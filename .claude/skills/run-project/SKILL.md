---
name: run-project
description: Build, run, drive, and screenshot the habits-grid web app (a Vite + vanilla TS single-page app that renders a printable habit-tracker PDF via Typst). Use when asked to run, start, launch, or screenshot the app, confirm a change works in the real page, or drive the preview/download UI.
---

habits-grid is a browser-driven web app (Vite dev server, vanilla TS,
no framework). All paths below are relative to the repo root.

For agent/automated use, drive it through the Playwright REPL at
`.claude/skills/run-project/driver.mjs` (commands piped over stdin).

## Prerequisites

```bash
pnpm install
```

## Build

Nothing to build for the driver path — Vite serves TS directly. For a
production bundle (what `pnpm e2e` tests against), `pnpm build` writes
to `dist/`.

## Run (agent path)

```bash
cd /path/to/project/root
node .claude/skills/run-project/driver.mjs
```

It's a REPL: commands arrive one per line, each prints its result.
Pipe a script via heredoc for one-shot runs.

**First run on a machine:** `launch` with no argument doesn't guess
which cached Chromium to use — it reports what it found and stops, so
the choice can be confirmed first rather than silently picked:

```bash
node .claude/skills/run-project/driver.mjs <<'EOF'
launch
quit
EOF
```

- **No cached binary found** → ask the user whether to run
  `playwright install chromium`. If they approve, run that command
  directly in the shell yourself (it's unrelated to this driver, which
  never runs it on its own), then retry `launch`.
- **One found** → it's printed along with whether its revision matches
  this project's pinned Playwright (see Gotchas) — confirm with the
  user, then re-run with `launch <path>` using the exact path printed
  (no quotes; the path itself may contain spaces).
- **More than one found** → same, but choose between them; if exactly
  one matches the pinned revision it's called out as the recommended
  one.

`launch <path>` never checks that `path` came from its own discovery —
a system Chrome/Chromium install, or anything else Chromium-compatible,
works the same way if you point it there directly.

Confirming via `launch <path>` remembers the choice as a gitignored,
machine-local symlink (`.chromium-bin` next to this skill, pointing at
the confirmed binary), so every run after that — on this machine —
just works with a bare `launch`, no re-asking. A dangling symlink (the
confirmed binary got removed or moved) is treated the same as no
confirmed choice at all — back to the discovery flow above, no manual
cleanup needed. Verified end-to-end, including a fresh `git clone` +
`pnpm install` with that symlink absent:

```bash
node .claude/skills/run-project/driver.mjs <<'EOF'
server-start
launch
goto /
wait-settled
counts
ss 01-defaults
fill input[name="habits"] 6
wait-settled
counts
download-enabled
ss 02-habits-6
errors
quit
EOF
```

Screenshots land in `/tmp/habits-grid-shots/` (override:
`SCREENSHOT_DIR`). **Always look at the screenshot file** — the loop
is `goto` -> `wait-settled` -> act (`fill`/`click`/`select`) ->
`wait-settled` -> `ss` -> `errors`.

For iterative/interactive use, wrap it in `tmux` and `send-keys` one
command at a time instead of piping a whole script. This is the
general pattern for driving a REPL, not something that's actually
been run against this driver — check `SKILL.local.md` (see
"Machine-specific notes" below) for whether `tmux` is actually usable
on the machine you're on before relying on it:

```bash
tmux new-session -d -s habits-grid -x 200 -y 50
tmux send-keys -t habits-grid 'cd /path/to/habits-grid && node .claude/skills/run-project/driver.mjs' Enter
tmux send-keys -t habits-grid 'server-start' Enter
tmux send-keys -t habits-grid 'launch' Enter
tmux send-keys -t habits-grid 'goto /' Enter
tmux send-keys -t habits-grid 'ss landing' Enter
tmux capture-pane -t habits-grid -p
```

### Commands

