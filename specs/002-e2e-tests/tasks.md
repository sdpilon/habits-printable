# Tasks: Automated End-to-End Tests

**Input**: Design documents from `/specs/002-e2e-tests/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: The e2e suite is the deliverable of this feature, so its scenarios are the implementation tasks. No separate TDD test tasks are added on top of them.

**Organization**: Tasks are grouped by user story (US1 download, US2 preview and input, US3 overflow) so each story can be implemented and run independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Wire up the Playwright runner that `@playwright/test` (already installed, 1.63.0) needs

- [x] T001 [P] Add `"e2e": "playwright test"` script to `package.json` (the `@playwright/test` devDependency is already present)
- [x] T002 [P] Add `test-results/` and `playwright-report/` to `.gitignore`
- [x] T003 Create `playwright.config.ts` at the repository root: `testDir: 'tests/e2e'`; one project, desktop Chromium, headless; `webServer` running `pnpm build && pnpm exec vite preview --port <fixed> --strictPort` with `reuseExistingServer: !process.env.CI`; `screenshot: 'only-on-failure'`, `trace: 'retain-on-failure'`; a per-run `runId` (from the `E2E_RUN_ID` environment variable, or `${Date.now()}-${process.pid}` when unset) used as `outputDir: \`test-results/${runId}\``and as the HTML reporter's`outputFolder: \`playwright-report/${runId}\``with`open: 'never'`; browser `channel: 'chrome'`when`CI`is set, otherwise the Chromium already cached in`~/Library/Caches/ms-playwright` (see research.md §1)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The page signals and shared helpers every scenario uses. MUST complete before any user story phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] In `web/index.html`, add `id="preview-section"` and `aria-busy="false"` to the existing `<section aria-label="Preview">` (currently at line 39, wrapping `<div id="preview">`). Do not add a second `<section>` and do not change any other markup (FR-011, contracts/page-test-interface.md)
- [x] T005 Set `aria-busy` in `update()` in `web/src/main.ts` (lines 44–77): set `"true"` when a valid option change starts rendering, and `"false"` once `renderQueue` has drained. Track a pending-update counter so a stale update cannot clear `aria-busy` while a newer render is still queued. Invalid input must leave the section at `"false"`. No change to layout, preview, or download logic
- [x] T006 Set `data-habits` and `data-days` on `#preview-section` in the render callback of `update()` in `web/src/main.ts`. Inside the `renderQueue` callback, after `renderPreview(...)` resolves, set them from the options that were rendered (`String(result.options.habits)`, `String(result.options.days)`). Do not set them when a render fails, and do not clear them on invalid or overflowing input. They describe the layout last drawn into `#preview` (contracts/page-test-interface.md). Confirm the option field names in `web/src/options.ts`. Depends on T005 (same function)
- [x] T007 [P] Create `tests/e2e/support/pdf.ts`: import `countPdfPages` from `web/src/typst-compile.ts`; add `readFirstPageSize(path)` that reads the first `/MediaBox` with a regular expression and returns width and height in points; add `expectOnePageUsLetter(path)` that asserts exactly one page and 612 × 792 points. Confirm the import of `web/src/typst-compile.ts` works under Playwright's loader on the first test run. If it fails, move `countPdfPages` into a module with no compiler import (for example `web/src/pdf-pages.ts`), re-exported from `typst-compile.ts`
- [x] T008 [P] Create `tests/e2e/support/page.ts` with: `openPage(page)` (goes to `/`); `resetDefaults(page)` (sets every control to the quickstart.md defaults: layout `rows`, habits 5, days 31, perRow 7, dot diameter 4, dot spacing 1.5, paper `letter`); `setOption(page, name, value)` (fills the input or select by `name` inside `#options`); `waitForSettled(page)` (waits up to 5 seconds for `#preview-section[aria-busy="false"]`); `readMessages(page)`; `isDownloadEnabled(page)`; `isWarningVisible(page)`; `readPreviewCounts(page)` (returns `data-habits` and `data-days` from `#preview-section`); `readCanvasHash(page)` (hashes the `#preview canvas` pixels, used only to confirm that a change happened, never to detect settling). Each helper is called inside a named `test.step` so failures report the step

**Checkpoint**: Foundation ready. Shared helpers and the page signals exist, so user story scenarios can be written.

---

## Phase 3: User Story 1 - Confirm the download path works end to end (Priority: P1) 🎯 MVP

**Goal**: One command opens the real page, waits for the preview, downloads the PDF, and checks it is a one-page US Letter file. The preview shows the chosen habit and day counts.

