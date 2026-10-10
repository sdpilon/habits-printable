---

description: "Task list for Deploy the Main Site to GitHub Pages"
---

# Tasks: Deploy the Main Site to GitHub Pages

**Input**: Design documents from `/specs/009-gh-pages-deploy/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no `contracts/` — this feature defines no API/interface, see plan.md)

**Tests**: Not requested in the spec (this is a CI/CD and build-config change, not application code — see spec's Assumptions). Verification is operational via `quickstart.md`'s scenarios, referenced below instead of a separate automated test suite.

**Organization**: Tasks are grouped by user story (US1, US2, US3) per `spec.md`'s priorities. Because this feature is one atomic deploy mechanism (there is no safe way to ship a partial version — an incomplete `clean-exclude` config would destroy the benchmark history on its very first run, per FR-004), the actual implementation lives in Phase 2 (Foundational); each user-story phase verifies that implementation against its own acceptance scenario.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact; config values referenced are the ones decided in `research.md`, not left to implementation-time guessing

---

## Phase 1: Setup

**Purpose**: Reconfirm the two facts the whole plan is built on, since they were established by live `gh`/`git` queries during planning (not fixed in code) and could have drifted.

- [ ] T001 Confirm `gh api repos/sdpilon/habits-printable/pages --jq .source` still returns `{"branch":"gh-pages","path":"/"}` (research.md Decision 1), and that `.github/workflows/ci.yml`'s `check` job still has `permissions: contents: write` (already present, used by the existing benchmark-publish step) — no new permission is needed for the deploy step added in Phase 2.

---

## Phase 2: Foundational

**Purpose**: The actual deploy mechanism — all three user stories depend on this existing and being correctly configured from the start.

**⚠️ CRITICAL**: No user story can be validated until this phase is complete.

- [ ] T002 [P] Set `base: './'` in `vite.config.ts`'s `defineConfig({...})` call (research.md Decision 3) — add the one key, no other changes. Needed so the build produced in T004 resolves its assets correctly whether served from the origin root (local preview, e2e) or the GitHub Pages subpath.
- [ ] T003 Add a top-level `concurrency: { group: pages, cancel-in-progress: false }` block to `.github/workflows/ci.yml`, after the existing `on:` block (research.md Decision 5). Same file as T004/T005 below — do these three sequentially to avoid conflicting edits, not because of a logical dependency on this one.
- [ ] T004 Add a "Build production bundle" step to the end of the `check` job in `.github/workflows/ci.yml`, after the existing "End-to-end tests" step: `run: pnpm build`, guarded by `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` (FR-001, FR-002, FR-007). Depends on T002 (the build must use the new relative `base`).
- [ ] T005 Add a "Deploy to GitHub Pages" step immediately after T004's step in `.github/workflows/ci.yml`, using `JamesIves/github-pages-deploy-action@v4` with `folder: dist`, `clean: true`, and `clean-exclude: |` / `  dev/bench` (research.md Decision 2 — satisfies FR-004), guarded by the same `if:` condition as T004 (FR-007). Depends on T004.

**Checkpoint**: Foundational complete — once this reaches `main`, the next CI run performs one full real deploy. All three user stories below can now be validated.

---

## Phase 3: User Story 1 - Visit the live app (Priority: P1) 🎯 MVP

**Goal**: A visitor can open the published URL directly and complete a full configure → preview → download flow with no local setup.

**Independent Test**: Open the published URL in a browser and complete that flow (quickstart.md Scenario 1).

### Validation for User Story 1

- [ ] T006 [US1] Once this feature has reached `main` and the first real deploy (Phase 2) has completed, run `quickstart.md` Scenario 1: open `https://sdpilon.github.io/habits-printable/` directly, confirm no asset 404s, and confirm a configure → preview → download cycle completes. Depends on T005.

**Checkpoint**: User Story 1 is independently demoable — the live app works for a visitor.

---

## Phase 4: User Story 2 - Live site stays current automatically (Priority: P2)

**Goal**: Every CI-passing push to `main` redeploys automatically with no manual step; a CI-failing push never reaches the live site; pull requests never deploy; overlapping pushes can never let an older build overwrite a newer one.

**Independent Test**: Push a visible change to `main`, confirm it appears on the live site with no manual action (quickstart.md Scenario 2); the remaining sub-guarantees (Scenarios 3, 5, 6) are verified by inspection since they describe absence-of-action under the already-implemented conditions.

### Validation for User Story 2

