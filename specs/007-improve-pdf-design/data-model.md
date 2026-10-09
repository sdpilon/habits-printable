# Data Model: Improve PDF Output Design

Nothing is stored. This extends `specs/001-printable-habit-grid/data-model.md`'s `TrackerOptions`
with one new field and updates the fit rules for the geometry this feature changes. Fields and
rules not mentioned here are unchanged.

## TrackerOptions (change)

| Field   | Type   | Default | Rule                                                                                                                                                                                                                                                 | Source |
| ------- | ------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `title` | string | `''`    | Freeform, single line. No required minimum. A defensive 200-character cap rejects pathological input before it reaches Typst — the actual on-page clipping rule is geometric (fits the printable width), not character-count-based (research.md §1). | FR-001 |

**Validation**: `title` has no min/format requirement; only the 200-character defensive cap can
make it invalid, and that is a planning safeguard, not a spec-level option limit (data entry this
long was never going to fit on one line regardless).

## HabitRow (layout-specific shape) — label-placement change

| Layout      | Habit is        | Dots per line set by                           | Label sits                                                  |
| ----------- | --------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| `rows`      | a row           | `perRow` dots per habit row, wrapping in order | **above the dots** (changed from "left of the row"; FR-003) |
| `columns`   | a column        | `perRow` habits per row group                  | above the column (unchanged)                                |
| `calendars` | a mini calendar | `perRow` dots per calendar row                 | above the calendar (unchanged)                              |

After this change, the `rows` and `calendars` per-habit block are the same shape (a label strip
over wrapped dot lines) — see research.md §2. They remain two different layouts because `rows`
always stacks one block per habit down the page, while `calendars` wraps multiple blocks per page
row.

## DayDot — spacing change

A single empty circle, unchanged in shape/size. Day-number labels still appear on every fifth day
(unchanged from 001), but the gap structure around each number changes: the gap between a number
and the row of dots _above_ it (`NUM_GAP_ABOVE`) is now larger than the gap between that number and
its _own_ row of dots below it (`NUM_GAP_BELOW`), so each number reads as grouped with its own row
(research.md §3). Today's layout has this reversed (effectively zero gap above, a wide gap below).

## PageHeader (new)

| Field   | Type                         | Notes                                                                    |
| ------- | ---------------------------- | ------------------------------------------------------------------------ |
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

- `HEADER_H = 6mm` (new, value lowered from an initial `10mm` planning value — see note below): the
  title header band's height, included only when `title` is non-empty. The space below it reuses
  the existing `GAP = 4mm`, not a new constant (research.md §1).
- `LABEL_H = 2mm` (existing constant, value lowered from `6mm`, now also used by `rows`): the label
  strip height, previously `6mm` and used only by `calendars`. Lowered during implementation
  (research.md §3) because `rows` now pays this cost once per _habit_ (not once per block-row as
  `calendars` does), and the combination of this plus the `NUM_GAP_*` addition below pushed the
  plain defaults (5 habits × 31 days × 7/row) to a second page even with a blank title — and, once a
  title _is_ set at those same defaults, needs enough combined slack to also absorb `HEADER_H + GAP`
  without overflowing. `2mm` restores a one-page fit for both cases with a real margin of slack
  (~7mm), re-verified against the margin check.
- `row-label-w = 40mm` (removed): no longer used by any layout now that `rows` stacks its label
  above the dots instead of beside them.
- `NUM_H = 3mm` (removed) → replaced by two constants that together total slightly more height per
  line, so the gap above a number can exceed the gap below it (research.md §3):
  - `NUM_GAP_ABOVE = 1mm`: space between the previous line's dots and this line's number. (Lowered
    from an initial `2mm` planning value for the same one-page-default reason as `LABEL_H` above.)
  - `NUM_GAP_BELOW = 0.4mm`: space between this line's number and its own dot (kept deliberately
    smaller than `NUM_GAP_ABOVE` — a 2.5:1 ratio, the same ratio visually verified at the original,
    larger `2mm`/`0.8mm` values — which is the entire point of the fix).
  - `NUM_TEXT_H ≈ 1.8mm`: planning estimate for the day-number glyph height at the existing 5pt
    size; verified against the real compiled output, not assumed, during implementation.
  - `lineH = pitch + NUM_GAP_ABOVE + NUM_TEXT_H + NUM_GAP_BELOW` (replaces `pitch + NUM_H`; re-verified
    against the margin check per case).
- `#set block(spacing: 0pt)` (new, document-wide): Typst's default implicit block spacing was adding
  unaccounted-for height around the header (research.md §1 note). All vertical spacing in this
  template is explicit (`GAP`/`v()`/`stack(spacing: ...)`), so implicit block spacing is disabled
  document-wide rather than worked around per element.

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
`pitch + NUM_H`), since both layouts stack dot lines with a number band above each. `calendars`
inherits the lowered `LABEL_H` too (it already used this constant pre-feature), which restores
`calendars-default` (20 habits) to a one-page fit alongside `rows-default`.

- Fits when block width ≤ usable width and total height ≤ (usable height − headerH).

**Label decision (updated)**: the `LABEL_H` strip now applies to layouts `rows` and `calendars`
alike (both stack a label above wrapped dot lines). Layout `columns` keeps its own `LABEL_COL_H =
30mm` rotated header, unchanged.
