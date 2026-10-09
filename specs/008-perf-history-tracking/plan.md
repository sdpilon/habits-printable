# Implementation Plan: CI Performance History Tracking

**Branch**: `008-perf-history-tracking` | **Date**: 2026-10-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-perf-history-tracking/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Record the project's existing compile-time performance metric (`median compile: X ms` from `tests/perf/timing.test.ts`) on every CI run, append it to a single persistent history, backfill that history from the project's existing CI run logs, and publish a browsable chart from it. Technical approach (see `research.md`): adopt `benchmark-action/github-action-benchmark` rather than hand-rolling storage/charting — it appends to a JSON file on a `gh-pages` branch and auto-generates a Chart.js dashboard, published via GitHub Pages. A one-off script backfills history from the repo's existing CI run logs before the live step starts appending.

## Technical Context

**Language/Version**: TypeScript/Node 24 (matches existing project toolchain) for the perf-test output change and the backfill script; YAML for the CI workflow change.

**Primary Dependencies**: `benchmark-action/github-action-benchmark` (GitHub Action, pinned to a specific version — confirm current release at implementation time, see `research.md`); GitHub CLI (`gh`) for the backfill script's historical run/log access.

**Storage**: A single JSON data file maintained by the action on a `gh-pages` branch (not a database; not stored on `main`).

**Testing**: No new automated test suite — this is CI/ops tooling, not application code (per spec's Assumptions). Verified operationally per `quickstart.md`.

**Target Platform**: GitHub Actions (`ubuntu-latest`, matching existing `ci.yml`) and GitHub Pages.

**Project Type**: Addition to an existing single-project web app's CI/tooling — no new app, no new runtime component shipped to users.

**Performance Goals**: N/A as a feature of its own — it *tracks* the project's existing 0.2s compile budget (SC-002), it does not add a new performance target.

**Constraints**: Must not alter the pass/fail outcome of the existing `pnpm perf` budget check (FR-006); must not fail CI for pull requests from forks lacking write access (FR-005); the backfill script must run and push its seeded data once, before the live CI step first runs for real, to avoid a duplicate/conflicting entry for the same commit (see spec Edge Cases).

**Scale/Scope**: ~53 pre-existing CI runs to backfill (all from the last few days — no log-retention gap); one new record per qualifying CI run indefinitely afterward.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Not applicable. This repo's constitution (Principles I–V) governs the printable-habit-grid *product* — layout, rendering, print fidelity, and product scope discipline (Principle V names accounts, tracking, and analytics *features of the app* as out-of-scope examples). This feature touches none of that: it's CI/dev-ops tooling for the project's own build pipeline, doesn't render or export anything, and ships nothing to the app's users. No principle applies; no gate to fail. **PASS.**

*Post-Phase-1 re-check*: `data-model.md` and `quickstart.md` introduce no new entities, behavior, or dependencies touching the product itself (layout/rendering/print output) — still **PASS**, unchanged.

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
.github/workflows/ci.yml        # add benchmark-publish step after existing "Timing check"
tests/perf/timing.test.ts       # write customSmallerIsBetter JSON alongside existing assert/console.log
scripts/backfill-perf-history.ts  # one-off backfill script (run once, kept for reproducibility)
```

**Structure Decision**: No new project or directory structure — this is a
small addition to the existing single-project layout (`web/`, `tests/`,
`.github/workflows/`). The only new file is the one-off backfill script
under a new top-level `scripts/` directory (doesn't exist yet; created by
this feature). No frontend/backend split applies.

## Complexity Tracking

Not applicable — Constitution Check passed with no violations.