**Independent Test**: `pnpm e2e` with default options passes the "defaults download" scenario and reports the saved file as a one-page US Letter PDF. Breaking the download so it produces no file makes the run fail.

- [x] T009 [US1] Create `tests/e2e/download.spec.ts` with the "defaults download" scenario: `openPage`, `resetDefaults`, `waitForSettled`, click `#download`, and wait for the `download` event inside a `test.step('download')`. Save the file with `download.saveAs(test.info().outputPath('habit-grid.pdf'))` so it lands in this run's own output folder, and assert `suggestedFilename()` is `habit-grid.pdf`
- [x] T010 [US1] In `tests/e2e/download.spec.ts`, run `expectOnePageUsLetter` on the copy saved by T009 in a `test.step('check PDF')`, so it checks the file from this run only (FR-003)
- [x] T011 [US1] In `tests/e2e/download.spec.ts`, add a missing-download check: if the `download` event does not fire within the timeout, the scenario fails at the `download` step with a clear message. It must never pass without a file (FR-008)
- [x] T012 [US1] In `tests/e2e/download.spec.ts`, add the non-default scenario (US1 acceptance 2): set habits, days, and layout to non-default values (habits 6, days 14, layout `columns`), `waitForSettled`, then assert `readPreviewCounts` returns `data-habits="6"` and `data-days="14"`, and that the layout select reads `columns`. Depends on T006 and T008

**Checkpoint**: User Story 1 is independently runnable. `pnpm e2e` with the download scenario is the MVP.

---

## Phase 4: User Story 2 - Catch preview and option regressions (Priority: P2)

**Goal**: Each option change updates the preview without an apply action, and invalid values show a message and block download.

**Independent Test**: With the invalid-habit-count message broken on purpose, the run fails on the invalid-value scenario and names the input that was tested.

- [x] T013 [US2] Create `tests/e2e/preview-and-input.spec.ts` with one test per changeable option, table-driven: habits 5 → 4 (assert `data-habits="4"`); days 31 → 14 (assert `data-days="14"`); dots per row 7 → 10; dot diameter 4 → 3; dot spacing 1.5 → 2; layout → `columns`. Each test runs `openPage`, `resetDefaults`, `waitForSettled`, reads `readCanvasHash`, applies only its own change with `setOption`, then `waitForSettled`. It asserts the hash differs from before and download is enabled, with no apply control pressed and no page reload. Each option is its own test, so a broken option fails only its own scenario (FR-004, US2 AC1). Paper is not tested, because the form only offers `letter`. Confirm each chosen value renders without overflow at default size
- [x] T014 [US2] In `tests/e2e/preview-and-input.spec.ts`, add one test per invalid habit-count kind. Empty, `0`, `-1`, and `21` are set with `fill()`. The non-numeric kind is entered with `fill('')` then `pressSequentially('1e')`: Chromium accepts `e` in a `type=number` input and flags the value as bad input, so `input.validity.badInput` is `true`. Before writing the non-numeric test, run a probe to confirm `1e` gives `badInput` in Chromium. If it reads as empty instead, drop the non-numeric kind and record in the spec that the browser blocks non-numeric entry before the page sees it. Each test asserts a message in `#messages li`, `input[name="habits"][aria-invalid="true"]`, and `#download` disabled. Separate tests keep every kind running even if one fails (FR-013)
- [x] T015 [US2] In `tests/e2e/preview-and-input.spec.ts`, add the recovery scenario: after an invalid value, set habits to `5`. The message list must clear, `aria-invalid` must clear, and download must be enabled again

**Checkpoint**: User Stories 1 and 2 both run independently.

---

## Phase 5: User Story 3 - Catch overflow blocking across layouts (Priority: P3)

**Goal**: Overflowing combinations show the warning and block download in each of the three layouts. Reducing the count clears it.

**Independent Test**: One overflowing combination per layout each show `#warning` and no enabled download. Removing the warning for one layout fails only that layout's scenario.

