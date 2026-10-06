# Implementation Plan: Printable Habit Grid

**Branch**: `001-printable-habit-grid` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-printable-habit-grid/spec.md`

## Summary

A static web page lets a person set habit count, day count, layout (one row per habit, habits as columns, or one mini calendar per habit), per-row count, dot size and spacing, and paper size. A live preview redraws on every valid change. The download produces a PDF from the same Typst source as the preview.

Technical approach (from research.md): one Typst template (`typst/tracker.typ`) holds the whole layout. The browser compiles it to one PDF with Typst compiled to WebAssembly. The preview draws that PDF with PDF.js, and the download is the same file, so the preview matches the print by construction. Overflow is detected from the compiled page count, so the same layout code decides both the warning and the output. No server is involved.

## Technical Context

**Language/Version**: TypeScript 7.x (strict mode) for the page; Typst 0.14.2 template language, the version bundled with typst.ts 0.7.0 (see research.md §8)

**Primary Dependencies**: Typst compiled to WebAssembly for in-browser compilation (`@myriaddreamin/typst.ts`); PDF.js (`pdfjs-dist`) to draw the preview; Vite as the build tool. No UI framework: plain DOM, since the page is a form plus one preview.

**Storage**: N/A. Options live in page state only; nothing is saved.

**Testing**: Vitest for option validation, the fit model against the engine's page count, and the timing check. A margin check rasterizes each PDF and confirms content sits inside the 10 mm margin (Principle III), run with `pnpm margins` on Node 24.

**Target Platform**: Desktop and laptop browsers (modern Chromium, Firefox, Safari). Mobile is out of scope per spec.

**Project Type**: Static web application (client-side only).

**Performance Goals**: Preview updates within 0.2 s of a valid option change (SC-002), measured as the compile only (PDF.js drawing is not timed) for the fitting page with the most dots: A4, layout `calendars`, 9 habits, 360 days, 24 per row, 2 mm dots (3,240 dots; the case timed by T025).

**Constraints**: All layout in one Typst file (Principle I). PDF exported at 100% scale with no tool-side scaling (constitution Technical Constraints). Dot diameter 2 to 5 mm; row label area 40 mm in layout (1) only (header sizes in data-model.md); per-row max 31; habits max 20; days max 365 (spec clarifications).

**Scale/Scope**: One page per download; at most 20 habits × 365 days, which the overflow rule limits to what fits on one page.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|-----------|-------|--------|
| I. Single Layout Source | Grid drawn only in `typst/tracker.typ`. The page holds form controls and passes values to Typst; it has no grid drawing code. | PASS |
| II. Preview Equals Print | The preview draws the same PDF file as the download, so they are identical by construction. No separate comparison is needed. | PASS (by construction; amended in 1.1.0) |
| III. Hand-Fillable Output | Dots are empty circles drawn with stroke only; default size is 4 mm, within the 2–5 mm range. Margins are kept inside the page (Typst page margins). | PASS |
| IV. Responsive Options | Each change re-compiles; invalid values show a message and disable download. The preview keeps the last valid PDF on screen until a valid value arrives. | PASS |
| V. Scope Discipline | No accounts, storage, or analytics. Three layouts are required by the spec (user-specified), so their complexity is justified; it's the only added configurability. | PASS (justified below) |
| Technical: Typst | Typst used for layout and rendering. | PASS |
| Technical: A4 default, Letter available | Page size selector in the Typst inputs; A4 default. | PASS |
| Technical: 100% scale | PDF uses true page dimensions; no scaling applied. | PASS |
| Technical: explicit limits | 20 habits, 365 days, 31 per row, 2–5 mm dots, defined in spec. | PASS |
| Workflow: spec checklist | 16/16 items pass (checklists/requirements.md). | PASS |

## Project Structure

### Documentation (this feature)

```text
specs/001-printable-habit-grid/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── tracker-options.schema.json   # Options passed from page to Typst
├── checklists/
│   └── requirements.md
└── spec.md
```

tasks.md is created by `/speckit-tasks`, not by this plan.

### Source Code (repository root)

```text
typst/
├── tracker.typ          # The single layout definition (Principle I)
└── fonts/               # Any bundled font files, if needed

web/
├── index.html           # Options form, preview pane, download button
├── src/
│   ├── main.ts          # Wires form inputs to compile + preview
│   ├── options.ts       # Option parsing and validation (FR-012)
│   ├── typst-compile.ts # Compiles the template to one PDF (no build-time imports)
│   ├── typst-engine.ts  # Page entry: the template as raw text, compiled to a PDF
│   ├── typst-init.ts    # Browser only: points typst.ts at its WebAssembly module
│   ├── preview.ts       # Draws the PDF into the preview with PDF.js
│   └── style.css
└── public/              # Static assets

tests/
├── unit/
│   ├── options.test.ts          # Validation rules, limits, defaults
│   └── fit.test.ts              # Layout fit formulas vs Typst page count
├── comparison/
│   ├── margins.ts               # Rasterizes each PDF, checks the 10 mm margin
│   └── cases.json               # Option combinations to check
└── perf/
    └── timing.test.ts              # Worst-case compile time (SC-002)
```

**Structure Decision**: A single static web app under `web/`, with the layout in `typst/`. There's no backend because nothing needs to be stored or shared. The margin check lives under `tests/` and runs outside the browser, on the same PDF the page downloads.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Three layouts, not one (Principle V) | Spec User Story 3 and the clarification answers explicitly require three layouts that the person chooses between. | One fixed layout would contradict FR-003 and the recorded clarification answers. |
