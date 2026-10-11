# Feature Specification: Layout controls: Shape, Direction, Repeat

**Feature Branch**: `011-layout-shape-orientation-repeat`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "Model: Shape (per-habit): line or calendar. Orientation (only meaningful for line): horizontal (= today's "rows") or vertical (= today's "columns"). Calendar has no orientation control — exposing it would be confusing with no real use case, so it's fixed. Repeat direction (how multiple habit-shapes tile across the page): horizontal or vertical, available for every shape, with a sensible default per combo: line+horizontal → repeat vertical (today's only "rows" behavior); line+vertical → repeat horizontal (today's only "columns" behavior); calendar → repeat horizontal (today's only "calendars" behavior); the non-default repeat option becomes available for all three, which is what generalizes "calendars'" grid-tiling to also work for rows and columns — directly resolving the asymmetry, as a user choice rather than a hardcode. days and perRow keep their current meaning. UI controls: 1. "Shape": Line / Calendar. 2. "Direction" (shown only when Shape = Line): Rows / Columns. 3. "Repeat": Stacked / Side-by-side — defaults change based on (1)+(2), user can override. Data model (options.ts): replace layout: 'rows'|'columns'|'calendars' with shape: 'line'|'calendar', orientation: 'horizontal'|'vertical' (ignored/hidden when shape=calendar), repeat: 'horizontal'|'vertical'. Typst template: generalize the page-level packing currently only implemented for calendar blocks into one shared tiling function parameterized by repeat direction, used by all three shape/orientation combos instead of calendars being special-cased."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Understand what each layout control actually does (Priority: P1)

A user configuring their habit tracker currently picks from a single "layout" dropdown ("One row per habit" / "Habits as columns" / "One mini calendar per habit") without any indication of what's actually different between the three, or that two independent numbers (days, dots per row) already drive all of them underneath. They want controls that make the actual structure of the layout obvious: what shape each habit's dots take, which way that shape grows, and how multiple habits' shapes repeat across the page.

**Why this priority**: This is the core problem driving the whole change — the existing control surface hides a simple model behind three opaque, loosely-related presets. Without this, nothing else in the feature matters.

**Independent Test**: Can be fully tested by opening the options panel and confirming that choosing each Shape/Direction/Repeat combination produces the output that today's three presets produce, with the relationship between the controls and the output now legible from the controls themselves (e.g. via labels/help text) rather than needing to experiment.

**Acceptance Scenarios**:

1. **Given** the options panel, **When** the user sets Shape to Line and Direction to Rows, **Then** the output matches today's "One row per habit" preset exactly (days wrap into lines of "dots per row" width, lines stack vertically within a habit, habits stack vertically down the page).
2. **Given** the options panel, **When** the user sets Shape to Line, Direction to Columns, and Repeat to Stacked, **Then** the output matches today's "Habits as columns" preset exactly (the new default for this combination is Side-by-side, a deliberate change from today — see User Story 2).
3. **Given** the options panel, **When** the user sets Shape to Calendar, **Then** the output matches today's "One mini calendar per habit" preset exactly, and no Direction control is shown.

---

### User Story 2 - Tile habit blocks side-by-side regardless of shape (Priority: P2)

A user whose habits wrap into short lines (e.g. few days or a small "dots per row") wants multiple habits' blocks to sit side-by-side on the page instead of stacking in one long column, to use page space efficiently. Today this is only possible with the "calendars" preset — a user who wants the Rows or Columns shape, but tiled side-by-side the way calendars already tile, has no way to get it.

