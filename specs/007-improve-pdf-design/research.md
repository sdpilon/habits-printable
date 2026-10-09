# Research: Improve PDF Output Design

No [NEEDS CLARIFICATION] markers remained in the spec after `/speckit-clarify`, so the decisions
below are planning defaults needed to design the four changes, made directly in the same style as
`specs/001-printable-habit-grid/research.md` (concrete constants recorded here, verified against
the compiled output rather than re-litigated in the spec).

## 1. Title header: placement and sizing

- **Decision**: When `title` is non-empty, render it as one line of larger text at the top of the
  page, inside its own `HEADER_H = 10mm` band, followed by the existing `GAP = 4mm` spacing already
  used between blocks (no new gap constant). When `title` is empty, the header band is omitted
  entirely (0mm), reproducing today's page exactly (FR-002).
- **Rationale**: 10mm gives enough room for a one-line title at a noticeably larger size than the
  8pt body text (e.g. 16–18pt) without a second line. Reusing the existing `GAP` constant for the
  space below the header avoids introducing a redundant constant, consistent with Principle V
  (prefer reusing what exists).
- **Alternatives considered**: A fixed-height header regardless of content (rejected — would waste
  10mm of printable height on every page even when no title is set, which the spec's FR-002
  explicitly rules out). A title that can wrap to two lines (rejected — spec Assumptions require
  single-line clipping, not wrapping).
- **Clipping mechanism**: Typst's `box(width: ..., clip: true)` truncates content wider than the
  box rather than reflowing it, which is exactly the "clip at the printable width" rule the spec
  requires (Edge Cases) — no character-count limit is needed for the rendering rule itself.

## 2. Rows-layout label: reuse the mini-calendar's existing shape

- **Decision**: Replace the rows-layout's `row-label-w = 40mm` side column with the same label
  shape the calendar layout's block already uses: a `LABEL_H = 6mm` strip spanning the dot grid's
  width, stacked above the dot lines. After this change, a one-row-per-habit "block" and a
  mini-calendar "block" are the same shape (a label strip over wrapped dot lines); the two layouts
  now differ only in how blocks are arranged on the page — rows stacks one block per habit straight
  down the page, calendars wraps multiple blocks per page row.
- **Rationale**: This is exactly the space-efficiency argument from the spec's clarification
  (6×7 units stacked vs. 11×6 units side-by-side) implemented with a constant the codebase already
  defines (`LABEL_H`, currently used only by the calendar layout), rather than inventing a new one.
- **Alternatives considered**: A new, separately-tuned label height for the rows layout. Rejected —
  there's no reason for the two layouts' label strips to differ once they're the same shape, and
  reusing the constant keeps the typography/spacing consistent (FR-006) by construction instead of
  by manual matching.

## 3. Numbering every dot: legibility at the smallest supported pitch

- **Decision**: Keep the existing day-number text size (5pt) and simply remove the "only every
  fifth day" condition everywhere, so every dot's cell prints its own day number.
- **Rationale**: The narrowest pitch the project supports is `dotDiameterMm (2mm) + dotSpacingMm
  (0.5mm) = 2.5mm`. At 5pt, typical proportional-digit advance widths run roughly 0.5–0.6em per
  character; even the widest day number in range ("365", 3 digits) is on the order of 1.5–1.8em ≈
  2.6–3.2pt ≈ 0.9–1.1mm per digit, comfortably under the 2.5mm cell width for the common case and
  within a small, implementation-time-verifiable margin for the extreme. This is re-verified
  against the actual compiled output (not assumed) via the margin check and a visual check at the
  minimum-pitch/max-per-row case during implementation, per the spec's edge case on this exact
  combination.
- **Alternatives considered**: Shrinking the day-number font further to guarantee headroom.
  Rejected as a default — it would make every other (more common, larger-pitch) case's numbers
  needlessly smaller; only reach for this if implementation-time verification shows the 5pt size
  doesn't fit at the extreme.

## 4. "Nearest dot is correct" is true by construction, not a separate check

- **Decision**: No new verification code is needed for FR-005 ("every day number's nearest dot is
  the dot it labels"). The existing `dot-cell(day)` already draws one day's number and that same
  day's dot inside one shared cell; as long as every cell keeps doing this (just without the
  `day % 5 == 0` guard), each number's nearest dot is, by construction, the dot in its own cell.
- **Rationale**: Avoids adding a geometry-checking test (e.g. nearest-neighbor distance
  calculations) for a property the existing per-cell structure already guarantees. Verification is
  a visual/e2e check (every cell shows exactly one number and one dot), not a new computed check.
- **Alternatives considered**: A dedicated automated "numbering correctness" test that measures
  label-to-dot distances on the rasterized page. Rejected as unnecessary complexity (Principle V) —
  the structural guarantee from keeping day-number and dot in the same cell is strictly stronger
  than a distance-threshold test could verify, and is enforced by the one piece of code that
  assembles each cell.

## 5. Typography / line-weight polish

- **Decision**: No new dependency. Typst's built-in `text`, `line`, and `stroke` primitives (already
  used throughout `tracker.typ`) are sufficient for consistent label styling, line weights, and the
  header's larger text size.
- **Rationale**: The existing template already achieves its current look entirely with these
  primitives; FR-006 only requires consistency across layouts, not new visual primitives or fonts.

## 6. Tooling

- **Decision**: No change from `specs/001-printable-habit-grid/research.md` §7 — pnpm, Vite,
  Vitest, Playwright.
- **Rationale**: No new dependency is introduced by this feature.
