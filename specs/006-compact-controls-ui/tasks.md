---
description: "Task list template for feature implementation"
---

# Tasks: Compact, Polished Options UI

**Input**: Design documents from `/specs/006-compact-controls-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Not requested by the spec. Existing automated suites (unit, e2e, margins, perf) must
keep passing unmodified — verifying that is folded into the implementation tasks below rather than
written as new tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing
of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single existing web app (no new projects). All implementation tasks touch `web/index.html` and
`web/src/style.css`; verification tasks run the existing `tests/` suites.

---

## Phase 1: Setup

**Purpose**: Record the "before" state so the ≥30% reduction (SC-002/SC-003) can be measured.

- [x] T001 Capture baseline measurements: the options panel's rendered height at the default
      desktop viewport and at a mobile viewport (e.g. 600px wide), on the current, unmodified layout.
      Record both numbers in a new file `specs/006-compact-controls-ui/baseline-measurements.md`.

**Checkpoint**: Baseline recorded — ready for foundational styling work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared control styling (border color, box sizing, focus state) that every user story
builds on. No user story work should start until this phase is done, since all three restyle the
same `input, select, button` rule in `web/src/style.css`.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add a `--control-border` custom property to the `:root` block and the
      `@media (prefers-color-scheme: dark)` block in `web/src/style.css`: `#8a8a8a` (light) and
      `#707070` (dark) — the values computed in research.md §4 to clear the WCAG AA 3:1 non-text
      contrast floor (current `--line` is only ~1.5:1). Leave `--line` itself unchanged, since it's
      still used for the preview canvas's decorative outline.
- [x] T003 Update the shared `input, select, button` rule in `web/src/style.css`: change
      `border-color` to `var(--control-border)`, reduce padding from `0.4rem 0.5rem` to approximately
      `0.3rem 0.4rem`, and add `min-height: 24px; min-width: 24px; box-sizing: border-box;` so the
      24×24 CSS px floor (FR-007/SC-007) is a hard guarantee rather than a side effect of padding math
      (research.md §3). Font size on these elements MUST NOT change (FR-010).
- [x] T004 Add a `:focus-visible` rule for `input, select, button` in `web/src/style.css` using
      `var(--control-border)` for a stronger outline/box-shadow, with any transition wrapped in
      `@media (prefers-reduced-motion: no-preference)` (FR-009, research.md §5). Do not add a plain
      `:focus` rule or change any `tabindex`/DOM order — keyboard tab order must stay exactly as it is.

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Compact options panel (Priority: P1) 🎯 MVP

**Goal**: Reduce the options form's vertical footprint by at least 30% on desktop, without
changing text size or any existing behavior.

**Independent Test**: Load the app at a typical desktop viewport; every control (layout, habits,
days, dots per row, dot diameter, dot spacing, paper, messages area, download button) is visible
without scrolling the options panel, and the panel's height is at least 30% less than the T001
baseline.

### Implementation for User Story 1

- [x] T005 [US1] In `web/index.html`, change each control's label from the current
      label-above-input pattern to label-beside-input, keeping the existing implicit
      `<label>Text <input></label>` wrapping and every existing `name` attribute unchanged (per
      `contracts/page-interface.md` — the e2e suite selects by `name`, not position or markup shape).
- [x] T006 [US1] In `web/index.html`, wrap `habits`, `days`, and `perRow` in one `<div>` group and
      `dotDiameterMm`/`dotSpacingMm` in a second `<div>` group (plain wrapper divs, no new `id`s or
      `name`s — see data-model.md), so research.md §2's row layout has something to target in CSS.
- [x] T007 [US1] Rewrite the `form` and `label` rules in `web/src/style.css` for the new
      label-beside-input layout and the two field-group rows from T006 (CSS Grid, narrow label column
  - wider control column, each group's row splitting evenly across its fields), replacing the
    current `label { display: grid; gap: 0.25rem; }` stacked rule.
- [x] T008 [US1] Reduce the `form` gap and the `h1` bottom margin in `web/src/style.css` to remove
      the remaining extra whitespace between controls (FR-001/FR-010 — spacing/layout only, no font
      size change).
- [x] T009 [US1] Run `pnpm test`, `pnpm run e2e`, `pnpm run margins`, and `pnpm run perf`. All
      must pass unmodified (SC-005). If any e2e selector breaks, fix the markup to keep the existing
      `name`/`id` attributes rather than updating the test.
- [x] T010 [US1] Measure the options panel's height at the default desktop viewport (same method
      as T001) and compare against the T001 baseline. Append the result and the percentage reduction
      to `specs/006-compact-controls-ui/baseline-measurements.md`. Confirm it meets or exceeds 30%
      (SC-002); if not, revisit T007/T008 before moving on.

**Checkpoint**: User Story 1 is fully functional and independently testable — desktop compaction
done, all existing automated checks green.

---

## Phase 4: User Story 2 - Visual polish (Priority: P2)

**Goal**: The form reads as a tidy, deliberately designed panel: grouped fields look grouped,
hover/focus states are clear, and the download button is visually the primary action.

**Independent Test**: Visually review the form against: grouped fields (T006) read as a group
rather than a uniform stack; hovering or focusing any control shows a clear, consistent state;
the download button is visually distinguishable as the primary action. No change to validation
behavior or PDF output.

### Implementation for User Story 2

- [x] T011 [US2] Restyle the `button` rule in `web/src/style.css` so the download button reads
      as the primary action — distinct weight, color, or spacing from the input/select styling (FR-005).
- [x] T012 [US2] Add visual separation (spacing and/or a subtle divider) between the two
      field groups from T006 and the `layout`/`paper` selects in `web/src/style.css`, so each group
      reads as its own cluster (US2 acceptance scenario 1).
