# Data Model: Phone-Friendly Numeric Controls

No new persisted state. The entities below describe the in-page controls. Limits and steps come
from the existing `LIMITS` table in `web/src/options.ts` (unchanged).

## Numeric option (existing, from `LIMITS`)

| Field           | min | max | integer | step | decimals | Control kind on phone |
| --------------- | --- | --- | ------- | ---- | -------- | --------------------- |
| `habits`        | 1   | 20  | yes     | 1    | 0        | Stepper               |
| `days`          | 1   | 365 | yes     | 1    | 0        | Stepper               |
| `perRow`        | 1   | 31  | yes     | 1    | 0        | Stepper               |
| `dotDiameterMm` | 2   | 5   | no      | 0.1  | 1        | Slider + readout      |
| `dotSpacingMm`  | 0.5 | 5   | no      | 0.1  | 1        | Slider + readout      |

## Numeric control (new, in-page)

Each of the five options has one **field** (the existing `<input name="...">`, the source of truth)
and one **companion** control:

- **Stepper companion** (integer fields): two `<button type="button">` elements, decrease and
  increase, with `aria-label`s, placed on either side of the field.
- **Slider companion** (mm fields): one `<input type="range">` (no `name`), with `min`, `max`,
  `step` copied from `LIMITS`, plus one `<output>` readout.

## Validation and state rules

| Rule                                                                                                                                                                                  | Source                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| The field's text value is the only value read by `readForm()` and `validate()`. Companions never write a value that `validate()` cannot read.                                         | `web/src/main.ts`, `web/src/options.ts` |
| A stepper write always lands within `[min, max]`. Its button is disabled at the limit it would exceed.                                                                                | spec FR-004                             |
| A stepper tap, or a slider release that changes the value, dispatches a bubbling `input` event on the field, exactly as typing does. A slider drag dispatches nothing while it moves. | spec FR-010                             |
| A slider's value follows the field when the field is a valid number in range. Otherwise the thumb sits at the nearest end, and the readout shows the field's text.                    | spec FR-008 and edge case               |
| An empty or non-numeric field: "+" sets `min`, "−" sets `max`.                                                                                                                        | spec edge case                          |
| The readout shows the field's text exactly as typed or stepped, with no rounding.                                                                                                     | spec FR-007                             |

## State transitions (one numeric control)

```text
          tap "+" (value < max)          tap "+" (value = max)
  value ─────────────────────▶ value+step        (button disabled, no change)
    │
    │ tap "−" (value > min)
    ▼
  value−step
    │
    │ type "9" (out of range)
    ▼
  value = 9  ──▶ validate() error, download disabled, thumb pinned at max, readout "9"
```
