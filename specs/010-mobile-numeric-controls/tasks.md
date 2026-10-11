# Tasks: Phone-Friendly Numeric Controls

**Input**: Design documents from `/specs/010-mobile-numeric-controls/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/page-interface.md, quickstart.md

**Tests**: Included. The spec does not request tests explicitly, but plan.md names the unit test file (`tests/unit/numeric-controls.test.ts`) and the new e2e spec (`tests/e2e/mobile-numeric-controls.spec.ts`), and the existing e2e suite must pass unmodified (SC-005).

**Organization**: Tasks are grouped by user story so each story can be implemented and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story the task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Limits and steps (quoted from data-model.md, source of truth is `LIMITS` in `web/src/options.ts`)

- `habits`: min 1, max 20, integer, step 1, decimals 0
- `days`: min 1, max 365, integer, step 1, decimals 0
- `perRow`: min 1, max 31, integer, step 1, decimals 0
- `dotDiameterMm`: min 2, max 5, not integer, step 0.1, decimals 1
- `dotSpacingMm`: min 0.5, max 5, not integer, step 0.1, decimals 1

---

## Phase 1: Setup (Baseline)

**Purpose**: Confirm the starting state so later failures can be attributed to this feature.

- [ ] T001 Record the baseline by running `pnpm test`, `pnpm typecheck`, and `pnpm e2e` on the unchanged repo, and note any pre-existing failures in `specs/010-mobile-numeric-controls/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure helpers that every control type depends on. No DOM code here, so these can be unit-tested without a browser.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Create `web/src/numeric-controls.ts` exporting pure helpers: `stepValue(text, direction, rule)` (returns the next value, rounded to `rule.decimals`, clamped to `[min, max]`; empty or non-numeric text yields `min` for increase and `max` for decrease), `clampToRange(value, rule)`, `atLimit(text, direction, rule)` (true when a step in that direction would not change the value), and `sliderValueFor(text, rule)` (nearest in-range number, or `null` when text is not a number). Use the `LIMITS` table imported from `web/src/options.ts`; do not copy the numbers.
- [ ] T003 [P] Create `tests/unit/numeric-controls.test.ts` covering `stepValue`, `atLimit`, `clampToRange`, and `sliderValueFor` for all five fields: step by one unit, clamp at each end, the float case `1.5` plus `0.1` giving `1.6` (not `1.6000000000000001`), empty and non-numeric input, and out-of-range input such as `9` for `dotSpacingMm`

**Checkpoint**: `pnpm test` passes with the new unit tests, and the helpers are the only place rounding and clamping live.

---

## Phase 3: User Story 1 - Adjust integer options with tap steppers (Priority: P1) 🎯 MVP

**Goal**: On a phone, Habits, Days, and Dots per row each show visible "−" and "+" buttons (at least 44×44 CSS px) that change the value by one, clamp at the limits, and disable at the limit. The browser's native spinners are hidden on all five fields.

**Independent Test**: At 390×844 with touch enabled, tap "+" on Habits: the value goes 5 → 6, `#preview-section[data-habits="6"]` appears, and Download stays enabled. Tap "−" on Days until it reads 1: the "−" button is disabled.

### Tests for User Story 1

- [ ] T004 [US1] Create `tests/e2e/mobile-numeric-controls.spec.ts` with a phone-viewport (390×844, `hasTouch: true`) describe block covering: stepper increment changes the value and redraws the preview; "−" on Habits stops at 1 with the button disabled; "+" on Habits stops at 20 with the button disabled; "−" on Days stops at 1 with the button disabled; "+" on Dots per row stops at 31 with the button disabled; stepper from an empty Days field goes to 1 on "+" and 365 on "−"; each button has the accessible name `Increase habits` / `Decrease habits` (and the same pattern for Days and Dots per row); each is at least 44×44 px; and each of the five fields has `appearance: none` (or the vendor-prefixed equivalent) computed on its spin-button pseudo-elements, confirming the native spinner is hidden

### Implementation for User Story 1

