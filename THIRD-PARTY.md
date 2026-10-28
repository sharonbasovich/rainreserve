# Attribution

All application HTML, CSS, JavaScript, SVG marks, synthetic rainfall fixtures and model tests are original work by Sharon Basovich with Codex AI assistance, October 28, 2026, licensed under MIT. No external visual assets, fonts, templates, runtime libraries, APIs or models are bundled. Available dot template guidance was consulted, not copied; the interface uses native controls, an original CSS/SVG barrel, and system fonts. No ReactBits code or Commons Clause component is included.

Node.js is a separately installed runtime, not distributed. Browser test tooling, when installed, remains under its own license and is not imported into the application. Public guidance is linked in the UI and README and does not endorse the prototype.

## Development-only verification dependencies

| Package | Pinned version | License |
| --- | --- | --- |
| @playwright/test | 1.64.1 | Apache-2.0 |
| jsdom | 27.4.0 | MIT |
| @axe-core/playwright | 4.14.0 | MPL-2.0 |

These are used only for tests. No dependency code is bundled in `dist/`. Transitive packages retain their own licenses and notices in installed package files; `package-lock.json` records their versions and license metadata. GitHub Actions uses actions/checkout, actions/setup-node and actions/upload-artifact without distributing their code in the application. Tests do not use credentials or access external user data.
