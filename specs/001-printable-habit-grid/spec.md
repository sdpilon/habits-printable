# Feature Specification: Printable Habit Grid

**Feature Branch**: Not applicable (project is not a git repository)

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "this is a project that should produce a printable template pdf. It is for a habit tracker consisting of a grid of dots that can be filled in by hand once printed out, each dot representing one day for a single habit. The amount of habits, the number of days for each habit, and the layout of the grid should be customizable. There should be a web page where these options can be chosen and a preview shown updating live. The template should export as a pdf that is identical to the preview. It should be made using Typst, so the layout is pixel-perfect and the preview is instant."

## Clarifications

### Session 2026-10-05

- Q: Should each habit have its own number of days, or must every habit in one tracker share the same day count? → A: Shared across all habits; default 31 days (one month), maximum 365 days. More days means fewer habits fit on a page.
- Q: When the chosen habits and days won't all fit on one page, should the tool block the download or paginate? → A: Block. Show a warning and disable download until the habits fit on one page.
- Q: What is the largest number of habits a tracker may contain? → A: 20 habits maximum.
- Q: Which layout should the grid use? → A: The person chooses among three layouts: (1) one row per habit, (2) habits as columns with days as rows, (3) one mini calendar per habit. The layout is a shared option that drives both the preview and the PDF.
- Q: What is the largest per-row count allowed in any layout? → A: 31 maximum, applied to every layout.
- Q: In the habits-as-columns layout, when the days don't fit vertically on the page, should they wrap into side-by-side column blocks or block the download? → A: Block. Show the overflow warning; do not wrap.
- Q: In the mini-calendar layout, how should the calendars be arranged on the page? → A: A grid that fills the page width and wraps to new lines; the same overflow block applies when the grid runs past the page.
- Q: How wide should each habit's blank label area be? → A: 40 mm, fixed in every layout.
- Q: What range of dot diameters should the person be allowed to choose, in millimetres? → A: 2 to 5 mm.
- Q: Should the grid print day numbers so the person can find a given day without counting dots? → A: Yes, number every fifth day in every layout.
- Q: Should the 40 mm label area apply in every layout? → A: No. 40 mm applies to layout (1) only. Layouts (2) and (3) use the label shapes in FR-005.
- Q: How should each habit's name be written above its column in the habits-as-columns layout? → A: Written vertically (rotated) in a header above the column, so each column stays one dot wide. (Planning choice: in the mini-calendar layout the name spans the calendar's width.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate and download a printable habit grid (Priority: P1)

A person wants a paper habit tracker. They open the web page, choose how many habits they want to track and how many days each habit should cover, then download a PDF they can print and fill in by hand.

**Why this priority**: This is the core value of the product. Without a downloadable, printable PDF with the chosen counts, nothing else is useful.

**Independent Test**: Set the habit count, day count, and per-row count on the page (layout: one row per habit), download the PDF, print it (or view it), and confirm each habit shows all of its days as empty dots, in order, wrapping at the per-row count.

**Acceptance Scenarios**:

