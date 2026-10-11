# Implementation Plan: Layout controls: Shape, Direction, Repeat

**Branch**: `011-layout-shape-orientation-repeat` | **Date**: 2026-10-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-layout-shape-orientation-repeat/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Replace the single `layout: 'rows' | 'columns' | 'calendars'` option with three orthogonal controls — Shape (Line/Calendar), Direction (Rows/Columns, Line only), and Repeat (Stacked/Side-by-side) — so the relationship between controls and output is legible, and side-by-side tiling (today exclusive to "calendars") becomes available to every Shape/Direction combination. Research found that today's `row-habit` and `calendar-block` Typst functions are already byte-identical, so the implementation collapses them into one shared per-habit block builder and one shared page-tiling function parameterized by `repeat`, rather than keeping three separate rendering branches.

## Technical Context

**Language/Version**: TypeScript (web/src), Typst (typst/tracker.typ, compiled client-side via WASM)

**Primary Dependencies**: Vite (build/dev server), `@myriaddreamin/typst.ts` + `typst-ts-renderer`/`typst-ts-web-compiler` (in-browser Typst compilation), Biome (lint/format), Vitest (unit tests), Playwright (e2e)

**Storage**: N/A — stateless client-only app; no persisted user data or shared-link format

**Testing**: `vitest run tests/unit` (options/fit-model/numeric-controls unit tests), `tests/comparison/margins.ts` (printable-margin check, constitution Principle II/III gate), `playwright test` (e2e), `vitest run tests/perf` (Typst compile-time budget)

**Target Platform**: Browser (desktop + mobile web), static site on GitHub Pages

**Project Type**: Single-page web app (client-only, no backend)

**Performance Goals**: No regression in existing Typst compile-time budget (`tests/perf`); collapsing `row-habit`/`calendar-block` into one function should not add per-dot overhead (see `tests/perf` note in `tracker.typ` about flat per-dot cost)

**Constraints**: Constitution Principle I (layout defined once, in Typst — no new drawing logic in TS), Principle II (preview and export are the same compiled PDF), Principle III (hand-fillable, US Letter, printable margins — margins.ts must still pass, including for newly-reachable combinations), Principle IV (preview must update immediately and never show a layout inconsistent with current valid options)

**Scale/Scope**: Small, bounded change: `web/index.html` (controls markup), `web/src/options.ts` (types/defaults/validation), `web/src/main.ts` (control wiring), `typst/tracker.typ` (collapse 3 layout-kind branches into 2 block builders × a shared repeat/tiling axis), `tests/unit/fit-model.ts` + associated tests, `tests/comparison/cases.json` (new combinations)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Single Layout Source** — PASS. The new `shape`/`direction`/`repeat` values are passed through as additional `sys.inputs` strings, same as today's `layout`; all geometry/wrapping/tiling logic stays in `typst/tracker.typ`. No layout computation moves into TypeScript.
- **II. Preview Equals Print** — PASS. Preview and export remain the same compiled PDF; unaffected by this change. The printable-margin check (`tests/comparison/margins.ts`) MUST be re-run and MUST pass for both existing and newly-reachable Shape/Direction/Repeat combinations (notably Columns+Side-by-side, Rows+Side-by-side, Calendar+Stacked) before this feature is accepted.
- **III. Hand-Fillable Output** — PASS. Dot size, dot spacing, and margins are untouched; only block arrangement changes.
- **IV. Responsive Options** — PASS, by construction: the new controls feed the same immediate-recompile path as today's `layout` select (`web/src/main.ts`'s `value('layout')` read becomes reads of `shape`/`direction`/`repeat`). Hiding the Direction control when Shape=Calendar must not leave the preview depending on a hidden, stale value (FR-003).
- **V. Scope Discipline** — PASS. This reshapes existing layout controls; it adds no accounts, persistence, or tracking/analytics features.
- **Technical Constraints** — PASS. Typst remains the sole rendering engine; US Letter remains the only paper size; no new numeric limits are needed (Shape/Direction/Repeat are enums, not bounded numbers) — `days` and `perRow` keep their existing `LIMITS` entries unchanged.

No violations. Re-checked after Phase 1 design (research.md, data-model.md): the collapsed
block-builder and shared tiling-function approach stays entirely within `typst/tracker.typ`,
introduces no new numeric limits, and changes no principle's analysis above. Complexity Tracking
table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
web/
├── index.html            # Shape/Direction/Repeat controls replace the single layout <select>
└── src/
    ├── options.ts        # TrackerOptions type, DEFAULTS, LIMITS, validate(), toTypstInputs()
    └── main.ts            # Reads form field values, triggers recompile on change

typst/
└── tracker.typ           # Single layout source (constitution Principle I); collapses
                           # row-habit/calendar-block into one block builder, and the
                           # calendars-only page-tiling grid into one repeat-parameterized
                           # tiling function shared by all Shape/Direction combinations

tests/
├── unit/
│   ├── options.test.ts    # Validation of the new shape/direction/repeat fields
│   ├── fit-model.ts        # Mirrors tracker.typ's width/height fit formulas for tests
│   └── fit.test.ts
└── comparison/
    ├── margins.ts          # Printable-margin gate (constitution Principle II/III)
    └── cases.json          # Add cases for newly-reachable combinations
```

**Structure Decision**: Single existing web app project (Vite + TypeScript + Typst-via-WASM); no new top-level directories. This feature only touches the files listed above — the control markup and wiring in `web/`, the single layout definition in `typst/tracker.typ`, and the test mirrors/cases that assert on layout geometry.

## Complexity Tracking

Not applicable — no Constitution Check violations.
