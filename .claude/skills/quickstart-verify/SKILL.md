---
name: quickstart-verify
description: Dispatch a fresh agent to manually drive the real app through every scenario in a spec's quickstart.md and report pass/fail back, flagging (not silently skipping) anything this environment can't independently verify. Use when asked to verify, manually test, or run through quickstart scenarios for a spec/feature/bugfix, or before closing out work whose specs/NNN-slug/quickstart.md needs a by-hand pass beyond the automated test suite (pnpm test/e2e/perf/margins).
argument-hint: "Spec number or slug to verify (defaults to the current branch's spec)"
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: project
user-invocable: true
disable-model-invocation: false
---

# Verify Quickstart

Runs the by-hand checklist in a SpecKit spec's `quickstart.md` against the
real running app, via one fresh subagent with no memory of how the
fix/feature was built — so its verification isn't biased by assuming the
implementation is already correct. The output is a pass/fail/unverified
report per scenario, not a file written to the repo (contrast
`/speckit-bug-test`, which records a verification report to
`.specify/bugs/<slug>/test.md`; this command has no spec-kit extension of
its own and produces no artifact beyond the conversation).

This is what to use for a request shaped like "start a fresh agent and go
through the quickstart scenarios, report back any issues."

## User Input

```text
$ARGUMENTS
```

Optional: a spec number or slug (e.g. `005`, `005-mobile-preview-crashes`).
Empty is the normal case — resolve from the current branch instead (see
Spec Resolution).

## Spec Resolution

1. **User-provided identifier**: if `$ARGUMENTS` names a spec, resolve it
   against `specs/` (a bare number like `005` matches the
   `specs/005-*/` directory; a full slug matches exactly).
2. **Current branch** (the normal case, no argument given): SpecKit
   branches are named `NNN-slug` matching a `specs/NNN-slug/` directory —
   resolve from `git branch --show-current`.
3. **Neither resolves**: list every `specs/*/quickstart.md` that exists and
   ask which one, rather than guessing.

Set `QUICKSTART = specs/<resolved-dir>/quickstart.md`.

## Prerequisites

- `QUICKSTART` must exist. If the resolved spec directory has no
  `quickstart.md` at all, say so and stop — there's nothing to run. (A spec
  that used a lightweight bug-report format instead of a full feature spec
  may still have its own `quickstart.md` alongside it — check before
  assuming there's nothing to verify.)
- Confirm this project has a driving skill for the app itself — check
  `.claude/skills/` for one (e.g. `run-project`, or this project's own
  equivalent). The dispatched agent needs it to actually drive the app;
  don't send it in without confirming the skill exists first.
- `git status`: not a hard blocker, but note any uncommitted changes
  relevant to this spec in the dispatch prompt below, so the agent knows
  what it's actually testing. Don't dispatch mid-edit to your _own_
  in-progress work in the same session without saying so.
- Note whether a dev server is already running on the port the driving
  skill expects (e.g. `lsof -ti:5173`), so the dispatch prompt can tell the
  agent to reuse it instead of fighting over the port.

## Execution

1. **Dispatch one fresh agent** — `subagent_type: general-purpose`,
   explicitly **not** `fork`. A fork inherits this session's full context,
   including every assumption already made about whether the fix works;
   the whole point is an agent that approaches the app with no prior belief
   about the outcome.

2. **Prompt it with everything it needs** — a fresh agent has zero context,
   so the prompt has to be self-contained. Fill in the bracketed parts and
   send essentially this, verbatim:

   ```text
   You're working in the repo at [ABSOLUTE_PROJECT_PATH] (on branch
   [BRANCH], working tree [clean/has uncommitted changes — note what and
   why if not clean]) — don't switch branches or touch git.
   [ONE-SENTENCE PROJECT DESCRIPTION — what kind of app this is, how it's
   built/run.]

   [ONE-TWO SENTENCES OF CONTEXT: what work this quickstart is verifying —
   a bugfix, a feature, what it changed — and why an independent manual
   pass is wanted on top of the automated suite, which is already green.]

   **Your task**: read `[QUICKSTART]` in full, then manually execute every
   numbered scenario in it, and report back pass/fail/inconclusive for each
   with specifics.

   **How to drive the app**: read and follow
   `.claude/skills/[DRIVING_SKILL]/SKILL.md` — it documents how to
   launch/drive/screenshot the app. Use it exactly as documented, including
   its own first-run/discovery flow if launching doesn't just work. [If a
   dev server was already found running: note the port and tell the agent
   to connect to it instead of starting a new one.]

   **Important limitation to flag, not silently skip**: [list anything the
   quickstart calls for that this environment genuinely cannot do — a
   specific mobile browser, a real device, hardware the driving tool
   doesn't control. For each, tell the agent: do what you can with what's
   available instead, but explicitly mark that scenario NOT INDEPENDENTLY
   VERIFIED for the part you couldn't actually test — never claim a pass on
   a part you didn't run.]

   Work through the scenarios in order. For each, note: what you did, what
   you expected (per the quickstart doc), what you actually observed, and
   PASS / FAIL / NOT INDEPENDENTLY VERIFIED. Take screenshots where useful
   for anything surprising. At the end, give a short overall summary:
   anything that looks like a real regression or problem, versus everything
   that checked out fine.

   Do not modify any files, do not commit anything, do not touch git. This
   is a read-only / drive-and-observe verification task. Report your
   findings back in full detail.
   ```

3. **Synthesize the report back to the user** — don't just relay the raw
   report verbatim if it's long. Pull out what's pass/fail/unverified and
   any regressions, in the same shape as the agent's own summary.

4. **Offer to update the PR checklist, if this project has that
   convention** — check project memory for whether open PRs here include a
   collapsible quickstart-scenario checklist. If so, offer to update it to
   match what was _actually_ confirmed: check a box only for a scenario
   genuinely run and passed; leave it unchecked with a note for anything
   marked NOT INDEPENDENTLY VERIFIED. Never check a box on the agent's
   behalf for something it flagged as unverified.

## Guardrails

- The dispatched agent must be told, explicitly, not to modify files,
  commit, or touch git — this is a read-only verification pass.
- Never let the agent (or yourself, synthesizing its report) silently
  upgrade a "not independently verified" result to a pass. If a scenario
  genuinely can't be tested from this environment, say so in the final
  report, don't omit it.
- A regression the agent finds is a new bug, not something to quietly patch
  over in the same breath — surface it plainly and let the user decide
  whether to fix now or track it separately.
- Never fabricate scenario results for a `quickstart.md` that doesn't
  exist, and never invent scenario numbers not actually present in the
  file.
