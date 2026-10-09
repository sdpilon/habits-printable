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

## DayDot — spacing change

A single empty circle, unchanged in shape/size. Day-number labels still appear on every fifth day
(unchanged from 001), but the gap structure around each number changes: the gap between a number
and the row of dots *above* it (`NUM_GAP_ABOVE`) is now larger than the gap between that number and
its *own* row of dots below it (`NUM_GAP_BELOW`), so each number reads as grouped with its own row
(research.md §3). Today's layout has this reversed (effectively zero gap above, a wide gap below).

## PageHeader (new)

| Field   | Type                     | Notes                                                                 |
| ------- | ------------------------ | ---------------------------------------------------------------------- |
| `title` | string (from TrackerOptions) | Rendered once, at the top of the page, only when non-empty (FR-001/002). |

Not a persisted or per-habit entity — one optional page-level caption, printed once regardless of
layout or habit count (spec Key Entities, Assumptions).

## Relationships (change)

- `TrackerOptions` → optional `PageHeader` (when `title` is non-empty) → one layout → `habits` ×
  `days` `DayDot`s (every fifth one still carrying a number, now correctly spaced), grouped into
  `HabitRow`s.
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
- `NUM_H = 3mm` (removed) → replaced by two constants that together total slightly more height per
  line, so the gap above a number can exceed the gap below it (research.md §3):
  - `NUM_GAP_ABOVE = 2mm`: space between the previous line's dots and this line's number.
  - `NUM_GAP_BELOW = 0.8mm`: space between this line's number and its own dot (kept deliberately
    smaller than `NUM_GAP_ABOVE`, which is the entire point of the fix).
  - `NUM_TEXT_H ≈ 1.8mm`: planning estimate for the day-number glyph height at the existing 5pt
    size; verified against the real compiled output, not assumed, during implementation.
  - `lineH = pitch + NUM_GAP_ABOVE + NUM_TEXT_H + NUM_GAP_BELOW` (replaces `pitch + NUM_H`; a modest
    ~1.6mm taller per line than before — re-verified against the margin check per case).

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

**Layout `columns` (unchanged geometry)**: day numbers sit beside their row, not above it, so this
layout never had the spacing defect and its `NUM_W = 6mm` number column is untouched.

- Fits when total width ≤ usable width and total height ≤ (usable height − headerH).

**Layout `calendars` (changed, same formula shape as `rows`)**: uses the same new
`lineH = pitch + NUM_GAP_ABOVE + NUM_TEXT_H + NUM_GAP_BELOW` as `rows` (replacing
`pitch + NUM_H`), since both layouts stack dot lines with a number band above each.

- Fits when block width ≤ usable width and total height ≤ (usable height − headerH).

**Label decision (updated)**: the `LABEL_H` strip now applies to layouts `rows` and `calendars`
alike (both stack a label above wrapped dot lines). Layout `columns` keeps its own `LABEL_COL_H =
30mm` rotated header, unchanged.
