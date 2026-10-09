---
description: "Task list template for feature implementation"
---

# Tasks: Improve PDF Output Design

**Input**: Design documents from `/specs/007-improve-pdf-design/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Not requested as a dedicated TDD pass. The existing automated suites (`tests/unit`,
`tests/e2e`, `tests/comparison/margins.ts`, `tests/perf`) are extended/updated in place rather than
built as new test infrastructure, and running them green is the acceptance gate folded into each
story's tasks below.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing
of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single existing web app, no new projects. Every visual change lives in `typst/tracker.typ`
(Principle I); the page-side change is scoped to `web/index.html`, `web/src/options.ts`,
`web/src/main.ts`. Test changes extend `tests/unit/`, `tests/comparison/`, `tests/e2e/`.

---

## Phase 1: Setup

**Purpose**: Capture a visual "before" baseline so the four design changes can be compared
against today's actual output, the same way 006 captured baseline measurements before its change.

- [x] T001 Compile the default options (`layout=rows`, `habits=5`, `days=31`, `perRow=7`,
      `dotDiameterMm=4`, `dotSpacingMm=1.5`, `paper=letter`) for each of the three layouts
      (`layout=rows`, `layout=columns`, `layout=calendars`) using the current, unmodified
      `typst/tracker.typ` (`typst compile --input layout=... ... typst/tracker.typ`), rasterize each
      to PNG, and save them as `specs/007-improve-pdf-design/baseline-renders/{rows,columns,calendars}.png`.

**Checkpoint**: Baseline renders captured — ready for implementation work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Not applicable.** Unlike 006 (where every story restyled one shared CSS rule), none of this
feature's four stories share a prerequisite that blocks the others: US1 (title) touches a new,
story-scoped `title` input/constant; US2 (label placement) touches only `row-habit`; US3
(day-number spacing) touches only `dot-cell`/`line-h`; US4 (polish) is a cross-layout typography
pass done last. All four do edit the single `typst/tracker.typ` file, but that is a _file-ordering_
concern (see Parallel Opportunities below), not a blocking-prerequisite one — there is nothing to
build in a separate Foundational phase.

---

## Phase 3: User Story 1 - Add a page title (Priority: P1) 🎯 MVP

**Goal**: An optional freeform title, entered on the page, appears identically as a header in the
live preview and the exported PDF; leaving it blank reproduces today's header-less page exactly.

**Independent Test**: Type a title into the new field, see it in the preview immediately, download
the PDF and confirm the title matches; clear the field and confirm the header disappears again.

### Implementation for User Story 1

- [x] T002 [US1] In `web/src/options.ts`, add `title: string` to the `TrackerOptions` interface and
      `title` to the `Field` union type. In `validate()`, pass `raw.title` through as
      `title: raw.title.slice(0, 200)` with no error path — per data-model.md, "the 200-character
      cap is a defensive input limit, not the rendering rule" and per contracts/page-interface.md,
      title has "no dedicated error message state." Add `title: options.title` to `toTypstInputs()`.
      Default value (used by `DEFAULTS`) is `''`. Note: `title` is required like every other
      `TrackerOptions` field (always present, default `''`), not optional — see T006a for
      backfilling existing fixtures that predate this field.
- [x] T003 [P] [US1] In `web/index.html`, add a new labeled text input inside `#options`:
      `<label>Title <input name="title" type="text" maxlength="200" /></label>` (contracts/page-interface.md:
      "a plain single-line text input, no `min`/`max`/`step`... prevented by an HTML `maxlength="200"`
      attribute"). Leave every existing control's `name`/`id` unchanged.
- [x] T004 [US1] In `web/src/main.ts`, add `title: value('title')` to `readForm()`'s returned object
      (depends on T002's `Field` type including `'title'`).
- [x] T005 [US1] In `typst/tracker.typ`, read the new input (`#let title = inp("title", "")`) and,
      when non-empty, render it at the top of the page as one line of larger text inside a new
      `header-h = 10mm` band, inside `box(width: usable-w, clip: true)` so text wider than the
      printable width is clipped rather than wrapped (research.md §1, spec Edge Cases: "clipped/truncated
      at the printable margin rather than wrapping to a second line or shrinking indefinitely"). When
      `title` is empty, render nothing in that space (FR-002). Implementation note: `header-h` was
      lowered to `6mm` during T012/T014-T019's combined-overflow fix (research.md §1/§3) — see T014's
      note.
- [x] T006 [US1] In `typst/tracker.typ`, render the header (from T005) in the page's content flow
      _before_ any layout's grid content begins, so it occupies real vertical space ahead of the
      grid. Do **not** add a separate height-fit formula to `fits-w` — that check is width-only
      (its own comment: "height overflow is caught by Typst's own pagination"), and a taller page
      from the header is already caught by the existing page-count-based overflow detection,
      consistent with 001's research.md §2 decision not to duplicate fit logic outside Typst
      (Principle I).
- [x] T006a [US1] Backfill `title: ''` onto every existing fixture that predates this field, so the
      suite still compiles and runs correctly once `title` becomes a required `TrackerOptions`/
      `RawOptions` field (T002): the `valid` object in `tests/unit/options.test.ts:4-12`, and each of
      the 11 existing cases in `tests/comparison/cases.json` (`default-letter`, `rows-minimums`,
      `rows-max-habits-and-days`, `rows-too-wide`, `rows-31-small-dots`, `columns-small`,
      `columns-too-tall`, `columns-too-wide`, `calendars-default`, `calendars-too-tall`,
      `calendars-one-per-row`). Without this, `pnpm typecheck`/`pnpm test` fail to compile, and
      `toTypstInputs()` would otherwise pass `title: undefined` into Typst for every pre-existing
      comparison/fit case.
- [x] T007 [P] [US1] In `tests/unit/fit-model.ts`, add the same `headerH` computation and subtract it
      from `area.h` before each layout's height comparison in `predictFits`, mirroring T006 exactly
      (data-model.md Fit rules). `TrackerOptions` there will pick up the `title` field from T002's
      type change.
- [x] T008 [P] [US1] In `tests/comparison/cases.json`, add a new case (e.g. `default-letter-with-title`,
      cloning `default-letter`'s options with a short `title` set) so `pnpm margins` exercises the
      header band.
- [x] T009 [P] [US1] In `tests/unit/options.test.ts`, add cases: `title` defaults to `''`; a normal
      title passes through `validate()` and `toTypstInputs()` unchanged; a title longer than 200
      characters is silently truncated to 200 rather than producing a validation error (T002).
- [x] T010 [US1] In `tests/e2e/preview-and-input.spec.ts`, add a case that types into
      `#options [name="title"]` and confirms the preview reflects it, then clears the field and
      confirms the header disappears again.
- [x] T011 [US1] Run `pnpm test`, `pnpm run margins`, and `pnpm run e2e`. All must pass (FR-008/SC-005
      regression guard for this story).

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Stack the habit label above the dots in the one-row-per-habit layout (Priority: P1)

**Goal**: Each habit's blank name-label in the `rows` layout sits above its dots instead of in a
40mm side column, so the block's width tracks its dot grid's width (SC-002).

**Independent Test**: Generate a `rows`-layout tracker and confirm each habit's label sits directly
above its dots, with no separate wide side column remaining.

### Implementation for User Story 2

- [x] T012 [US2] In `typst/tracker.typ`, rewrite the `row-habit` function: replace the
      `grid(columns: (row-label-w, auto), ...)` side-by-side arrangement with a
      `stack(dir: ttb, spacing: 0pt, ...)` of (1) a label strip reusing the existing `label-h = 6mm`
      constant and `writing-line` helper, spanning `per-row * pitch` width — the same shape
      `calendar-block` already uses (research.md §2) — followed by (2) the existing stacked dot-lines.
      Remove the now-unused `row-label-w` constant, and update the `rows` branch of the `fits-w` check
      from `row-label-w + per-row * pitch <= usable-w` to `per-row * pitch <= usable-w`
      (data-model.md: "Block width: `perRow × pitch`... Block height: `LABEL_H + L × lineH`").
- [x] T013 [P] [US2] In `tests/unit/fit-model.ts`, update the `rows` branch of `predictFits`:
      `width = o.perRow * pitch` (was `ROW_LABEL_W_MM + o.perRow * pitch`) and
      `height = o.habits * (LABEL_H_MM + lines * lineH) + (o.habits - 1) * GAP_MM` (was
      `o.habits * lines * lineH + (o.habits - 1) * GAP_MM`), matching T012 exactly.
- [x] T014 [US2] Run `pnpm margins` against every `rows-*` case in `tests/comparison/cases.json`
      (`rows-minimums`, `rows-max-habits-and-days`, `rows-too-wide`, `rows-31-small-dots`). Confirm
      each still passes or still correctly overflows per data-model.md's updated formulas — not
      assumed from the pre-change behavior. **Note**: this run caught a real regression — `rows`'s
      new per-habit `LABEL_H` cost (then `6mm`), combined with T015-T016's `NUM_GAP_*` addition,
      pushed the plain defaults (5 habits × 31 days × 7/row) from one page to two, and the
      title-set default from US1 (quickstart.md scenarios 2-3) further still. `LABEL_H`,
      `NUM_GAP_ABOVE`/`NUM_GAP_BELOW`, and `HEADER_H` were all lowered together (to `2mm`, `1mm`/
      `0.4mm`, and `6mm` respectively) as part of T015-T019 until both defaults fit one page again
      with real slack — see data-model.md's Fit rules and research.md §1/§3 for the final values and
      why. Re-run after that fix; all `rows-*` cases pass/overflow correctly at the final constants.

**Checkpoint**: User Stories 1 and 2 are both independently functional.

---

## Phase 5: User Story 3 - Group day numbers with the row they label (Priority: P2)

**Goal**: Fix the spacing asymmetry so a day number's gap to its own row of dots is smaller than
its gap to the row above it — the reverse of today's layout — without changing the every-fifth-day
numbering convention.

**Independent Test**: In the `rows` or `calendars` layout, confirm each numbered line's gap to its
own dots is visibly smaller than its gap to the row above.

### Implementation for User Story 3

- [x] T015 [US3] In `typst/tracker.typ`, replace the flat `num-h = 3mm` constant with
      `num-gap-above = 2mm` (space between the previous line's dots and this line's number) and
      `num-gap-below = 0.8mm` (space between this line's number and its own dot) — deliberately
      smaller than `num-gap-above` (data-model.md: "NUM_GAP_ABOVE = 2mm... NUM_GAP_BELOW = 0.8mm...
      which is the entire point of the fix"). **Shipped values**: lowered to `num-gap-above = 1mm`,
      `num-gap-below = 0.4mm` (same 2.5:1 ratio) as part of the T014 overflow fix — see that task's
      note and data-model.md's Fit rules.
- [x] T016 [US3] In `typst/tracker.typ`, rework `line-h` and `dot-cell(day)` so each line's layout
      order (top to bottom) is: `num-gap-above` empty space, the day number, `num-gap-below` empty
      space, then the dot — instead of today's number-at-top/dot-at-bottom-of-one-box with zero
      spacing between boxes. New `line-h = pitch + num-gap-above + <number text height> + num-gap-below`
      (data-model.md's `lineH` formula). This single function change benefits both `rows` (via T012's
      reuse of the same shape) and `calendars`. If the rendered day-number glyph height differs
      materially from the ~1.8mm planning estimate (data-model.md `NUM_TEXT_H`), adjust
      `num-gap-below` so `num-gap-above > num-gap-below` still holds, and update the constant's
      value in `data-model.md`.
- [x] T017 [US3] As a temporary local debug aid only (research.md §4, not shipped), comment out the
      `calc.rem(day, 5) == 0` guard in `dot-cell` in `typst/tracker.typ` to number every dot,
      visually confirm each number now reads as grouped with its own row rather than the row above,
      then revert the guard — shipped behavior keeps every-fifth-day numbering (FR-004).
- [x] T018 [P] [US3] In `tests/unit/fit-model.ts`, update the `lineH` computation used by both the
      `rows` and `calendars` branches of `predictFits` to
      `pitch + NUM_GAP_ABOVE_MM + NUM_TEXT_H_MM + NUM_GAP_BELOW_MM` (replacing the flat `NUM_H_MM`
      addition), matching T015/T016.
- [x] T019 [US3] Run `pnpm margins` against `rows-31-small-dots` and every `calendars-*` case in
      `tests/comparison/cases.json` (the smallest dot size / most dots per row combinations). Confirm
      numbers stay legible and non-overlapping and every case still passes the 10mm margin check
      (spec Edge Cases). Separately, confirm every `columns-*` case in `tests/comparison/cases.json`
      is unaffected by this story (FR-005) — no change to the day-number column width or position in
      that layout.

**Checkpoint**: User Stories 1, 2, and 3 are all independently functional.

---

## Phase 6: User Story 4 - Consistent visual polish across all layouts (Priority: P3)

**Goal**: Typography, line weights, and spacing read as one consistent, finished design across
`rows`, `columns`, and `calendars`, fully legible without color.

**Independent Test**: Generate one tracker per layout with the same options; compare side by side
for consistent treatment; confirm legibility when printed without color.

### Implementation for User Story 4

- [x] T020 [US4] In `typst/tracker.typ`, review and align text sizes, stroke weights (the dot
      circle's stroke, the `writing-line` helper's stroke), and spacing constants across the
      `rows`, `columns`, and `calendars` branches so labels, dots, and day numbers use the same
      typographic treatment everywhere (FR-006).
- [x] T021 [US4] Generate one tracker per layout with the same habit/day counts and visually compare
      them side by side (quickstart.md step 13). Confirm no layout looks rougher or more "finished"
      than the others (SC-004).
- [x] T022 [US4] Print or print-preview each layout without color (quickstart.md step 14) and confirm
      the title, repositioned label, and regrouped day numbers from US1–US3 all remain fully legible
      (FR-007).

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final regression pass and manual verification before opening a PR.

- [x] T023 Run the full check suite: `pnpm run format:check`, `pnpm run lint`, `pnpm run typecheck`,
      `pnpm test`, `pnpm run perf`, `pnpm run margins`, `pnpm run e2e`. All must be green
      (FR-008/SC-005).
- [x] T024 Work through every scenario in `quickstart.md` (all 14 manual steps) and record the
      outcome of each. **Verified via a fresh, context-free agent driving the real app**: all 14
      scenarios PASS. Scenario 14's literal OS print-dialog step is NOT INDEPENDENTLY VERIFIED (no
      print dialog in this environment, as anticipated) — substituted a source-level check
      confirming `typst/tracker.typ` uses only `black`/`gray`, no color. Scenario 9's gap-direction
      fix was additionally cross-checked against the T001 baseline render to confirm it's a real,
      correctly-applied change rather than a no-op.
- [x] T025 Compare freshly rendered output for all three layouts against the T001 baselines in
      `specs/007-improve-pdf-design/baseline-renders/{rows,columns,calendars}.png` and confirm the
      title, label repositioning, day-number grouping, and overall polish are each visually present
      relative to the "before" state.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Not applicable (see above) — does not block any user story.
- **User Stories (Phase 3–6)**: Each can start once Setup's baseline (T001) exists.
  - US1 (Phase 3) has no dependency on US2/US3/US4 and is the MVP.
  - US2 (Phase 4) has no dependency on US1 and is independently testable, but T012's rewrite of
    `row-habit` and T015/T016's rework of `dot-cell`/`line-h` (US3) both live in `typst/tracker.typ`
    and are easiest to land in priority order (US2 before US3) to avoid re-merging the same
    function twice.
  - US3 (Phase 5) builds on the `dot-cell`/`line-h` that US2's rewritten `row-habit` also uses, but
    does not require US2 to be done first — it fixes the function in place either way.
  - US4 (Phase 6) reviews/aligns styling introduced by US1–US3, so it is done last.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Within Each User Story

- US1: `options.ts` type change (T002) before `main.ts`'s `readForm()` (T004); the Typst header
  (T005) before the fit-check subtraction that depends on it (T006); the existing-fixture backfill
  (T006a) before T007–T009's new title-specific test cases; test updates (T007–T009) can proceed in
  parallel with T005/T006 once T002's type change lands; e2e (T010) and the full-suite run (T011)
  come last.
- US2: the `row-habit` rewrite (T012) before the margin re-verification (T014); the fit-model update
  (T013) can proceed in parallel with T012 since the target formula is already fully specified in
  data-model.md.
- US3: the new gap constants (T015) before the `line-h`/`dot-cell` rework that uses them (T016);
  the temporary debug-numbering check (T017) after T016; the fit-model update (T018) can proceed in
  parallel with T015/T016; the margin re-verification (T019) comes last.
- US4: the styling alignment (T020) before the two verification passes (T021, T022).

### Parallel Opportunities

- T003 (`web/index.html`), T007/T008/T009 (`tests/unit/fit-model.ts`, `tests/comparison/cases.json`,
  `tests/unit/options.test.ts`) can run in parallel with each other and with T005/T006
  (`typst/tracker.typ`) within US1, once T002 lands.
- T013 (`tests/unit/fit-model.ts`) can run in parallel with T012 (`typst/tracker.typ`) within US2.
- T018 (`tests/unit/fit-model.ts`) can run in parallel with T015/T016 (`typst/tracker.typ`) within
  US3.
- Across stories: almost every story's core change lands in the single `typst/tracker.typ` file
  (Principle I), so US1's T005/T006, US2's T012, and US3's T015/T016/T017 are safest done in the
  priority order shown (not concurrently by different people), even though they are logically
  independent. The `tests/unit/fit-model.ts` updates (T007, T013, T018) touch different branches of
  one file and carry the same caution.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (baseline renders).
2. Complete Phase 3: User Story 1 (page title).
3. **STOP and VALIDATE**: confirm the title appears identically in preview and PDF, and that a
   blank title reproduces today's page exactly.

### Incremental Delivery

1. Setup → baseline renders captured.
2. User Story 1 → page title, all existing automated checks green (MVP).
3. User Story 2 → rows-layout label repositioned above the dots.
4. User Story 3 → day-number spacing fixed (still every fifth day).
5. User Story 4 → typography/line-weight consistency pass across all layouts.
6. Polish → full check suite, full quickstart.md walkthrough, before/after comparison.

## Notes

- Only tasks touching genuinely different files are marked [P]; nearly every story's core change
  lands in the single `typst/tracker.typ` file (Principle I), so those are listed in priority
  order rather than marked parallel.
- [Story] label maps task to specific user story for traceability.
- No new dependencies or project structure — see plan.md's Structure Decision.
- `tests/unit/fit-model.ts` is touched by three different stories (T007, T013, T018); each touches
  a different part of `predictFits` (header height, `rows` branch, `lineH`), so land them in the
  phase order above rather than concurrently.
