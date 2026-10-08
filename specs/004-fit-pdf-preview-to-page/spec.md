# Feature Specification: Fit PDF Preview To Page

**Feature Branch**: `004-fit-pdf-preview-to-page`

**Created**: 2026-10-08

**Status**: Draft

**Input**: Re-scope of `003-fit-pdf-preview-height` (PR #3) after review: PR #3 bundled
the core viewport-fit behavior with an additional fit-mode selector (fit-height /
fit-width) that was mis-specified and is not wanted. This spec keeps only the core
behavior — the preview always fits the whole page in the viewport, undistorted, with
no mode choice.

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
   with no scrolling of the browser window needed, and the page's proportions are
   not distorted.
2. **Given** the preview is already showing a fully visible page, **When** the user
   changes an option that changes the page's content or proportions (e.g., habit
   count, days, layout, paper), **Then** the newly rendered page is re-fit, still
   without distortion, and without needing to scroll the browser window.
3. **Given** the preview is fully visible, **When** the user resizes the browser
   window, **Then** the preview re-fits, remaining undistorted and without needing
   to scroll the browser window.

---

### Edge Cases

- What happens when the generated page is unusually tall or wide relative to the
  other dimension (e.g., many habits in "one row per habit" layout)? The preview
  scales down until both dimensions fit, preserving the true ratio.
- What happens on a narrow/short browser window (e.g., a small laptop window, or the
  app's existing narrow-viewport layout where the form stacks above the preview)?
  The fit behavior must still work, scaled to whatever space is available to the
  preview area at that breakpoint, with the browser window never needing to scroll.
- What happens while the preview is re-rendering after an option change? The
  preview should not briefly show the page at a distorted or unfit size (e.g.,
  flash at native/stretched size, then correct).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The preview MUST scale the generated page proportionally, preserving
  its true width-to-height ratio; the page MUST NOT be stretched or squashed in
  either dimension (the previous preview distorted this ratio, which this feature
  corrects).
- **FR-002**: The preview MUST scale the page to fit entirely within the available
  preview area in both width and height simultaneously, with no scrolling required
  in the browser window or the preview area.
- **FR-003**: The preview MUST re-fit automatically whenever the generated page's
  content or proportions change.
- **FR-004**: The preview MUST re-fit automatically when the browser window is
  resized.
- **FR-005**: The fit behavior MUST remain functional at the narrow-viewport
  breakpoint the app already defines, not only at wide desktop sizes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On first load, with default options, 100% of the generated page is
  visible in the preview without scrolling the browser window.
- **SC-002**: The previewed page's width-to-height ratio matches the actual
  generated page's ratio exactly (no visible stretching or squashing).
- **SC-003**: After any single option change, the preview re-fits with no scrolling
  of the browser window required, with no extra action from the user.
- **SC-004**: After resizing the browser window, the preview re-fits with no
  scrolling of the browser window required, with no extra action from the user.
- **SC-005**: Users can identify the overall shape and content of the generated
  page (labels, dot grid, row/column structure) without zooming in, at a standard
  desktop browser window size (1280×800 or larger).

## Assumptions

- "The full height of the website" (the original request behind `003`) is satisfied
  by always fitting the complete page — full height and full width — without any
  browser-window scrolling. A user-facing fit-mode choice (fit-height-only /
  fit-width-only) was explored in `003` and explicitly dropped as not wanted.
- The browser window itself must never require scrolling.
- This fitting behavior applies at both the existing wide-desktop layout and the
  existing narrow-viewport (stacked) layout — "available space" means whatever room
  remains for the preview area at that breakpoint.
- This changes the on-screen preview only. The downloaded PDF file's own page size
  and scale are unaffected.
