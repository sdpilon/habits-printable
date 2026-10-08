---

description: "Task list template for feature implementation"
---

# Tasks: Fit PDF Preview To Viewport Height

**Input**: Design documents from `/specs/003-fit-pdf-preview-height/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/preview-fit.md, quickstart.md

**Tests**: Included — the plan commits to specific test files (`tests/unit/preview-fit.test.ts`,
`tests/e2e/preview-fit.spec.ts`), and this project's existing codebase follows a
tested-by-default convention for layout/rendering changes (constitution
Development Workflow).

**Organization**: Tasks are grouped by user story (US1 = P1 MVP, US2 = P2) so each
can be implemented and tested independently once Foundational work is done.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2)
- File paths are repo-relative

## Path Conventions

Single-project web app — all paths are under `web/src/`, `web/index.html`, and
`tests/`, matching `plan.md`'s Project Structure section.

---

## Phase 1: Setup

**Purpose**: Confirm no new project setup is needed before touching code.

- [ ] T001 Confirm no new dependencies are required (research.md "Primary
  Dependencies": none new) — `package.json`/`pnpm-lock.yaml` must remain
  unchanged by this feature; run `pnpm install` to confirm the lockfile is
  already satisfied.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure every fit mode depends on — the viewport-bounded
layout, the pure scale-math function, and the render/resize wiring that uses it.
Nothing in User Story 1 or 2 works without this phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 [P] Add a viewport-bounded layout shell in `web/src/style.css`:
  `html`/`body`/`main` sized to `100svh`; `#preview-section` becomes
  `display: flex; flex-direction: column; min-height: 0`; `#preview` becomes
  `flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center;`
  while keeping the existing `#preview { overflow: auto; }` (research.md §2–§3, §5).
- [ ] T003 [P] Write failing unit tests in `tests/unit/preview-fit.test.ts` for a
  `computePreviewScale(page, container, mode)` function that does not exist yet,
  asserting all 5 invariants from `contracts/preview-fit.md`: (1) aspect ratio
  `displayWidth / displayHeight === page.width / page.height` in all three modes;
  (2) `"page"` mode never exceeds the container in either dimension; (3) `"height"`
  mode always matches `container.height` exactly; (4) `"width"` mode always
  matches `container.width` exactly; (5) the function is pure (plain object
  inputs/outputs, no DOM).
- [ ] T004 Implement `computePreviewScale` in `web/src/preview-fit.ts` per
  `contracts/preview-fit.md`'s formulas — `"page"`:
  `scale = min(container.width / page.width, container.height / page.height)`;
  `"height"`: `scale = container.height / page.height`; `"width"`:
  `scale = container.width / page.width`; always
  `displayWidth = page.width * scale`, `displayHeight = page.height * scale` — to
  make T003's tests pass (depends on: T003).
- [ ] T005 Update `renderPreview` in `web/src/preview.ts` to accept a `mode:
  FitMode` and `container: { width: number; height: number }` parameter, use
  `computePreviewScale` (T004) instead of the current width-only scale, and set
  `canvas.width`/`canvas.height` (device-pixel-ratio-aware pixel buffer) and
  `canvas.style.width`/`canvas.style.height` from the returned `displayWidth`/
  `displayHeight` — set both style dimensions before the canvas is attached via
  `container.replaceChildren(canvas)`, so no unfit/distorted frame is ever visible
  (spec Edge Cases: "no flash of unfit size") (depends on: T004).
- [ ] T006 In `web/src/main.ts`, add a `ResizeObserver` on `#preview` that stores
  the latest `{ width, height }` from `contentRect`, and a module-level
  `fitMode: FitMode` variable initialized to `"page"` (FR-006); call the updated
  `renderPreview` (T005) with the current `fitMode` and latest observed size on
  every successful compile and on every `ResizeObserver` callback, re-using the
  last compiled PDF (`latestValid`) without recompiling on a pure resize/mode
  change (depends on: T005).

**Checkpoint**: Loading the app now shows the full page in the default (hardcoded)
`"page"` fit mode, with no window scroll and correct proportions — foundation
ready for both user stories.

---

## Phase 3: User Story 1 - See the entire generated page without distortion (Priority: P1) 🎯 MVP

**Goal**: The default preview always shows the complete generated page — no
browser-window scrolling, no stretched/squashed proportions — and keeps doing so
across option changes and window resizes.

**Independent Test**: Load the app with default options; confirm the full page is
visible without scrolling the browser window and its proportions are correct;
change an option (e.g., habit count); confirm it re-fits the same way; resize the
browser window; confirm it re-fits again.

### Tests for User Story 1

- [ ] T007 [P] [US1] Add `readWindowScrollable()` (returns
  `document.documentElement.scrollHeight <= window.innerHeight`) and
  `readCanvasAspectRatio()` (reads `#preview canvas`'s `getBoundingClientRect()`
  width/height ratio) helpers to `tests/e2e/support/page.ts`, alongside the
  existing `readCanvasHash`/`waitForSettled` helpers.
- [ ] T008 [US1] Create `tests/e2e/preview-fit.spec.ts` with three tests using
  T007's helpers: (AC1) default load — `readWindowScrollable()` is `true` and
  `readCanvasAspectRatio()` matches the PDF page's own ratio; (AC2) after changing
  `habits`, both checks still hold; (AC3) after resizing the Playwright viewport,
  both checks still hold (depends on: T007).

### Implementation for User Story 1

- [ ] T009 [US1] Run T008 against the Foundational implementation (T002–T006);
  fix any gap found (e.g., the warning banner's height not being picked up before
  the first render, or a resize observer callback firing before the container has
  a real size) directly in `web/src/main.ts` / `web/src/preview.ts` (depends on:
  T008).

