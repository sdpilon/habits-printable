# Research: Phone-Friendly Numeric Controls

No `NEEDS CLARIFICATION` markers were carried over from the spec. The decisions below resolve the
technical choices the spec left open.

## 1. Hiding the native spinners without losing number semantics

**Decision**: Keep `type="number"` on all five inputs. Hide the browser's spin buttons with
`appearance: none` on the input and `::-webkit-inner-spin-button` / `::-webkit-outer-spin-button`
set to `appearance: none; margin: 0`, and `-moz-appearance: textfield` for Firefox.

**Rationale**: `type="number"` keeps the numeric keyboard on phones, keeps the browser's own
validity (`min`, `max`, `step`) for assistive tech, and keeps `control.fill()` working in the
e2e suite. Switching to `type="text"` would lose all three.

**Alternatives considered**: `type="text"` with `inputmode="decimal"` (rejected: loses native
numeric semantics and `min`/`max` announcements); removing the field and using steppers only
(rejected: spec requires typing to keep working).

## 2. Stepper behavior and where the limits come from

**Decision**: Each stepper is a `<button type="button">` placed beside its input. On tap it reads
the input's current numeric value, computes `value ± step`, clamps to `[min, max]` from `LIMITS`,
writes the result back with `input.value = ...`, and dispatches a bubbling `input` event so the
existing `form.addEventListener('input', update)` handles the recompile. The button is disabled
when the value is already at the limit in its direction.

**Rationale**: Reusing the existing `input` event means the stepper goes through the same path as
typing, so nothing new needs to happen in `main.ts` for recompile or error display. Reading min,
max, and integer-ness from `LIMITS` avoids duplicating ranges in HTML that could drift.

**Edge handling** (from spec edge cases): when the field is empty or non-numeric, "+" sets the
minimum and "−" sets the maximum. When the field holds an out-of-range value, a step moves it to
the nearest valid value in the tapped direction, clamped to the limits.

**Rounding**: For mm fields, `step = 0.1`. Floating-point addition gives values like `1.6000000000000001`,
so results are rounded with `Number(x.toFixed(decimals))`, where `decimals` is 0 for integer
fields and 1 for mm fields.

**Alternatives considered**: Calling `stepUp()`/`stepDown()` on the input (rejected: those do not
dispatch an `input` event, so nothing downstream would react; they also respect the browser's step
base, which is fragile for a `min=0.5` field with `step=0.1`).

## 3. Slider sync and the no-`name` rule

**Decision**: Each mm field gets an `<input type="range">` with `min`, `max`, and `step` copied from
`LIMITS`, plus an `<output>` element showing the readout. The range input has an `id` and an
`aria-label`, and **no `name` attribute**. Its `input` event writes its value into the paired
number field and dispatches a bubbling `input` event on that field. Typing into the number field
updates the range's `value` (clamped by the browser to the slider's range) and the readout.

**Rationale**: The e2e locator `#options [name="dotDiameterMm"]` and `readForm()`'s
`namedItem('dotDiameterMm')` both require exactly one element with that name. A named slider would
break both. The sync flow does not need `name` because the slider never submits a value on its own.

**Typed values outside the slider's range** (e.g. `9` mm): the browser clamps the range thumb to the
end, the readout keeps showing the typed text, and the existing validation message stays. This
matches the spec edge case.

**Alternatives considered**: Replacing the number field with a slider (rejected: spec requires
typed entry; also loses exact values). Using a shared `name` with a `data-` role (rejected: same
collision problem as above).

## 4. Keeping the stepper row within the phone layout

**Decision**: Under the existing 720px breakpoint, each integer field is a full-width row of
`[−] [input] [+]`, with the label above. Buttons are 44×44 px, and the input takes the remaining
width. The mm fields keep their label, then a slider row `[range] [readout]`.

**Rationale**: At 390px width the three integer fields in the current `field-group` grid
(`minmax(5rem, 1fr)`) would be about 111px each. Two 44px buttons plus a usable input do not fit in
that. Full-width rows fit, at the cost of vertical space.

**Risk**: The phone layout is a single-column grid with `minmax(0, 1fr)` rows, and feature 004
requires the page not to scroll the window. The extra rows may push the preview down. This is
checked in `quickstart.md` (`readWindowFits` at 390×844). If it fails, the fallback is a two-column
grid for the three integer fields at widths of 360px and above, with 36px buttons only if the
spec's 44px floor is revised. The spec floor is not to be lowered without asking.

**Alternatives considered**: Keep the desktop multi-column grid on phones (rejected: the input
becomes too narrow to type into).

## 5. Desktop behavior

**Decision**: Desktop (above 720px) keeps the existing sidebar and field grid. The steppers and
sliders are shown at all widths, because the spec requires the spinners hidden everywhere and the
stepper/slider is the replacement. Only the spinners change on desktop; the buttons and slider are
additions the spec permits.

**Rationale**: Spec FR-013 allows "the added stepper buttons and sliders" on desktop and forbids
other changes.

## 6. Accessibility names

**Decision**: Stepper buttons: `aria-label="Increase habits"` / `"Decrease habits"` (and the same
pattern for Days and Dots per row). Sliders: `aria-label` equal to the field label, e.g.
`"Dot diameter (mm)"`. The readout is an `<output>` with `for` pointing at the slider's id.

**Rationale**: Matches FR-011 and FR-012 and the labels already defined in `LIMITS`, so the
accessible names cannot drift from the visible labels.