**Why this priority**: This is the concrete capability gap the user identified ("columns still try to stack vertically" even when there's room to tile) — it's the second most important thing the new model needs to deliver after making the existing presets legible. Resolving it means Columns' default behavior changes: today Columns always stacks vertically with no alternative; under the new model, Columns defaults to Side-by-side (the more natural default for a columns-oriented shape), with Stacked available as an explicit override for anyone who wants today's exact old behavior.

**Independent Test**: Can be fully tested by setting Shape=Line, Direction=Columns, Repeat=Side-by-side with enough habits that today's "columns" preset would overflow a single vertical stack, and confirming the extra habit-groups tile to the right instead of only growing downward.

**Acceptance Scenarios**:

1. **Given** Shape=Line, Direction=Rows, **When** the user sets Repeat to Side-by-side, **Then** habit blocks that would otherwise stack vertically down the page instead tile left-to-right and wrap to a new row of blocks when the page width is used up.
2. **Given** Shape=Line, Direction=Columns, **When** the user sets Repeat to Side-by-side, **Then** habit-column groups that currently always stack vertically (today's exception) instead tile left-to-right and wrap, the same way calendar blocks already do.
3. **Given** Shape=Calendar, **When** the user sets Repeat to Stacked, **Then** calendar blocks stack in a single vertical column instead of tiling into a grid.

---

### User Story 3 - Configure a calendar shape without an irrelevant control (Priority: P3)

A user choosing the Calendar shape wants to set "dots per row" to control the calendar's width (e.g. 5 for a weekdays-only calendar) without being shown an "orientation" control that has no meaningful effect for calendars and would only cause confusion.

**Why this priority**: Lower priority because it's a refinement of control visibility rather than new layout capability, but it directly prevents the new model from reintroducing the kind of confusing, purposeless control the redesign is meant to eliminate.

**Independent Test**: Can be fully tested by switching Shape to Calendar and confirming the Direction control disappears (or is disabled) from the panel, with no observable effect on output even if a leftover value were somehow applied.

**Acceptance Scenarios**:

1. **Given** Shape is set to Line with a Direction selected, **When** the user switches Shape to Calendar, **Then** the Direction control is hidden and has no effect on the rendered output.
2. **Given** Shape is set to Calendar, **When** the user switches Shape back to Line, **Then** the Direction control reappears, defaulted to Rows.

---

### Edge Cases

- What happens when the user has only one habit? Repeat direction has no visible effect (nothing to tile), but selecting it must not error or change the single block's own internal layout.
- What happens when "days" is less than or equal to "dots per row" (no wrapping needed within a single habit's shape)? Repeat direction still governs how multiple single-line/single-row habit blocks arrange relative to each other.
- What happens to a previously saved or shared configuration that used the old single "layout" value (rows/columns/calendars)? Each old value must map to one specific Shape+Direction+Repeat combination so the rendered output for that configuration is unchanged by default.
- What happens when Repeat is set to Side-by-side but the page is too narrow to fit even two blocks side-by-side? The layout falls back to a single column of blocks (equivalent to Stacked), consistent with how calendar tiling already degrades today.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a "Shape" control with exactly two options: Line and Calendar.
- **FR-002**: System MUST provide a "Direction" control with options Rows and Columns, visible and applicable only when Shape is set to Line.
- **FR-003**: System MUST hide or disable the Direction control, and ignore any previously selected Direction value, when Shape is set to Calendar.
- **FR-004**: System MUST provide a "Repeat" control with options Stacked and Side-by-side, available and meaningful for every Shape/Direction combination.
- **FR-005**: System MUST default Repeat to Stacked when Direction is Rows, to Side-by-side when Direction is Columns, and to Side-by-side when Shape is Calendar. The Rows and Calendar defaults reproduce today's existing behavior exactly; the Columns default is a deliberate change from today's behavior (which always stacks vertically with no alternative), chosen because side-by-side is the more natural default for a columns-oriented shape.
- **FR-006**: Users MUST be able to override the default Repeat selection for any Shape/Direction combination.
- **FR-007**: System MUST continue to let users independently set total days per habit. Dots-per-row/calendar-row-width is a Shape=Calendar-only control (superseded by FR-014): for Shape=Line, a habit is always a single unbroken line or group, sized from Days and Habits alone.
- **FR-014**: System MUST hide the "Dots per row" control for Shape=Line (both Directions); it remains visible and user-editable only for Shape=Calendar, where it sets that shape's own arbitrary wrap width (e.g. 5 for weekdays-only).
- **FR-015**: For Shape=Line, Direction=Rows, System MUST render each habit as one unbroken line of all `days` dots, never wrapping internally regardless of width.
- **FR-016**: For Shape=Line, Direction=Columns, Repeat=Stacked, System MUST render all habits as one unbroken group of columns (no artificial grouping); a group too wide for the page MUST be blocked by the existing overflow warning (FR-013 in the original spec), never auto-wrapped.
- **FR-017**: For Shape=Line, Direction=Columns, Repeat=Side-by-side, System MUST compute the largest habit-column group that fits the page width (never a user-chosen number) and tile multiple such groups side-by-side, wrapping as needed — preserving the same tiling capability as FR-008 without a manual grouping control.
- **FR-008**: System MUST allow habit-column groups (Shape=Line, Direction=Columns) to tile left-to-right and wrap when Repeat is set to Side-by-side, rather than only ever stacking vertically as today.
- **FR-009**: System MUST allow habit-row blocks (Shape=Line, Direction=Rows) to tile left-to-right and wrap when Repeat is set to Side-by-side, matching the tiling behavior already available to calendar blocks today.
- **FR-010**: System MUST allow calendar blocks (Shape=Calendar) to stack in a single vertical column when Repeat is set to Stacked, in addition to their existing side-by-side tiling.
- **FR-011**: System MUST map each of today's three preset values (rows, columns, calendars) to one specific Shape+Direction+Repeat combination. The Rows and Calendars mappings MUST render identically by default after this change. The Columns mapping's default output changes from today (see FR-005); per FR-014–FR-017, "Dots per row" no longer exists as a manual grouping control for Columns at all, so the original pre-FR-014 columns preset's exact grouping width is reachable only for habit counts that already fit in one unbroken group or one page-width-computed group — a further, deliberate departure from strict backward compatibility beyond what this FR originally promised.

### Key Entities

- **Layout Configuration**: The per-habit-tracker settings that determine page layout: Shape (Line or Calendar), Direction (Rows or Columns; applicable only to Line), Repeat (Stacked or Side-by-side), total days, and dots-per-row. Shape and Direction together determine how a single habit's dots are arranged; Repeat determines how multiple habits' shapes are arranged relative to each other on the page.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can determine, from the on-screen controls alone (no external documentation), which Shape/Direction/Repeat combination reproduces each of the three previously available presets.
- **SC-002**: A user can produce a side-by-side tiled layout using Line+Rows or Line+Columns shapes — a combination not previously reachable through any existing preset.
- **SC-003**: Every configuration producible under the old three-preset model remains producible under the new model with pixel-identical output — for Rows and Calendars via each preset's mapped default combination, and for Columns via Direction=Columns with Repeat explicitly set to Stacked (since Columns' new default is Side-by-side, a deliberate behavior change — see FR-005).
- **SC-004**: Switching Shape never leaves a visible control on screen that has no effect on the rendered layout.

## Assumptions

- This change affects only the on-screen layout controls and the underlying layout computation that interprets them; dot size, dot spacing, paper size, title, and habit count controls are unaffected and out of scope.
- Side-by-side tiling for the Line+Rows and Line+Columns combinations reuses the same page-fitting and wrapping logic already proven out for calendar blocks' existing tiling, rather than introducing new fitting rules.
- There is no persisted user data or shared-link format that needs a migration path beyond mapping the three old preset values to their equivalent new combinations; no external consumers depend on the old `layout` value's exact name.