- [x] T013 [US2] Add a `:hover` rule for `input, select, button` in `web/src/style.css`, visually
      distinct from the `:focus-visible` rule added in T004 (research.md §5).
- [x] T014 [US2] Recompute the WCAG contrast ratios (light/dark, text and `--control-border`) for
      any color touched in T002/T011/T012/T013, using the method in research.md §4. Confirm every
      value still meets 4.5:1 (text) / 3:1 (UI boundaries) in both color schemes (SC-006).
- [x] T015 [US2] Manually verify keyboard tab order through the controls is unchanged after the
      T005/T006 markup restructuring (quickstart.md step 11).

**Checkpoint**: User Stories 1 and 2 are both independently functional.

---

## Phase 5: User Story 3 - Compact and polished on mobile too (Priority: P3)

**Goal**: Carry the same compaction and polish into the existing <720px responsive breakpoint.

**Independent Test**: Narrow the viewport below 720px; the options panel occupies at least 30%
less vertical space than the T001 mobile baseline, and every control keeps a ≥24×24 CSS px
tappable area.

### Implementation for User Story 3

- [x] T016 [US3] Update the `@media (max-width: 720px)` block in `web/src/style.css` so the
      grouped, compact layout from T005–T008 and T011–T013 also applies at mobile width, instead of
      falling back to the old stacked spacing. **Verified no change was needed**: the compact styles
      aren't desktop-only (the mobile media query only ever touched `main`'s grid columns/padding), so
      they already apply at every width — confirmed empirically at 375px and 320px.
- [x] T017 [US3] At a mobile viewport width, inspect the computed size of every input, select, and
      the download button. Confirm each is at least 24×24 CSS px (SC-007/quickstart.md step 9). If any
      falls short, adjust T003's `min-height`/`min-width` or T016's mobile padding — do not shrink
      below the floor.
- [x] T018 [US3] Measure the options panel's height at a mobile viewport (same width used for the
      T001 baseline) and compare against it. Append the result to
      `specs/006-compact-controls-ui/baseline-measurements.md`. Confirm it meets or exceeds 30%
      (SC-003).

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final formatting, linting, and full-suite confirmation before opening a PR.

- [x] T019 Run `pnpm run format` and `pnpm run lint`, fixing any findings in `web/index.html`
      and `web/src/style.css`.
- [x] T020 Work through every scenario in `quickstart.md` (all 14 manual verification steps) and
      record the outcome of each. All 14 passed (desktop/mobile/320px screenshots, dark mode,
      validation message, overflow warning, reduced window height all visually confirmed via the
      `run-project` skill; contrast and tab order confirmed in T014/T015).
- [x] T021 Run the full check suite one final time — `pnpm run format:check`, `pnpm run lint`,
      `pnpm run typecheck`, `pnpm test`, `pnpm run perf`, `pnpm run margins`, `pnpm run e2e` — and
      confirm everything is green before opening a PR. All green: format:check clean, lint clean,
      typecheck clean, 32/32 unit tests, 1/1 perf, margins all pass, 23/23 e2e.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T001) only so the baseline exists before any
  visual change is made. BLOCKS all user stories, since every story restyles the same
  `input, select, button` rule touched in T002–T004.
- **User Stories (Phase 3–5)**: All depend on Foundational completion.
  - US1 (Phase 3) has no dependency on US2/US3 and is the MVP.
  - US2 (Phase 4) depends on US1's T006 (field groups must exist before they can be visually
    separated) but is otherwise independently testable against its own acceptance scenarios.
  - US3 (Phase 5) depends on US1's T005–T008 and US2's T011–T013 existing, since the mobile
    breakpoint extends the same desktop styles rather than defining a parallel layout.
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### Within Each User Story

- US1: markup changes (T005, T006) before the CSS rules that target them (T007, T008); test/margin
  verification (T009) and measurement (T010) come last.
- US2: button styling (T011) and group separation (T012) before hover state (T013) and the
  contrast re-check (T014), since T014 needs every color change finalized first.
- US3: the media-query update (T016) before the touch-target check (T017) and measurement (T018).

### Parallel Opportunities

This feature has no real cross-file parallelism to exploit: almost every task edits one of two
files (`web/index.html`, `web/src/style.css`), so tasks are listed in the order they must run to
avoid conflicting edits to the same file. T001 (Setup) is the only task with no file-edit
dependency on anything else and could start the moment the branch exists.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (baseline measurement).
2. Complete Phase 2: Foundational (border color, box sizing, focus state — CRITICAL, blocks all
   stories).
3. Complete Phase 3: User Story 1 (desktop compaction).
4. **STOP and VALIDATE**: confirm every automated check passes and the ≥30% desktop reduction
   holds.

### Incremental Delivery

1. Setup + Foundational → baseline recorded, shared control styling in place.
2. User Story 1 → compact desktop layout, all existing tests green (MVP).
3. User Story 2 → visual polish (grouping, hover/focus, primary action) on top of US1.
4. User Story 3 → the same compaction and polish carried to the mobile breakpoint.
5. Polish → format/lint clean, full quickstart.md walkthrough, final full-suite run.

## Notes

- No task in this feature is marked [P]: nearly everything edits one of two shared files
  (`web/index.html`, `web/src/style.css`), so the listed order is the safe execution order.
- [Story] label maps task to specific user story for traceability.
- No new dependencies, entities, or test infrastructure — this feature is markup/CSS only.
- `name`/`id` attributes on every control stay exactly as they are throughout (see
  `contracts/page-interface.md`); if any task seems to require changing one, stop and re-check the
  contract instead.
