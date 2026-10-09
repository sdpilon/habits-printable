# Implementation Plan: Compact, Polished Options UI

**Branch**: `006-compact-controls-ui` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-compact-controls-ui/spec.md`

## Summary

Restyle the existing options form (`web/index.html` + `web/src/style.css`) so its eight controls
use noticeably less vertical space and internal padding, without shrinking text, while reading as
a more deliberately designed panel. The approach is CSS/markup-only: move labels beside their
inputs instead of stacking them, group the related numeric fields into a row, trim each control's
own internal padding down to (but not below) a 24×24px tappable area, darken the control border
color enough to clear the WCAG AA 3:1 non-text contrast floor (the current `--line` value fails
this today), and add a consistent focus/hover state that respects `prefers-reduced-motion`. No
application logic, validation rules, option limits, or Typst/PDF output changes.

## Technical Context

**Language/Version**: TypeScript (strict, ES2022 target) via Vite 8; this feature itself is almost
entirely HTML (`web/index.html`) and CSS (`web/src/style.css`) — no new TS logic is expected.

**Primary Dependencies**: None added. Uses the project's existing toolchain only (Vite, vanilla
DOM, Biome for TS/CSS/JSON formatting+lint, Prettier for Markdown). No CSS framework, no new npm
packages.

**Storage**: N/A

**Testing**: Vitest (`tests/unit`) for option validation logic (unaffected by this feature),
Playwright (`tests/e2e`) for the form/preview behavior — these select controls by `name`/`id`
attributes (see Contracts below) and MUST keep passing unmodified. `tests/comparison/margins.ts`
(PDF margin check) and `tests/perf` are unaffected since the Typst template is untouched, but both
are re-run as a regression guard per SC-005.

**Target Platform**: Browser, both the existing desktop (sidebar) and mobile (stacked, <720px)
responsive breakpoints, in both the light and dark color schemes the app already supports.

**Project Type**: Single web app (no new project/package). Changes are scoped to the existing
`web/` frontend.

**Performance Goals**: N/A — static markup/CSS change, no runtime behavior affected. Existing
`tests/perf` timing budget is unaffected and re-run only as a regression guard.

**Constraints**:
- Must preserve the existing `name`/`id` contract the e2e suite depends on
  (`specs/002-e2e-tests/contracts/page-test-interface.md`) — see Contracts section.
- Text/label font size MUST NOT shrink (clarified 2026-10-08); space savings come from layout and
  padding only.
- Every interactive control MUST keep a ≥24×24 CSS px tappable area on mobile (WCAG 2.2 AA 2.5.8).
- Redesigned styling MUST meet WCAG AA contrast (4.5:1 text, 3:1 UI component boundaries) in both
  color schemes. **Finding**: computing the actual ratios for the current palette shows text
  colors already pass (16.8:1 / 5.1:1 / 7.3:1 light; 15.6:1 / 6.6:1 / 7.5:1 dark), but the current
  `--line` border color used on inputs/selects/buttons is only ~1.5:1 in both modes — well under
  the 3:1 floor. The border color must change; see research.md.
- No change to Typst template, dot geometry, margins, option limits, or validation rules
  (Constitution Principles I–III, V).

**Scale/Scope**: One form, eight controls, two breakpoints, two color schemes. No new entities,
routes, or persisted state.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Single Layout Source | Feature touches only the HTML options form and its CSS, never the Typst template or a separate drawing implementation. | PASS |
| II. Preview Equals Print | Typst template, compile pipeline, and exported PDF are untouched; the preview still renders the same compiled PDF. `tests/comparison/margins.ts` re-run as a regression guard, not because this feature affects dot geometry/margins. | PASS |
| III. Hand-Fillable Output | No change to dot size/shape or printable margins — only the on-screen control panel chrome changes. | PASS |
| IV. Responsive Options | FR-002 explicitly requires preserving live preview updates, invalid-input messaging, and the disabled-download guard unchanged. | PASS |
| V. Scope Discipline | No new options, fields, accounts, or persistence; purely a layout/visual change using the existing toolchain (no new dependencies). | PASS |

No violations. Complexity Tracking table is not needed.

**Post-Phase 1 re-check**: data-model.md confirms no entity/schema changes, contracts/page-interface.md
confirms the e2e interface contract is unchanged, and quickstart.md's verification approach adds no
new dependency or automated test infrastructure beyond the existing suites. All five principles
still PASS; no new complexity introduced by the design artifacts.

## Project Structure

### Documentation (this feature)

```text
specs/006-compact-controls-ui/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output (confirms: no data model changes)
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output (reaffirms the existing 002 interface contract)
└── tasks.md              # Phase 2 output (/speckit-tasks — not created by this command)
```

### Source Code (repository root)

```text
web/
├── index.html           # Options form markup — primary edit target (grouping, label placement)
├── src/
│   ├── style.css        # Form layout, spacing, control sizing, border color, focus state — primary edit target
│   ├── main.ts           # Wires the form to validation/compile/preview — unaffected logic; touched
│   │                      only if new wrapper elements need a selector main.ts doesn't already have
│   ├── options.ts         # Field limits/validation — unaffected, no new fields
│   └── preview.ts, typst-*.ts, debug-overlay.ts, map-upsert-polyfill.ts  # unaffected

tests/
├── unit/                 # Vitest; unaffected (no logic change)
├── e2e/                  # Playwright; selects by name/id per the existing contract — must keep passing
├── comparison/margins.ts  # PDF margin check; unaffected, re-run as regression guard
└── perf/                  # Timing checks; unaffected, re-run as regression guard
```

**Structure Decision**: Single existing web app, no new projects or packages. All substantive
changes land in `web/index.html` and `web/src/style.css`. `web/src/main.ts` is touched only if a
new grouping wrapper needs a DOM hook that doesn't already exist — the existing `name`/`id`
attributes on every control stay exactly as they are so the e2e suite needs no changes.

## Complexity Tracking

Not applicable — Constitution Check reported no violations.
