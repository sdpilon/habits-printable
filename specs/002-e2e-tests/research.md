# Research: Automated End-to-End Tests

Resolves the open technical choices from the spec and plan. Each decision lists the alternatives considered.

## 1. Test runner and browser

**Decision**: Playwright Test (`@playwright/test`), one project: desktop Chromium, headless.

**Rationale**: It drives real downloads (`page.waitForEvent('download')`), gives screenshots and traces on failure, runs every test even after a failure by default (FR-013), has polling assertions for the 5-second settle rule, and runs the same way on macOS and Linux CI. The spec fixes one Chromium browser for version 1.

**Alternatives considered**:
- *Vitest with jsdom*: cannot run the WASM Typst compile or real downloads. Rejected.
- *Cypress*: good UI, but downloads and multi-tab control are weaker, and it adds a separate runtime. Rejected.
- *Puppeteer with a custom runner*: would rebuild retries, reporting, and screenshots by hand. Rejected.

**Install status**: `@playwright/test` 1.63.0 is installed (approved as an npm package). The browser is not an npm package, so it is not downloaded. Locally, the suite launches the Playwright-bundled Chromium (revision 1243), which is already cached in `~/Library/Caches/ms-playwright`, with no `executablePath`. The suite passes on this machine. CI uses the Google Chrome that GitHub's Ubuntu runner provides (`channel: 'chrome'`), and the first CI run passed on `ubuntu-latest` (run 37555321864).

## 2. Page under test: production build, served locally

**Decision**: The `webServer` entry in `playwright.config.ts` builds a fresh production bundle for each run, then runs `vite preview` on a free port chosen for that run, with `--strictPort`. The build runs through `tests/e2e/support/build-page.mjs` into `dist/e2e-<runId>`, which the global teardown removes at the end of the run. The server is never reused (`reuseExistingServer: false`), so a run can never test an older build. Two runs can therefore happen at the same time (spec Edge Cases).

**Verified**: `pnpm build` completes on this machine with the existing dependencies (built in 375 ms, output in `dist/`, which is git-ignored). `vite.config.ts` sets `root: 'web'` and `build.outDir: '../dist'`. The run passes `--outDir` explicitly, so `vite preview` serves the same output as the build. The first CI run on `ubuntu-latest` passed the build and the e2e step with `channel: 'chrome'` (run 37555321864).

**Alternatives considered**:
- *Development server*: the spec changed to the production build on 2026-10-06, since that is what people receive. Rejected.
- *Hosted or staging URL*: forbidden by FR-009. Rejected.

**CI check (done)**: the first CI run on `ubuntu-latest` passed the build and the e2e step (run 37555321864).

## 3. How the suite knows a preview has settled

**Decision**: `update()` in `web/src/main.ts` sets `aria-busy="true"` on the preview section when a change starts and `aria-busy="false"` when its render queue has finished. The suite waits for `aria-busy="false"` with a 5-second timeout (clarified). The attribute is set on the section with `id="preview-section"`, which is added to `index.html`. The same section carries `data-habits` and `data-days`, set in the render callback after each successful render, so they describe the layout last drawn. US1 AC2 reads them (see plan Complexity Tracking).

**Rationale**: The page has no existing signal for a finished preview. `aria-busy` is standard, not visible, and useful for assistive technology. The change does not alter layout, preview, or download behaviour (FR-011). The download button's `disabled` state can't be used alone, because it stays disabled for invalid input and overflow too.

**Alternatives considered**:
- *Wait for canvas pixels to change*: fragile and slow. Rejected.
- *A fixed sleep*: breaks the 5-second rule and slows every scenario. Rejected.
- *A global test hook (`window.__settled`)*: adds a test-only API to product code. Rejected in favour of a standard attribute.

## 4. Checking the downloaded PDF

**Decision**: Save the download (`download.path()`) and check it with two small helpers in `tests/e2e/support/pdf.ts`:
- Page count: reuse `countPdfPages` from `web/src/typst-compile.ts`. That module imports the Typst compiler when it loads. It loads in Node 24, so Playwright's runner can import it, at the cost of loading the compiler at test startup.
- Page size: read the first page's `/MediaBox` with a regular expression. US Letter is 612 × 792 points.

**Rationale**: No new dependency. The count matches what the product itself uses to block overflow (FR-013), so the test and the product agree.

**Alternatives considered**:
- *pdf.js in Node*: already a dependency, but the PDF.js Node build path is not verified here, and the page count is already available. Rejected for now.
- *A PDF parsing library*: a new dependency for two values. Rejected.

**Check (done)**: the `/MediaBox` regular expression reads the page size correctly on Typst's output. The default-options download test confirms it (612 × 792 points, one page).

## 5. Failure artifacts and CI

**Decision**:
- Playwright config: `screenshot: 'only-on-failure'`, `trace: 'retain-on-failure'`, and the HTML report in `playwright-report/` (git-ignored).
- CI: a step after the e2e run uploads `test-results/` and `playwright-report/` with `if: failure()` and `retention-days: 7`. This meets FR-014 and the 7-day clarification.
- CI browser: `channel: 'chrome'` on the Ubuntu runner's preinstalled Google Chrome. No browser download step. Verified on the first CI run (`ubuntu-latest` has the Chrome channel).

**Alternatives considered**:
- *Retain 30 or 90 days*: rejected by the clarification (7 days).
- *Screenshots on every run*: more storage with no added benefit for failure review. Rejected.

## 6. CI placement

**Decision**: Add the suite as a step in the existing `check` job in `.github/workflows/ci.yml`, after the margin check. It runs on every pull request on `ubuntu-latest`.

**Rationale**: The clarified answer is "run in the existing CI workflow on every pull request". One job keeps the setup shared.

**Alternatives considered**:
- *A separate workflow*: adds a second setup block for the same checkout and install. Rejected for now.
- *A manually triggered workflow*: the clarification chose every-PR CI. Rejected.

**Risk**: the suite adds time to every PR run. The first CI run (37555321864) took 55 seconds for the e2e step on `ubuntu-latest`, including the production build. That is well inside the 3-minute target in SC-001, which is also the local measure for a developer's run.

## 7. Where the test files live

**Decision**: `tests/e2e/*.spec.ts`. Vitest's include pattern (`tests/**/*.test.ts`) does not pick up `.spec.ts`, so the two runners do not overlap (FR-012). The Playwright config lives at the repository root, next to `vitest.config.ts`.

## 8. Paper size in the form

The constitution requires US Letter only, and A4 must not be offered. The paper selector offers US Letter alone, and its default is `letter` (`web/index.html`, `web/src/options.ts`). The suite also sets paper to `letter` explicitly in every scenario. The 001 specification and plan still describe A4 as the default; they are historical artifacts and were not changed.
