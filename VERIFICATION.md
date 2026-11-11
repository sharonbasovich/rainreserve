# Verification — October 28, 2026

## Passing evidence

Candidate commit `813b3047009edb3de1cd4ad18e170273a167166c` passed [GitHub Actions run 40688776436](https://github.com/sharonbasovich/rainreserve/actions/runs/40688776436), job 122817910767, on Ubuntu with Node 24.21 and Playwright Chromium 156.0.8078.4.

- 14 model tests, including 2,000 seeded independent-oracle scenarios.
- Four independently authored review tests, including 32,768 enumerated models, DOM state checks and full 60-row CSV conservation.
- JavaScript syntax checks and static build.
- Ten actual Chromium tests: live model comparisons, day/chart inspection, keyboard capacity change, pending/invalid input preservation, reset/reload, four rainfall patterns, zero capacity/rain/garden, real download with exact applied assumptions and raw conservation, no external runtime requests during the tested flow, 360/390/768/1440 px overflow and axe checks, keyboard skip navigation, disclosures, reduced motion, original illustration hover/focus tracing and static fallback.

Independent model/UI review found no blocker, high or medium issues. Server, dependency-license, secret-pattern and CI publication audits passed. Runtime has no third-party dependency or external asset. Test dependencies remain development-only.

Browser evidence ZIP SHA256: `266d97f112c4290dd1fb29556839f366f55ef565d9407176ff85a6b27ddda9b5`; artifact 12815504170. Artifact retention is 14 days. Desktop/mobile screenshots were visually inspected. Heading whitespace and crowded-label refinements, an original rain-flow illustration, and the robust skip-link clipping were rechecked in this final run. Normal screenshot state explicitly asserts the skip link is not focused and clipped; the separate keyboard test asserts focus restores its visibility. Independent review approved these changes. The subsequent verification-note update does not change runtime source.


## Reproduce

Node ≥22.12 (CI uses 24):

```sh
npm ci
npm test
npm run test:review
npm run check
npm run build
npx playwright install --with-deps chromium
npm run test:browser
```

Model tests and build require no npm dependencies. Review/browser tests require the pinned development dependencies.

## Limits

Passing automated axe checks is not accessibility certification. No physical touch devices, screen readers, Firefox or Safari tested. No measured water savings, real weather validation, garden experiment, or user study. No installation/safety/legal assurance. Synthetic fixtures only.

Supported managed preview in the authoring container timed out and reported stopped; no raw local-browser workaround was used. Actual browser verification instead ran in the independently reviewed public GitHub CI workflow with read-only repository permissions. Final contest registration/submission was not performed.

## 2026-10-29: local rainfall CSV improvement

Independent source review and new regression tests cover strict ISO date/mm parsing, gaps/duplicates/limits, no mutation or upload, export provenance, actual jsdom import/update/reset, invalid settings, rejected-file recovery, and asynchronous reset/new-file/pattern cancellation. Model is byte-identical to the original. Local aggregate checks: 18 model/parser tests + 8 review/UI tests pass; syntax/build pass. Existing film is unchanged and predates this feature.

Real-browser suite expanded from 11 to 14 tests: real file input/import/export, invalid/oversize/repeated files and reset/refresh, 366-day mobile layout with axe/reduced motion, plus all original behavior and exact five runtime-byte checks. Local browser execution is blocked by the executor (bundled Playwright Chromium absent; system Chromium fails `socket() Operation not permitted` before page execution). Use exact-commit GitHub Actions and its public-host browser job as the browser/deployment gate; do not infer success from local unit tests.

## 2026-10-29: interrupted-import day-selection recovery

A reproduced recovery defect reset the day slider before an imported rainfall replacement could pass setup validation. With an invalid roof value, the displayed old comparison retained day 2 while the slider silently moved to day 1. Export remained disabled; balances were not corrupted. The fix moves that reset inside the successful comparison update, leaving the old slider, daily readout and selected chart bar synchronized until new results can be applied.

The new regression fails on the prior runtime and passes on the fix. Local aggregate verification passes: 18 model/parser tests, 9 review/UI tests, syntax and build. A separate independent-arithmetic audit checked 3,308 exported daily rows and every corresponding chart/day value across 14 decimal/boundary series (1, 2, 30, 31, 32, 365 and 366 days). Model, parser, visual design and existing film are unchanged.

The Chromium suite now contains 15 tests, including invalid-settings replacement, correction, downloaded replacement dates and repeated successful import. Local Chromium remains unavailable for the previously documented executor reason; the exact-commit GitHub Actions verification and public-host browser jobs are the required publication evidence. Do not interpret the local checks as browser success.

## 2026-11-05: complete selected-day balance

The daily comparison now exposes starting storage, garden target after direct rainfall and ending storage for both capacities. The prior day-20 display showed 20 L versus 60 L used with no collection but omitted the carried storage explaining the difference. The new rows make both storage conservation and target partition inspectable on the page. Values remain independently rounded to 0.1 L; the explanation warns that displayed sums can differ slightly. Model, parser, CSV format and film are unchanged.

Independent review found no blocking findings. Two separately authored regressions check 276 daily states and 3,864 displayed values against independent arithmetic across 12 decimal/boundary fixtures, plus pending and invalid assumptions, delayed/failed/repeated imports and reset cancellation of stale reads. Both regressions fail against the prior UI because the required balances are absent.

Local verification passed: 21 model/parser tests, 19 review/UI tests, syntax, static build and all 29 Chromium browser tests under the /rainreserve/ prefix. New 1440 px and 360 px flows cover dry-day carried storage, rainy-day overflow, residual garden target, pending/invalid inputs, imported dates, rejected replacement, keyboard selection, zero scenario capacity and repeated reset/cancel. Reduced motion, no horizontal document overflow and automated axe checks pass. Both new screenshots were visually inspected. The complete suite also covers real CSV downloads and original keyboard, import, responsive and runtime/network checks.

Local runs used the installed Playwright Chromium with a loopback-only test server. Public deployment still requires exact-commit CI, deployment provenance and public-host browser verification. Passing automated checks does not establish physical-device, screen-reader or cross-browser compatibility, user-study results, measured savings, or rainfall accuracy.

## 2026-11-11: refreshed private session protection candidate

This candidate preserves the current main's SVG action and its regressions, documentation and workflow. It integrates the previously reviewed best-effort beforeunload protection and reusable number formatter. The warning is not recovery or persistence: downloads remain reports, not restorable sessions. There is no model, parser, CSV format, dependency, workflow or deployment change.

Local source checks passed 21 model/parser tests, 31 review groups, syntax and build using Node 24.22.1 and already-installed jsdom 30.1.1, rather than pinned 27.4.0. This is qualified source evidence, not a locked dependency or browser pass.

The browser suite adds desktop/360px native Cancel and Leave checks with bounded required-dialog observation. Seven repeated canceled reloads retain edits/imports; explicit apply/default reset and accepted reload are distinguished. Actual saved comparison bytes are checked against separately assembled canonical CSV using the synchronous model. A 366-day leap-year case checks all chart labels across six keyboard slider settings, day 366 keyboard navigation, exact saved bytes before/after canceled leave, and reset after accepted reload. Structured decisions, chart observations and raw downloaded files are retained in test-results. These are synthetic model-parity checks, not independent hydrology or real-world evidence.

Local browser execution was not performed. Exact-commit hosted tests, artifact and visual review, and production verification remain separate; this draft checkpoint does not claim any of them passed.
