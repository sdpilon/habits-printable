# Feature Specification: Improve PDF Output Design

**Feature Branch**: `007-improve-pdf-design`

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Improve the design of the resulting pdf output."

## Clarifications

### Session 2026-10-09

- Q: What's the main gap in the current PDF's design that should be fixed? → A: All of the above — add a header/title area, refine typography/spacing/line weights of existing elements, and apply fuller structural polish (dividers, hierarchy) — plus two additional concrete issues raised directly: (1) the blank habit-name label in the one-row-per-habit layout should be stacked above the dots instead of beside them, the way the mini-calendar layout already stacks its label, to use less horizontal space; (2) day numbers currently sit visually closer to the row of dots above them than to the row they actually label — they should be grouped by proximity with their own row.
- Q: If a header/title area is added, what should it contain? → A: A freeform editable title only (no auto-generated date range or other structured content).
- Q: Should the design improvements apply uniformly across all three existing layouts (rows, columns, calendars), or could some layouts get different treatment? → A: Uniform across all three layouts.
- Q: Any other design issues? → A: Yes, noted above (label placement, day-number proximity). Additional issues raised were recognized by the requester as new functionality rather than design, and were explicitly deferred to a future, separate spec.
- Q: How should "the day number is grouped with its own row, not the previous one" be concretely verified? → A: Number every dot (not just every fifth day), in all three layouts, replacing the previous every-fifth-day convention everywhere — including the habits-as-columns layout, which never had the grouping defect but is changed too for uniform density. Correctness is then checked geometrically: every dot has exactly one day number, every day number's nearest dot is the dot it labels, and no dot or number is left unmatched.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a page title (Priority: P1)

A person preparing a printable tracker wants to give the page a title (for example, "Morning Routine" or "October Habits") so the printed sheet looks finished and identifies itself, instead of being an anonymous grid.

**Why this priority**: Today the page has no header or title at all. This is the most visible gap between "a functional grid" and "a page someone would want to print and put on their fridge," and it is foundational to the rest of the redesign (the header sits above everything else).

**Independent Test**: Can be fully tested by typing a title into the new title field, confirming it appears at the top of the live preview immediately, downloading the PDF, and confirming the printed title matches the preview exactly. Leaving the title blank must reproduce today's header-less page exactly.

**Acceptance Scenarios**:

1. **Given** the options page is open, **When** the person types a title into the new title field, **Then** the live preview updates immediately to show that title as a header at the top of the page.
2. **Given** a title has been entered, **When** the person downloads the PDF, **Then** the exported PDF shows the identical title, in the identical position, as the live preview.
3. **Given** the title field is left empty, **When** the preview is shown or the PDF is downloaded, **Then** the page renders with no header area, matching today's output exactly.

---

### User Story 2 - Stack the habit label above the dots in the one-row-per-habit layout (Priority: P1)

A person using the one-row-per-habit layout wants each habit's blank space for writing its name to sit above that habit's row of dots, instead of occupying a wide column beside it — the same space-efficient arrangement the mini-calendar layout already uses. This leaves more width for the dots themselves and shortens each habit's block.

**Why this priority**: This is a concrete, already-identified design flaw with a direct, high-value fix: the current side-by-side arrangement wastes horizontal space (mostly blank) that scales with every habit added, while the equivalent mini-calendar layout already demonstrates a more compact approach.

**Independent Test**: Can be fully tested by generating a one-row-per-habit tracker and confirming each habit's writable label area now sits directly above its row(s) of dots, with the per-habit block no wider than its dot grid, rather than occupying a separate fixed-width column to the side.

**Acceptance Scenarios**:

1. **Given** the one-row-per-habit layout is selected, **When** the preview or PDF is generated, **Then** each habit's blank writing area for its name appears directly above that habit's dots, not beside them.
2. **Given** the same number of habits, days, and dots per row as before this change, **When** the page is generated, **Then** each habit's block is no wider than its grid of dots (plus a small margin), and the overall page no longer reserves a wide side column that was mostly empty.
3. **Given** this layout change, **When** the printable-margin and overflow checks are run, **Then** they continue to pass, confirming no regression to existing fit rules.

---

### User Story 3 - Make every dot unambiguously numbered (Priority: P2)

A person filling in a printed tracker by hand wants to always know exactly which day a dot represents without miscounting. Today only every fifth day is numbered, and those numbers can read as belonging to the wrong row of dots. Numbering every single dot removes the ambiguity entirely: there is no longer a question of which row a number belongs to, because each number sits with exactly one dot.

**Why this priority**: This is a legibility defect in an already-shipped feature (day numbering) rather than a missing feature, but it actively causes the kind of counting mistake the day numbers exist to prevent.

**Independent Test**: Can be fully tested by generating a tracker in any layout and confirming every dot has exactly one day number associated with it, every day number's nearest dot is the dot it labels, and no dot or number is left unmatched.

**Acceptance Scenarios**:

1. **Given** any layout (one-row-per-habit, habits-as-columns, or mini-calendars), **When** the page is generated, **Then** every dot is printed with its own day number, not just every fifth day.
2. **Given** a generated page, **When** each day number is checked against its nearest dot, **Then** that nearest dot is the exact dot the number labels, with no dot lacking a number and no number lacking a dot.
3. **Given** the habits-as-columns layout, where day numbers already sit beside their row rather than above it, **When** the page is generated, **Then** it also numbers every dot (not just every fifth), matching the density of the other two layouts even though it never had the grouping defect.

---

### User Story 4 - Consistent visual polish across all layouts (Priority: P3)

A person printing any of the three layouts wants consistent, refined typography, line weights, and spacing throughout, so the finished page looks like a deliberate, finished product rather than a bare wireframe, and so no one layout looks noticeably rougher than the others.

