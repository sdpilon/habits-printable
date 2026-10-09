# Feature Specification: Compact, Polished Options UI

**Feature Branch**: `006-compact-controls-ui`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Do a UI uplift, make it look nice, make the controls take up less room that isn't needed."

## Clarifications

### Session 2026-10-08

- Q: Should this redesign commit to a specific accessibility bar (contrast ratios, keyboard tab
  order) as a testable requirement, or just preserve whatever accessibility the current form
  already has without a formal target? → A: WCAG AA contrast ratios (4.5:1 text, 3:1 UI elements)
  in both color schemes, plus unchanged keyboard tab order through the controls.
- Q: To make the controls more compact, is it acceptable to also shrink text/label font size, or
  should all the space savings come from layout alone? → A: Keep the current font size; space
  savings MUST come entirely from tighter spacing and layout (inline labels, grouping), not from
  smaller text.
- Q: A follow-up request to make controls "smaller" too, citing empty space inside the input
  controls themselves — does this mean shrinking font size (reversing the prior answer), or
  trimming the inputs' own internal padding/box size? → A: Trimming internal padding/box size
  only; font size stays unchanged, consistent with the prior answer. Internal control padding is
  called out explicitly as a target of the space reduction, not just the gaps between controls.
- Q: Should the redesign commit to a specific minimum touch-target size for inputs/buttons on
  mobile, so the size reduction has a hard floor it can't shrink past? → A: 24×24 CSS px minimum,
  per the WCAG 2.2 AA target-size criterion (2.5.8).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compact options panel (Priority: P1)

A user opens the app to generate a habit tracker PDF. Today, the options form stacks each
control's label above its input, so the eight controls (layout, habits, days, dots per row, dot
diameter, dot spacing, paper, download button) consume more vertical space than their content
needs. The user wants to see and reach every control without the form feeling bloated or pushing
useful content out of view.

