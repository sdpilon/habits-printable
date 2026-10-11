# Implementation Plan: Phone-Friendly Numeric Controls

**Branch**: `010-mobile-numeric-controls` | **Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-mobile-numeric-controls/spec.md`

## Summary

On phones the five numeric options can only be changed by typing, because the browser's
spinners are not rendered there. This feature adds visible −/+ steppers beside Habits, Days, and
Dots per row, and a range slider with a live readout beside Dot diameter and Dot spacing. The
existing `<input type="number">` fields stay in place and remain the source of truth, so typing
keeps working and the existing validation, error messages, and preview recompile are reused
unchanged. Native spinners are hidden on the five fields. Limits and steps come from the existing
`LIMITS` table in `web/src/options.ts`, so the controls and the validator cannot disagree.

Approach: static markup additions in `web/index.html`, styling in `web/src/style.css`, and a small
behavior module `web/src/numeric-controls.ts` whose pure step/clamp/format logic is unit-tested.
No Typst, PDF, or validation-rule changes.

## Technical Context

**Language/Version**: TypeScript (strict, ES2022 target) via Vite 8, vanilla DOM.

**Primary Dependencies**: None added. Existing toolchain only (Vite, Biome, Prettier, Vitest,
Playwright). Package manager is pnpm (`pnpm-lock.yaml` present).

**Storage**: N/A

**Testing**: Vitest (`pnpm test`, `tests/unit`) for the pure stepper/slider helpers. Playwright
(`pnpm e2e`, `tests/e2e`) for the existing suite, unmodified, plus one new phone-viewport spec for
the new controls. `pnpm margins` is not required because Typst output is untouched (see Constitution
Check), but it is cheap and may be run as a regression guard.

**Target Platform**: Browser. Phone-sized viewports (width at or below the existing 720px breakpoint,
verified at 390×844) and the existing desktop sidebar layout, in light and dark color schemes.

**Project Type**: Single web app. Changes are scoped to `web/` plus tests.

**Performance Goals**: A stepper or slider change reaches the form's `input` listener in the same
frame; the existing preview recompile budget (5 s settle rule in the e2e suite) is unchanged.

**Constraints**:

- The e2e contract selects inputs with `#options [name="<field>"]`. Exactly one element per field
  name may carry that `name`. New slider elements MUST NOT use the five option names
  (see `contracts/page-interface.md`).
- `readForm()` in `web/src/main.ts` reads `form.elements.namedItem(name)`; a duplicate name would
  return a collection and break the read. Same rule as above.
- Stepper buttons: at least 44×44 CSS px. Typed inputs keep the 24×24 px floor from feature 006.
- No change to label font size (feature 006 clarification).
- Must not introduce a window scroll at phone viewports (feature 004 fit requirement; checked by
  `readWindowFits`).

**Scale/Scope**: Five numeric fields, two new control types (stepper, slider), one phone breakpoint.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
| --- | --- | --- |
| I. Single Layout Source | PASS | No drawing code added to the page. Controls only set option values. |
| II. Preview Equals Print | PASS | Typst template, dot geometry, and margins are untouched, so the printed output is unchanged for identical option values. |
| III. Hand-Fillable Output | PASS | No change to the PDF. |
| IV. Responsive Options | PASS | Each stepper/slider change dispatches the same `input` event as typing, so the preview updates immediately. Steppers clamp to limits, so they cannot create an invalid value. Typed invalid input still produces the existing message and blocks download. |
| V. Scope Discipline | PASS | Only the requested controls. No new option, persistence, or analytics. |
| Technical Constraints: Typst, US Letter, 100% scale, explicit limits | PASS | Limits already defined in `LIMITS`; not changed. |
| Development Workflow: spec + checklist before planning | PASS | `checklists/requirements.md` passed on 2026-10-10. |

**Gate result**: PASS. No violations, so Complexity Tracking is not needed.

**Post-design re-check**: PASS. The design adds no Typst, PDF, or option-limit changes and keeps
the single validation path in `validate()`.

## Project Structure

### Documentation (this feature)

```text
specs/010-mobile-numeric-controls/
├── plan.md                  # This file
├── spec.md                  # Feature spec (from /speckit-specify)
├── research.md              # Phase 0 decisions
├── data-model.md            # Phase 1: numeric control entities and state rules
├── quickstart.md            # Phase 1: validation scenarios
├── contracts/
│   └── page-interface.md    # Phase 1: additions to the e2e page contract
├── checklists/
│   └── requirements.md      # Spec quality checklist
└── tasks.md                 # Created by /speckit-tasks (NOT by /speckit-plan)
```

### Source Code (repository root)

```text
web/
├── index.html               # MODIFIED: stepper buttons and slider+readout beside the five numeric fields
├── src/
│   ├── numeric-controls.ts  # NEW: pure step/clamp/format helpers + DOM wiring for steppers and sliders
│   ├── main.ts              # MODIFIED: call the numeric-controls wiring once at startup
│   ├── options.ts           # UNCHANGED: LIMITS remains the single source of min/max/step
│   └── style.css            # MODIFIED: hide native spinners, stepper and slider layout, 44px tap targets

tests/
├── unit/
│   └── numeric-controls.test.ts   # NEW: step, clamp, rounding, slider-sync mapping
└── e2e/
    ├── mobile-numeric-controls.spec.ts  # NEW: phone-viewport stepper, slider, typing, limits, preview
    └── (existing specs)                 # UNCHANGED, must pass as-is
```

**Structure Decision**: Single web project. Markup is static in `index.html` (not built by JS) so
the e2e contract and no-JS markup stay readable. Behavior lives in one new module, and the pure
helpers are separated from DOM code so Vitest can test them without a browser.

## Complexity Tracking

> No constitution violations. Nothing to justify.
