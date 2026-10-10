# Feature Specification: Deploy the Main Site to GitHub Pages

**Feature Branch**: `009-gh-pages-deploy`

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Deploy the main site to gh Pages"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visit the live app (Priority: P1)

A visitor opens a public URL and gets a fully working copy of the habit-grid
app — able to configure habits, preview the layout, and download a PDF —
without installing anything or running a local dev server.

**Why this priority**: This is the entire point of the feature. Without a
reachable live site, there's nothing to deploy.

**Independent Test**: Open the published URL in a browser and complete a full
configure → preview → download flow.

**Acceptance Scenarios**:

1. **Given** the site has been deployed, **When** a visitor opens the
   published URL directly (not navigating from another page), **Then** the
   app loads and is fully usable — all assets resolve correctly.
2. **Given** the app is loaded from the published URL, **When** the visitor
   configures habits and requests a PDF, **Then** the preview renders and the
   download completes, matching the behavior of a locally-run build.

---

### User Story 2 - Live site stays current automatically (Priority: P2)

As the maintainer, when a change is pushed to `main`, the live site reflects
that change without any manual deploy step.

**Why this priority**: Without automatic redeploy, the feature degrades into
a one-time manual publish that immediately goes stale.

**Independent Test**: Push a visible change to `main`, wait for CI to finish,
then confirm the published URL reflects the new change.

**Acceptance Scenarios**:

1. **Given** a change is pushed to `main` and CI passes, **When** the
   deployment completes, **Then** the published site serves the new build
   with no manual intervention.
2. **Given** a push to `main` fails CI (lint, typecheck, unit tests, or e2e),
   **When** the pipeline finishes, **Then** the live site is left serving the
   last successful build — the broken build is never published.

---

### User Story 3 - Benchmark history keeps working (Priority: P3)

As the maintainer, the existing performance-benchmark history dashboard
(already published on GitHub Pages) keeps working after the main site starts
deploying to the same destination.

**Why this priority**: GitHub Pages for this repo already serves one thing
(the perf-benchmark dashboard under `dev/bench/`); adding the main site must
not clobber that history.

**Independent Test**: After the site deploy is set up, open the existing
benchmark-dashboard URL and confirm prior history is still intact.

**Acceptance Scenarios**:

1. **Given** the benchmark dashboard already has history published, **When**
   the main site is deployed, **Then** the dashboard's existing content and
   history remain reachable and unchanged.

---

### Edge Cases

- What happens when a push to `main` fails CI? The live site MUST continue
  serving the last successful build rather than going down or showing a
  broken build.
- What happens when a pull request (not `main`) runs CI? It MUST NOT trigger
  a deploy to the live site.
- What happens to already-published benchmark history when the site deploy
  first runs? It MUST be left intact — no overwrite, no deletion.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST build a production version of the web app from
  `main` and publish it to a publicly reachable GitHub Pages URL.
- **FR-002**: System MUST automatically redeploy the live site whenever new
  changes are pushed to `main`, with no manual deploy step.
- **FR-003**: System MUST only publish a build that has passed the project's
  existing CI checks (format, lint, typecheck, unit tests, e2e) — a failing
  build MUST NOT replace the live site.
- **FR-004**: System MUST NOT remove, overwrite, or otherwise disrupt the
  existing performance-benchmark history already published on GitHub Pages.
- **FR-005**: The published site MUST work correctly when loaded directly at
  its published URL — all asset and navigation paths MUST resolve under
  wherever GitHub Pages actually serves the project from.
- **FR-006**: Deployment MUST require no manual step (e.g., hand-running a
  build-and-copy script) once set up — pushing to `main` is sufficient.
- **FR-007**: Pull request / non-`main` CI runs MUST NOT publish to the live
  site.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can open the published URL and complete a full
  configure → preview → download flow with no local setup.
- **SC-002**: After a push to `main` passes CI, the live site reflects that
  change with no manual action, as part of the normal CI run — no separate
  deploy trigger needed.
- **SC-003**: The benchmark-history dashboard remains reachable at its
  current URL after the site deploy is in place, with zero loss of prior
  history.
- **SC-004**: A push to `main` that fails CI never results in the live site
  being replaced with the broken version.

## Assumptions

- No custom domain is configured for this repo; the site is published at the
  default GitHub Pages project URL (`https://sdpilon.github.io/habits-printable/`).
- Deployment is continuous: every push to `main` that passes CI redeploys;
  pull requests never trigger a deploy.
- The repo is public, so the published site needs no additional access
  control.
- The app deploys to the root of the existing GitHub Pages destination; the
  benchmark dashboard's existing `dev/bench/` content continues to coexist
  there unchanged.
