# Implementation Plan: Automated End-to-End Tests

**Branch**: `002-e2e-tests` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-e2e-tests/spec.md`

## Summary

Add a browser-driven end-to-end suite that exercises the Printable Habit Grid page the way a person does: set options, wait for the preview, check invalid and overflowing inputs, and download a US Letter PDF and check its page count and size. The suite runs against the production build served locally, runs every scenario even after a failure, saves a screenshot per failure, and runs in the existing CI workflow on every pull request (Linux runner, artifacts kept 7 days).

Technical approach (see research.md): Playwright Test with a single Chromium project, a `webServer` that builds and serves the production build, a small test-only signal on the page (`aria-busy` on the preview section) so the suite can tell when a preview has settled, plus `data-habits` and `data-days` on the same section so the suite can read the counts that were drawn, and PDF checks reusing the existing `countPdfPages` helper plus a MediaBox read. No new layout or rendering code.

**Installs**: `@playwright/test` 1.63.0 is installed as an approved npm package. The browser is not an npm package, so it is not downloaded: locally the suite uses the Chromium already in the Playwright cache, and CI uses the Google Chrome on the Ubuntu runner (see research.md §1).

## Technical Context

**Language/Version**: TypeScript (strict, as in the rest of the project); Node.js 24 (as in CI)

**Primary Dependencies**: `@playwright/test` 1.63.0 (new dev dependency, installed). Existing: Vite 8, Vitest 5, pdfjs-dist 6, `@myriaddreamin/typst.ts`

**Storage**: N/A. Test output (report, screenshots, traces) goes to the Playwright output directory, which is git-ignored.

**Testing**: Playwright Test for the end-to-end suite (`tests/e2e/`, files named `*.spec.ts`). Vitest keeps `tests/unit`, `tests/comparison`, and `tests/perf` unchanged. Vitest's include pattern is `tests/**/*.test.ts`, so `*.spec.ts` files are not picked up by it.

**Target Platform**: Chromium desktop, headless, on Linux (CI) and on the developer's Mac (local). One browser in version 1.

**Project Type**: Web application (static page, Typst compiled to PDF in the browser). Test layer only.

**Performance Goals**: The suite finishes within 3 minutes on a typical machine (SC-001). A preview counts as settled within 5 seconds (clarified).

**Constraints**: Tests use only the locally served production build. No hosted test service or account (FR-009). The suite may not change layout, preview, or download behaviour (FR-011). Test files stay separate from existing test folders (FR-012).

**Scale/Scope**: About 12 scenarios covering the download path, preview update, five invalid-value kinds, and the overflow block for three layouts, with the paper fixed to US Letter. Compact by design.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution version 2.0.0 (US Letter only).

| Principle | Assessment | Status |
|-----------|------------|--------|
| I. Single Layout Source | The suite only observes the page. It draws nothing and adds no layout code. | PASS |
| II. Preview Equals Print | The suite checks that the downloaded file is the one-page US Letter PDF. Byte-level equality with the preview stays with the design (the preview is drawn from that PDF). The suite does not add a second rendering. | PASS |
| III. Hand-Fillable Output | No change to dots, margins, or layout. The margin check is untouched. | PASS (not affected) |
| IV. Responsive Options | The suite checks that changes update the preview and that invalid values block download. This is the principle's own test. | PASS |
| V. Scope Discipline | Adds one test dependency and three test-only page attributes (`aria-busy`, `data-habits`, `data-days`). All are required by the spec (FR-001 to FR-006, US1 AC2). No product features. | PASS, see Complexity Tracking |
| Technical: Typst | Unchanged. | PASS |
| Technical: US Letter only | The suite targets US Letter only, as the constitution now requires. | PASS |
| Workflow: margin check | Not triggered: no layout or rendering change. | PASS (not triggered) |

**Gate result**: PASS. Re-checked after Phase 1 design: the count attributes were added and are justified in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-e2e-tests/
├── spec.md              # Feature specification (clarified)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output: Scenario and Run report
├── quickstart.md        # Phase 1 output: how to run and check
├── contracts/
│   └── page-test-interface.md   # What the page exposes to the suite
├── checklists/
│   └── requirements.md
└── tasks.md             # Created by /speckit-tasks, not by this command
```

### Source Code (repository root)

```text
playwright.config.ts          # NEW: Chromium project, webServer (build + vite preview), reporter, screenshots
tests/
├── e2e/                      # NEW
│   ├── download.spec.ts      # User Story 1
│   ├── preview-and-input.spec.ts   # User Story 2
│   ├── overflow.spec.ts      # User Story 3
│   └── support/
│       ├── pdf.ts            # Page count and US Letter size check
│       └── page.ts           # Form helpers: set options, wait for settled preview
├── comparison/               # unchanged
├── perf/                     # unchanged
└── unit/                     # unchanged

web/src/main.ts               # CHANGED (small): aria-busy on the preview section during update(); data-habits and data-days set after each render
web/index.html                # CHANGED (small): aria-busy starts as "false" on the preview section
.github/workflows/ci.yml      # CHANGED: e2e job step, screenshot artifact with 7-day retention
package.json                  # CHANGED: "e2e" script; @playwright/test devDependency (installed)
.gitignore                    # CHANGED: Playwright output directories
```

**Structure Decision**: One Playwright project under `tests/e2e/` next to the existing test folders. The suite imports only `web/src/typst-compile.ts` (for `countPdfPages`, which has no build-time imports), so the PDF check reuses the product's own page counter. The only product-code changes are three test-only attributes on the preview section (`aria-busy`, `data-habits`, `data-days`), set in `update()`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New dev dependency `@playwright/test` (Principle V, YAGNI) | Real-browser automation with downloads, screenshots, and polling assertions is the spec's requirement (FR-001 to FR-008) | Hand-written browser scripts would re-implement waiting, screenshots, and reporting. Vitest with jsdom cannot run the WASM Typst compile or real downloads. |
| `aria-busy` attribute added to product markup | The suite needs an observable signal for "preview settled" (5-second rule). The page exposes none today. | Polling the canvas for changes is fragile; a fixed sleep breaks the 5-second rule and is slow. The attribute is invisible and also helps assistive technology. |
| `data-habits` and `data-days` on `#preview-section` (Principle V) | US1 AC2 requires the preview to show the chosen habit and day counts, and the suite can only check that from the page. The page exposes no counts today. | Counting dots or reading canvas pixels is fragile (research.md §3 rejects pixel polling). Reading counts from PDF text needs a parser (research.md §4 rejects one). |
</content>