| command                    | what it does                                                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `server-start`             | runs `pnpm dev --port 5173 --strictPort` in the background, waits until it responds (override the port: `PORT`)                                                                                                                      |
| `server-stop`              | kills the dev server's process group                                                                                                                                                                                                 |
| `launch [path]`            | with `path` given explicitly, launches headless and confirms/remembers it for next time; with no argument, launches the already-confirmed path if one is saved, otherwise reports cached candidates instead of launching — see above |
| `goto [path]`              | navigates to `http://localhost:5173/<path>` (default `/`; port follows `PORT`, see `server-start`)                                                                                                                                   |
| `ss [name]`                | screenshot -> `/tmp/habits-grid-shots/<name>.png`                                                                                                                                                                                    |
| `fill <css-sel> <value>`   | clears then fills a text/number input                                                                                                                                                                                                |
| `select <css-sel> <value>` | sets a `<select>`'s value                                                                                                                                                                                                            |
| `click <css-sel>`          | clicks an element                                                                                                                                                                                                                    |
| `wait <css-sel>`           | waits up to 10s for a selector                                                                                                                                                                                                       |
| `wait-settled`             | waits up to 10s for `#preview-section[aria-busy="false"]` — the page's own "render finished" signal                                                                                                                                  |
| `counts`                   | prints `#preview-section`'s `data-habits`/`data-days` (the layout actually drawn)                                                                                                                                                    |
| `download-enabled`         | prints whether `#download` is enabled                                                                                                                                                                                                |
| `canvas-hash`              | sha1 of the `#preview canvas` pixels — use only to confirm _something_ redrew, not to detect settling (use `wait-settled` for that)                                                                                                  |
| `eval <js>`                | `page.evaluate`, prints JSON                                                                                                                                                                                                         |
| `text [css-sel]`           | prints `innerText` (body if no selector)                                                                                                                                                                                             |
| `errors`                   | prints captured console/page errors since `launch`                                                                                                                                                                                   |
| `quit`                     | closes the browser and stops the dev server if this REPL started it                                                                                                                                                                  |

`quit` (or stdin EOF / Ctrl-D) always tears down the browser and, if
this process started it, the dev server — verified the port is free
immediately after.

## Run (human path)

```bash
pnpm dev
```

Opens nothing by itself — prints a `http://localhost:5173/` URL to
open in a real browser. Useless headless; `Ctrl-C` to stop.

For starting a server on the user's behalf that stays up in the background
and is reachable from their own other devices (not this driver's own
ephemeral, localhost-only, Playwright-managed server below) — a request
like "start the dev server for me" — use the `serve-for-me` skill instead.
The two server lifecycles are independent: this skill's `server-stop` does
not know about anything `serve-for-me` started, and vice versa.

## Test

```bash
pnpm test   # vitest unit tests - 29 passed in ~1.5s
pnpm e2e    # playwright e2e suite - 18 passed in ~28s
```

Both verified clean on a fresh `git clone` + `pnpm install`, no other
setup.

`pnpm e2e` builds its own production bundle and manages its own
server/port — it does not need `driver.mjs` or `server-start`. Use
the driver for ad hoc interaction/screenshots; use `pnpm e2e` for the
real regression suite.

## Gotchas

- **`chromium-cli` (the generic `/run` skill's assumed default web-app
  driver) isn't an installable tool on this machine.** There's no real
  npm/brew package by that name — the only npm hit is a placeholder
  published specifically to catch AI agents hallucinating it. It's
  presumably bundled tooling internal to some other Claude Code
  execution environment. Hence the custom REPL here instead.
- **pnpm doesn't hoist `playwright-core`.** It's a transitive dep of
  `@playwright/test`, not a direct dependency, so
  `node_modules/playwright-core` doesn't exist at the top level under
  pnpm's strict linking. The driver resolves it by scanning
  `node_modules/.pnpm` for a `playwright-core@*` directory instead of
  hardcoding a version.
- **`playwright-core` is CJS; dynamic `import()` only exposes it under
  `.default`.** `const { chromium } = await import(path)` is
  `undefined`; it has to be
  `const { chromium } = (await import(path)).default`.
