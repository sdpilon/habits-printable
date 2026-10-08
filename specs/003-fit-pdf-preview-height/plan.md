# Implementation Plan: Fit PDF Preview To Viewport Height

**Branch**: `003-fit-pdf-preview-height` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-fit-pdf-preview-height/spec.md`

## Summary

The on-screen preview currently renders the compiled PDF at a width-only scale
(`web/src/preview.ts`), so a tall page overflows the browser window and forces a
page scroll. This feature adds three selectable fit modes — **fit-page** (default,
fits both dimensions, no scroll), **fit-height**, and **fit-width** — all computed
from the same PDF.js viewport the preview already uses, so the page's true aspect
ratio is always preserved. The layout gains a bounded-height shell (`main`/
`#preview-section`/`#preview` sized to the viewport) so "available space" is a real,
measurable quantity instead of an unbounded, growing block.

## Technical Context

**Language/Version**: TypeScript (strict mode), ES modules, no framework (vanilla DOM)

**Primary Dependencies**: `pdfjs-dist` (already used for preview rendering); native
`ResizeObserver` for detecting available-space changes; no new dependencies

**Storage**: N/A

**Testing**: `vitest` (unit, `pnpm test`), Playwright (e2e, `pnpm e2e`); this project's
`run-project` skill (`.claude/skills/run-project/driver.mjs`) for manual/ad hoc
browser verification

**Target Platform**: Browser (desktop and the existing narrow-viewport breakpoint at
`max-width: 720px`); static site, no backend

**Project Type**: Single-project web app (Vite + vanilla TS SPA)

**Performance Goals**: Fit-mode switch and resize re-fit must be visually immediate
(SC-006: under 1s, in practice a single synchronous layout pass — no re-render of
the PDF itself, only a CSS/canvas resize)

**Constraints**:
- Constitution Principle I/II: no second drawing of the grid — this feature only
  changes how the already-rendered PDF.js canvas is sized/positioned in the DOM; the
  PDF bytes and the render-from-that-PDF pipeline are untouched.
- Constitution Technical Constraints: "100% export scale" refers to the exported PDF
  itself, not the on-screen magnification — this feature only changes the on-screen
  display scale, never the PDF's own dimensions or the export path.
- Must not collide conceptually with the existing `tests/unit/fit-model.ts` /
  `fit.test.ts`, which predict whether the *generated grid* fits on one printed
  page (an unrelated, pre-existing concept). New code uses `preview-fit`/`fit mode`
  naming scoped to the on-screen preview, never bare `fit`.

**Scale/Scope**: One preview pane, three fit modes, in-memory UI state only (no
persistence across page loads, no new network calls, no new entities)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Single Layout Source | Feature only resizes/repositions the existing PDF.js canvas; no new grid-drawing code is introduced. | PASS |
| II. Preview Equals Print | Preview continues to render the exact exported PDF bytes via PDF.js; only the DOM/CSS scale changes. The margin check (`pnpm margins`) operates on the PDF file itself and is unaffected. | PASS |
| III. Hand-Fillable Output | Not touched — dot size, spacing, and printable margins are unchanged; this feature is purely about on-screen magnification. | PASS |
| IV. Responsive Options | Reinforced: preview must still update immediately on option change, now also respecting the selected fit mode (FR-009). | PASS |
| V. Scope Discipline | A fit-mode selector is a small view-layer addition to the existing generator UI — no accounts, persistence, or analytics introduced. | PASS |
| Technical Constraints | US Letter, Typst, and 100%-export-scale constraints are untouched; this feature never changes PDF generation, only its on-screen display. | PASS |

No violations. Complexity Tracking table is not needed.

**Post-design re-check** (after Phase 0/1 below): unchanged. The design added one
pure function (`computePreviewScale`), one `ResizeObserver`, and a viewport-bounded
CSS shell — no new dependency, no second grid-drawing implementation, no change to
PDF generation or export scale. All six rows above still PASS.

## Project Structure

### Documentation (this feature)

```text
specs/003-fit-pdf-preview-height/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   └── preview-fit.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created here)
```

### Source Code (repository root)

```text
web/
├── index.html            # add the fit-mode selector control inside #preview-section
├── src/
│   ├── main.ts            # wire the selector to preview re-fit; track selected mode
│   ├── preview.ts          # renderPreview() gains an explicit fit-mode parameter
│   ├── preview-fit.ts       # NEW: pure scale-math (computePreviewScale), no DOM
│   ├── options.ts           # unchanged
│   ├── typst-engine.ts        # unchanged
│   └── style.css              # viewport-bounded layout for main/#preview-section/#preview

tests/
├── unit/
│   ├── preview-fit.test.ts    # NEW: unit tests for computePreviewScale (pure math)
│   ├── fit-model.ts            # unchanged (unrelated: page-overflow prediction)
│   └── fit.test.ts              # unchanged (unrelated: page-overflow prediction)
└── e2e/
    ├── preview-and-input.spec.ts   # extend or add a sibling spec for fit-mode behavior
    └── support/page.ts              # add helpers: setFitMode, readWindowFits, readCanvasAspectRatio
```

**Structure Decision**: Single-project web app — no backend/frontend split exists or
is needed. The new scale computation lives in its own pure module
(`web/src/preview-fit.ts`) deliberately separate from DOM wiring, mirroring the
existing `tests/unit/fit-model.ts` pattern (pure predictor, tested in isolation),
but under a distinct `preview-fit` name so it is never confused with the unrelated
page-overflow "fit" concept already in the codebase.

## Complexity Tracking

*No violations — table not needed.*