- [ ] T005 [US1] In `web/index.html`, wrap each of the `habits`, `days`, and `perRow` fields in a `<div class="numeric-row">` inside `#options`. Keep the existing `<label>` element around the input only. Place a `<button type="button">` before and after the `<label>`, not inside it, because a button inside a label becomes the label's labelable control. Each button has `data-stepper="<field>"`, `data-direction="decrease"` or `"increase"`, an `aria-label` such as `Decrease habits`, and visible text `−` or `+`. Leave the existing `name` attributes and input types unchanged, and do not add a `name` to any button.
- [ ] T006 [US1] In `web/src/style.css`, hide the native spinners on `input[type="number"]` for the five option fields (`appearance: none` on the input, `::-webkit-inner-spin-button` and `::-webkit-outer-spin-button` with `appearance: none; margin: 0`, and `-moz-appearance: textfield`). Style the stepper row as `[−] [input] [+]` with 44×44 px buttons, and under the existing 720px breakpoint make each integer field a full-width row with its label above, per research.md §4. Keep label font size unchanged.
- [ ] T007 [US1] Add a `:disabled` style for stepper buttons in `web/src/style.css` that keeps the border visible at 3:1 contrast in light and dark color schemes, matching the existing `--control-border` treatment.
- [ ] T008 [US1] In `web/src/numeric-controls.ts`, add `initSteppers(form: HTMLFormElement): void`. On each `[data-stepper]` button click, read the matching field, call `stepValue` from T002, write the result to `input.value`, dispatch `new Event('input', { bubbles: true })` on the field only when the text actually changed, and update the button's `disabled` state with `atLimit`. Also update disabled state on every `input` event on the form so typed values keep the buttons correct.
- [ ] T009 [US1] In `web/src/main.ts`, import `initSteppers` from `./numeric-controls.ts` and call `initSteppers(form)` once at startup, before the first `void update()` call at the bottom of the file, so the initial disabled state is correct.

**Checkpoint**: User Story 1 works on its own. `pnpm e2e tests/e2e/mobile-numeric-controls.spec.ts` passes for the stepper cases, and the MVP can be demoed.

---

## Phase 4: User Story 2 - Adjust dot size and spacing with a slider (Priority: P2)

**Goal**: On a phone, Dot diameter (mm) and Dot spacing (mm) each show a range slider with a live numeric readout. The slider and the number field stay in sync, and the slider never gets a `name` attribute.

**Independent Test**: At 390×844, drag the Dot diameter slider to its far right end: the readout reads 5, the field reads 5, and the preview uses 5 mm dots. Drag Dot spacing to its far left: the readout reads 0.5.

### Tests for User Story 2

- [ ] T010 [US2] Add to `tests/e2e/mobile-numeric-controls.spec.ts` a describe block for sliders covering: dragging Dot diameter to each end sets the field and readout to 2 and 5; dragging Dot spacing to the left end sets 0.5; typing `3.7` into Dot diameter moves the slider thumb to 3.7 and the readout reads `3.7`; and `#options [name="dotDiameterMm"]` and `#options [name="dotSpacingMm"]` each match exactly one element; each slider has the accessible name `Dot diameter (mm)` / `Dot spacing (mm)` (checked with `getByRole('slider', { name })`); releasing a slider at its current value leaves `#preview-section` `aria-busy` as `"false"` in a read taken right after the release; and dragging either slider confirms the value only lands on 0.1 mm increments (e.g. never `4.05`)

### Implementation for User Story 2

- [ ] T011 [US2] In `web/index.html`, add next to each of the `dotDiameterMm` and `dotSpacingMm` labels (outside the `<label>` element, for the same reason as T005) an `<input type="range">` with `min`, `max`, and `step` copied from the limits table above, `data-slider-for="<field>"`, `aria-label` equal to the visible label (`Dot diameter (mm)` / `Dot spacing (mm)`), and an `id` such as `dotDiameterMm-slider`. Add an `<output data-readout-for="<field>" for="<id>">` after it. The range input MUST NOT have a `name` attribute.
- [ ] T012 [US2] In `web/src/style.css`, lay out each mm field as `[range] [readout]` on phones, with the range taking the remaining width and the readout a fixed width so the value does not shift as it changes. Keep the existing label font size.
- [ ] T013 [US2] In `web/src/numeric-controls.ts`, add `initSliders(form: HTMLFormElement): void`. An `input` event on a range (fires during the drag) writes its value to the paired field (`data-slider-for`) and updates the readout, without dispatching. A `change` event on a range (fires on release) dispatches a bubbling `input` event on that field, but only if the field's text changed since the drag began (record it on `pointerdown`). An `input` event on a mm field sets the range to `sliderValueFor` from T002 — clamped to the nearest end for an out-of-range value, left unchanged when the text is not a number — and updates the readout to the field's text verbatim. Confirm no code in this function writes to a field on an `input` event that came from the field itself (no feedback loop).
- [ ] T014 [US2] In `web/src/main.ts`, call `initSliders(form)` next to `initSteppers(form)` added in T009.

**Checkpoint**: User Stories 1 and 2 both work independently. Sliders update the preview, and the e2e name-uniqueness assertion passes.

---

## Phase 5: User Story 3 - Type exact values into any field (Priority: P3)

**Goal**: Typing still works on all five fields with the same validation, error messages, and download gating as before. Out-of-range typed values pin the slider and show the existing error (behavior implemented in T013; this phase locks it in with tests).

**Independent Test**: Type `12` into Days and confirm the preview shows 12 days. Type `0` into Habits and confirm the error message appears and Download is disabled. Type `9` into Dot spacing and confirm the thumb pins to the right end, the readout shows `9`, and the error appears.

### Tests for User Story 3

