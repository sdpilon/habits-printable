# Contract Delta: Page Interface for Numeric Controls

This feature extends the e2e page contract in
[`specs/002-e2e-tests/contracts/page-test-interface.md`](../../002-e2e-tests/contracts/page-test-interface.md).
Everything in that contract stays as it is. The additions below are the only new names.

## Unchanged (must keep working)

- `#options [name="habits" | "days" | "perRow" | "dotDiameterMm" | "dotSpacingMm"]` is the typed
  `<input type="number">`. Exactly one element per name. `fill()` and `pressSequentially()` continue
  to work.
- `#messages li`, `input[aria-invalid="true"]`, `#warning`, `#download`, `#preview-section`
  (`aria-busy`, `data-habits`, `data-days`), and `#preview canvas`, with the same meaning.

## New names

| Name / selector                                                                    | Element              | Rule                                                                                                                                |
| ---------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `#options button[data-stepper="<field>"][data-direction="increase" \| "decrease"]` | `button type=button` | One per integer field (`habits`, `days`, `perRow`), two per field. Has `aria-label`, e.g. `Increase habits`. Disabled at its limit. |
| `#options input[type="range"][data-slider-for="<field>"]`                          | `input type=range`   | One per mm field (`dotDiameterMm`, `dotSpacingMm`). Has no `name` attribute. Has `aria-label` equal to the field label.             |
| `#options output[data-readout-for="<field>"]`                                      | `output`             | One per mm field. Text equals the field's current text exactly, with no rounding.                                                   |

## Rules for future changes

- A new control in `#options` MUST NOT reuse one of the five option `name`s. Use `data-*`
  attributes to link companions to their field.
- Companions MUST NOT change the field's `name`, `type`, or `id`.
- Any new companion control that changes a value MUST dispatch a bubbling `input` event on the field when the value is committed (a tap or a slider release). A drag in progress MUST NOT dispatch.
