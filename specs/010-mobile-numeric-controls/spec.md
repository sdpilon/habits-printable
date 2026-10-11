# Feature Specification: Phone-Friendly Numeric Controls

**Feature Branch**: `010-mobile-numeric-controls`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: "Make the numeric options usable on phones. Habits, Days, and Dots per row get visible −/+ stepper buttons beside the field, with tap targets of at least 44px. The browser's native hover-only spinners are hidden for these fields. Steppers clamp to each field's min/max and disable at the limit. Dot diameter and Dot spacing (mm) get a slider with a live numeric readout, which stays in sync with the value. Typing a value directly still works for all five fields. Any change, from a stepper, slider, or typing, updates the form value and triggers the existing preview recompile. Controls get accessible labels (e.g. "Increase habits"). Desktop behavior is unchanged apart from the hidden spinners. Verify at a phone viewport that each control changes the value, respects limits, and updates the preview."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Adjust integer options with tap steppers (Priority: P1)

On a phone, a person sets how many habits, days, or dots per row they want by tapping visible "−" and "+" buttons next to each field, without needing to hover or open a keyboard.

**Why this priority**: Habits, Days, and Dots per row are the options most people change, and the browser's spinners do not appear on phones, so these fields are the main usability gap.

**Independent Test**: On a phone-sized viewport, tap "+" and "−" on the Habits field and confirm the value changes by one per tap, the preview updates after each change, and the buttons stop at the field's limits.

**Acceptance Scenarios**:

1. **Given** the Habits field is at 5 on a phone-sized screen, **When** the person taps "+", **Then** the field shows 6 and the preview redraws with six habit rows.
2. **Given** the Days field is at its minimum of 1, **When** the person taps "−", **Then** the value stays at 1 and the "−" control is disabled.
3. **Given** the Dots per row field is at its maximum of 31, **When** the person taps "+", **Then** the value stays at 31 and the "+" control is disabled.
4. **Given** the Days field shows 31, **When** the person taps "+" once, **Then** the value becomes 32 and the preview recompiles to match.

---

### User Story 2 - Adjust dot size and spacing with a slider (Priority: P2)

On a phone, a person adjusts Dot diameter (mm) and Dot spacing (mm) by dragging a slider. A numeric readout beside the slider shows the exact value at all times.

**Why this priority**: These two fields have fine increments (0.1 mm) and wide ranges, which suit a drag control better than stepping one tick at a time. They are less frequently changed than the integer fields.

**Independent Test**: On a phone-sized viewport, drag the Dot diameter slider from one end to the other and confirm the readout tracks the position, the value stays within 2 to 5 mm in 0.1 mm steps, and the preview redraws at each committed value.

**Acceptance Scenarios**:

1. **Given** Dot diameter is 4 mm, **When** the person drags the slider to its far right end, **Then** the readout shows 5 and the preview uses 5 mm dots.
2. **Given** Dot spacing is 1.5 mm, **When** the person drags the slider to a position the readout reads as 2.3, **Then** the value is 2.3 and the preview reflects 2.3 mm spacing.
3. **Given** the person has typed 3.7 into the Dot diameter field, **When** they look at the slider, **Then** the slider thumb sits at the position for 3.7 and the readout shows 3.7.

---

### User Story 3 - Type exact values into any field (Priority: P3)

A person who wants an exact value can still type into any of the five fields directly, and the controls around that field follow the typed value.

**Why this priority**: Typing is the only way to reach an exact value that does not fall on a stepper or slider position in some cases, and it must keep working as it does today.

**Independent Test**: Type 12 into Days and confirm the preview updates to 12 days; type 0 into Habits and confirm an error message appears and no download is offered.

**Acceptance Scenarios**:

1. **Given** the Days field is empty or shows 31, **When** the person types 12, **Then** the preview updates to 12 days and the "+" and "−" buttons reflect the new value.
2. **Given** the Habits field shows 5, **When** the person types 0, **Then** an error message appears explaining the valid range, the preview does not show an invalid layout, and the Download button stays disabled.
3. **Given** the Dot spacing field shows 1.5, **When** the person types 9, **Then** an error message explains the valid range and the download stays disabled.

---

### Edge Cases