- [ ] T015 [P] [US3] Add a unit test to `tests/unit/numeric-controls.test.ts` confirming `sliderValueFor` clamps a typed out-of-range value to the nearest end (e.g. `9` for `dotSpacingMm` → `5`) and that the slider-sync code in T013 has no feedback loop (a programmatic field write does not re-trigger the range's own `input` handler).
- [ ] T016 [US3] Add to `tests/e2e/mobile-numeric-controls.spec.ts` a describe block for typing: `typeOption` (from `tests/e2e/support/page.ts`) into Days `12` updates the preview; `0` into Habits shows a `#messages li` error and `input[aria-invalid="true"]` on habits, and leaves Download disabled; `9` into Dot spacing shows an error and the range value is `5`; and the existing typed-invalid cases in `tests/e2e/` still pass

**Checkpoint**: All three stories work independently and together. Validation is still owned by `validate()` in `web/src/options.ts`.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Verify the constraints that span all stories: the unmodified existing suite, layout at other widths, both color schemes, and lint.

- [ ] T017 Run the existing e2e suite unmodified (`pnpm e2e`, excluding the new file if needed) and confirm every pre-existing test still passes, since SC-005 requires it. Do not edit any file under `tests/e2e/` other than the new spec.
- [ ] T018 [P] Verify at 390×844 that `readWindowFits` (from `tests/e2e/support/page.ts`) returns true with the new rows. If it fails, follow the fallback in research.md §4 and record the decision in `specs/010-mobile-numeric-controls/research.md`.
- [ ] T019 [P] Verify at 320×640 that every stepper and its field stay visible and that the options panel does not scroll horizontally. Record the result in `specs/010-mobile-numeric-controls/quickstart.md`.
- [ ] T020 [P] Verify the desktop layout above 720px: spinners are hidden on all five fields, steppers and sliders work, and field positions and labels match the pre-change layout except for the added controls.
- [ ] T021 [P] Verify the stepper and slider borders meet the 3:1 UI contrast floor in light and dark color schemes (`prefers-color-scheme: dark`), per feature 006's clarification.
- [ ] T022 Run `pnpm typecheck`, `pnpm lint`, and `pnpm format:check`, and fix any findings in `web/src/numeric-controls.ts`, `web/src/main.ts`, `web/src/style.css`, `web/index.html`, and the new test files.
- [ ] T023 Run the quickstart.md scenarios by hand at 390×844 and record pass or fail for each in `specs/010-mobile-numeric-controls/quickstart.md`.
- [ ] T024 Run `pnpm margins` and record its result in `specs/010-mobile-numeric-controls/quickstart.md` (constitution Development Workflow; see plan.md Constitution Check).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Start here.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories, because every control uses the helpers in T002.
- **User Stories (Phases 3–5)**: All depend on Foundational. US1 is the MVP. US2 and US3 build on the same file (`numeric-controls.ts`) and the same `index.html`, so run them in priority order.
- **Polish (Final Phase)**: Depends on all user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational. No dependency on US2 or US3.
- **US2 (P2)**: Starts after Foundational. Edits the same markup and file as US1 (T011 follows T005), so start it after US1 is complete.
- **US3 (P3)**: Depends on US2's slider sync (T015 modifies T013's code).

### Within Each User Story

- Tests first where marked, then markup, then styles, then behavior, then wiring in `main.ts`.
- Story complete and checked at its checkpoint before the next story starts.

### Parallel Opportunities

- T003 (unit tests) can run in parallel with T002's implementation once the helper signatures are fixed.
- T004 and T010 and T016 each touch the same new e2e file, so they are NOT parallel with each other. Write them one block at a time.
- T018, T019, T020, and T021 are independent verifications and can run in parallel on separate browser contexts.

---

## Parallel Example: Final Phase

```bash
# After T017 passes, run these checks in parallel:
Task: "Verify readWindowFits at 390×844 (T018)"
Task: "Verify 320×640 layout (T019)"
Task: "Verify desktop layout above 720px (T020)"
Task: "Verify contrast in light and dark (T021)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T003)
3. Complete Phase 3: User Story 1 (T004–T009)
4. **STOP and VALIDATE**: run the US1 e2e block and the phone check in quickstart.md
5. Demo if ready. Habits, Days, and Dots per row are usable on a phone.

### Incremental Delivery

1. Setup + Foundational → helpers tested
2. Add US1 → steppers on phones (MVP)
3. Add US2 → sliders for the two mm fields
4. Add US3 → typing behaviors locked in with tests
5. Polish → layout, contrast, lint, quickstart pass

---

## Notes

- `[P]` tasks touch different files and have no dependency on an incomplete task
- `[Story]` labels trace each task to its user story in `spec.md`
- Each user story can be checked at its checkpoint before moving on
- Do not add a `name` attribute to any stepper button or slider (contract rule in `contracts/page-interface.md`)
- Validation stays in `validate()` in `web/src/options.ts`; the new code must not duplicate it
