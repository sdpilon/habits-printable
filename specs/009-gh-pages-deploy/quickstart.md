# Quickstart: Deploy the Main Site to GitHub Pages

Manual validation guide. Each scenario starts from the state left by
the previous one unless noted; only the changes needed are listed.

## Prerequisites

- This feature's `vite.config.ts` `base` change and the `ci.yml` deploy step
  are implemented and merged (or present on the branch being validated).
- `gh` CLI authenticated against this repo (`gh auth status`).
- GitHub Pages already enabled for this repo at `branch: gh-pages, path: /`
  (see `research.md` Decision 1) — confirm with
  `gh api repos/sdpilon/habits-printable/pages --jq .source`.

## Scenario 1: A visitor can use the live app end-to-end

1. Open `https://sdpilon.github.io/habits-printable/` directly (type/paste
   the URL — don't navigate in from another page first).
2. **Expect**: the page loads with no 404s in the browser console for any
   script/style/worker/WASM asset.
3. Set habits/days to something other than the defaults, then request a PDF
   download.
4. **Expect**: the preview updates and the PDF downloads successfully,
   matching the behavior of a locally-run `pnpm dev`.

## Scenario 2: A push to `main` redeploys automatically

1. Push a small, visible change to `main` (e.g. a text tweak) and wait for
   the `ci.yml` workflow to finish.
2. `git fetch origin gh-pages && git log origin/gh-pages -1 --format=%s`
3. **Expect**: a new commit on `gh-pages` from the deploy step, landing after
   CI passes, with no manual action taken.
4. Reload the published URL (hard refresh / cache-bypass).
5. **Expect**: the change is visible.

## Scenario 3: A failing push to `main` never reaches the live site

1. Push a commit to `main` that fails CI (e.g. a lint or type error) —
   easiest to validate by reasoning through the workflow: the deploy step
   runs after `e2e` in the same job, so any earlier step failing (format,
   lint, typecheck, unit tests, timing, margins, e2e) means the job stops
   before the deploy step ever runs.
2. **Expect**: no new commit appears on `gh-pages`, and the live site still
   serves the last successful build.

## Scenario 4: The benchmark dashboard survives the app's first deploy

1. Before merging this feature, note the current benchmark dashboard state:
   `git fetch origin gh-pages && git log origin/gh-pages -1 --format=%H -- dev/bench`.
2. After this feature's first deploy runs, repeat the same command.
3. **Expect**: `dev/bench/`'s latest commit hash for that path is unchanged
   (the app's deploy didn't touch it), and
   `<html_url>dev/bench/` still renders the existing chart with all prior
   history intact.

## Scenario 5: A pull request never deploys

1. Open a pull request against `main` with any trivial change and let CI run.
2. **Expect**: the workflow's deploy step is skipped (its `if:` condition
   excludes non-`main` runs) — check the step's status in the Actions run
   view (should show "Skipped", not run and not failed).
3. `git fetch origin gh-pages && git log origin/gh-pages -1 --format=%H`
4. **Expect**: no new commit appears on `gh-pages` from this PR's run.

## Scenario 6: Overlapping pushes to `main` never let an older build win

1. Reason through the configured `concurrency: { group: pages,
cancel-in-progress: false }` setting (see `research.md` Decision 5) rather
   than trying to race two real pushes by hand: push A starts the workflow;
   while it's still running, push B's workflow run is queued into the same
   concurrency group.
2. **Expect**: push A's run is left to finish uninterrupted (not canceled
   mid-deploy); once it finishes, push B's run proceeds and deploys last,
   so `gh-pages` ends up matching the newer commit. If a third push C had
   landed and finished queuing before B started, B's run would have been
   skipped automatically in favor of C — never the reverse.