- [x] T016 [US3] Create `tests/e2e/overflow.spec.ts` with the rows overflow scenario: habits 20, days 365, perRow 1. Assert `#warning` is visible, `#download` is disabled, and `readPreviewCounts` returns `data-habits="20"` and `data-days="365"`, because the overflowing layout is still drawn
- [x] T017 [US3] In `tests/e2e/overflow.spec.ts`, add the columns overflow scenario: layout `columns`, days 365 (habits left at the default 5), with the same assertions as T016 except the counts, which are `data-habits="5"` and `data-days="365"`. The check that the drawn columns are not side by side (US3 AC2) is not asserted here; it stays an open decision
- [x] T018 [US3] In `tests/e2e/overflow.spec.ts`, add the calendars overflow scenario: layout `calendars`, habits 20, days 365, perRow 1, with the same assertions as T016
- [x] T019 [US3] In `tests/e2e/overflow.spec.ts`, add the fix-an-overflow scenario: set habits 20 at the default days (31) and dots per row (overflows), then change habits 20 → 5. Assert the warning is hidden, download is enabled, and the counts read `data-habits="5"` and `data-days="31"`. Days 365 is not used here: at 1 dot per row no habit count fits one page

**Checkpoint**: All three user stories run independently. The suite covers every scenario in quickstart.md.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: CI wiring, verification against the spec, and docs

- [x] T020 [P] Add an e2e step to the `check` job in `.github/workflows/ci.yml` after the margin check, running `pnpm e2e` (FR-009)
- [x] T021 [P] Add a step in `.github/workflows/ci.yml` that uploads `test-results/` and `playwright-report/` with `if: failure()` and `retention-days: 7` (FR-014)
- [x] T022 [P] Verify the `/MediaBox` regular expression against Typst output for the default layout, as research.md §4 requires. Adjust `tests/e2e/support/pdf.ts` if the first page's box is written differently
- [x] T023 Run `pnpm e2e` locally from a clean state and confirm every scenario in quickstart.md passes, and that a single run finishes within 3 minutes (SC-001)
- [x] T024 Run `pnpm e2e` twice at the same time on one machine. Confirm each run writes to its own `test-results/<runId>` and `playwright-report/<runId>`, and that the second run does not read the first run's PDF (spec Edge Cases). The two local runs share one static server on the fixed port, which is expected
- [x] T025 Confirm on the first CI run that `pnpm build` and the Chrome channel work on `ubuntu-latest` (research.md §2 and §5). If the runner has no Chrome, stop and raise it before adding a browser download
- [x] T026 Run quickstart.md validation: follow the written setup steps on a clean checkout and confirm no step is missing
- [x] T027 In a scratch copy or `git worktree` (not the real tree), break the invalid-habit message and run `pnpm e2e`. Confirm only the matching scenario fails and the report names its failing step (SC-003)
- [x] T028 Run `pnpm e2e` 10 times in a row on an unchanged tree. Record that all 10 runs pass (SC-004)
- [x] T029 In a scratch copy, make `pnpm build` fail. Confirm the run stops before any scenario starts and reports that the page could not be reached (spec Edge Cases)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T001 and T002 can run in parallel. T003 can start alongside them.
- **Foundational (Phase 2)**: Depends on Setup. T005 depends on T004. T006 depends on T005. T007 and T008 can run in parallel with T004–T006.
- **User Stories (Phases 3–5)**: All depend on Foundational. US1 is the MVP. US2 and US3 can proceed in parallel after Foundational, since they use separate spec files.
- **Polish (Phase N)**: Depends on the user stories being complete. T025 needs a CI run, so it comes last among the verification tasks.

### User Story Dependencies

- **US1 (P1)**: Needs T003, T007, T008, and T005 (settled signal). T012 also needs T006 (count attributes). No dependency on US2 or US3.
- **US2 (P2)**: Needs T004, T005, T006 (count assertions for habits and days), and T008 (including `readCanvasHash`). No dependency on US1 or US3.
- **US3 (P3)**: Needs T004, T005, T006 (counts), and T008. No dependency on US1 or US2.

### Within Each User Story

- Helpers (Phase 2) before scenarios
- Scenarios within one spec file run in order, because each file shares the same page setup
- Each scenario starts from defaults (T008 `resetDefaults`), so one scenario cannot leak state into another

### Parallel Opportunities

- Setup: T001 and T002 in parallel
- Foundational: T004, T007, and T008 in parallel (different files)
- Stories: once Foundational is done, US1, US2, and US3 can be worked on in parallel (separate spec files)
- Polish: T020, T021, and T022 in parallel

---

## Parallel Example: Foundational

