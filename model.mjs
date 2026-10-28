/**
 * RainReserve v1: daily, deterministic illustrative water balance.
 * 1 mm over 1 m² = 1 litre. Roof collection occurs before irrigation.
 * Direct garden rain offsets that day's target only; no soil carryover is modeled.
 * Not a forecast, measured saving, installation design, or water-quality assessment.
 */
export const LIMITS = Object.freeze({ roofM2: [0, 1000], capacityL: [0, 10000], gardenM2: [0, 1000], demandMm: [0, 20], efficiency: [0, 1], initialL: [0, 10000] });

function numberInRange(value, min, max, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${label} must be a finite number from ${min} to ${max}.`);
  }
}

export function validate(params, rainfall) {
  if (params === null || typeof params !== 'object' || Array.isArray(params)) throw new TypeError('Parameters must be an object.');
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    if (!Object.hasOwn(params, key)) throw new TypeError(`Missing parameter: ${key}.`);
    numberInRange(params[key], min, max, key);
  }
  for (const key of Object.keys(params)) if (!Object.hasOwn(LIMITS, key)) throw new TypeError(`Unknown parameter: ${key}.`);
  if (params.initialL > params.capacityL) throw new RangeError('initialL cannot exceed capacityL.');
  if (!Array.isArray(rainfall) || rainfall.length < 1 || rainfall.length > 366) throw new RangeError('Rainfall must be an array of 1 to 366 daily values.');
  // Index iteration deliberately rejects sparse arrays, unlike forEach/map.
  for (let i = 0; i < rainfall.length; i++) numberInRange(rainfall[i], 0, 500, `Rainfall day ${i + 1}`);
}

export function simulate(params, rainfall) {
  validate(params, rainfall);
  let storage = params.initialL;
  const totals = { inflow: 0, overflow: 0, used: 0, unmet: 0, demand: 0, initial: storage, end: storage };
  const days = [];
  for (let i = 0; i < rainfall.length; i++) {
    const rainMm = rainfall[i];
    const initial = storage;
    const inflow = rainMm * params.roofM2 * params.efficiency;
    const overflow = Math.max(0, initial + inflow - params.capacityL);
    const available = Math.min(params.capacityL, initial + inflow);
    const demand = Math.max(0, params.demandMm - rainMm) * params.gardenM2;
    const used = Math.min(available, demand);
    const unmet = demand - used;
    storage = available - used;
    days.push({ day: i + 1, rainMm, initial, inflow, overflow, demand, used, unmet, end: storage });
    for (const key of ['inflow', 'overflow', 'used', 'unmet', 'demand']) totals[key] += days[i][key];
  }
  totals.end = storage;
  return { days, totals };
}
