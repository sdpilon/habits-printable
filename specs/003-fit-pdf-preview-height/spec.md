# Feature Specification: Fit PDF Preview To Viewport Height

**Feature Branch**: `003-fit-pdf-preview-height`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "show the whole pdf (make sure the preview fits to the full height of the website)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the entire generated page at a glance (Priority: P1)

A user adjusts the habit-tracker options (layout, habit count, days, dot sizing,
paper) and wants to see the complete generated page in the preview, from top to
bottom, without scrolling the page to check whether the bottom of the grid looks
right.

**Why this priority**: This is the only behavior the feature changes. Today the
preview renders the page at its native size, which can be taller than the browser
window, so the bottom of the page is only visible after scrolling. Seeing the whole
page at once is the entire value of this feature.

**Independent Test**: Load the app at a typical desktop window size, leave the
default options in place, and confirm the entire generated page — top edge to
bottom edge — is visible in the preview area without scrolling the window.

**Acceptance Scenarios**:

1. **Given** the app is freshly loaded with default options, **When** the preview
   renders, **Then** the full generated page is visible within the browser window's
   current height, with no vertical scrolling needed to see the top or bottom of
   the page.
2. **Given** the preview is already showing a fully visible page, **When** the user
   changes an option that changes the page's content or proportions (e.g., habit
   count, days, layout, paper), **Then** the newly rendered page is still fully
   visible within the window's height, with no vertical scrolling needed.
3. **Given** the preview is fully visible, **When** the user resizes the browser
   window, **Then** the preview adjusts so the full page remains visible within the
   new window height.

---

### Edge Cases

- What happens when the generated page is unusually tall relative to its width
  (e.g., many habits in "one row per habit" layout)? The preview must still show
  the full page within the available height, scaling down as needed.
- What happens on a narrow/short browser window (e.g., a small laptop window, or
  the app's existing narrow-viewport layout where the form stacks above the
  preview)? The preview must still fit the full page within whatever vertical
  space remains for it, without vertical scrolling of the preview area.
- What happens while the preview is re-rendering after an option change? The
  preview should not briefly show the page at an unfit size (e.g., flash at native
  size then resize) in a way that requires a scroll during that moment.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The preview MUST display the complete generated page — full height,
  top to bottom — within the visible browser window at all times, without
  requiring the user to scroll to see any part of the page.
- **FR-002**: The preview MUST scale the generated page proportionally (preserving
  its width-to-height ratio) to fit the available space, rather than cropping any
  part of the page out of view.
- **FR-003**: The preview MUST re-fit automatically whenever the generated page's
  content or proportions change (e.g., habit count, days, layout, dot sizing, or
  paper selection), without requiring a manual user action.
- **FR-004**: The preview MUST re-fit automatically when the browser window is
  resized.
- **FR-005**: The preview MUST remain fully visible at the narrow-viewport
  breakpoint the app already defines, not only at wide desktop sizes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On first load, with default options, 100% of the generated page's
  height is visible in the preview without scrolling.
- **SC-002**: After any single option change, the full page remains visible in the
  preview without scrolling, with no extra action required from the user.
- **SC-003**: After resizing the browser window, the full page is visible in the
  preview without scrolling, with no extra action required from the user.
- **SC-004**: Users can identify the overall shape and content of the generated
  page (labels, dot grid, row/column structure) in the fitted preview without
  zooming in, at common desktop window sizes.

## Assumptions

- "The full height of the website" means the browser window's visible height at
  the time of viewing, not a fixed pixel size — the preview adapts to whatever
  height is actually available, consistent with how the rest of the layout already
  responds to the viewport.
- Showing the complete page takes priority over preserving a specific zoom level;
  the preview may scale the rendered page up or down (within reason) to fit.
- This fitting behavior applies at both the existing wide-desktop layout and the
  existing narrow-viewport (stacked) layout — "full height" means whatever
  vertical space is available to the preview area at that breakpoint, not
  specifically the full browser window.
- This changes the on-screen preview only. The downloaded PDF file's own page size
  and scale are unaffected.
- No new user-facing zoom/pan controls are introduced; fitting is automatic.
