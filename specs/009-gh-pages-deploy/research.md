# Research: Deploy the Main Site to GitHub Pages

## Decision 1: Keep the existing branch-based Pages source

**Decision**: Publish the built app by pushing to the root of the `gh-pages`
branch (the same branch the perf-benchmark dashboard already publishes to),
rather than switching the repo to GitHub's newer Actions-environment Pages
deployment (`actions/configure-pages` + `actions/deploy-pages`).

**Rationale**: `gh api repos/sdpilon/habits-printable/pages` confirms the repo's
Pages source is already `{"branch":"gh-pages","path":"/"}` (`build_type:
"legacy"`) — this is how `benchmark-action/github-action-benchmark`'s
`auto-push` already publishes `dev/bench/`. A repo can only have one Pages
source configured at a time. Switching to the Actions-environment model would
mean migrating the benchmark publish step too (out of scope) just to deploy
the app. Staying on the branch-based source keeps this feature's blast radius
to "add a step that pushes `dist/` to `gh-pages`," with no Pages-settings
change and no new `pages: write` / `id-token: write` permissions — the `check`
job already has `contents: write`, which is all a branch push needs.

**Alternatives considered**: `actions/deploy-pages` (GitHub's current
recommended path for new projects) — rejected because it replaces the whole
Pages artifact on each deploy and doesn't compose with a separate branch-push
publisher for `dev/bench/`; adopting it would require moving the benchmark
dashboard onto the same artifact pipeline, which is unrelated extra scope.

## Decision 2: Publish via `JamesIves/github-pages-deploy-action`, excluding `dev/bench/`

**Decision**: Use `JamesIves/github-pages-deploy-action`, pinned to `v4.9.0`
(the latest release as of 2026-10-09, confirmed via `gh api
repos/JamesIves/github-pages-deploy-action/releases/latest` during tasks.md
T001 — not guessed at plan time), to push the production build to the root
of `gh-pages`, with `clean: true` (default) and `clean-exclude: dev/bench`
so stale app assets get swept on every deploy while the benchmark history is
explicitly protected.

**Rationale**: Satisfies FR-004 directly. The alternative,
`peaceiris/actions-gh-pages` with `keep_files: true`, would also avoid
touching `dev/bench/`, but `keep_files: true` keeps _everything_ ever
published — since Vite content-hashes asset filenames, every deploy would
leave the previous deploy's JS/WASM chunks behind forever, growing the branch
unbounded. `clean-exclude` gets the protection without that downside.

**Alternatives considered**: `peaceiris/actions-gh-pages` (rejected per
above — unbounded orphaned-asset growth); a hand-rolled `git worktree` +
manual commit script (rejected — reimplements what a maintained action
already does correctly, including the clean-exclude logic).

## Decision 3: Relative Vite `base` instead of an environment-specific one

**Decision**: Set `base: './'` in `vite.config.ts`.

**Rationale**: `vite.config.ts` currently has no `base` (defaults to `/`),
which resolves correctly when served from the origin root — true for `vite
preview` (e2e) and `vite dev`, but not for a GitHub Pages project page, which
serves from `/habits-printable/`. A relative base makes every built asset
reference relative to `index.html`'s own location, so the exact same
`pnpm build` output works unmodified at the origin root (e2e, local preview)
_and_ under the Pages subpath — no second build config, no env-conditional
base. Confirmed safe: the app has no client-side routing and no absolute-path
`fetch()`/`new URL('/...')` calls (checked `web/src/*.ts`); the only
absolute-looking path is `<link href="/src/style.css">` in `web/index.html`,
which Vite itself rewrites relative to `base` at build time.

**Alternatives considered**: `base: '/habits-printable/'` (hardcoded repo
name) — rejected: works for the deploy but breaks `vite preview`/e2e, which
serve at root, forcing two separate build invocations/configs for the same
output.

## Decision 4: Deploy step lives in the existing single `check` job

**Decision**: Add the build-and-publish step to the end of the existing
`check` job in `.github/workflows/ci.yml`, after `e2e` passes — not a
separate job.

**Rationale**: Matches the repo's existing convention (one job, sequential
steps — see the `Publish benchmark result` step already living mid-job) and
the project's current scale doesn't justify the added complexity/duplicate
checkout+install cost of a second job. The deploy step's own `if:` condition
restricts it to `main` pushes only (FR-006), the same pattern the benchmark
step already uses for its own condition.

**Alternatives considered**: separate `deploy` job depending on `check` via
`needs:` — rejected for now as unnecessary parallelism for a project this
size; would re-pay the checkout/install/cache cost for no benefit since the
deploy step needs `check`'s own build output anyway.

## Decision 5: Concurrency control for FR-007 (latest-wins guarantee)

**Decision**: Add a workflow-level `concurrency: { group: pages, cancel-in-progress: false }`.

**Rationale**: GitHub Actions concurrency groups automatically skip any
queued run that is superseded by a newer one _before it starts_, regardless
of `cancel-in-progress`. Setting `cancel-in-progress: false` means an
_already-running_ deploy is never killed mid-push (which could leave
`gh-pages` in a half-written state); it simply finishes, and any
now-stale queued runs in between are skipped automatically, so the branch
always ends up at the latest pushed commit. `cancel-in-progress: true` was
considered but rejected: it can abort a deploy action mid-`git push`.

**Alternatives considered**: `cancel-in-progress: true` (rejected — unsafe
mid-push abort risk); no concurrency group at all (rejected — this is exactly
the gap the clarification session flagged: two overlapping runs could finish
in either order with no ordering guarantee).
