import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate, validate, LIMITS } from './model.mjs';
const base = { roofM2: 40, capacityL: 200, gardenM2: 20, demandMm: 4, efficiency: 0.8, initialL: 0 };
const near = (a, b, label = '') => assert.ok(Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b)), `${label}: ${a} != ${b}`);

test('hand-calculated three-day example and chronology', () => {
  const r = simulate(base, [10, 0, 1]);
  assert.deepEqual(r.days, [
    { day: 1, rainMm: 10, initial: 0, inflow: 320, overflow: 120, demand: 0, used: 0, unmet: 0, end: 200 },
    { day: 2, rainMm: 0, initial: 200, inflow: 0, overflow: 0, demand: 80, used: 80, unmet: 0, end: 120 },
    { day: 3, rainMm: 1, initial: 120, inflow: 32, overflow: 0, demand: 60, used: 60, unmet: 0, end: 92 },
  ]);
  assert.deepEqual(r.totals, { initial: 0, end: 92, inflow: 352, overflow: 120, demand: 140, used: 140, unmet: 0 });
});
test('overflow precedes same-day withdrawal', () => {
  const r = simulate({ ...base, capacityL: 100, initialL: 100, demandMm: 20 }, [1]);
  assert.equal(r.totals.overflow, 32); assert.equal(r.totals.used, 100); assert.equal(r.totals.unmet, 280);
});
test('no-barrel baseline loses all roof inflow and meets no irrigation', () => {
  const r = simulate({ ...base, capacityL: 0 }, [0, 2, 10]);
  assert.equal(r.totals.used, 0); assert.equal(r.totals.inflow, r.totals.overflow);
  assert.equal(r.totals.unmet, r.totals.demand); assert.equal(r.totals.end, 0);
});
test('rain offsets garden demand; surplus does not carry into next dry day', () => {
  const r = simulate({ ...base, roofM2: 0 }, [500, 0]);
  assert.equal(r.days[0].demand, 0); assert.equal(r.days[1].demand, 80);
});
test('zero collection and zero demand edge cases', () => {
  for (const params of [{ ...base, efficiency: 0 }, { ...base, roofM2: 0 }]) assert.equal(simulate(params, [500]).totals.inflow, 0);
  for (const params of [{ ...base, demandMm: 0 }, { ...base, gardenM2: 0 }]) assert.equal(simulate(params, [0, 500]).totals.demand, 0);
});
test('initial stock counted separately, never as new collected water', () => {
  const t = simulate({ ...base, initialL: 200 }, [0, 0, 0]).totals;
  assert.equal(t.inflow, 0); assert.equal(t.used, 200); assert.equal(t.unmet, 40); assert.equal(t.end, 0);
});
test('fractional millimetres and efficiency stay fractional', () => {
  const t = simulate({ ...base, roofM2: 1.5, efficiency: 0.5, gardenM2: 0 }, [0.1]).totals;
  near(t.end, 0.075); assert.ok(t.end > 0 && t.end < 1);
});
test('all bounds accepted, 366 days supported', () => {
  const p = { roofM2: 1000, capacityL: 10000, gardenM2: 1000, demandMm: 20, efficiency: 1, initialL: 10000 };
  assert.equal(simulate(p, Array(366).fill(500)).days.length, 366);
  assert.equal(simulate(Object.fromEntries(Object.keys(p).map(k => [k, 0])), [0]).totals.end, 0);
});
test('reject missing and unknown parameters, arrays, null, scalars', () => {
  for (const key of Object.keys(base)) { const p = { ...base }; delete p[key]; assert.throws(() => simulate(p, [0])); }
  for (const p of [null, [], 4, 'x', undefined, { ...base, typo: 1 }]) assert.throws(() => simulate(p, [0]));
});
test('reject every out-of-range, coercible and nonfinite parameter', () => {
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    for (const value of [min - 1, max + 1, NaN, Infinity, -Infinity, '4', '', null, undefined, true, [], {}]) {
      assert.throws(() => simulate({ ...base, [key]: value }, [0]), `${key}=${String(value)}`);
    }
  }
  assert.throws(() => simulate({ ...base, initialL: 201 }, [0]));
});
test('reject sparse, oversized, empty and invalid rainfall arrays', () => {
  for (const rain of [[], Array(367).fill(0), Array(2), null, {}, '0', new Float64Array([0]), [NaN], [Infinity], [-0.01], [500.01], ['1'], [null], [false]]) assert.throws(() => simulate(base, rain));
});
test('does not mutate params or rainfall; calls are independent', () => {
  const p = Object.freeze({ ...base }), rain = Object.freeze([0, 5, 0]);
  const a = simulate(p, rain), b = simulate(p, rain); assert.deepEqual(a, b);
  a.days[0].end = 999; assert.notDeepEqual(a, b); validate(p, rain);
});
// Independently structured reservoir reference: account for captured input by
// subtracting spills, then subtract irrigation, not implementation's min formula.
function oracle(p, rain) {
  let s = p.initialL; const out = { initial: s, inflow: 0, overflow: 0, used: 0, unmet: 0, demand: 0, end: 0 };
  for (const r of rain) {
    const incoming = r * p.roofM2 * p.efficiency; s += incoming; out.inflow += incoming;
    if (s > p.capacityL) { out.overflow += s - p.capacityL; s = p.capacityL; }
    const demand = r >= p.demandMm ? 0 : (p.demandMm - r) * p.gardenM2; out.demand += demand;
    if (s >= demand) { s -= demand; out.used += demand; }
    else { out.used += s; out.unmet += demand - s; s = 0; }
  }
  out.end = s; return out;
}
test('2000 seeded adversarial scenarios conserve water and match independent oracle', () => {
  let seed = 4711; const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (let n = 0; n < 2000; n++) {
    const capacityL = random() * 10000;
    const p = { roofM2: random() * 1000, capacityL, gardenM2: random() * 1000, demandMm: random() * 20, efficiency: random(), initialL: random() * capacityL };
    const rain = Array.from({ length: 1 + Math.floor(random() * 366) }, () => random() < 0.7 ? 0 : random() * 500);
    const r = simulate(p, rain), expected = oracle(p, rain);
    for (const key of Object.keys(expected)) near(r.totals[key], expected[key], key);
    near(r.totals.initial + r.totals.inflow, r.totals.overflow + r.totals.used + r.totals.end, 'total conservation');
    near(r.totals.used + r.totals.unmet, r.totals.demand, 'total demand');
    for (const d of r.days) {
      near(d.initial + d.inflow, d.overflow + d.used + d.end, 'daily conservation');
      near(d.demand, d.used + d.unmet, 'daily demand');
      assert.ok(d.end >= 0 && d.end <= capacityL); assert.ok(d.overflow >= 0 && d.used >= 0 && d.unmet >= 0);
    }
  }
});
test('larger empty barrel never reduces total water used for same scenario', () => {
  for (let c = 0; c < 1000; c += 10) {
    const rain = [0, 2, 0, 0, 50, 0, 0, 0, 0, 1, 0];
    const a = simulate({ ...base, capacityL: c }, rain).totals;
    const b = simulate({ ...base, capacityL: c + 10 }, rain).totals;
    assert.ok(b.used + 1e-9 >= a.used); assert.ok(b.unmet <= a.unmet + 1e-9);
  }
});