**Checkpoint**: User Story 1 (MVP) is fully functional and independently testable
— `pnpm e2e -g "preview-fit"` passes on its own.

---

## Phase 4: User Story 2 - Choose how the page fits the preview (Priority: P2)

**Goal**: A user can switch the preview between "fit-page" (default), "fit-height",
and "fit-width", and the chosen mode persists across option changes.

**Independent Test**: With the preview showing a page, select "fit-height" and
confirm the page's height fills the available vertical space; select "fit-width"
and confirm the page's width fills the available horizontal space; change an
option while in either mode and confirm the mode doesn't reset.

### Tests for User Story 2

- [ ] T010 [P] [US2] Add `setFitMode(page, mode)` helper to
  `tests/e2e/support/page.ts` (selects `select[name="fitMode"]`'s value and waits
  for settle).

### Implementation for User Story 2

- [ ] T011 [P] [US2] Add a `<select name="fitMode">` control to
  `web/index.html` inside `#preview-section` (above `#preview`), with options
  `"Fit page"` (value `page`, selected by default), `"Fit height"` (value
  `height`), `"Fit width"` (value `width`) (FR-001, FR-006).
- [ ] T012 [US2] In `web/src/main.ts`, listen for the `fitMode` select's `input`
  event, update the module-level `fitMode` variable (from T006), and immediately
  re-render the last compiled PDF (`latestValid`) with the new mode — no
  recompile needed (FR-007) (depends on: T006, T011).
- [ ] T013 [US2] Extend `tests/e2e/preview-fit.spec.ts` (T008) with: (AC1)
  selecting "fit-height" makes the canvas's rendered height match `#preview`'s
  height (within 1px) with no window scroll; (AC2) selecting "fit-width" makes the
  canvas's rendered width match `#preview`'s width (within 1px) with no window
  scroll; (AC3) after selecting "fit-height" or "fit-width" and then changing an
  option, the select's value is unchanged and the preview still re-fits with no
  window scroll (depends on: T010, T012).

**Checkpoint**: Both user stories work independently — `pnpm e2e -g "preview-fit"`
covers all three fit modes end-to-end.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T014 [P] Run `pnpm margins` to confirm the exported PDF's printable-margin
  check is unaffected (constitution Principle II — this feature never touches PDF
  generation, only on-screen display).
- [ ] T015 Run `pnpm test && pnpm e2e` for the full suite and confirm everything
  is green, including the pre-existing (unrelated) `tests/unit/fit-model.ts`/
  `fit.test.ts` and `tests/e2e/preview-and-input.spec.ts` suites (no regressions).
- [ ] T016 Walk through `specs/003-fit-pdf-preview-height/quickstart.md` scenarios
  1–7 manually via the `run-project` skill's driver and record the result in the
  PR/review (constitution Development Workflow: "the result MUST be recorded in
  the review").

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS both user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on US2.
- **User Story 2 (Phase 4)**: Depends on Foundational and on T006 (the `fitMode`
  variable and `renderPreview` signature it extends) and T008 (the spec file it
  extends) — in practice, run after US1 since it shares `tests/e2e/preview-fit.spec.ts`
  and `web/src/main.ts`'s render-call site, but is conceptually independent of
  US1's own acceptance criteria.
- **Polish (Phase 5)**: Depends on both user stories being complete.

### Within Each Phase

- Foundational: T003 (failing test) before T004 (implementation) before T005
  before T006 — each depends on the previous; T002 is independent and parallel.
- US1: T007 (helpers) before T008 (spec using them); T009 depends on T008's
  findings.
- US2: T010 and T011 are independent of each other ([P]); T012 depends on both
  T006 and T011; T013 depends on T010 and T012.

### Parallel Opportunities

- T002 and T003 (Foundational) — different files, no shared dependency.
- T007 (US1) and T010/T011 (US2) touch different files than each other and could
  be prepared ahead of time, but T011/T012 functionally depend on T006, and T013
  depends on T008 existing — so in practice US2's implementation tasks (T012,
  T013) should follow US1's Phase 3 checkpoint even though they're not blocked by
  US1's own acceptance criteria.
- T014 (Polish) has no dependency on T015/T016 and can run in parallel with them.

---

## Parallel Example: Foundational Phase

```bash
# Launch together — different files, no shared dependency:
Task: "Add viewport-bounded layout shell in web/src/style.css"
Task: "Write failing unit tests in tests/unit/preview-fit.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002–T006) — this alone fixes the reported bug
   (whole-window scrolling) with the default fit-page mode.
3. Complete Phase 3: User Story 1 (T007–T009).
4. **STOP and VALIDATE**: `pnpm e2e -g "preview-fit"`, then quickstart.md Scenario 1–2.
5. This is a shippable MVP: the preview always shows the whole, undistorted page.

### Incremental Delivery

1. Setup + Foundational → bug fixed for the default view.
2. Add User Story 1 → test independently → MVP ready.
3. Add User Story 2 → test independently → fit-height/fit-width selector shipped.
4. Polish → full regression pass + manual quickstart walkthrough.

---

## Notes

- `tests/unit/fit-model.ts`/`fit.test.ts` and `tests/e2e/preview-and-input.spec.ts`
  are pre-existing and unrelated (grid-fits-one-page prediction, not preview
  scaling) — do not modify them; T015 only confirms they still pass.
- Commit after each task or logical group, consistent with this repo's existing
  commit granularity on earlier specs.
- Verify T003's tests actually fail before starting T004 (TDD).
