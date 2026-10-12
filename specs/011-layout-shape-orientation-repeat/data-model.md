# Data Model: Layout controls — Shape, Direction, Repeat

Nothing is stored. These are the in-memory values the page holds and passes to the Typst template.
Supersedes the `layout` field described in `specs/001-printable-habit-grid/data-model.md`.

## TrackerOptions

| Field           | Type                            | Default | Rule                                                                                                                                                                                                                                                                                                                          | Source          |
| --------------- | ------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `shape`         | enum: `line`, `calendar`        | `line`  | One of the two shapes                                                                                                                                                                                                                                                                                                         | FR-001          |
| `direction`     | enum: `rows`, `columns`         | `rows`  | Ignored/not applicable when `shape` is `calendar` (FR-003)                                                                                                                                                                                                                                                                    | FR-002          |
| `repeat`        | enum: `stacked`, `side-by-side` | derived | Default depends on `shape`/`direction` (see Repeat defaults below)                                                                                                                                                                                                                                                            | FR-004, FR-005  |
| `habits`        | integer                         | 5       | 1 ≤ habits ≤ 20 (unchanged)                                                                                                                                                                                                                                                                                                   | existing        |
| `days`          | integer                         | 31      | 1 ≤ days ≤ 365 (unchanged)                                                                                                                                                                                                                                                                                                    | existing        |
| `perRow`        | integer                         | 7       | 1 ≤ perRow ≤ 31. **Used only when `shape` is `calendar`** (FR-014–FR-017) — for `shape: line`, a habit is always one unbroken line/group derived from `days`/`habits`, and the "Dots per row" control is hidden; the stored value is ignored (not cleared) while hidden, same pattern as `direction` under `shape: calendar`. | existing/FR-014 |
| `dotDiameterMm` | number                          | 4       | 2 ≤ value ≤ 5 (unchanged)                                                                                                                                                                                                                                                                                                     | existing        |
| `dotSpacingMm`  | number                          | 1.5     | 0.5 ≤ value ≤ 5 (unchanged)                                                                                                                                                                                                                                                                                                   | existing        |

`layout` is removed from `TrackerOptions`. `LAYOUTS` is removed from `options.ts`'s exports; `SHAPES`,
`DIRECTIONS`, and `REPEATS` readonly arrays replace it for validation. `paper` was later removed
entirely (US Letter was the only value Typst ever rendered — `typst/tracker.typ` hardcodes
`paper: "us-letter"` and never read a `paper` input — so the field and its "US Letter" selector were
dead weight).

### Repeat defaults

| `shape`    | `direction` | Default `repeat` | Reproduces today's...                                                                                                           |
| ---------- | ----------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `line`     | `rows`      | `stacked`        | "One row per habit" preset, exactly                                                                                             |
| `line`     | `columns`   | `side-by-side`   | **New default** — today's "Habits as columns" preset always stacks; `repeat: stacked` remains available to reproduce it exactly |
| `calendar` | _(n/a)_     | `side-by-side`   | "One mini calendar per habit" preset, exactly                                                                                   |

**Validation**: Unchanged shape for numeric fields (FR-012 in the original spec). `shape`,
`direction`, and `repeat` are validated like `layout` was — a value outside its enum is an
error; a `direction` value is accepted but has no effect when `shape` is `calendar` (FR-003), rather
than erroring, so stale form state from a prior `shape` selection never blocks validation.

**Overflow**: Unchanged (FR-013 in the original spec) — still decided by Typst's own page count, for
every reachable Shape/Direction/Repeat combination, not shrunk or paginated.

## HabitBlock (shape/direction-specific)

One habit's own section of the tracker (before Repeat decides how multiple HabitBlocks are
arranged). Its shape depends on `shape` and `direction`:

| `shape`    | `direction` | Habit is        | Dots per line/row set by                                                                                                          | Label sits         |
| ---------- | ----------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `line`     | `rows`      | a row           | `days` — always one unbroken line, never wrapped (FR-015)                                                                         | left of the row    |
| `line`     | `columns`   | a column        | `habits` (Repeat=Stacked, one unbroken group) or a computed page-width fit (Repeat=Side-by-side) — never `perRow` (FR-016/FR-017) | above the column   |
| `calendar` | _(n/a)_     | a mini calendar | `perRow`, the shape's own user-chosen wrap width                                                                                  | above the calendar |

`line`+`rows` and `calendar` use the identical block _builder_ (confirmed in research.md: today's
`row-habit` and `calendar-block` Typst functions are byte-identical) — `shape` doesn't select a
distinct rendering function, only which value feeds that builder's wrap width: `days` (always, for
`line`) or the user's `perRow` (for `calendar`). Column grouping is similarly derived rather than
user-set for `line` (FR-016/FR-017).

All block kinds hold the same ordered sequence of `days` dots, one per day.

## Repeat (new: page-level arrangement, independent of HabitBlock shape)

How multiple HabitBlocks are arranged on the page, previously hardcoded per preset (`rows`/`columns`
always `ttb`-stacked, `calendars` always tiled) and now a user-facing choice for every combination:

| `repeat`       | Arrangement                                                                                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stacked`      | Blocks/groups stack top-to-bottom in a single column (today's `rows`/`columns` behavior)                                                                                                                                   |
| `side-by-side` | Blocks/groups tile left-to-right, wrapping to a new row when the page width is used up (today's `calendars`-only behavior); falls back to a single column if even two blocks can't fit side-by-side (edge case in spec.md) |

For `direction: columns`, the unit that repeats is a column-_group_ (up to `perRow` habits as
columns), not a single habit — unchanged from today's `column-group`.

## DayDot

Unchanged from `specs/001-printable-habit-grid/data-model.md`: a single empty circle, stroke only,
diameter `dotDiameterMm`. Day-number labels appear on days 5, 10, 15, …

## Relationships

- `TrackerOptions` → `shape` + `direction` select a HabitBlock kind → `habits` × `days` `DayDot`s,
  grouped into HabitBlocks.
- `repeat` selects how those HabitBlocks are arranged on the page — orthogonal to the HabitBlock kind.
- The Typst template takes `TrackerOptions` as its input dictionary (`sys.inputs`), same mechanism as
  today, with `shape`/`direction`/`repeat` replacing `layout` as separate string inputs.

## Fit rules (overflow)

Builds on `specs/001-printable-habit-grid/data-model.md`'s fit rules (page size, margin, pitch,
label/gap constants — all unchanged). What changes is how block width/height combine when `repeat`
is `side-by-side`, generalized from the existing calendars-only calculation (research.md):

- A HabitBlock's own width: `perRow * pitch` for `direction: rows` (or `shape: calendar`); a
  column-group's width is `num-w + n * pitch` where `n` is that group's habit-column count (≤ `perRow`,
  and less than `perRow` for a trailing group when `habits` isn't a multiple of `perRow`).
- `repeat: stacked`: total height sums every block's/group's height (plus `gap` between them); width
  is a single block's/group's width (today's `rows`/`columns` fit check, unchanged).
- `repeat: side-by-side`: blocks/groups pack left-to-right into the usable width, wrapping to a new
  page-row when the next block/group wouldn't fit; total height sums each page-row's height (plus
  `gap` between page-rows). For uniform-width blocks (every `line`+`rows` block, every `calendar`
  block) this is today's calendars page-row math unchanged. For `line`+`columns` groups, page-rows
  are packed by remaining width rather than a fixed count, since trailing groups may be narrower
  (research.md decision).
- `tests/unit/fit-model.ts` mirrors these formulas, same role as today: a planning check that fails
  if it disagrees with Typst's actual page count, at which point the formula is corrected.
