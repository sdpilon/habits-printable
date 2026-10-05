# Tasks: Printable Habit Grid

**Input**: Design documents from `specs/001-printable-habit-grid/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: The spec does not request TDD. Included: option validation unit tests (plan.md lists Vitest) and the preview-vs-PDF comparison, which constitution Principle II requires for every layout change.

**Organization**: Tasks are grouped by user story so each story can be implemented and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3 map to the user stories in spec.md
- Paths are relative to the repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization per plan.md (pnpm, Vite, TypeScript strict, Vitest)

- [ ] T001 Create `package.json` at the repo root with scripts `dev`, `build`, `test`, and `compare` (commands in quickstart.md)
- [ ] T002 [P] Create `tsconfig.json` at the repo root with `"strict": true`
- [ ] T003 [P] Create `vite.config.ts` at the repo root with `root: "web"`
- [ ] T004 [P] Create `vitest.config.ts` at the repo root
- [ ] T005 Install packages with pnpm: `@myriad-dreamin/typst.ts`, `vite`, `typescript`, `vitest`. **Requires your approval before running** (request-install).
- [ ] T006 [P] Create `web/index.html` with the options form, preview pane, and download button
- [ ] T007 [P] Create `web/src/style.css` with page-level styles for the form and preview

**Checkpoint**: `pnpm dev` serves an empty page with the form

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared pieces every story uses: the Typst template skeleton, the compile engine, option validation, and the comparison harness. **No user story work starts until this phase is complete.**

- [ ] T008 Create `typst/tracker.typ` with an input read for every field in `contracts/tracker-options.schema.json`, and a page setup that uses A4 by default and Letter when `paper` is `letter` (FR-011, research.md §3)
- [ ] T009 Create `web/src/typst-engine.ts` that loads typst.ts, compiles `typst/tracker.typ` with the options as inputs, and returns both SVG (preview) and PDF (download) from the same compile (research.md §1)
- [ ] T010 [P] Create `web/src/options.ts` with the `TrackerOptions` type, the defaults, and validation using these constraints verbatim from data-model.md: `habits`: integer, `1 ≤ habits ≤ 20`; `days`: integer, `1 ≤ days ≤ 365`; `perRow`: integer, `1 ≤ perRow ≤ 31`; `dotDiameterMm`: number, `2 ≤ value ≤ 5`; `dotSpacingMm`: number, `0.5 ≤ value ≤ 5`; `labelWidthMm`: fixed at `40`; `paper`: `a4` or `letter`, default `a4`; `layout`: `rows`, `columns`, or `calendars`, default `rows`. Defaults: habits 5, days 31, perRow 7, dotDiameterMm 4, dotSpacingMm 1.5
- [ ] T011 Add overflow detection in `web/src/typst-engine.ts`: a compile whose output has more than one page sets `overflowing = true` (FR-013, research.md §2)
- [ ] T012 Create `web/src/main.ts` that reads the form, validates with `options.ts`, compiles through `typst-engine.ts`, and displays the SVG preview (FR-008, FR-012)
- [ ] T013 [P] Create `tests/comparison/compare.ts` that renders the SVG preview and the PDF at 300 dpi, rasterizes both, and fails on any pixel difference (Principle II, research.md §6)
- [ ] T014 [P] Create `tests/comparison/cases.json` with the default case and boundary values (habits 1 and 20, days 1 and 365, perRow 1 and 31, dot diameter 2 and 5)
- [ ] T015 [P] Create `tests/unit/options.test.ts` covering each validation rule and default in T010

**Checkpoint**: Foundation ready. The page compiles a placeholder layout and the comparison harness runs.

---

## Phase 3: User Story 1 - Generate and download a printable habit grid (Priority: P1) 🎯 MVP

**Goal**: The default one-row-per-habit layout, downloaded as a PDF that matches the preview.

**Independent Test**: With the defaults (5 habits, 31 days, 7 per row), download the PDF and confirm it is one A4 page with 5 habit rows, each with a label area and 31 dots in order (quickstart.md scenario 1).

- [ ] T016 [US1] In `typst/tracker.typ`, draw layout `rows`: one habit per row; dots are empty circles (stroke only) that wrap onto more lines within the habit when `perRow` is reached, in order (FR-003, FR-004, FR-006)
- [ ] T017 [US1] In `typst/tracker.typ`, draw a blank 40 mm label area to the left of each habit row (FR-005)
- [ ] T018 [US1] In `typst/tracker.typ`, print a small day number on days 5, 10, 15, and so on in each habit row, as printed text outside the dots (FR-015)
- [ ] T019 [US1] In `web/src/main.ts`, wire the download button to the PDF output from `typst-engine.ts`; it stays disabled while options are invalid or `overflowing` is true (FR-009, FR-013, SC-005)
- [ ] T020 [US1] Run `pnpm compare` on the default case in `tests/comparison/cases.json` and record the result (Principle II)

**Checkpoint**: User Story 1 works on its own. This is the MVP.

---

## Phase 4: User Story 2 - See a live preview while choosing options (Priority: P2)

**Goal**: The preview redraws on every option change, with no button, and never shows a stale or misleading layout.

**Independent Test**: Change habits and days one at a time and confirm the preview updates without a reload (quickstart.md scenario 2). Type an empty value and confirm the last valid preview stays with a message (scenario 3).

- [ ] T021 [US2] In `web/src/main.ts`, add input listeners on every option field so each change recompiles the preview without an apply action (FR-008)
- [ ] T022 [US2] In `web/src/main.ts`, show a clear placeholder for empty or intermediate values and keep the last valid preview on screen until a valid value arrives (FR-012, User Story 2 scenario 3)
- [ ] T023 [US2] In `web/src/main.ts`, tag each compile request with an increasing id and display only the newest result, so a slow earlier compile can't overwrite a newer preview (Edge Cases: stale preview)
- [ ] T024 [US2] In `web/src/main.ts`, show the overflow warning on screen when `overflowing` is true (FR-013, SC-006)
- [ ] T025 [US2] In `web/src/typst-engine.ts`, add a timing log for each compile so SC-002 (preview updates within 0.2 s) can be checked on the worst case (20 habits, 365 days)

**Checkpoint**: User Stories 1 and 2 both work on their own.

---

## Phase 5: User Story 3 - Customize the grid layout (Priority: P3)

**Goal**: The other two layouts, the per-row count, dot size and spacing, and paper size, all reflected in both preview and PDF.

**Independent Test**: Change a layout option and confirm both the preview and the downloaded PDF change to match (quickstart.md scenarios 5 and 6).

- [ ] T026 [US3] In `typst/tracker.typ`, draw layout `columns`: habits as columns, days as rows, `perRow` as habits per row group, labels above each column; too-tall grids trigger overflow instead of wrapping (FR-003, FR-006, FR-013)
- [ ] T027 [US3] In `typst/tracker.typ`, draw layout `calendars`: one mini calendar per habit, `perRow` dots per calendar row, calendars in a grid that fills the page width and wraps (FR-003, FR-006)
- [ ] T028 [US3] In `typst/tracker.typ`, apply `dotDiameterMm` and `dotSpacingMm` to all three layouts; dots must stay inside the page margins (FR-007, FR-011)
- [ ] T029 [US3] In `typst/tracker.typ`, print the every-fifth-day numbers in layouts `columns` and `calendars` too (FR-015)
- [ ] T030 [US3] In `web/index.html` and `web/src/main.ts`, add controls for layout, perRow, dot size, dot spacing, and paper size, wired into `TrackerOptions` (FR-001, FR-002, FR-006, FR-007, FR-011)
- [ ] T031 [US3] Add cases for layouts `columns` and `calendars`, including overflow cases, to `tests/comparison/cases.json`
- [ ] T032 [US3] Run `pnpm compare` on every case in `tests/comparison/cases.json` and record the results in the review (Principle II)

**Checkpoint**: All user stories work on their own.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final checks across all stories

- [ ] T033 Run the scenarios in `specs/001-printable-habit-grid/quickstart.md` (1 to 7) and record the outcome of each
- [ ] T034 Print the default PDF at 100% scale on home paper and confirm no dots or labels are clipped (SC-004)
- [ ] T035 [P] Update `specs/001-printable-habit-grid/spec.md` User Story 1 scenarios to say they assume layout `rows` (the default)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories
- **User Stories (Phases 3 to 5)**: Depend on Foundational. US1 is the MVP. US2 and US3 build on the same files, so run them in priority order.
- **Polish (Phase 6)**: Depends on all user stories

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2. No dependency on other stories.
- **US2 (P2)**: Starts after Phase 2. Uses the preview wiring from T012. Independent of US1's drawing work.
- **US3 (P3)**: Starts after US1, because it extends the `rows` drawing in `typst/tracker.typ`.

### Within Each User Story

- Template drawing before UI wiring
- Comparison run last, before the checkpoint

### Parallel Opportunities

- Setup: T002, T003, T004, T006, T007 can run in parallel
- Foundational: T010, T013, T014, T015 can run in parallel
- US2 tasks all touch `web/src/main.ts`, so they run one at a time
- T035 can run alongside any Phase 6 task

---

## Parallel Example: Foundational

```text
Task: "Create web/src/options.ts ..."            (T010)
Task: "Create tests/comparison/compare.ts ..."   (T013)
Task: "Create tests/comparison/cases.json ..."   (T014)
Task: "Create tests/unit/options.test.ts ..."    (T015)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (blocks everything)
3. Phase 3: User Story 1
4. **Stop and validate**: run quickstart.md scenario 1 and `pnpm compare` on the default case

### Incremental Delivery

1. Setup + Foundational: foundation ready
2. Add US1: MVP, download works
3. Add US2: live preview
4. Add US3: layouts and customization
5. Polish: quickstart, print test, spec wording

---

## Notes

- [P] tasks touch different files and have no dependencies
- Layout changes must pass `pnpm compare` before the story is complete (Principle II)
- Commit after each phase checkpoint
