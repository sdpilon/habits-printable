# Research: Layout controls — Shape, Direction, Repeat

No `NEEDS CLARIFICATION` markers remained in the Technical Context, but implementing the approved
design required confirming how it maps onto the existing `typst/tracker.typ` implementation. This
file records those findings as decisions.

## Decision: Collapse `row-habit` and `calendar-block` into one shared block builder

**Finding**: `typst/tracker.typ:67-83` (`row-habit`) and `typst/tracker.typ:110-125`
(`calendar-block`) are byte-identical function bodies — both wrap `days` into lines of `per-row`
dots and stack those lines `ttb` within the block. The only actual difference between today's
"rows" and "calendars" presets is at the page level: how multiple blocks are arranged (plain `ttb`
stack vs. an `ltr`-then-wrap grid).

**Decision**: Define a single per-habit block builder (the current `row-habit`/`calendar-block`
body) and use it for every `direction == "rows"` case, regardless of `shape`. Delete the duplicate
`calendar-block` function.

**Rationale**: Removing a duplicate that was already producing identical output removes risk of the
two drifting apart in a future change, and directly reflects the spec's finding that Shape's only
remaining effect — once Direction and Repeat are separated out — is selecting defaults and labels,
not a distinct rendering path.

**Alternatives considered**: Keep `calendar-block` as a separate function for conceptual clarity
even though it duplicates `row-habit`. Rejected: the duplication is the exact kind of hidden
coupling this feature exists to remove, and the two functions have already proven to drift toward
identical in practice — keeping them separate only invites a future edit to one without the other.

## Decision: One shared tiling function, parameterized by `repeat`, used by both block kinds

**Finding**: Today, only `calendars` mode (`typst/tracker.typ:154-161`) tiles blocks left-to-right
with wraparound (`per-page-row` computed from `usable-w`, `per-row`, `pitch`, and `gap`); `rows`
(`typst/tracker.typ:162-163`) and `columns` (`typst/tracker.typ:149-153`) each only `stack(dir:
ttb, ...)` their blocks/groups, with no tiling option.

**Decision**: Extract the `calendars` branch's grid-tiling logic into one function taking a list of
blocks (each with a known width) and a `repeat` direction (`"stacked"` → plain `ttb` stack;
`"side-by-side"` → the existing `ltr`-then-wrap grid math). Use this function for both the per-habit
line-blocks (`direction == "rows"`) and the per-group column-blocks (`direction == "columns"`),
replacing the three separate page-level branches with: pick the block builder (line vs. column-group)
from `direction`, then pick the arrangement (stacked vs. side-by-side) from `repeat`.

**Rationale**: This is what FR-008/FR-009 require (symmetric tiling for all Shape/Direction
combinations) and it reuses logic already proven correct for calendars, rather than re-deriving grid
math for columns and rows independently.

**Alternatives considered**: Hand-roll separate tiling logic per direction. Rejected — this
duplicates the exact asymmetry (different, independently-maintained tiling code per mode) that
produced today's "columns still stacks vertically" inconsistency the feature is fixing.

## Decision: Column-group tiling reuses the same per-page-row math, with group width in place of block width

**Finding**: `calendars`' existing per-page-row calculation (`typst/tracker.typ:155`) divides
`usable-w` by a fixed block width (`per-row * pitch + gap`), which holds because every calendar
block has the same width. Column-groups do not all have the same width: the last group may have
fewer habit-columns than `per-row` when `habits` isn't a multiple of `per-row`
(`typst/tracker.typ:150-152`, `calc.min(per-row, habits - g * per-row)`).

**Decision**: When tiling column-groups side-by-side, compute each group's width individually
(`num-w + n * pitch` for that group's `n`) rather than assuming a uniform block width, and pack
groups into page-rows greedily by remaining width rather than by a fixed per-page-row count.

**Rationale**: Reusing calendars' fixed-width assumption unmodified would either overflow the page
for a narrower trailing group's row-mates, or waste width by always sizing every row's capacity off
the widest (full) group. A plain per-page-row divisor only works because calendar blocks are
uniform; column-groups generally aren't.

**Alternatives considered**: Force every column-group to render at full `per-row` width (padding the
last group) so the existing fixed-width packer applies unmodified. Rejected — this would add visible
blank space / change today's `column-group` rendering for the common non-exact-multiple case, which
is out of scope and not something either preset currently does.

## Decision: Columns' default `repeat` becomes `side-by-side`, a deliberate behavior change

**Finding**: Confirmed directly with the user (see spec FR-005 edit history) that Direction=Columns
should default to `repeat: side-by-side`, even though today's "columns" preset has no side-by-side
option and always stacks vertically. This is an intentional default change, not a preservation of
current behavior.

**Decision**: Implement the default mapping as specified (Rows→Stacked, Columns→Side-by-side,
Calendar→Side-by-side) and ensure today's exact "columns" output remains reachable via
Direction=Columns, Repeat=Stacked (an explicit, non-default choice).

**Rationale**: The user judged side-by-side to be the more natural default for a columns-oriented
shape, and explicitly chose to accept a default-behavior change for this one combination in exchange
for removing the inconsistency. Full backward compatibility is preserved as a reachable
non-default state, satisfying SC-003's requirement that every old-preset output remain producible.

**Alternatives considered**: Keep Columns' default as Stacked to preserve pixel-identical default
output for all three legacy presets. Rejected by the user — see the `AskUserQuestion` exchange
during planning, which confirmed Side-by-side as the intended default despite the behavior change.
