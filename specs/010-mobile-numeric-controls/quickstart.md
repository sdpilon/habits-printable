# Quickstart: Phone-Friendly Numeric Controls

A run guide for checking this feature by hand and with the automated suite. Defaults are
Habits 5, Days 31, Dots per row 7, Dot diameter 4 mm, Dot spacing 1.5 mm.

## Prerequisites

- pnpm (repo uses `pnpm-lock.yaml`). Install with `pnpm install` if `node_modules` is missing.
- Playwright browsers for the e2e run (`pnpm exec playwright install chromium` if not present).

## Automated checks

1. `pnpm typecheck`: no type errors in the new `numeric-controls.ts`.
2. `pnpm lint` and `pnpm format:check`: Biome passes on the changed TS and CSS.
3. `pnpm test`: unit tests for step, clamp, rounding, and slider mapping pass.
4. `pnpm e2e`: the existing suite passes **unmodified** (SC-005 in the spec), plus the new
   `tests/e2e/mobile-numeric-controls.spec.ts`.
5. `pnpm margins`: run and recorded per the constitution's Development Workflow (T024).

## Baseline (T001, pre-implementation, 2026-10-10)

- `pnpm typecheck`: clean, no errors.
- `pnpm test` (`tests/unit`): 3 files, 37 tests, all passed.
- `pnpm e2e`: 24 tests, all passed. No pre-existing failures.

## Phone-viewport scenarios (390×844, touch enabled)

Run the dev server (`pnpm dev`) and open the page at a 390×844 viewport.

1. **Steppers visible without hover.** Habits, Days, and Dots per row each show "−" and "+"
   beside the field. No hover is needed.
2. **Tap size.** Each stepper button measures at least 44×44 CSS px.
3. **Increment.** Tap "+" on Habits. The value goes 5 → 6, the preview redraws with six habit
   rows (`#preview-section[data-habits="6"]`), and Download stays enabled.
4. **Lower limit.** Tap "−" on Days until it reads 1. The "−" button is disabled and further taps
   change nothing.
5. **Upper limit.** Tap "+" on Dots per row until it reads 31. The "+" button is disabled.
6. **Slider.** Drag the Dot diameter slider from left to right. The readout tracks the thumb, moves
   in 0.1 steps, and stops at 2.0 and 5.0. The preview redraws once, when the drag ends.
7. **Slider limits.** Drag Dot spacing to both ends. The readout reads 0.5 and 5.0.
8. **Typing still works.** Type `12` into Days. The preview shows 12 days. Slider and steppers
   reflect the new value.
9. **Typed out-of-range.** Type `0` into Habits. The error message appears, `input[aria-invalid="true"]`
   flags the field, and Download is disabled. Type `9` into Dot spacing. The slider thumb pins to
   the right end, the readout shows `9`, and an error appears.
10. **Stepper from invalid.** Clear Days and tap "+". Days becomes 1. Clear Days and tap "−".
    Days becomes 365.
11. **No window scroll.** At 390×844 the page fits without scrolling the window (`readWindowFits`
    returns true). If it does not, see the layout risk in `research.md` §4.
12. **Narrow width.** At 320×640 each stepper and its field stay fully visible. The options panel
    does not scroll horizontally.
13. **Dark mode.** Repeat scenario 1 with `prefers-color-scheme: dark`. Button and slider borders
    are visible (3:1 UI contrast from feature 006).

## Desktop check (above 720px)

1. Native spinners are gone from all five fields.
2. Steppers and sliders are present and work the same as on the phone.
3. Field positions and labels are unchanged except for the added controls.

## Accessibility check

1. Each stepper button has an accessible name such as "Increase habits" (check in the browser
   accessibility tree or with the `getByRole('button', { name: 'Increase habits' })` locator).
2. Each slider has an accessible name equal to its field label.
3. Tab order through the options is unchanged from before (a new button follows its field's
   decrease button and precedes its increase button).

## Results (T023, T024, post-implementation, 2026-10-10)

All scenarios above were verified with Playwright at the stated viewports, substituting for a
manual phone pass (no physical device in this environment):

- Scenarios 1–13 (phone, 390×844): **PASS**, via
  `tests/e2e/mobile-numeric-controls.spec.ts` (18 tests, all passing) plus the T018/T019 ad hoc
  checks below.
- Desktop check (1–3, above 720px): **PASS**. Spinners hidden (`appearance: none` on all five
  fields); steppers and slider confirmed interactive (Habits 5→6, Dot diameter 4→4.1); field
  positions/labels unchanged apart from the added controls.
- Accessibility check (1–2): **PASS**, via `getByRole('button'|'slider', { name })` locators in
  the e2e suite. Tab order (3) not independently verified beyond markup order (buttons placed
  immediately before/after each field's `<label>`, matching source order).
- T018 (`readWindowFits` at 390×844): **PASS** — `true`, no fallback from research.md §4 needed.
- T019 (320×640, no horizontal scroll): **PASS** — `scrollWidth` (320) ≤ `clientWidth` (320);
  every stepper button's bounding box stayed within the viewport.
- T021 (3:1 border contrast, light/dark): **PASS** — enabled buttons inherit the existing
  dark-pill button style (`border-color: var(--ink)`, already compliant per feature 006);
  disabled buttons use `var(--control-border)`, the same value feature 006 established as
  passing the 3:1 floor in both color schemes.
- T024 (`pnpm margins`): **PASS** — all 12 cases passed or were correctly skipped as
  overflow (download blocked); no Typst/PDF output changed by this feature.
