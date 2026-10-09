# Contract: Page Interface Used by the End-to-End Suite

The suite drives the page only through these names. Changing any of them breaks the suite, so the names are fixed here. Everything not listed is not part of the contract and may change freely.

## Form controls (existing, `web/index.html`)

| Name            | Element             | Values the suite sets                                  |
| --------------- | ------------------- | ------------------------------------------------------ |
| `layout`        | `select`            | `rows`, `columns`, `calendars`                         |
| `habits`        | `input type=number` | integers; invalid cases: empty, `0`, `-1`, `abc`, `21` |
| `days`          | `input type=number` | integers, 1 to 365                                     |
| `perRow`        | `input type=number` | integers, 1 to 31                                      |
| `dotDiameterMm` | `input type=number` | numbers, 2 to 5                                        |
| `dotSpacingMm`  | `input type=number` | numbers, 0.5 to 5                                      |
| `paper`         | `select`            | `letter` only (suite never selects `a4`)               |

The form is found by `#options`. Inputs are found by `name`, not position.

## Feedback

| Element                      | Meaning                                  | Suite reads it                                                                                                                                               |
| ---------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `#messages li`               | One validation message per invalid field | Count and text. Invalid cases must show at least one message (FR-005).                                                                                       |
| `input[aria-invalid="true"]` | Field with an error                      | Confirms which field is flagged.                                                                                                                             |
| `#warning`                   | Overflow warning                         | Visible (not `hidden`) for overflowing layouts (FR-013 in 001).                                                                                              |
| `#download`                  | Download button                          | `disabled` state. Must be enabled only for a valid, fitting layout (001 FR-012 for invalid input, 001 FR-013 for overflow). Clicking it starts the download. |

## Preview

| Element                         | Meaning                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#preview-section`              | **New (test-visible)**. The preview section. Its `aria-busy` attribute is `"true"` from the moment an option change is accepted until the newest render has finished, then `"false"`.                                                                                                                                                                         |
| `#preview-section[data-habits]` | **New (test-visible)**. The habit count of the layout last drawn into `#preview`, as a decimal integer string. Set after each successful render, including layouts that overflow (the preview still draws them and download is disabled). Unchanged on invalid input, because the last valid preview stays on screen (FR-012). Absent until the first render. |
| `#preview-section[data-days]`   | **New (test-visible)**. The day count of the layout last drawn into `#preview`, as a decimal integer string. Set and kept in step with `data-habits`.                                                                                                                                                                                                         |
| `#preview canvas`               | The rendered page 1 of the current valid layout.                                                                                                                                                                                                                                                                                                              |

**Settled** means `#preview-section` has `aria-busy="false"`. The suite waits up to 5 seconds for that state (clarification, 2026-10-06). It fails the scenario with the step name if the state is not reached.

## Download

- Clicking `#download` (when enabled) starts a download named `habit-grid.pdf` (existing behaviour).
- The suite treats a missing download event within its timeout as a failure (FR-008).

## Stability promises

- These names and values stay as they are. A new name or value must be added here first.
- `aria-busy`, `data-habits`, and `data-days` are the only attributes added to the page for the suite. They must not change layout, the preview, or the download (FR-011).
