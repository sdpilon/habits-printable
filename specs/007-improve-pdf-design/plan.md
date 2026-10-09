# Implementation Plan: Improve PDF Output Design

**Branch**: `007-improve-pdf-design` | **Date**: 2026-10-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-improve-pdf-design/spec.md`

## Summary

Four visual changes to the single Typst template that already draws every layout: (1) an optional
freeform page title, rendered as a header above the grid when non-empty; (2) in the one-row-per-habit
layout, move each habit's blank name-label from a fixed-width column beside the dots to a thin strip
above them — the same shape the mini-calendar layout's block already uses, so the two layouts become
structurally the same per-habit block, differing only in how blocks are arranged on the page; (3) fix
the day-number-to-row spacing so a number's gap to its *own* row of dots is smaller than its gap to
the row *above* it — the reverse of today's layout, which is why a number can currently read as
belonging to the wrong row. Day numbering itself stays at every fifth day (today's convention); only
the spacing changes. (4) consistent typography/line-weight polish applied uniformly across all three
layouts. All four changes live entirely in `typst/tracker.typ` (Principle I); the only web-page
change is one new optional text field (`title`) that flows through exactly like every existing
option.

Technical approach: no new dependencies or architecture. The existing fit model
(`tests/unit/fit-model.ts`) is updated to mirror the new rows-layout geometry, the optional header's
height, and the new asymmetric line-spacing constants, the existing `tracker-options.schema.json`
contract gains one optional `title` property, and the existing margin check
(`tests/comparison/margins.ts`) is the regression gate that proves the redesign doesn't break
Principle III. Temporarily numbering every dot (instead of every fifth) is a recommended
implementation-time technique for visually verifying the spacing fix — not a shipped behavior, so it
does not appear in any FR or data-model constant.

## Technical Context

**Language/Version**: TypeScript 7.x (strict) for the page; Typst template language, the version
bundled with typst.ts 0.7.0 (Typst 0.14.2, per `specs/001-printable-habit-grid/research.md` §8).

**Primary Dependencies**: None added. Uses the project's existing toolchain only: `@myriaddreamin/typst.ts`
(in-browser Typst → PDF compilation), `pdfjs-dist` (preview rendering and the margin check's
rasterization), Vite, Biome/Prettier. The new title field is a plain text input; no new package is
needed to add it.

**Storage**: N/A. The title behaves like every other option: held in page state only, never persisted.

**Testing**: Vitest (`tests/unit`) for option validation (extended for the new `title` field) and the
fit model against the engine's page count (updated for the new rows-layout geometry, the optional
header, and the taller per-line spacing from the asymmetric-gap fix); `tests/comparison/margins.ts`
(PDF margin check, re-run as the primary regression gate for Principle III since this feature changes
dot/label/header/line geometry); `tests/perf` (compile-time budget, re-run as a regression guard);
Playwright (`tests/e2e`) extended for the new title field's live-preview behavior. Day numbering
stays at every fifth day, so no e2e expectation about numbering density changes.

**Target Platform**: Desktop and laptop browsers (modern Chromium, Firefox, Safari), matching the
existing project scope. No change to platform support.

**Project Type**: Static web application (client-side only). No new project or package.

**Performance Goals**: No new budget. The existing `tests/perf` compile-time check (SC-002 of
001-printable-habit-grid) must continue to pass. Day-number content/count is unchanged (still every
fifth day); only the layout's spacing constants and the optional header change page height
slightly, so this is re-verified, not assumed, during implementation.

**Constraints**:

- All four changes MUST live only in `typst/tracker.typ` (Principle I) — no second drawing
  implementation on the page side.
- The exported PDF MUST remain the same file the preview draws (Principle II); the new title is
  rendered through the same compile path as every other option (FR-009).
- `tests/comparison/margins.ts` MUST continue to pass for every case in `tests/comparison/cases.json`
  after the geometry changes (Principle III, SC-005).
- The gap between a day number and its own row of dots MUST be visibly smaller than the gap to the
  row of dots above it (FR-004), and this MUST hold at the smallest supported dot size (2 mm) and
  largest supported per-row count (31) (spec Edge Cases).
- Title text that doesn't fit the printable width on one line MUST be clipped there rather than
  wrapped or auto-shrunk (spec Assumptions) — a rendering rule (clip at a fixed box width), not a
  character-count limit.

**Scale/Scope**: Same existing limits (habits ≤ 20, days ≤ 365, per-row ≤ 31, dot diameter 2–5 mm).
One new optional field (`title`): single-line freeform text, no new numeric limit — see
data-model.md for the defensive length cap chosen during planning.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle                                 | Check                                                                                                                                                                                                     | Status |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Single Layout Source                   | The title header, the rows-layout label repositioning, the day-number spacing fix, and the typography polish are all implemented only in `typst/tracker.typ`. The page adds one new form field and passes its value through — no drawing logic on the page side. | PASS   |
| II. Preview Equals Print                   | The title and every other design change render through the same compiled PDF the preview draws (FR-009). No separate preview-only path is introduced.                                                   | PASS (by construction) |
| III. Hand-Fillable Output                  | Dot shape/size range is unchanged. The redesign MUST keep all content inside the printable margin — re-verified by `tests/comparison/margins.ts` against updated `cases.json` before this gate is re-checked post-design. | PASS, pending Phase 1 margin re-verification |
| IV. Responsive Options                     | The title field updates the live preview immediately, exactly like every existing option (FR-001); no new persistence or save step. The 200-char cap (data-model.md) is a defensive input limit, not a spec-level "maximum" in Principle IV's numeric-field sense — it is silently truncated rather than erroring, since no FR imposes a length requirement on the title. | PASS (see note) |
| V. Scope Discipline                        | No accounts, storage, or per-habit name capture. The title is a single page-level caption, not per-habit data (spec Assumptions); no new configurability beyond what the four FRs require.              | PASS   |
| Technical: Typst                           | All rendering stays in Typst; no new rendering technology.                                                                                                                                                | PASS   |
| Technical: US Letter only                  | Unchanged — no page-size option is added or altered.                                                                                                                                                      | PASS   |
| Technical: 100% scale                      | Unchanged — no scaling logic is introduced.                                                                                                                                                               | PASS   |
| Technical: explicit limits                 | Existing limits (habits/days/perRow/dot size) are untouched; the new title field's only new constant is a defensive character cap, documented in data-model.md, not a spec-level option limit.          | PASS   |
| Workflow: spec checklist                   | 16/16 items pass (`checklists/requirements.md`).                                                                                                                                                          | PASS   |

**Post-Phase 1 re-check**: data-model.md's Fit rules confirm the header/label/line-spacing geometry
changes have concrete, bounded formulas (not open-ended); `contracts/tracker-options.schema.json`
and `contracts/page-interface.md` confirm the new `title` field extends the existing contracts
without breaking any current selector, name, or range; research.md §3 confirms the asymmetric-gap
fix adds a modest, bounded amount of height per line (not an open-ended change). All
Technical/Workflow constraints and Principles I, II, IV, V still PASS outright; Principle III
remains PASS pending the implementation-time margin-check run against the extended
`tests/comparison/cases.json` — no violation is anticipated, but this is the one gate this feature
could plausibly fail if the chosen gap constants turn out to push a case past one page, so it is
called out explicitly rather than marked PASS before that evidence exists.

## Project Structure

### Documentation (this feature)

```text
specs/007-improve-pdf-design/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── tracker-options.schema.json  # Adds the optional `title` property
│   └── page-interface.md            # Adds the new `title` form field to the existing contract
├── checklists/
│   └── requirements.md
└── spec.md
```

tasks.md is created by `/speckit-tasks`, not by this plan.

### Source Code (repository root)

```text
typst/
└── tracker.typ          # Every visual change: title header, rows-layout label repositioning,
                          # day-number spacing fix, typography/line-weight polish (Principle I)

