# Data Model: Printable Habit Grid

Nothing is stored. These are the in-memory values the page holds and passes to the Typst template.

## TrackerOptions

The person's current settings. Each download and preview is built from one `TrackerOptions` value.

| Field           | Type                                 | Default | Rule                                                         | Source                |
| --------------- | ------------------------------------ | ------- | ------------------------------------------------------------ | --------------------- |
| `layout`        | enum: `rows`, `columns`, `calendars` | `rows`  | One of the three layouts                                     | FR-003                |
| `habits`        | integer                              | 5       | 1 ≤ habits ≤ 20                                              | FR-001, clarification |
| `days`          | integer                              | 31      | 1 ≤ days ≤ 365                                               | FR-002                |
| `perRow`        | integer                              | 7       | 1 ≤ perRow ≤ 31                                              | FR-006, clarification |
| `dotDiameterMm` | number                               | 4       | 2 ≤ value ≤ 5                                                | FR-007, clarification |
| `dotSpacingMm`  | number                               | 1.5     | 0.5 ≤ value ≤ 5 (planning default; range is not in the spec) | FR-007                |
| `paper`         | enum: `a4`, `letter`                 | `a4`    | A4 default                                                   | FR-011                |

The row label width (40 mm) is a fixed constant for layout (1), set in `typst/tracker.typ`. It is not a person-set option. Layouts (2) and (3) use the header sizes in the Label decision below.

**Validation (FR-012)**: A field that is empty, zero, negative, non-numeric, or over its maximum makes `TrackerOptions` invalid. The page shows a message for that field, keeps the last valid preview, and disables download.

**Overflow (FR-013)**: A valid `TrackerOptions` whose compiled template runs to more than one page is _overflowing_. The page shows the overflow warning and disables download.

## HabitRow (layout-specific shape)

One habit's section of the tracker. Its shape depends on `layout`:

| Layout      | Habit is        | Dots per line set by                           | Label sits         |
| ----------- | --------------- | ---------------------------------------------- | ------------------ |
| `rows`      | a row           | `perRow` dots per habit row, wrapping in order | left of the row    |
| `columns`   | a column        | `perRow` habits per row group                  | above the column   |
| `calendars` | a mini calendar | `perRow` dots per calendar row                 | above the calendar |

All three hold the same ordered sequence of `days` dots, one per day.

## DayDot

A single empty circle. Stroke only, diameter `dotDiameterMm`. Position follows from its habit and day index and the layout. Day-number labels appear on days 5, 10, 15, … and are printed text, not part of the dot.

## Relationships

- `TrackerOptions` → one layout → `habits` × `days` `DayDot`s, grouped into `HabitRow`s.
- The Typst template takes `TrackerOptions` as its input dictionary (see contracts/tracker-options.schema.json).

## Fit rules (overflow, FR-013)

Shared constants (planning defaults, recorded here so the rules can be checked):

Typst's page count (T011) decides overflow. The formulas below are a planning check: `tests/unit/fit.test.ts` (T015) fails if they disagree with the page count, and the formula is then corrected.

- Page: A4 is 210 × 297 mm; US Letter is 215.9 × 279.4 mm. Both portrait.
- Margin: 10 mm on every side. Usable area = page minus margins. This is the printable margin that Principle III requires on both papers.
- Pitch = `dotDiameterMm` + `dotSpacingMm`.
- Label header height `LABEL_H` = 6 mm. Gap between blocks `GAP` = 4 mm.
- Day-number bands: `NUM_H` = 3 mm above each dot line (layouts rows and calendars), so a dot line is `lineH = pitch + NUM_H`. `NUM_W` = 6 mm at the left of each row (layout columns).
- A layout overflows when its content is wider or taller than the usable area. Overflow blocks download (FR-013). Nothing is paginated or shrunk.

Layout (1) `rows`: fully specified.

- Lines per habit: `L = ceil(days / perRow)`.
- Block width: `40 mm + perRow × pitch` (the 40 mm label sits left of the dots).
- Block height: `L × lineH`.
- Total height: `habits × block height + (habits − 1) × GAP`.
- Fits when block width ≤ usable width and total height ≤ usable height.

Layout (2) `columns`: each habit's name is written vertically (rotated) in a header above its column.

- Groups of habit columns: `G = ceil(habits / perRow)`. Each group is `days` dots tall.
- Column width: `pitch`. The rotated name sits in the header above the column, so the column stays one dot wide.
- Header height `LABEL_COL_H` = 30 mm (planning default: room for a short name read vertically).
- Total height: `G × (LABEL_COL_H + days × pitch) + (G − 1) × GAP`.
- Total width: `NUM_W + min(habits, perRow) × column width`.
- Fits when total width ≤ usable width and total height ≤ usable height. With 365 days, the height alone exceeds one page, so the layout always overflows at that day count.

Layout (3) `calendars`: the name sits in a header that spans the calendar block.

- Block height: `BH = LABEL_H + ceil(days / perRow) × lineH`.
- Block width: `perRow × pitch`. The label header spans this width and is `LABEL_H` tall.
- Blocks per page row: `N = floor((usable width + GAP) / (block width + GAP))`.
- Total height: `ceil(habits / N) × BH + (ceil(habits / N) − 1) × GAP`.
- Fits when block width ≤ usable width and total height ≤ usable height.

**Label decision**: the 40 mm label area applies to layout (1) only. In layout (2) the name is rotated above each column in a `LABEL_COL_H` = 30 mm header. In layout (3) the name spans the calendar block in a `LABEL_H` header.
