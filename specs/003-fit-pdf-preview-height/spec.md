# Feature Specification: Fit PDF Preview To Viewport Height

**Feature Branch**: `003-fit-pdf-preview-height`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "show the whole pdf (make sure the preview fits to the full height of the website)"

## Clarifications

### Session 2026-10-07

- Q: Should the preview also avoid horizontal scrolling, or is it acceptable for a tall/narrow page to end up wider than the preview area (requiring horizontal scroll) once it's scaled to fully fit the available height? → A: Offer three selectable fit modes — "fit-height" (scales the width to match), "fit-width" (scales the height to match), and "fit-page" (fits both dimensions at once) — all of which preserve the page's true aspect ratio (the current preview distorts it, which this feature also corrects). None of the three modes require scrolling the browser window itself.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the entire generated page without distortion (Priority: P1)

A user adjusts the habit-tracker options (layout, habit count, days, dot sizing,
paper) and wants to see the complete generated page in the preview, edge to edge,
without scrolling the browser window and without the page looking stretched or
squashed out of its true proportions.

**Why this priority**: This is the core value of the feature. Today the preview
renders the page at native size (so the user has to scroll to see the bottom) and
does not preserve the page's true proportions. Fixing both — full visibility and
correct proportions — is what makes the preview trustworthy.

**Independent Test**: Load the app at a typical desktop window size (1280×800 or
larger), leave the default options in place, and confirm the entire generated page
is visible in the preview without scrolling the browser window, and that its
proportions match the actual generated page (not stretched or squashed).

**Acceptance Scenarios**:

1. **Given** the app is freshly loaded with default options, **When** the preview
   renders, **Then** the full generated page is visible within the browser window,
   in the default "fit-page" mode, with no scrolling of the browser window needed,
   and the page's proportions are not distorted.
2. **Given** the preview is already showing a fully visible page, **When** the user
   changes an option that changes the page's content or proportions (e.g., habit
   count, days, layout, paper), **Then** the newly rendered page is re-fit using the
   current mode, still without distortion, and without needing to scroll the
   browser window.
3. **Given** the preview is fully visible, **When** the user resizes the browser
   window, **Then** the preview re-fits using the current mode, remaining
   undistorted and without needing to scroll the browser window.

---

### User Story 2 - Choose how the page fits the preview (Priority: P2)

A user wants to see the page scaled to its full height (to judge vertical spacing
precisely) or its full width (to judge horizontal spacing precisely), instead of
the default view that shows the whole page at once.

**Why this priority**: The default "fit-page" view is enough to confirm the whole
layout at a glance, but a user fine-tuning spacing may want to maximize one
dimension. This is a secondary refinement on top of User Story 1's core guarantee.

**Independent Test**: With the preview showing a page, select "fit-height" and
confirm the page's height fills the available vertical space (width scaled
proportionally); select "fit-width" and confirm the page's width fills the
available horizontal space (height scaled proportionally); select "fit-page" and
confirm the full page is visible in both dimensions. Confirm proportions stay
correct in all three.

**Acceptance Scenarios**:

1. **Given** the preview is showing a page in "fit-page" mode, **When** the user
   selects "fit-height", **Then** the page is rescaled so its full height fills the
   available vertical space, its width scaled proportionally, without distortion.
2. **Given** the preview is showing a page in "fit-page" mode, **When** the user
   selects "fit-width", **Then** the page is rescaled so its full width fills the
   available horizontal space, its height scaled proportionally, without
   distortion.
3. **Given** the user has selected "fit-height" or "fit-width", **When** the user
   changes a habit-tracker option, **Then** the preview re-fits using the same
   selected mode (the mode is not reset).

---

### Edge Cases

- What happens when the generated page is unusually tall relative to its width
  (e.g., many habits in "one row per habit" layout)? In "fit-page" mode it scales
  down until both dimensions fit. In "fit-height" mode, its height fills the
  available space and it becomes correspondingly narrow (width scaled down to
  match, preserving the ratio).
- What happens when the generated page is unusually wide relative to its height?
  In "fit-page" mode it scales down until both dimensions fit. In "fit-width" mode,
  its width fills the available space and it becomes correspondingly short (height
  scaled down to match, preserving the ratio).
