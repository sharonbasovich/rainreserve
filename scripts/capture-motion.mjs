/** Original RainReserve editorial graphics only. No application capture or state changes. */
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

const out = resolve('motion-capture');
await mkdir(out, { recursive: true });
const hash = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const gsap = JSON.parse(await readFile('film/motion-deps/node_modules/gsap/package.json', 'utf8'));
const gsapSource = 'film/motion-deps/node_modules/gsap/dist/gsap.min.js';
assert.equal(gsap.version, '3.15.0');
assert.match(gsap.license, /gsap.com\/standard-license/);
assert.match((await readFile(gsapSource, 'utf8')).slice(0, 2000), /gsap.com\/standard-license/);
// Keep the genuine license-bearing runtime and package metadata. GSAP has no assumed LICENSE file.
for (const [from, to] of [
  [gsapSource, 'film/motion/gsap.min.js'],
  [gsapSource, `${out}/gsap.min.js`],
  ['film/motion-deps/package-lock.json', `${out}/gsap-package-lock.json`],
  ['film/motion-deps/node_modules/gsap/package.json', `${out}/gsap-package.json`],
  ['film/motion/index.html', `${out}/motion-source.html`],
]) await copyFile(from, to);

const provenance = {
  success: false,
  sourceCommit: process.env.GITHUB_SHA || null,
  workflowRun: process.env.GITHUB_RUN_ID || null,
  purpose: 'Original editorial motion only; no app footage, measured weather or savings.',
  viewport: { width: 1600, height: 900 },
  dependencies: { gsap: gsap.version, playwright: JSON.parse(await readFile('node_modules/@playwright/test/package.json', 'utf8')).version },
  sourceSha256: await hash('film/motion/index.html'),
  captureScriptSha256: await hash('scripts/capture-motion.mjs'),
  rootLockSha256: await hash('package-lock.json'),
  gsapSha256: await hash(gsapSource),
  timingNote: 'Recording starts around page creation, not playback. Offset estimates are diagnostic only; inspect actual video frames before editing. Midpoint PNG is taken during the one continuous playback, with no pre-play seek flash.',
  scenes: [],
};
let browser;
try {
  browser = await chromium.launch();
  provenance.browserVersion = browser.version();
  for (const [scene, duration] of [['intro', 12], ['math', 15], ['end', 9]]) {
    const errors = [];
    const context = await browser.newContext({
      viewport: provenance.viewport,
      deviceScaleFactor: 1,
      recordVideo: { dir: out, size: provenance.viewport },
    });
    const pageCreation = performance.now();
    const page = await context.newPage();
    const video = page.video();
    const entry = { scene, duration, errors, completed: false };
    provenance.scenes.push(entry);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    try {
      await page.goto(pathToFileURL(resolve('film/motion/index.html')).href + `?scene=${scene}`);
      await page.waitForFunction(() => window.__FILM_READY__ === true, {}, { timeout: 15000 });
      assert.equal(await page.evaluate(() => window.film.duration), duration);
      await page.waitForTimeout(400);
      const start = performance.now();
      // A GSAP timeline is thenable. Never return it across the browser evaluation boundary.
      await page.evaluate(() => { window.film.play(); });
      entry.playbackOffsetEstimateSeconds = (start - pageCreation) / 1000;
      await page.waitForTimeout(Math.max(0, duration * 500 - (performance.now() - start)));
      entry.midpointCaptureTimeSeconds = (performance.now() - start) / 1000;
      await page.screenshot({ path: `${out}/${scene}-midpoint.png` });
      await page.waitForTimeout(Math.max(0, duration * 1000 + 350 - (performance.now() - start)));
      entry.actualPlaybackWaitSeconds = (performance.now() - start) / 1000;
      assert.deepEqual(errors, [], `${scene} browser errors`);
      entry.completed = true;
    } finally {
      await context.close();
      await video.saveAs(`${out}/${scene}.webm`);
      await video.delete(); // Remove the redundant random-named recording after its named copy is saved.
      entry.videoSha256 = await hash(`${out}/${scene}.webm`);
    }
  }
  provenance.success = true;
} finally {
  if (browser) await browser.close();
  await writeFile(`${out}/provenance.json`, JSON.stringify(provenance, null, 2) + '\n');
}
console.log('Motion-only capture complete: intro, math, end.');
