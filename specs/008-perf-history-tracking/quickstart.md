# Quickstart: CI Performance History Tracking

Manual validation guide. Each scenario starts from the state left by
the previous one unless noted; only the changes needed are listed.

## Prerequisites

- This feature's CI workflow change, perf-test output change, and
  backfill script are implemented and merged (or present on the
  branch being validated).
- `gh` CLI authenticated against this repo (`gh auth status`).
- GitHub Pages enabled for this repo (see `research.md`'s `gh api
  .../pages` call) — confirm with `gh api repos/{owner}/{repo} --jq
  .has_pages` returning `true`.

## Scenario 1: Backfilled history is complete and ordered

1. Run the backfill script once: `pnpm tsx scripts/backfill-perf-history.ts`
   (or however it's invoked per its own implementation).
2. `git fetch origin gh-pages && git show origin/gh-pages:dev/bench/data.js | head -50`
3. **Expect**: the file exists, contains an `entries` map with one
   array keyed by the metric name, and that array has one entry per
   historical CI run that had a measurable `median compile: X ms`
   value (cross-check count against `gh run list --workflow=ci.yml
   --limit 200 --json databaseId | jq length` minus any runs that
   failed before the Timing check step).
4. **Expect**: entries are in chronological order by commit timestamp,
   oldest first.

## Scenario 2: A live CI run appends exactly one new entry

1. Push any trivial commit (e.g. to a scratch branch) and let CI run
   to completion.
2. `git fetch origin gh-pages && git log origin/gh-pages -1 --format=%s`
3. **Expect**: a new commit on `gh-pages` from the action, and the
   data file's entry count for this metric is exactly one more than
   before the push.
4. Visit the published Pages URL (`gh api repos/{owner}/{repo}/pages
   --jq .html_url`).
5. **Expect**: the chart renders and its most recent point matches the
   value this CI run printed in its "Timing check" step log.

## Scenario 3: The existing performance budget check is unaffected

1. On the same CI run from Scenario 2, check the "Timing check" step's
   outcome.
2. **Expect**: pass/fail is identical to what it would have been
   before this feature (still asserting the 0.2s median budget,
   unaffected by the new JSON-output/publish step added alongside it).

## Scenario 4: A fork PR doesn't fail CI over missing write access

1. Simulate by temporarily editing the guard condition locally, or by
   reasoning through it: a workflow run where `github.event_name ==
   'pull_request'` and `github.event.pull_request.head.repo.full_name
   != github.repository`.
2. **Expect**: the benchmark-publish step is skipped (not failed), and
   the job's overall pass/fail is determined solely by the existing
   steps (lint, typecheck, unit tests, timing, margins, e2e) as today.

## Scenario 5: Local `pnpm perf` is unaffected

1. From a clean checkout, run `pnpm perf` locally (no `gh`/network
   access required).
2. **Expect**: identical behavior to before this feature — prints
   `median compile: X ms` and passes/fails against the 0.2s budget.
   No gh-pages write, no network call, no new file left behind other
   than whatever local JSON-output file the test writes for CI's
   benefit (confirm it's gitignored or in a temp location, not
   committed).
