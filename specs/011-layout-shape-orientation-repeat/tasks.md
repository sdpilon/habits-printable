---

description: "Task list for layout controls: Shape, Direction, Repeat"
---

# Tasks: Layout controls: Shape, Direction, Repeat

**Input**: Design documents from `/specs/011-layout-shape-orientation-repeat/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not explicitly requested as new TDD scaffolding in spec.md. This project's existing unit
tests, margin check, and perf check are maintained/extended as part of each phase's tasks, since the
constitution (Principles II/III) requires them to pass for every reachable combination.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3) to enable
independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact

## Path Conventions

Single existing project (plan.md Structure Decision): `web/`, `typst/`, `tests/` at repository root.
No new directories.

---

## Phase 1: Setup

**Purpose**: Confirm the environment; no new dependencies are introduced by this feature.

- [ ] T001 Confirm environment ready: `pnpm install` on branch `011-layout-shape-orientation-repeat`. No new dependencies required (plan.md Primary Dependencies list is unchanged).

**Checkpoint**: Environment ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Replace the `layout` option with `shape`/`direction`/`repeat` end-to-end — types,
markup, wiring, the Typst rendering it drives, and the existing test fixtures that still reference
the removed field — so every user story can build on a working default combination.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Replace `layout` with `shape`/`direction`/`repeat` in `web/src/options.ts`: add `type Shape = 'line' | 'calendar'`, `type Direction = 'rows' | 'columns'`, `type Repeat = 'stacked' | 'side-by-side'`; update `TrackerOptions` (remove `layout`, add `shape`, `direction`, `repeat`); update `DEFAULTS` to `shape: 'line'`, `direction: 'rows'`, `repeat: 'stacked'` (data-model.md TrackerOptions table); replace the `LAYOUTS` export with `SHAPES`, `DIRECTIONS`, `REPEATS` readonly arrays (mirroring the existing `PAPERS` pattern); update the `Field` union; update `validate()` to validate the three new enum fields instead of `layout` — a `direction` value MUST still validate successfully even when `shape === 'calendar'` (FR-003: direction has no effect, not an error, in that case); update `toTypstInputs()` to serialize `shape`, `direction`, `repeat` instead of `layout`.
- [ ] T003 [P] `typst/tracker.typ`: replace `#let layout-kind = inp("layout", "rows")` with `shape`, `direction`, `repeat` `sys.inputs` reads, and derive `#let effective-direction = if shape == "calendar" { "rows" } else { direction }` (data-model.md HabitBlock table).
- [ ] T004 `typst/tracker.typ`: delete the duplicate `calendar-block` function; keep one shared per-habit block builder (today's `row-habit` body) used whenever `effective-direction == "rows"` (research.md: "Collapse row-habit and calendar-block into one shared block builder"). Depends on T003.
- [ ] T005 `typst/tracker.typ`: implement one shared tiling function taking a list of blocks (each with a known width) and `repeat`: `"stacked"` → plain `ttb` stack (today's rows/columns behavior); `"side-by-side"` → today's calendars `ltr`-then-wrap grid math, generalized to any block kind (research.md: "One shared tiling function, parameterized by repeat"). Depends on T003.
- [ ] T006 `typst/tracker.typ`: generalize the side-by-side page-row packing to use each column-group's own width (`num-w + n * pitch` for that group's habit-column count `n`) rather than assuming a uniform block width, so a narrower trailing group (when `habits` isn't a multiple of `perRow`) packs correctly (research.md: "Column-group tiling reuses the same per-page-row math, with group width in place of block width"). Depends on T005.
- [ ] T007 `typst/tracker.typ`: update the `fits-w` check and the final layout-dispatch `#if`/`#else` block to select the block builder from `effective-direction` (T004) and the arrangement from `repeat` (T005/T006), replacing the old three-way `layout-kind` branch — same width formulas as today (data-model.md Fit rules). Depends on T004, T006.
- [ ] T008 [P] `web/index.html`: replace the single `<select name="layout">` with three controls — "Shape" (`line`/`calendar`), "Direction" (`rows`/`columns`), "Repeat" (`stacked`/`side-by-side`) — per FR-001, FR-002, FR-004. (Direction's visibility toggling when Shape=Calendar is US3's concern, not this task.)
- [ ] T009 `web/src/main.ts`: replace the `layout: value('layout')` read with reads of `shape`, `direction`, `repeat`, feeding the same immediate-recompile path (constitution Principle IV). Depends on T002, T008.
- [ ] T010 [P] `tests/e2e/support/page.ts`: replace `layout` in `DEFAULTS` with `shape: 'line'`, `direction: 'rows'`, `repeat: 'stacked'`; add `shape`, `direction`, `repeat` to the `SELECTS` set (all three are `<select>` elements, same as today's `layout`).
- [ ] T011 [P] `tests/e2e/overflow.spec.ts`: update the two `setOption(page, 'layout', ...)` calls — `'columns'` → `setOption(page, 'direction', 'columns')`, `'calendars'` → `setOption(page, 'shape', 'calendar')` — preserving each test's existing intent (width-overflow trigger via `fits-w`, unaffected by this feature). Depends on T010.
- [ ] T012 [P] `tests/e2e/preview-and-input.spec.ts`: update the `{ option: 'layout', value: 'columns' }` case to `{ option: 'direction', value: 'columns' }`. Depends on T010.
- [ ] T013 [P] `tests/e2e/download.spec.ts`: update `setOption(page, 'layout', 'columns')` to `setOption(page, 'direction', 'columns')` and the `select[name="layout"]` assertion to `select[name="direction"]`. Depends on T010.
- [ ] T014 [P] `tests/comparison/cases.json`: migrate all 12 existing entries off the removed `layout` field to `shape`/`direction`/`repeat`, preserving each case's *original* geometry (not the new Columns default) — `rows-*` cases → `shape: "line", direction: "rows", repeat: "stacked"`; `columns-*` cases → `shape: "line", direction: "columns", repeat: "stacked"` (explicit Stacked override, matching pre-change behavior — FR-011); `calendars-*` cases → `shape: "calendar", repeat: "side-by-side"` (`direction` value is ignored per FR-003; include `"rows"` for schema completeness). Without this task, `margins.ts` casts `cases.json` straight to `TrackerOptions` with no validation, so the 6 `columns-*`/`calendars-*` cases would silently compile via the rows/line-block default instead of their intended configuration — a passing margin check that tests the wrong thing. Depends on T002, T007.

**Checkpoint**: The new three-control model renders end-to-end for the default combination
(Shape=Line, Direction=Rows, Repeat=Stacked), no remaining e2e test references the removed
`layout` field, and `tests/comparison/cases.json`'s existing cases use the new field names.

---

## Phase 3: User Story 1 - Understand what each layout control actually does (Priority: P1) 🎯 MVP

**Goal**: Each of today's three legacy presets is reachable through one specific
Shape/Direction/Repeat combination, with the Rows and Calendar combinations producing
pixel-identical output to today, and Columns reachable with identical output via an explicit
override (its new default changes — see User Story 2).

**Independent Test**: quickstart.md scenarios 1 ("Defaults reproduce today's rows preset"), 2
("Columns reproduces today's columns preset — with Repeat overridden"), and 4 ("Calendar reproduces
today's calendars preset").

### Implementation for User Story 1

- [ ] T015 [US1] In `web/src/main.ts` (or `web/src/options.ts`, wherever form-state updates are applied): when `direction` changes, set `repeat` to that direction's default (`rows` → `stacked`, `columns` → `side-by-side`); when `shape` changes to `calendar`, set `repeat` to `side-by-side` (data-model.md Repeat defaults table, FR-005). Re-defaults on every change, not only on first load — consistent with Direction resetting to `rows` when Shape leaves `calendar` (User Story 3).
- [ ] T016 [P] [US1] `tests/unit/options.test.ts`: replace `layout`-based validation assertions with `shape`/`direction`/`repeat` assertions, including the FR-003 case (a `direction` value validates successfully even when `shape === 'calendar'`).
- [ ] T017 [US1] `tests/comparison/cases.json`: add/confirm a case for Shape=Line, Direction=Rows, Repeat=Stacked and a case for Shape=Calendar, Repeat=Side-by-side, each asserting pixel-identical output to the pre-change `rows`/`calendars` cases (quickstart.md scenarios 1 and 4; SC-003).
- [ ] T018 [US1] `tests/comparison/cases.json`: add a case for Shape=Line, Direction=Columns, Repeat=Stacked (explicit override) asserting pixel-identical output to the pre-change `columns` case (quickstart.md scenario 2; FR-011).
- [ ] T019 [US1] Run `pnpm margins` and `pnpm test`; confirm quickstart.md scenarios 1, 2, and 4 pass.

**Checkpoint**: SC-001 holds, and the Rows/Calendar/Columns(-via-explicit-override) halves of SC-003
hold.

---

## Phase 4: User Story 2 - Tile habit blocks side-by-side regardless of shape (Priority: P2)

**Goal**: Columns' new default (side-by-side) works correctly, including when a trailing
column-group is narrower than the rest; Rows and Calendar can also use their non-default Repeat
value.

**Independent Test**: quickstart.md scenarios 3 ("Columns' new default tiles side-by-side"), 5
("Rows can now tile side-by-side too"), and 6 ("Calendar can now stack instead of tile").

### Implementation for User Story 2

- [ ] T020 [US2] `tests/unit/fit-model.ts`: rename the existing `o.layout === 'rows'` / `o.layout === 'columns'` branches to `o.direction === 'rows'` / `o.direction === 'columns'` (this is a compile error otherwise, once T002 removes `layout` from `TrackerOptions`), and add width/height formulas for `repeat: side-by-side` with `direction: rows` (uniform block width, mirrors today's calendars math) and with `direction: columns` (per-group width packing, research.md Decision on group width) — per data-model.md Fit rules.
- [ ] T021 [P] [US2] `tests/unit/fit.test.ts`: add cases asserting the new fit-model formulas (T020) agree with Typst's actual page count for Rows+Side-by-side and Columns+Side-by-side, including a case where `habits` isn't a multiple of `perRow` (non-uniform trailing group).
- [ ] T022 [US2] `tests/comparison/cases.json`: add margin-check cases for Columns+Side-by-side (multiple groups tiling, quickstart.md scenario 3), Rows+Side-by-side (short `perRow`, quickstart.md scenario 5), and Calendar+Stacked (quickstart.md scenario 6).
- [ ] T023 [US2] Run `pnpm margins`, `pnpm test`, and `pnpm perf`; confirm quickstart.md scenarios 3, 5, 6 pass with no regression in the Typst compile-time budget (plan.md Performance Goals).

**Checkpoint**: SC-002 holds — side-by-side tiling is correct for every Shape/Direction combination.

---

## Phase 5: User Story 3 - Configure a calendar shape without an irrelevant control (Priority: P3)

**Goal**: The Direction control is hidden (and has no effect) when Shape=Calendar, and reappears
defaulted to Rows when switching back to Line.

**Independent Test**: quickstart.md scenarios 7 ("Switching Shape never leaves a stale control") and
8 ("Narrow-page side-by-side fallback").

### Implementation for User Story 3

- [ ] T024 [US3] `web/src/main.ts`: hide/disable the Direction control when `shape === 'calendar'`; reset `direction` to `'rows'` when `shape` switches from `calendar` back to `line` (FR-003; quickstart.md scenario 7).
- [ ] T025 [P] [US3] `tests/unit/options.test.ts`: assert `validate()` ignores a stale `direction` value with no error when `shape === 'calendar'` (FR-003) — skip if already covered by T016.
- [ ] T026 [US3] Manually run quickstart.md scenarios 7 (Shape toggle resets Direction, no stale control left visible or in effect) and 8 (Repeat=Side-by-side with `habits: 1` degrades gracefully, no error).

**Checkpoint**: All three user stories are independently functional; SC-004 holds.

---

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Run `pnpm lint`, `pnpm typecheck`, and `pnpm format:check` across all changed files.
- [ ] T028 Run `pnpm e2e` (full Playwright suite) to confirm no regression beyond the renamed-field updates from T011–T013.
- [ ] T029 Run the full quickstart.md validation guide (all 8 scenarios) end-to-end as final manual sign-off before PR.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories — the Typst refactor (T003–T007), control replacement (T002, T008–T013), and the existing-fixture migration (T014) are a single interdependent unit; none of the three stories has a working, correctly-verified default combination without it.
- **User Stories (Phase 3–5)**: All depend on Foundational completion. US1, US2, and US3 touch different concerns (default-selection logic, tiling-case coverage, control-visibility logic) and can proceed in parallel once Foundational is done, though US1 should land first since it's the MVP and the other two build confidence on top of a working baseline.
- **Polish (Final Phase)**: Depends on all three user stories being complete.

### Within Each User Story

- US1: T015 (defaulting logic) has no file dependency on T016–T018 (test/case updates); T019 (run checks) depends on all of T015–T018.
- US2: T020 (fit-model formulas) blocks T021 (fit tests exercising them); T022 (margin cases) is independent of T020/T021; T023 (run checks) depends on T020–T022.
- US3: T024 (control logic) has no file dependency on T025 (validation test); T026 (manual run) depends on T024.

### Parallel Opportunities

- Within Foundational: T003 can start alongside T002 (different files); T008 can start alongside T002/T003; T010 can start once T008 lands (same control names), and T011–T013 can all run in parallel once T010 lands (three different spec files); T014 can start once T002 and T007 land (independent of T008–T013).
- Within US1: T016, T017, and T018 can run in parallel (different files) once T015 lands.
- Within US2: T020 and T022 can start in parallel; T021 depends on T020.
- Within US3: T025 can run in parallel with T024 (different files).
- T027 (lint/typecheck/format) can run in parallel with T028/T029.

---

## Parallel Example: Foundational phase

```bash
# Once T008 (index.html controls) lands, these four e2e/support updates can run together:
Task: "Update tests/e2e/support/page.ts DEFAULTS/SELECTS for shape/direction/repeat"
Task: "Update tests/e2e/overflow.spec.ts layout references"
Task: "Update tests/e2e/preview-and-input.spec.ts layout reference"
Task: "Update tests/e2e/download.spec.ts layout references"
```

## Parallel Example: User Story 1

```bash
# Once T015 (defaulting logic) lands, these three can run together:
Task: "Update tests/unit/options.test.ts for shape/direction/repeat validation"
Task: "Add rows/calendar margin-check cases to tests/comparison/cases.json"
Task: "Add columns-explicit-override margin-check case to tests/comparison/cases.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: run quickstart.md scenarios 1, 2, 4 and confirm all three legacy presets
   are reachable with correct output.
5. At this point the new controls are live and legible (the core problem from spec.md User Story 1)
   even before the new side-by-side capability (US2) or control-hygiene polish (US3) land.

### Incremental Delivery

1. Setup + Foundational → new controls render correctly at defaults, with test fixtures already
   migrated off the removed `layout` field.
2. Add User Story 1 → legacy-preset parity confirmed → this is the MVP.
3. Add User Story 2 → side-by-side tiling available for every combination (the concrete capability
   gap from the original request).
4. Add User Story 3 → no stale controls when switching Shape (final polish on the control surface).
5. Final Phase → lint/typecheck/format, full e2e suite, full quickstart.md sign-off.

## Notes

- [P] tasks touch different files with no completed-task dependency between them.
- [Story] labels map tasks to spec.md's user stories for traceability.
- Commit after each task or logical group, per this project's existing git convention (speckit hook
  auto-commits are already wired for `before_implement/after_implement`).
- Run `pnpm margins` after any change to `typst/tracker.typ` block/tiling logic — a failing margin
  check is a constitution defect (Principle III), not a tolerance to accept.