- **Piped (non-TTY) stdin delivers every line to `readline` immediately**,
  well before an earlier async command (e.g. `server-start`, which
  waits up to 20s) finishes. Without serializing, `launch` races
  `server-start` and `quit` can tear down the server mid-boot. The
  driver queues each line's handler behind the previous one's promise.
  A naive one-line-per-event handler looks like it works interactively
  but silently reorders under a heredoc.
- **`readline`'s `'close'` event fires on stdin EOF**, independent of
  whether queued async commands have finished — calling `rl.prompt()`
  after that throws `ERR_USE_AFTER_CLOSE`. The driver gates `rl.prompt()`
  behind an `rlOpen` flag set `false` in the `'close'` handler.
- **The driver never runs `playwright install` itself**, since that's
  a manual step outside the normal `pnpm install` dependency flow — if
  it's needed, whoever's driving this (the agent, or a human) runs it
  directly in the shell after the user approves, then retries `launch`.
  See "Run (agent path)" above for what the driver does on its own
  (discover, confirm, remember).
- **Vite's default port (5173) can be left occupied by a prior run.**
  `server-start` uses `--strictPort` so it fails loudly instead of
  silently picking a different port; if it times out, check
  `lsof -ti:5173 -sTCP:LISTEN` for a stale process first.
- **`pnpm dev`/`pnpm build`/anything that execs `node` can fail with
  `ERR_PNPM_SHIM_NO_TARGET` on a machine where pnpm's own Node.js
  version-management shim (`pnpm config get globalShims`) is enabled
  but has never actually provisioned a runtime.** This has nothing to
  do with habits-grid — `pnpm install` for this project succeeds either
  way, and the failure shows up the moment anything tries to run `node`
  afterward. See "Machine-specific notes" below for the fix; it's a
  one-time, whole-machine fix, not something to redo per clone.
- **A machine can have multiple cached `chromium-<rev>/` dirs from
  unrelated projects' Playwright installs, and they aren't
  interchangeable.** `playwright-core`'s own `browsers.json` pins an
  exact revision (e.g. `1243` for `1.63.0`, == Chrome for Testing
  `153.0.8010.12`) — a differently-revisioned cached binary may well
  launch and mostly work, but it's not the build this project's
  Playwright was tested against. `launch`'s discovery output flags
  which candidate(s) match before anyone picks one.

## Troubleshooting

- **`launch` prints "No cached Chromium binary found on this machine"**:
  nothing under the platform's Playwright cache dir
  (`~/Library/Caches/ms-playwright/` on macOS, `~/.cache/ms-playwright/`
  on Linux), or your platform/arch isn't one of the paths
  `CHROMIUM_BINARY_BY_PLATFORM` in `driver.mjs` knows about. Ask the
  user before running `playwright install`; see Gotchas.
- **`launch` (no argument) just prints candidates and doesn't launch**:
  expected on a first run on this machine, or after `.chromium-bin`
  goes dangling (its target binary got removed or moved) — see
  "First run on a machine" above. Confirm one with the user, then
  `launch <path>`.
- **`server-start` times out**: something is already bound to port 5173. `lsof -ti:5173 -sTCP:LISTEN | xargs -r kill`, then retry.
- **A command prints `ERROR: launch first`**: `page` is still null —
  either `launch` wasn't run yet (or only ran in discovery mode — see
  above), or (if driving via heredoc) an earlier command errored
  silently upstream. Run `errors` and re-check the transcript from the
  top.

## Machine-specific notes

Before relying on anything above that could vary by machine (whether
`tmux` is actually usable, which Chromium cache path/platform was
actually exercised, shell quirks like missing GNU `timeout`), check
`.claude/skills/run-project/SKILL.local.md`. It's gitignored on
purpose — those are facts about the machine a session happened to run
on, not about habits-grid, so they don't belong in this tracked file.

`.SKILL.local.md` (the leading-dot file, tracked) is the empty
template for it. If `SKILL.local.md` doesn't exist yet on the machine
you're on, copy `.SKILL.local.md` to `SKILL.local.md` and start filling
it in as you hit things — don't assume anything carries over from
another machine.
