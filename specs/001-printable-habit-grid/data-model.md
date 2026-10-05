# Data Model: Printable Habit Grid

Nothing is stored. These are the in-memory values the page holds and passes to the Typst template.

## TrackerOptions

The person's current settings. Each download and preview is built from one `TrackerOptions` value.

| Field | Type | Default | Rule | Source |
|-------|------|---------|------|--------|
| `layout` | enum: `rows`, `columns`, `calendars` | `rows` | One of the three layouts | FR-003 |
| `habits` | integer | 5 | 1 ≤ habits ≤ 20 | FR-001, clarification |
| `days` | integer | 31 | 1 ≤ days ≤ 365 | FR-002 |
| `perRow` | integer | 7 | 1 ≤ perRow ≤ 31 | FR-006, clarification |
| `dotDiameterMm` | number | 4 | 2 ≤ value ≤ 5 | FR-007, clarification |
| `dotSpacingMm` | number | 1.5 | 0.5 ≤ value ≤ 5 (planning default; range is not in the spec) | FR-007 |
| `labelWidthMm` | number | 40 | Fixed at 40 | FR-005, clarification |
| `paper` | enum: `a4`, `letter` | `a4` | A4 default | FR-011 |

**Validation (FR-012)**: A field that is empty, zero, negative, non-numeric, or over its maximum makes `TrackerOptions` invalid. The page shows a message for that field, keeps the last valid preview, and disables download.

**Overflow (FR-013)**: A valid `TrackerOptions` whose compiled template runs to more than one page is *overflowing*. The page shows the overflow warning and disables download.

## HabitRow (layout-specific shape)

One habit's section of the tracker. Its shape depends on `layout`:

| Layout | Habit is | Dots per line set by | Label sits |
|--------|----------|----------------------|------------|
| `rows` | a row | `perRow` dots per habit row, wrapping in order | left of the row |
| `columns` | a column | `perRow` habits per row group | above the column |
| `calendars` | a mini calendar | `perRow` dots per calendar row | above the calendar |

All three hold the same ordered sequence of `days` dots, one per day.

## DayDot

A single empty circle. Stroke only, diameter `dotDiameterMm`. Position follows from its habit and day index and the layout. Day-number labels appear on days 5, 10, 15, … and are printed text, not part of the dot.

## Relationships

- `TrackerOptions` → one layout → `habits` × `days` `DayDot`s, grouped into `HabitRow`s.
- The Typst template takes `TrackerOptions` as its input dictionary (see contracts/tracker-options.schema.json).
