# Verification — October 28, 2026

## Passing evidence

Candidate commit `a6bd18c8bc6b1d6e6775ee8cb9f93f791c137d67` passed [GitHub Actions run 40687554289](https://github.com/sharonbasovich/rainreserve/actions/runs/40687554289), job 122813709037, on Ubuntu with Node 24.21 and Playwright Chromium 156.0.8078.4.

- 14 model tests, including 2,000 seeded independent-oracle scenarios.
- Four independently authored review tests, including 32,768 enumerated models, DOM state checks and full 60-row CSV conservation.
- JavaScript syntax checks and static build.
- Nine actual Chromium tests: live model comparisons, day/chart inspection, keyboard capacity change, pending/invalid input preservation, reset/reload, four rainfall patterns, zero capacity/rain/garden, real download with exact applied assumptions and raw conservation, no external runtime requests during the tested flow, 360/390/768/1440 px overflow and axe checks, keyboard skip navigation, disclosures, reduced motion.

Independent model/UI review found no blocker, high or medium issues. Server, dependency-license, secret-pattern and CI publication audits passed. Runtime has no third-party dependency or external asset. Test dependencies remain development-only.

Browser evidence ZIP SHA256: `0fd3a933957a007880ac8631bc816573f722d76fbcaa01dbf7fdc8494aca2399`; artifact 12816195555. Artifact retention is 14 days. Desktop/mobile screenshots were visually inspected. Minor heading whitespace and crowded-label refinements are included after that run. An original rain-flow illustration adds a meaningful hover/focus trace and static reduced-motion fallback, without changing model inputs or outputs. Screenshot capture now clears axe's temporary focus to avoid a visible skip-link overlay. The expanded ten-test CI rerun must be verified before merge.

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