- In "fit-height" or "fit-width" mode, what happens on the dimension that isn't
  being fit (e.g., width in "fit-height" mode) if the proportionally-scaled result
  is larger than the available space in that dimension? The browser window itself
  must still not require scrolling; any overflow on that one dimension is contained
  within the preview area itself, not the page.
- What happens on a narrow/short browser window (e.g., a small laptop window, or
  the app's existing narrow-viewport layout where the form stacks above the
  preview)? All three fit modes must still work, scaled to whatever space is
  available to the preview area at that breakpoint, with the browser window never
  needing to scroll.
- What happens while the preview is re-rendering after an option change or mode
  switch? The preview should not briefly show the page at a distorted or unfit
  size (e.g., flash at native/stretched size, then correct).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The preview MUST offer exactly three fit modes: "fit-height",
  "fit-width", and "fit-page".
- **FR-002**: In every fit mode, the preview MUST scale the generated page
  proportionally, preserving its true width-to-height ratio; the page MUST NOT be
  stretched or squashed in either dimension (the current preview distorts this
  ratio, which this feature corrects).
- **FR-003**: "Fit-page" mode MUST scale the page to fit entirely within the
  available preview area in both width and height simultaneously, with no
  scrolling required in the browser window or the preview area.
- **FR-004**: "Fit-height" mode MUST scale the page so its full height is visible
  within the available vertical space (width scaling proportionally); the browser
  window MUST NOT require scrolling to see the full height of the page.
- **FR-005**: "Fit-width" mode MUST scale the page so its full width is visible
  within the available horizontal space (height scaling proportionally); the
  browser window MUST NOT require scrolling to see the full width of the page.
- **FR-006**: The preview MUST default to "fit-page" mode on first load, matching
  the original goal of seeing the whole page at once without any scrolling.
- **FR-007**: Users MUST be able to switch between the three fit modes, with the
  preview updating immediately to reflect the newly selected mode.
- **FR-008**: The selected fit mode MUST persist across option changes (habit
  count, days, layout, etc.) and window resizes until the user selects a different
  mode.
- **FR-009**: The preview MUST re-fit automatically, using the currently selected
  mode, whenever the generated page's content or proportions change.
- **FR-010**: The preview MUST re-fit automatically, using the currently selected
  mode, when the browser window is resized.
- **FR-011**: All three fit modes MUST remain available and functional at the
  narrow-viewport breakpoint the app already defines, not only at wide desktop
  sizes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On first load, with default options, 100% of the generated page is
  visible in the preview (default "fit-page" mode) without scrolling the browser
  window.
- **SC-002**: In every fit mode, the previewed page's width-to-height ratio matches
  the actual generated page's ratio exactly (no visible stretching or squashing).
- **SC-003**: After any single option change or fit-mode switch, the preview
  re-fits with no scrolling of the browser window required, with no extra action
  from the user.
- **SC-004**: After resizing the browser window, the preview re-fits with no
  scrolling of the browser window required, with no extra action from the user.
- **SC-005**: Users can identify the overall shape and content of the generated
  page (labels, dot grid, row/column structure) in any fit mode without zooming
  in, at a standard desktop browser window size (1280×800 or larger).
- **SC-006**: Users can switch between all three fit modes and see the preview
  update accordingly in under 1 second.

## Assumptions

- "The full height of the website" (the original request) is satisfied by the
  default "fit-page" mode, which shows the complete page — full height and full
  width — without any browser-window scrolling; "fit-height" and "fit-width" are
  additional modes for users who want to maximize one dimension.
- The browser window itself must never require scrolling in any fit mode. In
  "fit-height"/"fit-width" modes, if the non-primary dimension's
  proportionally-scaled size exceeds the available space, that overflow is handled
  within the preview area itself (e.g., its own internal scroll), not by scrolling
  the page.
- This fitting behavior applies at both the existing wide-desktop layout and the
  existing narrow-viewport (stacked) layout — "available space" means whatever
  room remains for the preview area at that breakpoint.
- The selected fit mode persists across option changes and window resizes until
  the user actively changes it, and resets to the default ("fit-page") only on a
  fresh page load.
- This changes the on-screen preview only. The downloaded PDF file's own page size
  and scale are unaffected.