**Why this priority**: This is the general "make it look designed" polish pass. It matters, but it is lower priority than the two concrete, already-identified defects above (label placement and day-number grouping), and lower than adding the title that anchors the rest of the page.

**Independent Test**: Can be fully tested by generating one tracker per layout (rows, columns, calendars) with the same options, and confirming all three share the same line weights, label styling, header treatment, and spacing conventions, with no visual inconsistency between them.

**Acceptance Scenarios**:

1. **Given** trackers generated in each of the three layouts, **When** they are compared side by side, **Then** they share the same typographic and line-weight treatment for labels, dots, and day numbers.
2. **Given** any layout, **When** the page is printed in black and white, **Then** every visual refinement remains fully legible and usable without relying on color.

---

### Edge Cases

- What happens when the entered title is too long to fit on one line within the printable width? The title is clipped/truncated at the printable margin rather than wrapping to a second line or shrinking indefinitely.
- What happens when the title field is left blank? The page renders with no header area, identical to today's output.
- What happens to the first row of dots in a habit's block, which has no preceding row above it? It is numbered the same as every other row — every dot gets its own number, so there is nothing special about the first row.
- What happens in the habits-as-columns layout, which never had the grouping defect? It still moves from numbering every fifth day to numbering every dot, for consistency with the other two layouts, even though its existing beside-the-row placement was never ambiguous.
- What happens to the mini-calendar layout's label, which already stacks above its dots? It is unaffected by the label-placement fix (which targets the one-row-per-habit layout specifically), but still receives the general typography/spacing polish from User Story 4, and the per-dot numbering from User Story 3.
- What happens when the smallest supported dot size (2 mm) is combined with the largest per-row count (31), now that every dot carries its own number instead of only every fifth? The day numbers must remain legible and non-overlapping at every supported dot size and per-row combination; this is verified during planning and implementation using the project's existing printable-margin and fit checks.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let the person optionally enter a freeform title that, when non-empty, is shown as a header at the top of both the live preview and the exported PDF, identically in both.
- **FR-002**: When the title field is empty, the page MUST render with no header area, exactly as it does today.
- **FR-003**: In the one-row-per-habit layout, the system MUST position each habit's blank writing space for its name above that habit's grid of dots, rather than beside it, so the per-habit block's width is no greater than its dot grid's width (plus a small margin), eliminating the separate fixed-width side column used today.
- **FR-004**: In every layout (one-row-per-habit, habits-as-columns, mini-calendars), the system MUST print a day number for every dot, replacing the previous rule of numbering only every fifth day.
- **FR-005**: Each printed day number MUST be unambiguously associated with exactly one dot: that dot MUST be the nearest dot to the number, every dot MUST have a number, and no number MUST be left without a matching dot.
- **FR-006**: The visual refinements to typography, spacing, and line weight MUST be applied consistently across all three layouts (one-row-per-habit, habits-as-columns, mini-calendars).
- **FR-007**: All design changes MUST remain fully legible and usable when printed without color.
- **FR-008**: None of the design changes MUST alter existing functional behavior: habit count, day count, dots per row, dot size range, maximum limits, and the rule that blocks download when content does not fit one page.
- **FR-009**: The exported PDF MUST continue to be generated from the same rendering as the live preview, so the title and every other design change appear identically in both, with no separate preview-only or export-only rendering path.

### Key Entities

- **Tracker Title**: An optional, freeform, single-line piece of text entered by the person, printed once as a page header. It is not tied to any individual habit and is not persisted beyond the current session, consistent with how every other option already behaves.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can add a one-line title to their tracker, see it reflected in the live preview with the same immediacy as any other option change, and the downloaded PDF shows that exact title in the same position as the preview.
- **SC-002**: In the one-row-per-habit layout, each habit's block no longer reserves a separate fixed-width side column for the name label — the label sits above the dots instead, so the block's width equals its dot grid's width plus only a small margin.
- **SC-003**: On any generated page, every dot has exactly one day number, every day number's nearest dot is the dot it labels, and checking all dots and all numbers against each other turns up no dot without a number and no number without a dot.
- **SC-004**: All three layouts, viewed side by side with the same options, look like one consistent, finished design, with no layout appearing visually unfinished or out of step with the others.
- **SC-005**: Every existing printable-margin and overflow check continues to pass unchanged after the redesign, confirming the visual changes introduce no functional regression.

## Assumptions

- The title is a single freeform text field with no structured sub-parts (no auto-generated date range or subtitle), per the "freeform editable title only" decision.
- Entered title text is expected to fit on one printed line within the printable width; text that is too long is clipped/truncated rather than wrapped onto a second line or auto-shrunk, to keep the behavior simple and predictable.
- The redesigned label area in the one-row-per-habit layout remains blank space for handwriting — no habit name is pre-printed or auto-filled. The new page-level title is a single page caption, not per-habit name capture, and so does not conflict with the project's existing restriction on capturing per-habit names.
- No accounts, saved trackers, or persistence are introduced; the title is held only for the current session, exactly like every other existing option.
- Numbering every dot (instead of only every fifth day, as the original spec established) supersedes that earlier decision for all three layouts, including habits-as-columns, which did not have the grouping defect but changes anyway for consistent density across layouts.
- Keeping every dot legibly numbered at the smallest supported dot size (2 mm) and the largest supported per-row count (31) is a planning/implementation concern verified with the project's existing printable-margin and fit checks, not a new user-facing option.
- Additional design or functionality issues raised during discussion of this feature, beyond the title, label placement, day-number grouping, and general visual polish described above, were identified as new functionality rather than design and are explicitly deferred to a future, separate spec.
- The underlying data and options (habit count, day count, dots per row, dot size, choice of layout) are unchanged by this feature; only how that data is visually presented changes.
