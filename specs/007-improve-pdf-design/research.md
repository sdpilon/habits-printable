# Research: Improve PDF Output Design

No [NEEDS CLARIFICATION] markers remained in the spec after `/speckit-clarify`, so the decisions
below are planning defaults needed to design the four changes, made directly in the same style as
`specs/001-printable-habit-grid/research.md` (concrete constants recorded here, verified against
the compiled output rather than re-litigated in the spec).

## 1. Title header: placement and sizing

- **Decision**: When `title` is non-empty, render it as one line of larger text at the top of the
  page, inside its own `HEADER_H` band, followed by the existing `GAP = 4mm` spacing already
  used between blocks (no new gap constant). When `title` is empty, the header band is omitted
  entirely (0mm), reproducing today's page exactly (FR-002).
- **Rationale**: `HEADER_H` gives enough room for a one-line title at a noticeably larger size than
  the 8pt body text (e.g. 16–18pt) without a second line. Reusing the existing `GAP` constant for the
  space below the header avoids introducing a redundant constant, consistent with Principle V
  (prefer reusing what exists).
- **Alternatives considered**: A fixed-height header regardless of content (rejected — would waste
  printable height on every page even when no title is set, which the spec's FR-002 explicitly rules
  out). A title that can wrap to two lines (rejected — spec Assumptions require single-line clipping,
  not wrapping).
- **Clipping mechanism**: Typst's `box(width: ..., clip: true)` truncates content wider than the
  box rather than reflowing it, which is exactly the "clip at the printable width" rule the spec
  requires (Edge Cases) — no character-count limit is needed for the rendering rule itself.
- **Value chosen during implementation, and an unrelated spacing bug found along the way**: the
  initial planning value (`HEADER_H = 10mm`) was lowered to `6mm` as part of the combined-overflow
  fix described in §3 below. Separately, while isolating the header's actual rendered cost, measuring
  found it was consuming ~3.4mm more height than `HEADER_H + GAP` alone should require — traced to
  Typst's default implicit spacing between adjacent top-level block elements (the header's `box` and
  the `v(gap)` after it). Fixed document-wide with `#set block(spacing: 0pt)`, since every vertical
  gap in this template is already explicit; this is a general correctness fix, not specific to the
  title header, and was verified to not change any other layout's measured height.

## 2. Rows-layout label: reuse the mini-calendar's existing shape

- **Decision**: Replace the rows-layout's `row-label-w = 40mm` side column with the same label
  shape the calendar layout's block already uses: a `LABEL_H` strip spanning the dot grid's
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
- **Value chosen during implementation**: `LABEL_H`'s original planning value (`6mm`, `calendars`'
  pre-feature value) turned out not to fit once combined with §3's gap fix below — see §3's note on
  the combined overflow and the final constants. `LABEL_H` was lowered to `2mm` as part of that
  same pass, applying to both `rows` and `calendars` since they share the constant.

## 3. The actual defect, and why density was the wrong fix

- **Finding**: Numbering every dot (an earlier candidate fix) does not solve the mispairing defect.
  The root cause is asymmetric spacing, not missing numbers: today, `dot-cell(day)` places a day
  number at the _top_ of its own `line-h` box and its dot at the _bottom_ of the same box, and
  successive boxes are stacked with `spacing: 0pt`. That means a number sits immediately adjacent
  (touching) to the _previous_ line's dots — which stop right at the bottom edge of the box right
  before it — while being separated from its _own_ dot below by nearly the full box height. This
  asymmetry exists on every numbered line regardless of whether every day or only every fifth day
  carries a number, so increasing density alone changes nothing about which row a number visually
  reads as belonging to.
- **Decision**: Fix the spacing directly: insert a real gap between the _previous_ line's dots and
  this line's number (`NUM_GAP_ABOVE`), and keep the gap between this line's number and _its own_
  dot small (`NUM_GAP_BELOW`), with `NUM_GAP_ABOVE > NUM_GAP_BELOW` so the number reads as grouped
  with its own row. Shipped constants: `NUM_GAP_ABOVE = 1mm`, `NUM_GAP_BELOW = 0.4mm` (verified
  against the actual compiled output during implementation, not assumed — see §4).
- **Combined overflow found during implementation, and the fix**: the initial planning values
  (`NUM_GAP_ABOVE = 2mm`, `NUM_GAP_BELOW = 0.8mm`, `LABEL_H = 6mm`) visually confirmed the fix
  correctly (§4), but combined with §2's new per-habit `LABEL_H` cost in `rows`, they pushed the
  plain defaults (5 habits × 31 days × 7/row, and `calendars-default` at 20 habits) from one page to
  two — both had very little spare margin even before this feature (confirmed via
  `tests/comparison/margins.ts`). A first pass lowered `NUM_GAP_ABOVE`/`NUM_GAP_BELOW` to
  `1mm`/`0.4mm` and `LABEL_H` to `4mm`, which fit the _blank-title_ default — but quickstart.md's own
  US1 scenarios 2–3 (type a title, then download) run at the same default habit count with a title
  set, and `HEADER_H + GAP` (14mm) didn't fit in the ~11mm of slack that pass left, so that specific
  combination still overflowed. `LABEL_H` was lowered further to `2mm` and `HEADER_H` to `6mm` (§1)
  until _both_ the blank-title and title-set defaults fit one page with a real margin of slack
  (~7mm each), re-confirmed visually at the smaller `LABEL_H`/gap values and at the
  smallest-dot/most-per-row edge case (§4) to still read clearly and stay non-overlapping.
- **Rejected alternatives**:
  - _Place the number and dot at the same coordinates_ (user-raised). Rejected: the number would
    collide with or sit on top of the empty circle, hurting both the number's legibility and the
    circle's hand-fillable emptiness (Principle III) — typesetting software can overlay text on a
    shape, but doing so here fights the shape's purpose rather than serving it.
  - _Draw visible grid-cell borders around each day cell_ (user-raised). Rejected for this spec:
    it would fix the pairing by replacing proximity with explicit visual containment, but it adds a
    page-wide structural element (a border/gridline on every cell) that is a materially bigger
    aesthetic change than the rest of this spec's typography/spacing polish calls for. Worth
    reconsidering later if the spacing fix alone doesn't read clearly enough at implementation time,
    but not adopted as the default approach.
  - _Number every dot_ (the spec's originally-recorded, now-superseded answer). Rejected as the
    shipped fix for the reason above — kept only as an implementation-time visual-verification aid
    (see §4), not as a geometry or content change.

## 4. Verifying the fix: temporary every-dot numbering as a debug aid

- **Decision**: During implementation, it is fine to temporarily remove the `day % 5 == 0` guard
  (numbering every dot) purely as a way to make the above/below gap difference trivial to eyeball
  while tuning `NUM_GAP_ABOVE`/`NUM_GAP_BELOW`, then restore the every-fifth-day guard before
  shipping. The final, shipped behavior keeps every-fifth-day numbering (FR-004); only the spacing
  constants change.
- **Rationale**: This gives a fast, concrete way to confirm "is this number closer to its own row"
  without needing a new automated geometry test. It was the original motivation for the "number
  every dot" idea — unambiguous, quick visual verification — just applied as a development
  technique rather than shipped behavior.
- **Alternatives considered**: A dedicated automated test that measures number-to-dot pixel
  distances on the rasterized PDF and asserts the above-gap exceeds the below-gap. Rejected as
  unnecessary complexity (Principle V) for this spec — the existing margin check plus a manual
  visual check (quickstart.md) is proportionate to a spacing/typography fix; this could be
  revisited if the manual check proves unreliable in practice.

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
