---
name: serve-for-me
description: Start (or stop) the dev server or a production-build preview server bound to all network interfaces, running in the background, so the user can reach it themselves from another device (phone, tablet, another computer) on the same network. Use for a request shaped like "start the dev server for me", "serve the prod build so I can check it on my phone", "start it on the network", or "stop the server" once one of these is running. Distinct from run-project's driver-managed server, which is launched/torn down automatically for Playwright driving and is never exposed beyond localhost — don't confuse the two lifecycles.
argument-hint: "dev or prod/build, and optionally a port"
---

# Serve For Me

Runs this project's own server directly in the background (not through
`run-project`'s Playwright driver), bound to `0.0.0.0` instead of
`localhost`, so it's reachable from the user's own devices on the same
network. Stays up after this turn ends — it's for the user to actually use,
not for an agent to drive and tear down.

## Mode

- **dev** (default unless the user says otherwise): `pnpm dev`, serving
  source directly with HMR.
- **prod** / **build**: a real production bundle via `vite preview`. Always
  rebuild first (`pnpm build`) — never serve a `dist/` that might be stale
  from an earlier unrelated build.

If the user's phrasing doesn't say which, ask rather than guessing — the
two modes answer different questions (does the source work vs. does the
shipped bundle work) and this project has been burned before by overlay/
debug code that only shows up in one of the two.

## Ports

Default to Vite's own conventions: **5173** for dev, **4173** for preview.
If the user names a port, use that instead.

Before starting, check whether the target port is already listening
(`lsof -ti:<port> -sTCP:LISTEN`):

- **Nothing there**: proceed normally.
- **Something's already there and it's plausibly this same kind of server
  from earlier in this session** (you started it, or the user mentioned
  one is already up): don't start a duplicate — just report its existing
  Local/Network URLs.
- **Something unrelated is there**: don't kill it blindly. Tell the user
  what's occupying the port and ask whether to use a different port or stop
  the existing process.

## Starting

Run in the background (`run_in_background: true` on the Bash tool), not
foreground — this command is meant to keep running after your turn ends.

```bash
# dev
pnpm dev --host 0.0.0.0 --port <port> --strictPort

# prod/build
pnpm build && pnpm exec vite preview --host 0.0.0.0 --port <port> --strictPort
```

After it starts, read the backgrounded command's output and report back
every URL Vite prints (`Local:` and every `Network:` line — there may be
several, e.g. LAN and Tailscale) so the user can pick whichever is reachable
from the device they're on.

**Always mention the macOS background-server firewall gotcha** (see global
CLAUDE.md / the `Background-started local servers on macOS` note): the first
time an external device actually connects to a server bound to a
non-localhost interface and started from this session, macOS may show an
"Allow incoming network connections" dialog that only renders at the
physical screen — a background session can't see or dismiss it. Say this
proactively, don't wait for "it's not working."

## Stopping

This server was started directly via Bash, not through `run-project`'s
driver — `run-project`'s own `server-stop` command does not know about it
and won't touch it. To stop it:

```bash
lsof -ti:<port> -sTCP:LISTEN | xargs -r kill
```

Confirm the port is free afterward (`lsof -ti:<port> -sTCP:LISTEN` returns
nothing) before reporting it stopped.

## Guardrails

- Never kill a process on the target port without first confirming it's
  actually the server you started (or the user explicitly says to stop
  whatever's there) — an unrelated process could be something else
  entirely.
- Don't serve a production build without rebuilding first; a stale `dist/`
  silently shows old behavior as if it were current.
- This server outlives the turn on purpose — don't stop it at the end of a
  response just because the immediate task is done. Only stop it when asked,
  or when told to clean up / wrap up and the user confirms it's OK to stop.