**Why this priority**: This is the core, explicitly requested change ("make the controls take up
less room that isn't needed"). Without it, the rest of the uplift is just cosmetic polish on an
oversized form.

**Independent Test**: Can be fully tested by loading the app at a typical desktop viewport and
confirming every control and the download button are visible without scrolling the options panel,
and by comparing the panel's rendered height before and after the change.

**Acceptance Scenarios**:

1. **Given** the app loaded with default options, **When** viewed at a typical desktop viewport
   height, **Then** every control (layout, habits, days, dots per row, dot diameter, dot spacing,
   paper, messages area, download button) is visible without scrolling the options panel.
2. **Given** the app loaded at a reduced window height (e.g. a small laptop screen), **When** the
   options panel renders, **Then** controls remain legible, correctly labeled, and usable, with no
   overlapping or clipped content.

---

### User Story 2 - Visual polish (Priority: P2)

A user viewing the form perceives it as a tidy, deliberately designed panel rather than a quick
stack of default-styled inputs. Related fields read as a group instead of an undifferentiated
list, and interacting with a control (hover, focus) gives clear visual feedback.

**Why this priority**: Visual quality affects trust in a tool whose output is printed and shared.
It builds on the compaction in User Story 1 but can be evaluated independently of exactly how much
space the form occupies.

**Independent Test**: Can be fully tested by visually reviewing the rendered form against a short
checklist (grouped related fields, consistent spacing/alignment, clear hover/focus states, clear
visual priority for the download action) with no change to validation behavior or PDF output.

**Acceptance Scenarios**:

1. **Given** the default state, **When** viewing the form, **Then** related fields (e.g. the
   numeric count fields) are visually grouped rather than appearing as a uniform stack of
   identical rows.
2. **Given** a user hovers or focuses any control, **When** they interact with it, **Then** the
   control shows a clear, consistent visual state distinct from its resting state.
3. **Given** the form and the download button, **When** viewing the panel as a whole, **Then**
   the download button is visually distinguishable as the primary action.

---

### User Story 3 - Compact and polished on mobile too (Priority: P3)

A user on a narrow viewport (phone or narrow window, below the existing 720px breakpoint) gets the
same compactness and polish as desktop users, so the options form doesn't push the preview further
down the page than necessary.

**Why this priority**: The existing responsive breakpoint already stacks the form above the
preview; without extending the compaction and polish there, mobile users keep the current
oversized form despite the desktop improving.

**Independent Test**: Can be fully tested by narrowing the viewport below the existing breakpoint
and confirming the options panel is visibly more compact than the current implementation, leaving
more of the viewport for the preview.

**Acceptance Scenarios**:

1. **Given** a viewport narrower than the existing responsive breakpoint, **When** the page loads,
   **Then** the options panel occupies measurably less vertical space than the current layout,
   leaving more room for the preview below it.

---

### Edge Cases

- What happens when a validation message is shown (e.g. an invalid habit count)? The tightened
  layout must still show the message clearly, without overlapping adjacent controls.
- What happens when multiple validation messages are shown at once? The messages area must still
  render all of them legibly within the more compact panel.
- How does the layout hold up at very narrow widths (e.g. a 320px-wide phone)? Controls must stay
  comfortably tappable; compaction must not shrink touch targets to the point of being hard to use.
- How does the layout look in dark mode? Both the compaction and the visual polish must hold up in
  the existing light and dark color schemes.
- What happens when the overflow warning is shown (grid too large for one page)? The warning must
  remain clearly visible and not get visually lost in the tightened layout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The options form MUST present all existing controls (layout, habits, days, dots per
  row, dot diameter, dot spacing, paper, messages area, download button) using measurably less
  vertical space than the current stacked label-above-input layout, on both the desktop and mobile
  breakpoints.
- **FR-002**: The redesigned form MUST preserve all existing behavior unchanged: field validation,
  the overflow warning, the invalid-field styling, and the disabled state of the download button
  when the configuration is invalid or won't fit on one page.
- **FR-003**: Related fields MUST be visually grouped where doing so reduces wasted space and
  improves scannability, without hiding any control behind an extra interaction (e.g. no
  collapsed/expandable sections for controls that are currently always visible).
- **FR-003a**: Individual controls (inputs, selects, the download button) MUST have their own
  internal empty space (padding/box size) trimmed, not just the gaps between controls, since this
  is a significant source of the current form's bulk.
- **FR-004**: Every control MUST remain individually and correctly labeled (its accessible label
  still associated with its input) after the layout change.
- **FR-005**: The visual design MUST maintain a clear distinction between input controls and the
  primary action (the download button).
- **FR-006**: The redesigned layout MUST continue to support both the light and dark color schemes
  the application already provides.
- **FR-007**: All interactive controls (inputs, selects, the download button) MUST keep a tappable
  area of at least 24×24 CSS px at mobile sizes, per the WCAG 2.2 AA target-size criterion (2.5.8),
  even after the padding/box-size reduction in FR-003a.
- **FR-008**: The live PDF preview panel's size, position, and behavior MUST NOT be negatively
  affected by the options panel changes; the preview remains the dominant visual element on the
  page.
- **FR-009**: The redesigned styling MUST meet WCAG AA contrast ratios (at least 4.5:1 for text,
  3:1 for UI component boundaries/states) in both the light and dark color schemes, and MUST
  preserve the existing logical keyboard tab order through the controls.
- **FR-010**: The space reduction MUST be achieved without reducing current text or label font
  sizes; savings MUST come from tighter spacing (including internal control padding), inline
  label placement, and field grouping, not from making text smaller.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On common desktop viewport heights, all controls and the download button are visible
  without needing to scroll the options panel.
- **SC-002**: The vertical space occupied by the options panel, measured at default option values,
  is reduced by at least 30% compared to the current layout.
- **SC-003**: On mobile viewports (narrower than the existing responsive breakpoint), the options
  panel's vertical footprint is also reduced by at least 30% compared to the current layout,
  leaving at least as much visible space for the preview.
- **SC-004**: In an informal side-by-side review, the redesigned form is consistently described as
  more organized and less cluttered than the current layout.
- **SC-005**: Every existing automated check (unit tests, end-to-end tests, margin checks, and
  performance checks) continues to pass after the redesign, confirming no functional regression.
- **SC-006**: All text and interactive elements in the redesigned form meet WCAG AA contrast
  ratios (4.5:1 for text, 3:1 for UI components) in both light and dark mode, and keyboard users
  can tab through the controls in the same logical order as before.
- **SC-007**: Every interactive control keeps at least a 24×24 CSS px tappable area at mobile
  sizes, even with the trimmed padding/box sizing.

## Assumptions

- "Controls" refers to the web app's options form (layout, habits, days, dots per row, dot
  diameter, dot spacing, paper, messages area, download button) — not the printed Typst
  template/output, which is unaffected by this feature.
- The live preview panel stays the dominant visual element; compacting the form is in service of
  giving the preview relatively more visual priority, not shrinking the preview itself.
- "Look nice" means refining the existing minimalist, light/dark-aware aesthetic (spacing,
  alignment, typography, hover/focus states) rather than introducing a new visual theme, color
  palette, or branding.
- No options/fields are added or removed; this is a layout and visual-design change only, with no
  change to validation rules, option limits, or PDF output.
- Both the desktop (sidebar) and mobile (stacked) breakpoints receive the compactness and polish
  treatment, since the request did not limit the uplift to one of them.
- If the polish introduces hover/focus transitions or other motion, they respect a user's
  reduced-motion preference rather than always animating.