- What happens when the person taps "+" or "−" while the field is empty or holds a non-numeric or out-of-range value? The field moves to its nearest valid value in the tapped direction (empty or invalid input steps to the field's minimum on "+" and maximum on "−"), and the existing error message clears once the value is valid.
- How does the slider display a typed value that is outside the slider's range (e.g. 9 mm)? The slider thumb sits at the nearest end, the readout shows the typed value, and the existing error message stays visible. The slider does not change the typed value on its own.
- What happens when a stepper or slider change produces a value that is already the current value? No recompile is triggered and no visible change occurs.
- What happens on a phone in portrait orientation with a very narrow screen (about 320 px wide)? Each stepper and its field remain fully visible and tappable without horizontal scrolling of the options panel.
- What happens on a desktop browser? The stepper buttons and sliders are present and work, but the native hover-only spinners are hidden on the five fields as well, so the controls look the same on both device classes.
- What happens if the person holds a stepper button down? Holding is not required; each tap changes the value by one step. Repeat-on-hold is out of scope for this feature.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Habits, Days, and Dots per row fields MUST each show a visible "−" and "+" button beside the field, without requiring hover.
- **FR-002**: Each stepper button MUST have a tap target of at least 44 × 44 CSS pixels.
- **FR-003**: Each stepper MUST change its field's value by exactly one unit per tap (Habits 1, Days 1, Dots per row 1).
- **FR-004**: Each stepper MUST clamp the value to the field's existing minimum and maximum, and MUST be disabled when the value is already at the limit in that direction.
- **FR-005**: The browser's native hover-only number spinners MUST be hidden on the five numeric fields.
- **FR-006**: Dot diameter (mm) and Dot spacing (mm) MUST each show a slider covering the field's existing range (2 to 5 mm for diameter, 0.5 to 5 mm for spacing) in steps of 0.1 mm.
- **FR-007**: Each slider MUST display a numeric readout of its current value, updated live as the slider moves.
- **FR-008**: Each slider and its numeric field MUST stay in sync: a change to one MUST update the other, and a typed value MUST move the slider to the nearest position it can represent.
- **FR-009**: All five fields MUST continue to accept typed values directly, with the same validation and error messages as today.
- **FR-010**: Any change from a stepper, slider, or typing MUST update the form's value and trigger the existing preview recompile, with the same behavior as a typed change today.
- **FR-011**: Each stepper button MUST have an accessible name that says what it does and which field it affects (for example, "Increase habits" and "Decrease days").
- **FR-012**: Each slider MUST have an accessible name identifying the field it controls (for example, "Dot diameter (mm)").
- **FR-013**: On desktop-width screens, the layout and behavior of the options MUST be unchanged except for the hidden native spinners and the added stepper buttons and sliders.
- **FR-014**: The Download button MUST remain disabled whenever any field holds an invalid value, as it does today.

### Key Entities

- **Numeric option**: One of the five fields (Habits, Days, Dots per row, Dot diameter, Dot spacing). Each has a current value, a minimum, a maximum, and a step size, all already defined by the existing options.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a phone-sized viewport, a person can change Habits, Days, or Dots per row to any value in its range using only taps, without typing, in under 15 seconds per field.
- **SC-002**: Every stepper and slider on a phone-sized viewport changes the value and updates the preview on 100% of attempts in the verification pass.
- **SC-003**: Stepping any integer field past its minimum or maximum leaves the value unchanged and the corresponding button disabled, in 100% of verified cases.
- **SC-004**: Every stepper button measures at least 44 × 44 CSS pixels on a phone-sized viewport.
- **SC-005**: Each stepper and slider has an accessible name that identifies its field, verified for all five fields.
- **SC-006**: The desktop layout shows no change to field positions or labels beyond the added stepper buttons and sliders, verified at the existing desktop breakpoint.

## Assumptions

- "Phone-sized viewport" means the existing mobile breakpoint in the stylesheet (width 720 px or less); the verification pass uses a typical phone width, such as 390 px.
- The existing ranges and steps for each field are kept as-is (Habits 1–20, Days 1–365, Dots per row 1–31, Dot diameter 2–5 mm, Dot spacing 0.5–5 mm).
- The existing 24 × 24 px minimum target size from the compact-controls feature still applies to the typed inputs; the 44 × 44 px floor applies to the new stepper buttons.
- The slider is added alongside the existing number field, not in place of it, so exact values remain typeable.
- Holding a stepper button down to auto-repeat is not part of this feature.
- Visual styling of the new controls follows the existing options panel and works in both light and dark color schemes.
- The existing preview recompile behavior, validation messages, and Download gating are reused without redesign.
