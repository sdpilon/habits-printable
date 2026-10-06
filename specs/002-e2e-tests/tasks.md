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

- [ ] T001 [P] Add `"e2e": "playwright test"` script to `package.json` (the `@playwright/test` devDependency is already present)
- [ ] T002 [P] Add `test-results/` and `playwright-report/` to `.gitignore`
- [ ] T003 Create `playwright.config.ts` at the repository root: `testDir: 'tests/e2e'`; one project, desktop Chromium, headless; `webServer` running `pnpm build && pnpm exec vite preview --port <fixed> --strictPort` with `reuseExistingServer: !process.env.CI`; `screenshot: 'only-on-failure'`, `trace: 'retain-on-failure'`; `outputDir: 'test-results'`; HTML reporter writing to `playwright-report/`; browser `channel: 'chrome'` when `CI` is set, otherwise the Chromium already cached in `~/Library/Caches/ms-playwright` (see research.md §1)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The page signals and shared helpers every scenario uses. MUST complete before any user story phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Wrap the preview in `web/index.html` with `<section id="preview-section" aria-busy="false">` around the existing `<div id="preview">` (currently at line 41). Do not change any other markup (FR-011, contracts/page-test-interface.md)
- [ ] T005 Set `aria-busy` in `update()` in `web/src/main.ts` (lines 44–77): set `"true"` when a valid option change starts rendering, and `"false"` once `renderQueue` has drained. Track a pending-update counter so a stale update cannot clear `aria-busy` while a newer render is still queued. Invalid input must leave the section at `"false"`. No change to layout, preview, or download logic
- [ ] T006 Set `data-habits` and `data-days` on `#preview-section` in `update()` in `web/src/main.ts` when a valid layout renders, using the habit and day values that were rendered. Remove both attributes when options are invalid or the layout does not fit, so they never report a stale count (contracts/page-test-interface.md, Principle IV). Depends on T005 (same function)
- [ ] T007 [P] Create `tests/e2e/support/pdf.ts`: import `countPdfPages` from `web/src/typst-compile.ts`; add `readFirstPageSize(path)` that reads the first `/MediaBox` with a regular expression and returns width and height in points; add `expectOnePageUsLetter(path)` that asserts exactly one page and 612 × 792 points
- [ ] T008 [P] Create `tests/e2e/support/page.ts` with: `openPage(page)` (goes to `/`); `resetDefaults(page)` (sets every control to the quickstart.md defaults: layout `rows`, habits 5, days 31, perRow 7, dot diameter 4, dot spacing 1.5, paper `letter`); `setOption(page, name, value)` (fills the input or select by `name` inside `#options`); `waitForSettled(page)` (waits up to 5 seconds for `#preview-section[aria-busy="false"]`); `readMessages(page)`; `isDownloadEnabled(page)`; `isWarningVisible(page)`; `readPreviewCounts(page)` (returns `data-habits` and `data-days` from `#preview-section`). Each helper is called inside a named `test.step` so failures report the step

**Checkpoint**: Foundation ready. Shared helpers and the page signals exist, so user story scenarios can be written.

---

## Phase 3: User Story 1 - Confirm the download path works end to end (Priority: P1) 🎯 MVP

**Goal**: One command opens the real page, waits for the preview, downloads the PDF, and checks it is a one-page US Letter file. The preview shows the chosen habit and day counts.

**Independent Test**: `pnpm e2e` with default options passes the "defaults download" scenario and reports the saved file as a one-page US Letter PDF. Breaking the download so it produces no file makes the run fail.

- [ ] T009 [US1] Create `tests/e2e/download.spec.ts` with the "defaults download" scenario: `openPage`, `resetDefaults`, `waitForSettled`, click `#download`, and wait for the `download` event inside a `test.step('download')`. Save the file with `download.path()` and assert `suggestedFilename()` is `habit-grid.pdf`
- [ ] T010 [US1] In `tests/e2e/download.spec.ts`, run `expectOnePageUsLetter` on the file saved by T009 in a `test.step('check PDF')`, so it checks the file from this run only (FR-003)
- [ ] T011 [US1] In `tests/e2e/download.spec.ts`, add a missing-download check: if the `download` event does not fire within the timeout, the scenario fails at the `download` step with a clear message. It must never pass without a file (FR-008)
- [ ] T012 [US1] In `tests/e2e/download.spec.ts`, add the non-default scenario (US1 acceptance 2): set habits, days, and layout to non-default values (e.g. habits 6, days 14, layout `columns`), `waitForSettled`, then assert `readPreviewCounts` returns `data-habits="6"` and `data-days="14"`, and that the layout select reads `columns`. Depends on T006 and T008

**Checkpoint**: User Story 1 is independently runnable. `pnpm e2e` with the download scenario is the MVP.

---

## Phase 4: User Story 2 - Catch preview and option regressions (Priority: P2)

**Goal**: Each option change updates the preview without an apply action, and invalid values show a message and block download.

**Independent Test**: With the invalid-habit-count message broken on purpose, the run fails on the invalid-value scenario and names the input that was tested.