1. **Given** the options page is open with default values, **When** the person clicks download without changing anything, **Then** a PDF is produced containing the default number of habits and days, each habit represented by its own block of empty dots (the default layout, one row per habit, wraps at the default per-row count of 7).
2. **Given** the person sets 5 habits, 30 days, and 10 dots per row (layout: one row per habit), **When** they download the PDF, **Then** the PDF has 5 habit blocks, each showing 30 dots in order across three lines of 10, and every dot is an empty circle suitable for hand-filling.
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
- What happens when the requested grid is too large to fit on one page? The page must warn the person that the layout overflows, disable download, and must not silently drop habits or days.
- What happens when the person enters a day count above the 365-day maximum? The options must reject it with a clear message so the PDF and preview stay responsive.
- How does the preview behave when the browser is slow or the layout is complex? The preview must still reflect the latest valid options and must not show a stale layout after the person has changed a value.
- What happens if the download is requested while the preview is still updating? The downloaded PDF must match the options currently shown, not an earlier state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let the person choose the number of habits to track, from 1 up to a maximum of 20.
- **FR-002**: The system MUST let the person choose one number of days to track, shared by every habit in the tracker. The default is 31 days and the maximum is 365 days.
- **FR-003**: The system MUST offer three layouts: (1) each habit as one row of dots, (2) habits as columns with days as rows, and (3) each habit as its own mini calendar of dots. In every layout, each dot stands for one day for one habit.
- **FR-004**: Each dot MUST be an empty circle large enough to be filled in by hand with a pen or pencil.
- **FR-005**: Each habit MUST include a blank label area, in every layout, so the person can write the habit name by hand. In layout (1) the label is a 40 mm column to the left of the dots. In layout (2) the name is written vertically in a header above the column. In layout (3) the name is written in a header that spans the calendar. The header sizes are planning defaults (data-model.md, Label decision).
- **FR-006**: The system MUST let the person set the per-row count for the chosen layout, from 1 up to a maximum of 31, and MUST keep dots in order across that layout's rows. In layout (1) the count is dots per habit row, with remaining dots wrapping onto additional rows. In layout (2) it is habits per row. In layout (3) it is dots per calendar row.
- **FR-007**: The system MUST let the person choose the dot size, from 2 to 5 mm in diameter, and the spacing between dots, from 0.5 to 5 mm. The spacing range is a planning default, recorded here so validation can reject out-of-range values.
- **FR-008**: The system MUST show a preview of the tracker on the same web page as the options, and update it as soon as any option changes, without a separate apply action.
- **FR-009**: The system MUST provide a download of the tracker as a PDF.
- **FR-010**: The downloaded PDF MUST be visually identical to the preview for the same option values, including dot positions, sizes, spacing, and label areas.
- **FR-011**: The PDF MUST be sized to a standard printable page (A4 by default, with US Letter available) and MUST keep all content inside printable margins.
- **FR-012**: The system MUST reject or clearly flag option values that are empty, zero, negative, non-numeric, or above the configured maximums, and MUST keep the preview showing the last valid layout or a clear placeholder in the meantime.
- **FR-013**: When the chosen options cannot fit on one page, the system MUST show a warning and MUST disable download until the habit count or other options are reduced so the tracker fits on one page. It MUST NOT paginate, silently drop habits, days, or dots, or shrink dots to force a fit. This applies to every layout: in layout (2), a day count too tall for one page triggers the same block rather than wrapping into side-by-side columns.
- **FR-014**: The layout and rendering MUST be produced with Typst, so that the same layout definition drives both the preview and the PDF (user-mandated constraint, recorded here so that planning keeps it).
- **FR-015**: The grid MUST print day numbers on every fifth day (5, 10, 15, and so on) in every layout, so the person can locate a day without counting dots. Day numbers are printed text only and are not part of the hand-filled dots.

### Key Entities *(include if feature involves data)*

- **Tracker Options**: The person's chosen settings: layout, number of habits, number of days per habit, per-row count for the layout, dot size, dot spacing, and paper size.
- **Habit Row**: One habit's section of the tracker (a row, column, or mini calendar, depending on layout), containing a label area and an ordered sequence of day dots.
- **Day Dot**: A single empty circle representing one day for one habit.
- **Tracker Document**: The full printable layout built from the options, which is both shown as the preview and exported as the PDF.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can go from opening the page to downloading a printable tracker in under 1 minute on first use.
- **SC-002**: The preview visibly updates within 0.2 seconds of any valid option change.
- **SC-003**: For 100% of tested option combinations, the downloaded PDF matches the on-screen preview with no visible differences when compared at print resolution.
- **SC-004**: Printed at 100% scale on standard home paper, 100% of dots and label areas are fully visible with no clipping at the edges.
- **SC-005**: 100% of invalid option values (empty, zero, negative, non-numeric, over maximum) produce a clear on-screen message and cannot produce a downloaded PDF.
- **SC-006**: 100% of option combinations that overflow a single page show an overflow warning and cannot produce a downloaded PDF.

## Assumptions

- A tracker covers one period of days (default 31, maximum 365) and every habit shares that same day count.
- How much fits on one page depends on the chosen layout. In layout (1), each habit row is as long as the day count, so the number of habits that fits falls as the day count rises. Layouts (2) and (3) have their own fit rules, which planning must define.
- Habit names are handwritten. The tool does not collect habit names; it only provides a blank label area per row.
- Default layout values, chosen so that a typical tracker fits one page: A4 paper, a default of 31 days, a modest default number of habits, and a dots-per-row setting that keeps rows readable. Exact default numbers are a planning decision.
- Reasonable maximums apply to habit count, day count, and dots per row so the layout stays printable and the preview stays responsive. Habit count is capped at 20, day count at 365, and the per-row count at 31.
- The web page is used on a desktop or laptop browser. Mobile layout is out of scope for this version.
- No accounts, saved trackers, or cloud storage are needed. Each download is generated from the options currently on the page.
- Typst is the mandated layout and rendering engine (user-specified constraint), so pixel-perfect output and preview-equals-PDF are achieved by sharing one layout definition.
- Printing is done by the person on their own printer; the tool does not manage printing.