web/
├── index.html           # Add one new text input: name="title"
├── src/
│   ├── main.ts           # readForm() reads the new title field
│   ├── options.ts        # TrackerOptions/RawOptions gain `title`; toTypstInputs passes it through
│   └── preview.ts, typst-*.ts, style.css  # Unaffected — same compile/render path, no new logic

tests/
├── unit/
│   ├── options.test.ts   # New cases: title present/blank, over the defensive length cap
│   └── fit.test.ts        # fit-model.ts geometry updated: rows-layout width/height, optional header,
│                           # taller per-line spacing from the asymmetric-gap fix
├── comparison/
│   ├── margins.ts         # Unaffected code; re-run as the regression gate for the geometry changes
│   └── cases.json         # Extended with a title-present case and the redesigned rows-layout cases
├── e2e/                   # preview-and-input.spec.ts: new title field behavior
└── perf/
    └── timing.test.ts      # Re-run as a regression guard
```

**Structure Decision**: No new project, package, or dependency. Every visual change lands in the
single existing `typst/tracker.typ` (Principle I); the only page-side change is one new form field
that flows through the same validate → compile → preview/download pipeline every other option
already uses. Test changes are extensions of the existing suites, not new test infrastructure.

## Complexity Tracking

Not applicable — Constitution Check reported no violations.
