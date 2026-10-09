# Phase 0 Research: CI Performance History Tracking

All decisions below were substantially resolved during brainstorming
(see `docs/superpowers/specs/2026-10-09-perf-history-tracking-design.md`).
This file confirms/records the remaining technical unknowns needed
before implementation.

## Decision: Use `benchmark-action/github-action-benchmark`, not a hand-rolled recorder

**Rationale**: It already does the recording + append-only storage +
charting in one maintained tool, confirmed via web research to be an
actively used action (e.g. by cairo-vm, git-bug, and others) supporting
a `customSmallerIsBetter` tool mode for arbitrary single-value metrics
like ours.

**Alternatives considered**: Hand-rolled JSON/CSV append script plus a
custom static chart page — rejected as reinventing a maintained tool
for no added benefit; would also mean hand-rolling the dashboard, which
the action provides for free.

## Decision: `customSmallerIsBetter` data shape

```json
[{
  "name": "Typst compile (largest fitting page, median of 10)",
  "unit": "ms",
  "value": <median>,
  "extra": "branch: <branch-name>"
}]
```

**Rationale**: This is the action's documented format for a simple
named numeric metric with no built-in benchmark-tool output to parse
(confirmed via the action's own documentation: entries need only
`name`, `unit`, `value`, with optional `range`/`extra`). Matches our
single existing metric exactly. `extra` carries the branch name —
the schema has no dedicated branch field (see the gh-pages data file
schema decision below), and User Story 2 requires each dashboard
entry to be attributable to the branch that produced it.

## Decision: dashboard URL includes the benchmark-data-dir-path

The action serves its generated `index.html` under its configured
`benchmark-data-dir-path` (default `dev/bench/`), not at the gh-pages
branch root. The Pages site's base URL (from `gh api
repos/{owner}/{repo}/pages --jq .html_url`) must have that path
appended — e.g. `<html_url>dev/bench/` — to actually reach the chart.

**Action for implementation**: confirm this once the action is
configured (it's set via the action's `benchmark-data-dir-path`
input, left at its default unless explicitly overridden), and use the
resolved full URL everywhere the dashboard is linked or checked.

## Decision: gh-pages data file schema (for backfill script compatibility)

The action maintains a `window.BENCHMARK_DATA` object (conventionally
written to `dev/bench/data.js` on the `gh-pages` branch) shaped
approximately as:

```js
window.BENCHMARK_DATA = {
  lastUpdate: <epoch-ms>,
  repoUrl: "https://github.com/<owner>/<repo>",
  entries: {
    "<benchmark suite name, as configured in the workflow step>": [
      {
        commit: { id, message, timestamp, url, author: {...}, committer: {...} },
        date: <epoch-ms>,
        tool: "customSmallerIsBetter",
        benches: [{ name, unit, value, range?, extra? }]
      },
      ...
    ]
  }
}
```

**Rationale**: Confirmed via the action's own output structure (web
research of its documentation and example diffs from projects using
it, e.g. git-bug's `dev/bench/data.js`). The backfill script must
produce entries in this exact shape so the live action can append to
them afterward without needing a migration.

**Action for implementation**: Before writing the backfill script,
run the live action once on a throwaway/dry-run basis (or inspect its
source at the pinned version) to confirm the exact field names and
nesting haven't changed, rather than relying solely on this research —
an action-version mismatch here would silently corrupt the dashboard.

## Decision: pin the action to a specific release, verified at implementation time

**Rationale**: Web research (as of this writing) found `v1.20.7` as a
recent release, but action tags move; pin to whatever the current
latest stable release tag is *at implementation time* (check
https://github.com/benchmark-action/github-action-benchmark/releases
directly), not a value hardcoded here that may already be stale.

**Alternatives considered**: Floating `@v1` tag — rejected per general
CI supply-chain hygiene (a floating major tag can change behavior
without review); pinning to a commit SHA — viable, more secure, but
loses the human-readable version in the workflow file. Default to a
pinned version tag unless the user has a stronger preference at
implementation time.

## Decision: enabling GitHub Pages via `gh api`

```bash
gh api -X POST repos/{owner}/{repo}/pages \
  -f "build_type=legacy" \
  -f "source[branch]=gh-pages" \
  -f "source[path]=/"
```

**Rationale**: Confirmed via GitHub REST API documentation (`POST
/repos/{owner}/{repo}/pages` to enable Pages for a repo that doesn't
have it yet, `build_type: legacy` for branch-based builds rather than
a custom Actions workflow). This repo's `has_pages` was confirmed
`false` prior to this feature.

**Alternatives considered**: Enabling via the Settings UI by hand —
equally valid (it's a one-time action either way), but the API call is
scriptable/reproducible and is this plan's default; the user is free
to do it manually instead when this step is reached.

## Decision: backfill source — `gh run list` + `gh run view --log`, not the GitHub Actions REST API directly

**Rationale**: `gh` already wraps auth and pagination; confirmed
working in this session (`gh run list --json ...`, `gh run view <id>
--log` both returned usable data against this repo, including the
`median compile: X ms` line from a historical run's "Timing check"
step). No need to drop to raw REST calls.

**Alternatives considered**: GitHub Actions REST API directly via
`gh api` — more verbose for no benefit, since `gh run` already gives
structured JSON and log access.