- [ ] T013 [US2] Create `tests/e2e/preview-and-input.spec.ts` with the live-preview scenarios: habits 5 → 6; layout → `columns`; dot diameter 4 → 3. After each change, `waitForSettled` must pass and download must stay enabled, with no apply control pressed and no page reload (FR-004)
- [ ] T014 [US2] In `tests/e2e/preview-and-input.spec.ts`, add one test per invalid habit-count kind (empty, `0`, `-1`, `abc`, `21`). Each asserts a message in `#messages li`, `input[name="habits"][aria-invalid="true"]`, and `#download` disabled. Note: a `type=number` input may report `abc` as an empty value in Chromium, so assert the message and flag, not the typed text. Separate tests keep every kind running even if one fails (FR-013)
- [ ] T015 [US2] In `tests/e2e/preview-and-input.spec.ts`, add the recovery scenario: after an invalid value, set habits to `5`. The message list must clear, `aria-invalid` must clear, and download must be enabled again

**Checkpoint**: User Stories 1 and 2 both run independently.

---

## Phase 5: User Story 3 - Catch overflow blocking across layouts (Priority: P3)

**Goal**: Overflowing combinations show the warning and block download in each of the three layouts. Reducing the count clears it.

**Independent Test**: One overflowing combination per layout each show `#warning` and no enabled download. Removing the warning for one layout fails only that layout's scenario.

- [ ] T016 [US3] Create `tests/e2e/overflow.spec.ts` with the rows overflow scenario: habits 20, days 365, perRow 1. Assert `#warning` is visible and `#download` is disabled
- [ ] T017 [US3] In `tests/e2e/overflow.spec.ts`, add the columns overflow scenario: layout `columns`, days 365, with the same assertions as T016. Assert `#preview-section` has no `data-habits` attribute, so no layout is shown for the overflowing combination
- [ ] T018 [US3] In `tests/e2e/overflow.spec.ts`, add the calendars overflow scenario: layout `calendars`, habits 20, days 365, perRow 1, with the same assertions as T016
- [ ] T019 [US3] In `tests/e2e/overflow.spec.ts`, add the fix-an-overflow scenario: start from the T016 setup, change habits 20 → 5. Assert the warning is hidden and download is enabled

**Checkpoint**: All three user stories run independently. The suite covers the 10 scenarios in quickstart.md.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: CI wiring, verification against the spec, and docs

- [ ] T020 [P] Add an e2e step to the `check` job in `.github/workflows/ci.yml` after the margin check, running `pnpm e2e` (FR-009)
- [ ] T021 [P] Add a step in `.github/workflows/ci.yml` that uploads `test-results/` and `playwright-report/` with `if: failure()` and `retention-days: 7` (FR-014)
- [ ] T022 [P] Verify the `/MediaBox` regular expression against Typst output for the default layout, as research.md §4 requires. Adjust `tests/e2e/support/pdf.ts` if the first page's box is written differently
- [ ] T023 Run `pnpm e2e` locally from a clean state and confirm all 10 quickstart.md scenarios pass, and that a single run finishes within 3 minutes (SC-001)
- [ ] T024 Confirm on the first CI run that `pnpm build` and the Chrome channel work on `ubuntu-latest` (research.md §2 and §5). If the runner has no Chrome, stop and raise it before adding a browser download
- [ ] T025 Run quickstart.md validation: follow the written setup steps on a clean checkout and confirm no step is missing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T001 and T002 can run in parallel. T003 can start alongside them.
- **Foundational (Phase 2)**: Depends on Setup. T005 depends on T004. T006 depends on T005. T007 and T008 can run in parallel with T004–T006.
- **User Stories (Phases 3–5)**: All depend on Foundational. US1 is the MVP. US2 and US3 can proceed in parallel after Foundational, since they use separate spec files.
- **Polish (Phase N)**: Depends on the user stories being complete. T024 needs a CI run, so it comes last.

### User Story Dependencies

- **US1 (P1)**: Needs T003, T007, T008, and T005 (settled signal). T012 also needs T006 (count attributes). No dependency on US2 or US3.
- **US2 (P2)**: Needs T004, T005, and T008. No dependency on US1 or US3.
- **US3 (P3)**: Needs T004, T005, and T008. T017 also needs T006. No dependency on US1 or US2.

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
Task: "Wrap the preview in web/index.html with <section id=\"preview-section\" aria-busy=\"false\">"
Task: "Create tests/e2e/support/pdf.ts with countPdfPages reuse and US Letter MediaBox check"
Task: "Create tests/e2e/support/page.ts with openPage, resetDefaults, setOption, waitForSettled, readPreviewCounts"
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
5. Polish: CI wiring, then the first CI run (T024)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps each task to a user story for traceability
- The suite only observes the page. It must not change layout, preview, or download behaviour (FR-011). The only product-code additions are `aria-busy`, `data-habits`, and `data-days`
- Stop at any checkpoint to validate a story independently
- Avoid: adding product code beyond those attributes, or a second PDF renderer (constitution Principles I and II)
