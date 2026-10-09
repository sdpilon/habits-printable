# Data Model: Improve PDF Output Design

Nothing is stored. This extends `specs/001-printable-habit-grid/data-model.md`'s `TrackerOptions`
with one new field and updates the fit rules for the geometry this feature changes. Fields and
rules not mentioned here are unchanged.

## TrackerOptions (change)

| Field   | Type   | Default | Rule                                                                                      | Source |
| ------- | ------ | ------- | ------------------------------------------------------------------------------------------ | ------ |
| `title` | string | `''`    | Freeform, single line. No required minimum. A defensive 200-character cap rejects pathological input before it reaches Typst — the actual on-page clipping rule is geometric (fits the printable width), not character-count-based (research.md §1). | FR-001 |

**Validation**: `title` has no min/format requirement; only the 200-character defensive cap can
make it invalid, and that is a planning safeguard, not a spec-level option limit (data entry this
long was never going to fit on one line regardless).

## HabitRow (layout-specific shape) — label-placement change

| Layout      | Habit is        | Dots per line set by                           | Label sits                                   |
| ----------- | ---------------- | ------------------------------------------------ | ---------------------------------------------- |
| `rows`      | a row            | `perRow` dots per habit row, wrapping in order   | **above the dots** (changed from "left of the row"; FR-003) |
| `columns`   | a column         | `perRow` habits per row group                    | above the column (unchanged)                   |
| `calendars` | a mini calendar  | `perRow` dots per calendar row                   | above the calendar (unchanged)                  |

After this change, the `rows` and `calendars` per-habit block are the same shape (a label strip
over wrapped dot lines) — see research.md §2. They remain two different layouts because `rows`
always stacks one block per habit down the page, while `calendars` wraps multiple blocks per page
row.

## DayDot — numbering change

A single empty circle, unchanged in shape/size. **Day-number labels now appear on every day**
(changed from "days 5, 10, 15, …"), printed text directly associated with its own dot — drawn
inside the same cell, so the number's nearest dot is that dot by construction (research.md §4).

## PageHeader (new)

| Field   | Type                     | Notes                                                                 |
| ------- | ------------------------ | ---------------------------------------------------------------------- |
| `title` | string (from TrackerOptions) | Rendered once, at the top of the page, only when non-empty (FR-001/002). |

Not a persisted or per-habit entity — one optional page-level caption, printed once regardless of
layout or habit count (spec Key Entities, Assumptions).

## Relationships (change)

- `TrackerOptions` → optional `PageHeader` (when `title` is non-empty) → one layout → `habits` ×
  `days` `DayDot`s (now all individually numbered), grouped into `HabitRow`s.
- The Typst template takes the extended `TrackerOptions` as its input dictionary (see
  `contracts/tracker-options.schema.json`).

## Fit rules (overflow) — changes

Shared constants, extending `specs/001-printable-habit-grid/data-model.md`'s list:

- `HEADER_H = 10mm` (new): the title header band's height, included only when `title` is non-empty.
  The space below it reuses the existing `GAP = 4mm`, not a new constant (research.md §1).
- `LABEL_H = 6mm` (existing, now also used by `rows`): the label strip height, previously used only
  by `calendars`.
- `row-label-w = 40mm` (removed): no longer used by any layout now that `rows` stacks its label
  above the dots instead of beside them.

`tests/unit/fit.test.ts` (updated) fails if the formulas below disagree with Typst's actual page
count, exactly as in 001.

**Header height** (applies before any layout's own formula, for all three layouts):

- `headerH = title == '' ? 0 : HEADER_H + GAP`
- Usable height for the grid itself = `usableHeight(paper) - headerH`.

**Layout `rows` (changed)**: now the same per-habit block shape as `calendars`' block, stacked one
per page row instead of wrapped:

- Lines per habit: `L = ceil(days / perRow)` (unchanged).
- Block width: `perRow × pitch` (changed from `40mm + perRow × pitch` — no more side label column).
- Block height: `LABEL_H + L × lineH` (changed from `L × lineH` — the label strip now adds its own
  height instead of sharing the block's existing height).
- Total height: `habits × block height + (habits − 1) × GAP` (unchanged formula shape, new block
  height input).
- Fits when block width ≤ usable width and total height ≤ (usable height − headerH).

**Layout `columns` (unchanged geometry)**: numbering every dot instead of every fifth adds no new
width, since the existing `NUM_W = 6mm` number column was already sized for the widest possible day
number (365, 3 digits) regardless of how often a number appears.

- Fits when total width ≤ usable width and total height ≤ (usable height − headerH).

**Layout `calendars` (unchanged geometry)**: per-dot numbering is a content change within the
existing `lineH = pitch + NUM_H` band, not a size change.

- Fits when block width ≤ usable width and total height ≤ (usable height − headerH).

**Label decision (updated)**: the `LABEL_H` strip now applies to layouts `rows` and `calendars`
alike (both stack a label above wrapped dot lines). Layout `columns` keeps its own `LABEL_COL_H =
30mm` rotated header, unchanged.
