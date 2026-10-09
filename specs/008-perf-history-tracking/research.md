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
        commit: {
          id, message, timestamp, url,
          author: { username }, committer: { username }
        },
        date: <epoch-ms>,
        tool: "customSmallerIsBetter",
        benches: [{ name, unit, value, range?, extra? }]
      },
      ...
    ]
  }
}
```

**Rationale**: Confirmed by fetching the pinned version's actual
`dist/src/default_index_html.js` from the action's repo (not just
docs/examples) — its tooltip rendering reads `commit.committer.username`
(not `.name`) and `commit.message`/`commit.timestamp` directly, and a
bench's `extra` field is rendered verbatim in the tooltip (confirms the
branch-attribution approach above actually surfaces in the UI). The
backfill script must produce entries in this exact shape so the live
action can append to them afterward without needing a migration.

**Action for implementation — confirmed, not just planned**: fetched
`dist/src/default_index_html.js` at the pinned tag directly (via the
GitHub API's git blobs endpoint, since the repo's `contents` API
404s on nested paths under `dist/` for this repo for unclear reasons —
`git/trees`/`git/blobs` work fine). This is also the file that must be
seeded (as `index.html`, verbatim, no templating needed — it reads
everything from `window.BENCHMARK_DATA` at runtime) alongside the
backfilled `data.js`, since nothing else will generate it until the
live CI step (User Story 2) runs for the first time — without it,
Story 1's dashboard has no page to render, only raw JSON.

## Decision: pin the action to a specific release, verified at implementation time

**Confirmed at implementation time (T001, 2026-10-09)**: `v1.22.2` —
verified via `https://api.github.com/repos/benchmark-action/github-action-benchmark/releases/latest`,
not reused from the earlier placeholder value below.

**Rationale**: Web research during planning found `v1.20.7` as a
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

## Decision: the action's `name` input must match the backfill's entries key exactly

Confirmed via `action.yml`: the `name` input ("Name of the benchmark.
This value must be identical among all benchmarks") is the key under
`entries` in the gh-pages data file — it's the chart-section grouping,
not just metadata. If the live CI step's `name` input doesn't exactly
match the string the backfill script used as its `entries` key
(`"Typst compile (largest fitting page, median of 10)"`), live runs
would silently create a *second*, disconnected chart section instead
of appending to the backfilled one. The CI workflow step sets
`name: 'Typst compile (largest fitting page, median of 10)'` for
exactly this reason — it's not an arbitrary label, it's a hard
coordination point between `scripts/backfill-perf-history.ts` and
`.github/workflows/ci.yml`.

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

## Decision: concurrent CI runs on different branches don't lose data

Two CI runs finishing near-simultaneously (e.g. two PRs) both attempt
to push an updated data file to `gh-pages`. `benchmark-action/github-action-benchmark`
handles this itself — on push rejection it fetches the latest
`gh-pages` state and retries, merging its own new entry on top rather
than overwriting. No additional locking/retry logic needs to be built
for this.

**Rationale**: this is the action's documented/known behavior for
concurrent writes; confirmed as the basis for choosing this action
over a hand-rolled recorder (see the first Decision in this file)
rather than something we need to implement ourselves.