```bash
# Different files, no dependencies on each other:
Task: "In web/index.html, add id=\"preview-section\" and aria-busy=\"false\" to the existing <section aria-label=\"Preview\">"
Task: "Create tests/e2e/support/pdf.ts with countPdfPages reuse and US Letter MediaBox check"
Task: "Create tests/e2e/support/page.ts with openPage, resetDefaults, setOption, waitForSettled, readPreviewCounts, readCanvasHash"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks all stories)
3. Complete Phase 3: User Story 1 (T009–T012)
4. **STOP and VALIDATE**: run `pnpm e2e` and check the download and count scenarios pass, and that a broken download fails the run

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add US1 → run and validate (MVP)
3. Add US2 → run and validate
4. Add US3 → run and validate
5. Polish: concurrency check (T024), then the first CI run (T025)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps each task to a user story for traceability
- The suite only observes the page. It must not change layout, preview, or download behaviour (FR-011). The only product-code additions are `aria-busy`, `data-habits`, and `data-days`
- Stop at any checkpoint to validate a story independently
- Avoid: adding product code beyond those attributes, or a second PDF renderer (constitution Principles I and II)

---

## Phase 6: Convergence

- [x] T030 CRITICAL: Remove A4 so only US Letter is offered: the paper select in `web/index.html` (line 30, A4 currently selected), the `Paper` type, default and `PAPERS` list in `web/src/options.ts`, and the A4 default and branch in `typst/tracker.typ` (lines 15 and 32). The template change touches layout, so run `pnpm margins` (constitution Development Workflow) per Constitution Technical Constraints (contradicts)
- [x] T031 Make `playwright.config.ts` rebuild the production bundle on every local run, instead of reusing a server that may serve an older build (for example `reuseExistingServer: false`, with a clear error when the fixed port is occupied) per research.md §2 and spec Assumptions on the production build (partial)
- [x] T032 Make two concurrent local runs safe: give each run its own port and build output directory, so they don't race on the fixed port or overwrite each other's `dist/` per spec Edge Cases on two runs at the same time (partial)
- [x] T033 Align the scenario values in `quickstart.md` (scenarios 2, 3, 7 and 9) with what the suite now checks: habits 5→4, dots per row 7→10, and the overflow fix reduced at days 31 instead of 365. Then complete open T026 per quickstart.md (partial)
- [x] T034 Assert `input.validity.badInput` is `true` in the non-numeric invalid-habit test in `tests/e2e/preview-and-input.spec.ts`, so the test checks the browser state it claims to check per FR-005 and T014 (partial)
- [x] T035 Make a failed build or server start report that the page could not be reached, not only Playwright's generic webServer message, per spec Edge Cases on a local build that cannot be built or served (partial)

## Phase 7: Convergence

- [x] T036 Check that the overflowing columns layout creates no side-by-side columns (US3 AC2). Either add an assertion to the columns overflow test in `tests/e2e/overflow.spec.ts` that the page-1 drawing has one column of habits (for example from the PDF text positions), or record in the spec that this cannot be checked from the page. Currently the test has only a comment saying it is not asserted (partial)
- [x] T037 Align US1 AC2 with what the test checks. `spec.md` says "visible habit count and day count", but `tests/e2e/download.spec.ts` checks the `data-habits` and `data-days` attributes of the layout last drawn. Either change the spec to "drawn" or add a check that the grid is visibly shown per US1 AC2 (partial)
- [x] T038 Add a task documenting the per-run build cleanup in `tests/e2e/support/global-teardown.ts`, which is in the code but not in `tasks.md`, or remove it if it is not wanted (unrequested)

## Phase 8: Convergence

- [x] T039 Update `specs/002-e2e-tests/research.md` §2 to match the implemented server setup: a free port per run (not a fixed port), a fresh build into `dist/e2e-<runId>` through `tests/e2e/support/build-page.mjs`, and no server reuse. Also replace the open check about `pnpm build` on CI with the result of the first CI run (passed on `ubuntu-latest`) per research.md §2 and the implemented `playwright.config.ts` (partial)

## Phase 9: Convergence

- [x] T040 Update the open-check wording in `specs/002-e2e-tests/research.md` to the results already observed: §1 (the Chromium "not yet verified in a CI run" note; the first CI run passed the Chrome channel), §4 (the `/MediaBox` check passes in the download test), and §5 (the CI Chrome channel verified on `ubuntu-latest`, run 37555321864). Remove the "verify on the first CI run" wording and the conditional fallback, per research.md §1, §4 and §5 (partial)

## Phase 10: Convergence

- [x] T041 Replace "Measure it on the first run" in `specs/002-e2e-tests/research.md` §6 with the measured time of the e2e step from the first CI run (run 37555321864), and state it against the 3-minute target (SC-001). Measure the step from the run's job log, not the whole job, per research.md §6 (partial)
