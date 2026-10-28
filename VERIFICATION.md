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
