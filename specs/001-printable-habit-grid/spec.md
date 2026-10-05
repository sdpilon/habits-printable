# Feature Specification: Printable Habit Grid

**Feature Branch**: Not applicable (project is not a git repository)

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "this is a project that should produce a printable template pdf. It is for a habit tracker consisting of a grid of dots that can be filled in by hand once printed out, each dot representing one day for a single habit. The amount of habits, the number of days for each habit, and the layout of the grid should be customizable. There should be a web page where these options can be chosen and a preview shown updating live. The template should export as a pdf that is identical to the preview. It should be made using Typst, so the layout is pixel-perfect and the preview is instant."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate and download a printable habit grid (Priority: P1)

A person wants a paper habit tracker. They open the web page, choose how many habits they want to track and how many days each habit should cover, then download a PDF they can print and fill in by hand.

**Why this priority**: This is the core value of the product. Without a downloadable, printable PDF with the chosen counts, nothing else is useful.

**Independent Test**: Set the habit count and day count on the page, download the PDF, print it (or view it), and confirm it shows exactly that many rows of dots with exactly that many dots per row.

**Acceptance Scenarios**:

1. **Given** the options page is open with default values, **When** the person clicks download without changing anything, **Then** a PDF is produced containing the default number of habits and days, each habit represented by one row of empty dots.
2. **Given** the person sets 5 habits and 30 days, **When** they download the PDF, **Then** the PDF has 5 habit rows, each with 30 dots, and every dot is an empty circle suitable for hand-filling.
3. **Given** a downloaded PDF, **When** it is printed on standard home paper at 100% scale, **Then** all dots and habit labels are fully on the page and not clipped at the edges.

---

### User Story 2 - See a live preview while choosing options (Priority: P2)

While adjusting options, the person sees the tracker page drawn on screen and updated immediately as each option changes, so they know what they will get before downloading.

**Why this priority**: The preview is what lets people tune the layout without wasting paper or repeatedly downloading. It is the main interaction surface after the download itself.

**Independent Test**: Change the habit count and the days count one at a time and confirm the preview redraws each time without a page reload or a button press.

**Acceptance Scenarios**:

1. **Given** the options page is open, **When** the person changes the number of habits, **Then** the preview updates to show the new number of habit rows without any extra action.
2. **Given** the options page is open, **When** the person changes the days per habit, **Then** the preview updates to show the new number of dots per row without any extra action.
3. **Given** the person is typing a new number into an option field, **When** the value is intermediate or invalid (e.g. empty), **Then** the preview does not break and shows the last valid layout or a clear placeholder until a valid value is entered.

---

### User Story 3 - Customize the grid layout (Priority: P3)

The person adjusts how the dots are arranged on the page (for example how many dots sit in each row before wrapping, and how large the dots are) so the tracker fits their paper and their handwriting.

**Why this priority**: Layout control is valuable but the default layout already delivers a usable tracker, so it can follow the core flow.

**Independent Test**: Change a layout option and confirm both the preview and the downloaded PDF reflect the new arrangement.

**Acceptance Scenarios**:

1. **Given** a days-per-habit value that is not a multiple of the dots-per-row setting, **When** the PDF is generated, **Then** the last row of dots for that habit is shorter and the habit's remaining dots are still present in order.
2. **Given** the person changes the dot size, **When** the preview updates, **Then** the dots are drawn at the new size and still fit within the page margins.

---

### Edge Cases

- What happens when the habit count or days count is zero or negative? The options must not accept it; the preview shows a clear message and download is unavailable until the value is valid.
- What happens when the requested grid is too large to fit on one page? The page must warn the person that the layout overflows and must not silently drop habits or days.
- What happens when the person enters a very large number (for example 10,000 days)? The options must enforce a sensible maximum so the PDF and preview stay responsive.
- How does the preview behave when the browser is slow or the layout is complex? The preview must still reflect the latest valid options and must not show a stale layout after the person has changed a value.
- What happens if the download is requested while the preview is still updating? The downloaded PDF must match the options currently shown, not an earlier state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let the person choose the number of habits to track.
- **FR-002**: The system MUST let the person choose the number of days to track, applied to each habit.
- **FR-003**: The system MUST represent each habit as one row of dots, where each dot stands for one day for that habit.
- **FR-004**: Each dot MUST be an empty circle large enough to be filled in by hand with a pen or pencil.
- **FR-005**: Each habit row MUST include a blank label area so the person can write the habit name by hand.
- **FR-006**: The system MUST let the person choose how many dots appear per row within a habit, and MUST wrap the remaining dots onto additional rows in order.
- **FR-007**: The system MUST let the person choose the dot size and the spacing between dots.
- **FR-008**: The system MUST show a preview of the tracker on the same web page as the options, and update it as soon as any option changes, without a separate apply action.
- **FR-009**: The system MUST provide a download of the tracker as a PDF.
- **FR-010**: The downloaded PDF MUST be visually identical to the preview for the same option values, including dot positions, sizes, spacing, and label areas.
- **FR-011**: The PDF MUST be sized to a standard printable page (A4 by default, with US Letter available) and MUST keep all content inside printable margins.
- **FR-012**: The system MUST reject or clearly flag option values that are empty, zero, negative, non-numeric, or above the configured maximums, and MUST keep the preview showing the last valid layout or a clear placeholder in the meantime.
- **FR-013**: The system MUST warn the person when the chosen options cannot fit on one page, and MUST NOT silently drop habits, days, or dots.
- **FR-014**: The layout and rendering MUST be produced with Typst, so that the same layout definition drives both the preview and the PDF (user-mandated constraint, recorded here so that planning keeps it).

### Key Entities *(include if feature involves data)*

- **Tracker Options**: The person's chosen settings: number of habits, number of days per habit, dots per row, dot size, dot spacing, and paper size.
- **Habit Row**: One habit's section of the tracker, containing a label area and an ordered sequence of day dots.
- **Day Dot**: A single empty circle representing one day for one habit.
- **Tracker Document**: The full printable layout built from the options, which is both shown as the preview and exported as the PDF.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can go from opening the page to downloading a printable tracker in under 1 minute on first use.
- **SC-002**: The preview visibly updates within 0.2 seconds of any valid option change.
- **SC-003**: For 100% of tested option combinations, the downloaded PDF matches the on-screen preview with no visible differences when compared at print resolution.
- **SC-004**: Printed at 100% scale on standard home paper, 100% of dots and label areas are fully visible with no clipping at the edges.
- **SC-005**: 100% of invalid option values (empty, zero, negative, non-numeric, over maximum) produce a clear on-screen message and cannot produce a downloaded PDF.
- **SC-006**: 100% of option combinations that overflow a single page show an overflow warning before download.

## Assumptions

- Each habit is tracked on its own row. A tracker covers one period of days (for example, a single month or a fixed day count) and every habit shares that same day count.
- Habit names are handwritten. The tool does not collect habit names; it only provides a blank label area per row.
- Default layout values, chosen so that a typical tracker fits one page: A4 paper, a modest default number of habits and days, and a dots-per-row setting that keeps rows readable. Exact default numbers are a planning decision.
- Reasonable maximums apply to habit count, day count, and dots per row so the layout stays printable and the preview stays responsive. Exact limits are a planning decision.
- The web page is used on a desktop or laptop browser. Mobile layout is out of scope for this version.
- No accounts, saved trackers, or cloud storage are needed. Each download is generated from the options currently on the page.
- Typst is the mandated layout and rendering engine (user-specified constraint), so pixel-perfect output and preview-equals-PDF are achieved by sharing one layout definition.
- Printing is done by the person on their own printer; the tool does not manage printing.
