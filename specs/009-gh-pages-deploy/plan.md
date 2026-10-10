# Implementation Plan: Deploy the Main Site to GitHub Pages

**Branch**: `009-gh-pages-deploy` | **Date**: 2026-10-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-gh-pages-deploy/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Publish the production build of the habit-grid web app to the GitHub Pages
URL already configured for this repo (`gh-pages` branch, root path), keeping
it in sync automatically on every push to `main` that passes CI, without
disturbing the perf-benchmark dashboard already published to the same
branch's `dev/bench/` path. Technical approach: add one step to the end of
the existing `check` job in `ci.yml` that pushes `dist/` to the root of
`gh-pages` (excluding `dev/bench/` from cleanup) via
`JamesIves/github-pages-deploy-action`, restricted to `main`-branch pushes,
under a `concurrency` group so overlapping deploys can never finish
out of order. Switch `vite.config.ts`'s `base` to a relative path (`./`) so
the same build output works unmodified both at the origin root (local
preview, e2e) and under the Pages project-page subpath.

## Technical Context

**Language/Version**: TypeScript / Vite 8 (existing app); GitHub Actions
workflow YAML (existing `ci.yml`) — no new language introduced.

**Primary Dependencies**: `JamesIves/github-pages-deploy-action` (new, CI-only);
existing `pnpm build` (Vite) as the build step whose output gets published.

**Storage**: N/A — the only "storage" is the published static file tree on
the `gh-pages` branch, already in use for the benchmark dashboard.

**Testing**: No new automated test type. The deploy is gated by the existing
CI suite (format, lint, typecheck, unit tests, e2e) already in `ci.yml`; the
live deploy itself is validated manually via `quickstart.md`.

**Target Platform**: GitHub Pages (static hosting), served as a project page
at `https://sdpilon.github.io/habits-printable/`.

**Project Type**: Existing single-page web app + a CI/CD workflow change.

**Performance Goals**: None beyond what the app already has — this feature
adds no new runtime work, only a static-file publish step.

**Constraints**:

- MUST NOT disrupt the existing `dev/bench/` benchmark history on `gh-pages`
  (FR-004).
- MUST guarantee the live site always ends up matching the latest commit on
  `main`, even with overlapping/out-of-order CI runs (FR-007).
- Built asset and navigation paths MUST resolve correctly when served from
  the Pages subpath, not just at origin root (FR-005).

**Scale/Scope**: One static site, one `gh-pages` branch, deploy triggered on
every CI-passing push to `main`; no additional scope.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                                      | Assessment                                                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| I. Single Layout Source                                        | Not affected — no rendering/layout code changes.                                                      |
| II. Preview Equals Print                                       | Not affected — no change to how the PDF/preview is produced.                                          |
| III. Hand-Fillable Output                                      | Not affected.                                                                                         |
| IV. Responsive Options                                         | Not affected.                                                                                         |
| V. Scope Discipline                                            | Not affected — publishing the existing generator publicly adds no accounts/storage/tracking features. |
| Technical Constraints (Typst, US Letter, 100% scale)           | Not affected — no rendering changes.                                                                  |
| Development Workflow (spec before planning, quality checklist) | Satisfied — this spec passed its quality checklist (16/16) before this plan.                          |

**Result**: PASS. No violations; no Complexity Tracking entries needed.

_Post-Phase-1 re-check_: unchanged — the Phase 1 design (research.md,
data-model.md, quickstart.md) introduces no rendering/layout/data changes,
so the table above still holds.

## Project Structure

### Documentation (this feature)

```text
specs/009-gh-pages-deploy/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command) — N/A, no new entities
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory: this feature defines no new API, CLI, or service
interface — it is a CI/CD workflow and build-config change to an existing
static app. There is nothing to write a contract for.

### Source Code (repository root)

```text
vite.config.ts                 # MODIFIED: add `base: './'`
.github/workflows/ci.yml       # MODIFIED: add a deploy step + top-level `concurrency` block
```

**Structure Decision**: Single existing project, no new source directories.
This feature touches exactly two existing files — `vite.config.ts` (one new
config key) and `.github/workflows/ci.yml` (one new step + a `concurrency`
block) — consistent with the repo's existing single-job CI convention (see
`research.md` Decision 4).

## Complexity Tracking

_No entries — Constitution Check reported no violations._
