# Quickstart: Layout controls — Shape, Direction, Repeat

Manual validation guide. Every scenario starts from the defaults below unless noted; reset the form
first, then make only the listed changes. Build/implementation details are in tasks.md; nothing
here installs anything.

## Prerequisites

- This feature's `web/index.html`, `web/src/options.ts`, `web/src/main.ts`, and
  `typst/tracker.typ` changes are implemented (or present on the branch being validated).

## Run the page

```bash
pnpm install
pnpm dev
```

Open the printed local URL. The form starts at these defaults:

| Setting      | Default   |
| ------------ | --------- |
| Shape        | Line      |
| Direction    | Rows      |
| Repeat       | Stacked   |
| Habits       | 5         |
| Days         | 31        |
| Per row      | 7         |
| Dot diameter | 4 mm      |
| Dot spacing  | 1.5 mm    |
| Paper        | US Letter |

## Scenarios to check by hand

1. **Defaults reproduce today's "rows" preset** (User Story 1, scenario 1; SC-001, SC-003). No
   changes. Expect a one-page PDF identical to today's default output: 5 habits, each wrapping 31
   dots across 5 lines of 7, stacked top-to-bottom.
2. **Columns reproduces today's "columns" preset — with Repeat overridden** (User Story 1, scenario
   2; SC-003). Change:
   - Direction: Columns
   - Repeat: Stacked (override the new default — see scenario 3)
   - Expect output identical to today's "Habits as columns" preset: habits as columns, groups
     stacked vertically.
3. **Columns' new default tiles side-by-side** (User Story 2, scenario 2; this is a deliberate
   behavior change — see spec FR-005). Change:
   - Direction: Columns
   - Habits: 15 (enough to span more than one group at the default `perRow`)
   - Leave Repeat at its default (Side-by-side)
   - Expect multiple column-groups to tile left-to-right and wrap to a new row of groups, instead of
     only stacking downward.
4. **Calendar reproduces today's "calendars" preset** (User Story 1, scenario 3; SC-001, SC-003).
   Change:
   - Shape: Calendar
   - Expect output identical to today's "One mini calendar per habit" preset (blocks tiled in a
     grid), and no Direction control visible (User Story 3, scenario 1).
5. **Rows can now tile side-by-side too** (User Story 2, scenario 1; SC-002 — a combination not
   previously reachable). Change:
   - Per row: 3 (short lines, so several habit blocks fit per page-row)
   - Repeat: Side-by-side
   - Expect habit blocks to tile left-to-right and wrap, the way calendar blocks already do today.
6. **Calendar can now stack instead of tile** (User Story 2, scenario 3). Change:
   - Shape: Calendar
   - Repeat: Stacked
   - Expect calendar blocks to stack in a single vertical column instead of tiling into a grid.
7. **Switching Shape never leaves a stale control** (User Story 3, scenario 2; SC-004). Change:
   - Shape: Calendar, then back to Line
   - Expect the Direction control to disappear when Shape is Calendar, then reappear defaulted to
     Rows when switched back to Line — not left on whatever Direction was selected before.
8. **Narrow-page side-by-side fallback** (Edge Cases). Change:
   - Repeat: Side-by-side
   - Habits: 1
   - Expect no error and no visible difference from Stacked (nothing to tile with only one habit).

## Margin check (constitution Principle II/III)

```bash
pnpm margins
```

Must pass for both the legacy combinations (scenarios 1, 2, 4) and the newly-reachable ones
(scenarios 3, 5, 6) — add cases for the latter to `tests/comparison/cases.json` if not already
covered.

## Unit tests

```bash
pnpm test
```

Covers validation of the new `shape`/`direction`/`repeat` fields (`options.test.ts`) and the fit
formulas for side-by-side column-group tiling (`fit-model.ts`, `fit.test.ts`).

## Performance check

```bash
pnpm perf
```

Confirms collapsing `row-habit`/`calendar-block` into one shared block builder didn't regress the
existing Typst compile-time budget.
