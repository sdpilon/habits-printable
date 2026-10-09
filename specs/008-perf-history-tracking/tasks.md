---

description: "Task list for CI Performance History Tracking"
---

# Tasks: CI Performance History Tracking

**Input**: Design documents from `/specs/008-perf-history-tracking/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no `contracts/` — purely internal CI tooling)

**Tests**: Not requested in the spec (this is CI/ops tooling, not application code — see spec's Assumptions). Verification is operational via `quickstart.md`'s scenarios, referenced below instead of a separate automated test suite.

**Organization**: Tasks are grouped by user story (US1, US2) per `spec.md`'s priorities, so each can be implemented and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2)
- File paths are exact; schemas/commands referenced are the ones confirmed in `research.md`/`data-model.md`, not left to implementation-time guessing

---

## Phase 1: Setup

**Purpose**: Resolve the one open implementation-time decision flagged in `research.md` before any code change depends on it.

- [ ] T001 Look up the current latest stable release tag of `benchmark-action/github-action-benchmark` at https://github.com/benchmark-action/github-action-benchmark/releases (research.md's placeholder value, `v1.20.7`, was current only as of the research date and must be reconfirmed, not reused blindly). Record the confirmed tag in `specs/008-perf-history-tracking/research.md`'s "pin the action to a specific release" decision.

---

## Phase 2: Foundational

No blocking foundational work beyond Setup — User Story 1 (backfill + dashboard) and User Story 2 (live CI recording) touch disjoint files and have no shared prerequisite other than T001's pinned version, which only US2 actually consumes.

---

## Phase 3: User Story 1 - See the compile-time trend over the project's full history (Priority: P1) 🎯 MVP

**Goal**: A maintainer can open a published dashboard and see the Typst compile-time median trending across the project's full CI history, including runs that happened before this feature existed.

**Independent Test**: Run the backfill script once, enable Pages, open the dashboard URL, and confirm it shows a continuous series from the project's earliest CI run through the most recent one — delivers full regression-visibility value without any change to the live CI workflow yet.

### Implementation for User Story 1

- [ ] T002 [P] [US1] Write `scripts/backfill-perf-history.ts`: enumerate every historical CI run via `gh run list --workflow=ci.yml --limit 200 --json databaseId,headSha,headBranch,createdAt,conclusion`; for each, extract the `median compile: X ms` value from the "Timing check" step via `gh run view <id> --log` (skip runs with no usable value per spec Edge Cases — don't fabricate one); pull each `headSha`'s commit author/message/timestamp from local `git log` rather than re-fetching per run; assemble entries in the `window.BENCHMARK_DATA` schema recorded in `specs/008-perf-history-tracking/data-model.md` (one entry per record, keyed under the metric name `"Typst compile (largest fitting page, median of 10)"`, `tool: "customSmallerIsBetter"`).
- [ ] T003 [US1] Run `scripts/backfill-perf-history.ts`, create a fresh `gh-pages` branch from its output, and push it once — per `plan.md`'s Constraints, this MUST happen before the live CI step (Phase 4) first runs for real on `main`, to avoid a duplicate/conflicting entry for a commit both paths would otherwise cover. Depends on T002.
- [ ] T004 [US1] Enable GitHub Pages for this repo: `gh api -X POST repos/{owner}/{repo}/pages -f "build_type=legacy" -f "source[branch]=gh-pages" -f "source[path]=/"` (per `research.md`; requires the `gh-pages` branch from T003 to already exist). Depends on T003.
- [ ] T005 [US1] Verify `quickstart.md` Scenario 1: confirm the `gh-pages` branch's data file has one entry per historical CI run that had a usable value (cross-check the count against `gh run list --workflow=ci.yml --limit 200 --json databaseId | jq length` minus runs that failed before the Timing check step), entries are chronologically ordered, and the published Pages URL (`gh api repos/{owner}/{repo}/pages --jq .html_url`) renders the chart. Depends on T004.

**Checkpoint**: User Story 1 is fully functional and demoable on its own — the dashboard shows the complete historical trend even though no live CI run has recorded anything yet.

---

## Phase 4: User Story 2 - Catch regressions on feature branches before merge (Priority: P2)

**Goal**: Every CI run, on every branch and pull request, adds a new point to the same dashboard — not just historical runs — without ever failing CI over a permissions gap (e.g., a fork PR).

**Independent Test**: Push a commit to any branch, let CI run, and confirm the dashboard gains exactly one new entry for that run's commit — independently valuable even without Story 1's backfill (though in practice Story 1 should ship first per the sequencing constraint in T003).

### Implementation for User Story 2

- [ ] T006 [P] [US2] Modify `tests/perf/timing.test.ts` to additionally write its median value to a result JSON file in the shape `[{"name": "Typst compile (largest fitting page, median of 10)", "unit": "ms", "value": <median>}]` (the `customSmallerIsBetter` format from `research.md`), alongside the existing `console.log`/`expect(median).toBeLessThanOrEqual(200)` — neither the assertion nor the console output changes.
- [ ] T007 [P] [US2] Add `permissions: contents: write` scoped to the `check` job in `.github/workflows/ci.yml` (the repo's default workflow permission is read-only, confirmed via `gh api repos/{owner}/{repo}/actions/permissions/workflow`; this is required for the new step in T008 to push to `gh-pages`).
- [ ] T008 [US2] Add a new step in `.github/workflows/ci.yml`, immediately after the existing "Timing check" step, invoking `benchmark-action/github-action-benchmark@<tag confirmed in T001>` with `tool: customSmallerIsBetter`, the JSON file written in T006, `gh-pages-branch: gh-pages`, `auto-push: true`. Depends on T001, T006, T007.
- [ ] T009 [US2] Guard the step added in T008 with `if: github.event.pull_request.head.repo.full_name == github.repository || github.event_name != 'pull_request'` so a pull request from a fork skips publishing (no write access) instead of failing CI (spec FR-005 / Edge Cases). Depends on T008.
- [ ] T010 [US2] Verify `quickstart.md` Scenarios 2-5: a live run appends exactly one new entry and the dashboard updates; the existing "Timing check" pass/fail outcome is unchanged; a simulated fork-PR run skips the publish step without failing the job; local `pnpm perf` behavior (console output, assertion, no network/gh-pages write) is unchanged. Depends on T009.

**Checkpoint**: Both user stories are complete — the dashboard has full historical depth (US1) and keeps growing by exactly one point per qualifying CI run on any branch (US2), with no new CI failure mode for external contributors.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T011 Run `quickstart.md` end-to-end once, in order (Scenario 1 through 5), to confirm the full sequencing constraint held in practice — i.e. that T003's backfill push actually preceded T008's live step's first real run on `main`, with no duplicate or conflicting entry for any one commit (spec SC-004).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Empty — nothing blocks either user story beyond Setup.
- **User Story 1 (Phase 3)**: Depends only on Setup being available conceptually (it doesn't actually consume T001's output — see note below) — can start immediately after Phase 1.
- **User Story 2 (Phase 4)**: T008 depends on T001 (pinned version) in addition to its own phase's T006/T007.
- **Polish (Phase 5)**: Depends on both user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on User Story 2. Independently testable and demoable (MVP).
- **User Story 2 (P2)**: No code dependency on User Story 1, but per the sequencing constraint (spec Edge Cases, plan.md Constraints), User Story 1's T003 (backfill pushed to `gh-pages`) MUST complete before User Story 2's T008 first runs for real on `main` — otherwise the first live run could create an entry conflicting with one the backfill already covers for the same commit. Implement and merge Story 1 first.

### Within Each User Story

- **US1**: T002 → T003 → T004 → T005 (strictly sequential; each depends on the previous one's output).
- **US2**: T006 and T007 can run in parallel with each other (different files); T008 depends on both plus T001; T009 depends on T008; T010 depends on T009.

### Parallel Opportunities

- T002 [US1] and T006/T007 [US2] can all be worked on in parallel (different files, no shared dependency) — but see the sequencing note above for when US2's *live* step may actually ship.
- T006 and T007 within US2 can run in parallel.

---

## Parallel Example: Setup + both stories' first tasks

```bash
# Can run in parallel — all touch different files:
Task: "Write scripts/backfill-perf-history.ts (T002)"
Task: "Modify tests/perf/timing.test.ts to write customSmallerIsBetter JSON (T006)"
Task: "Add permissions: contents: write to .github/workflows/ci.yml (T007)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 3: User Story 1 (T002-T005).
3. **STOP and VALIDATE**: dashboard shows the full historical trend.
4. This is a legitimate, demoable MVP on its own — regression visibility into the past, even before live recording exists.

### Incremental Delivery

1. Setup → User Story 1 → validate → merge (dashboard live with historical data).
2. User Story 2 → validate → merge (dashboard now grows with every CI run, with the fork-PR safety guard in place).
3. Polish (T011): one final end-to-end quickstart pass confirming the sequencing constraint held across both merges.

## Notes

- No automated tests were generated — the spec's Assumptions explicitly scope this as CI/ops tooling verified operationally, not application code with its own test suite.
- Commit after each task or logical group of tasks, per this repo's standing git convention (commit when asked; this feature's own speckit hooks auto-commit after each phase command, independent of per-task commits during implementation).
- The sequencing constraint (US1's T003 before US2's T008 first real run) is the one cross-story coupling in this feature — call it out explicitly during review rather than relying on task order alone, since the two stories are otherwise fully independent.