- [ ] T007 [US2] Validate `quickstart.md` Scenario 2: push a small visible change to `main`, wait for CI to finish, confirm a new commit lands on `gh-pages` with no manual action, and the published URL reflects the change after reload. Depends on T005.
- [ ] T008 [US2] Validate `quickstart.md` Scenario 3 by inspection: confirm in `.github/workflows/ci.yml` that the steps added in T004/T005 are the last steps in the `check` job, after format/lint/typecheck/unit/timing/margins/e2e — so any of those failing stops the job before the deploy step ever runs. Depends on T005.
- [ ] T009 [US2] Validate `quickstart.md` Scenario 5 by inspection: confirm the `if:` condition added in T004/T005 excludes `pull_request` events (requires both `github.ref == 'refs/heads/main'` and `github.event_name == 'push'`), so a PR run skips the deploy step rather than running or failing it. Depends on T005.
- [ ] T010 [US2] Validate `quickstart.md` Scenario 6 by inspection: confirm the `concurrency` block added in T003 is present at the workflow's top level with `group: pages` and `cancel-in-progress: false`, so an in-progress deploy is never killed mid-push and any superseded queued run is skipped automatically in favor of the latest one. Depends on T003.

**Checkpoint**: User Stories 1 and 2 both independently hold — the live site works and stays current without ever regressing to an older or broken build.

---

## Phase 5: User Story 3 - Benchmark history keeps working (Priority: P3)

**Goal**: The existing perf-benchmark dashboard already published under `dev/bench/` on `gh-pages` keeps working, with zero loss of history, after the main site starts deploying to the same branch.

**Independent Test**: After the first real deploy, open the existing benchmark-dashboard URL and confirm prior history is still intact (quickstart.md Scenario 4).

### Validation for User Story 3

- [ ] T011 [US3] Once the first real deploy (Phase 2) has completed, validate `quickstart.md` Scenario 4: confirm `dev/bench/`'s latest commit hash on `gh-pages` is unchanged from before the deploy (`git log origin/gh-pages -1 --format=%H -- dev/bench`), and `<html_url>dev/bench/` still renders the existing chart with all prior history. Depends on T005.

**Checkpoint**: All three user stories now independently hold.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T012 Run `quickstart.md` end-to-end, in order (Scenarios 1 through 6), once this feature has been merged to `main` and had at least one real deploy — confirming the full feature holds together, not just each scenario in isolation.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: T002 can run in parallel with Setup (different file, no shared dependency); T003/T004/T005 touch `.github/workflows/ci.yml` and should be done in that order to avoid conflicting edits to the same file. T004 depends on T002.
- **User Stories (Phase 3-5)**: All depend on Phase 2 completing (specifically T005; T010 also depends on T003). Once Phase 2 is done, all three story phases can be validated in parallel — they're read-only inspections/checks, not further implementation.
- **Polish (Phase 6)**: Depends on all three user stories being validated.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2/US3 beyond the shared Foundational phase. Independently testable and demoable (MVP).
- **User Story 2 (P2)**: No dependency on US1/US3 beyond Foundational.
- **User Story 3 (P3)**: No dependency on US1/US2 beyond Foundational.

### Within Each Phase

- **Setup**: T001 only.
- **Foundational**: T002 → T004 → T005 (T004 needs T002's `base` change); T003 can be done any time relative to T002, but should not be edited concurrently with T004/T005 in the same file.
- **US1**: T006 only.
- **US2**: T007, T008, T009 can run in parallel with each other (independent checks); T010 depends on T003 specifically.
- **US3**: T011 only.

### Parallel Opportunities

- T002 (vite.config.ts) and T001 (Setup) can run in parallel — different files.
- Once Phase 2 is complete, T006 [US1], T007-T010 [US2], and T011 [US3] can all run in parallel — all are verification/inspection tasks with no file conflicts.

---

## Parallel Example: After Foundational completes

```bash
# Can run in parallel — all are independent verification tasks:
Task: "Validate quickstart.md Scenario 1 (T006, US1)"
Task: "Validate quickstart.md Scenario 2 (T007, US2)"
Task: "Validate quickstart.md Scenario 4 (T011, US3)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002-T005) — this is also what makes US2 and US3 true, since it's one atomic, correctly-configured deploy mechanism.
3. Complete Phase 3: User Story 1 (T006).
4. **STOP and VALIDATE**: the live app works for a visitor. This is a legitimate, demoable MVP.

### Incremental Delivery

1. Setup + Foundational → the deploy mechanism exists and is safe (clean-exclude, concurrency, main-only gating all present from the first real run).
2. Validate User Story 1 → merge/demo (MVP: the site works).
3. Validate User Stories 2 and 3 (can happen in parallel) → confirm the ongoing/safety guarantees hold.
4. Polish (T012): one final end-to-end quickstart pass.

## Notes

- No automated tests were generated — the spec's Assumptions explicitly scope this as a CI/CD and build-config change verified operationally, not application code with its own test suite.
- Commit after each task or logical group of tasks, per this repo's standing git convention (commit when asked; this feature's own speckit hooks auto-commit after each phase command, independent of per-task commits during implementation).
- Unlike a typical feature, Foundational here isn't "shared scaffolding" — it IS the feature. The user-story split exists to make each acceptance angle (visit it, it stays current, it doesn't break the benchmark dashboard) independently verifiable, not to allow a safe partial rollout.
