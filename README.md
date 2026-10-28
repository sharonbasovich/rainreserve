# RainReserve

Explore how roof area, barrel capacity, rainfall timing, and garden demand interact—without pretending to predict the weather or prove environmental savings.

An original browser-local prototype for Green Shift Hacks, created October 28, 2026 by Sharon Basovich with Codex AI assistance. Registration/submission are separate and not completed by this repository. Original application code is MIT licensed.

## Run

Requires Node.js 22.12 or newer (CI uses Node 24) and a modern browser. No dependency installation is required to run, build, or test the model.

```sh
npm test
npm run check
npm run build
node server.mjs
```

Open http://127.0.0.1:4173/. The server binds to this computer only. `PORT=4174 node server.mjs` selects another port. Do not open the HTML as a file; ES modules require an HTTP server. The built app makes no runtime network requests beyond its own static files. There is no account, automatic persistence, or backend. Refreshing restores the demo.

## A complete comparison

1. Start with the **Mixed month** synthetic fixture, 40 m² roof, 20 m² garden, 3 mm daily target, and 80% collection efficiency.
2. Compare the 200 L baseline with a 400 L scenario. Move the scenario slider to see how capacity affects modeled use, overflow, and unmet demand.
3. Inspect a rainy day and the dry days after it using the day slider or storage chart.
4. Change to **Long dry spell**, **Two heavy storms**, or **No rain**. These are invented examples, not historical or forecast local weather.
5. Change roof/garden assumptions and select **Update comparison**. Unapplied edits disable export and clearly retain the previous result.
6. Download a CSV containing the applied assumptions, exact synthetic rainfall, and both daily balances. The CSV is created locally and not uploaded.

The public UI supports 30 days, 0–1,000 m² connected roof/garden, 0–20 mm/day target, 0–100% efficiency, a 0–2,000 L scenario slider and 0–10,000 L baseline. These are software limits, not recommendations. Fields enforce their displayed increments. The pure model additionally supports up to 366 days, 0–500 mm daily rain, 0–10,000 L capacity and initial storage from zero to capacity; the UI always starts empty.

## Model

One millimetre on one square metre is one litre. Each day:

- `inflow = rainMm × roofM2 × efficiency`
- `overflow = max(0, start + inflow − capacity)`
- `demand = max(0, demandMm − rainMm) × gardenM2`
- `used = min(start + inflow − overflow, demand)`
- `end = start + inflow − overflow − used`
- `unmet = demand − used`

Capture and overflow precede withdrawal. Direct rainfall offsets the same day's garden target only. Soil moisture, evaporation, first-flush diversion, leakage, hourly timing, water quality, actual plant needs, costs, and local constraints are not modeled. Same-day garden rain is assumed fully effective. Simplifications can overstate useful supply. No drinking-water, installation, safety, or legal-compliance recommendation is provided.

`initial + total inflow = total overflow + total used + final storage`, within floating-point tolerance. `total demand = total used + total unmet`. Used water is **modeled supply from storage**, not a measured savings claim.

## Evidence and attribution

EPA WaterSense, [Watering Tips](https://www.epa.gov/watersense/watering-tips), accessed October 28, 2026, describes rainwater collection as one outdoor-water strategy alongside reducing overwatering. It does not validate this model or its presets.

No third-party assets, copied components, fonts, runtime libraries, weather services, or paid APIs are bundled. The available dot editorial template guidance was reviewed for native controls, responsive comparison tables, quiet typography, and disclosures; implementation is original. ReactBits was not copied because no needed compatible-license component justified adding dependencies. See `THIRD-PARTY.md`.

## Verification

`npm test` runs 14 domain tests, including 2,000 seeded scenarios against a separately implemented reference, conservation, boundary cases, rejection, and nonmutation. Syntax and static build checks are separate. Browser verification status and limitations are in `VERIFICATION.md`—do not infer browser success from model tests.

## Public deployment

The static app is compatible with a project directory such as `/rainreserve/`: its stylesheet, ES module entry, and model import are relative. The four runtime files and all visual/model behavior are unchanged by the deployment workflow.

`.github/workflows/verify.yml` verifies every push and pull request, including all browser flows under `/rainreserve/`. Only verified `main` builds can publish to GitHub Pages. The artifact contains the four built app files, `.nojekyll`, and a `deployment.json` recording the source commit. Deployment uses GitHub's temporary workflow token and OIDC; no custom credentials or paid service is required. The workflow does **not** enable Pages or change repository access. An owner must first select **GitHub Actions** as the Pages publishing source in repository settings. Keep the deployment PR in draft until independent review and merge readiness are coordinated.

After deployment, the workflow runs the same Chromium suite against the returned public URL in a fresh unauthenticated context. It verifies model/UI flows, CSV download, keyboard navigation, reduced motion, mobile layouts, axe checks, runtime/console/network failures, exact runtime asset bytes, and source commit provenance. Browser screenshots, traces on failure, and HTML reports are retained for 14 days. A green build alone does not prove publication; inspect the deploy and production-browser jobs and the live URL before using it in a submission.

To reproduce in a POSIX shell after `npm ci`, `npm run build`, and installing Playwright Chromium:

```sh
STATIC_PREFIX=/rainreserve/ npm run test:browser
BASE_URL=https://sharonbasovich.github.io/rainreserve/ EXPECTED_COMMIT=<deployed-full-sha> npm run test:browser
```

In PowerShell, set `$env:STATIC_PREFIX='/rainreserve/'` before `npm run test:browser`; remove it with `Remove-Item Env:STATIC_PREFIX`. Set `BASE_URL` and `EXPECTED_COMMIT` similarly for the public run. `BASE_URL` must include the trailing slash and disables the local test server. Build from the expected commit with Git line-ending conversion disabled, matching Linux CI, so the exact asset-byte comparison is meaningful. The expected Pages URL above is a deployment target, not evidence that it is already live.

Pages does not run `server.mjs` or inherit its local HTTP headers. The public app remains a static browser-local explorer without accounts, persistence, a weather API, or backend. A different static host can serve the same `dist` artifact if Pages later limits the project. No hackathon submission is performed by this workflow.
