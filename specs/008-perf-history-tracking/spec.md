# Feature Specification: CI Performance History Tracking

**Feature Branch**: `008-perf-history-tracking`

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "After every CI run, record the measured compile-time performance metric into a single accumulating history, backfilled with the project's existing CI run history, and feed a visualization dashboard from that data." (see `docs/superpowers/specs/2026-10-09-perf-history-tracking-design.md` for the brainstormed technical approach)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the compile-time trend over the project's full history (Priority: P1)

As the maintainer, after any CI run completes, I want to see how the preview's compile time has trended across commits — including runs that happened before this tracking existed — so I can catch a regression before it breaches the hard 0.2s budget, not just after it already fails.

**Why this priority**: Without this, the only signal is pass/fail at the budget's edge — a value creeping from 50ms to 190ms over weeks is invisible until it crosses 200ms and CI goes red. Seeing the trend is the entire point of the feature.

**Independent Test**: Can be fully tested by opening the published dashboard and confirming it shows a continuous series of data points starting from the project's earliest CI run through the most recent one — delivers the core value (regression visibility) on its own.

**Acceptance Scenarios**:

1. **Given** the project's pre-existing CI run history, **When** the history is seeded for the first time, **Then** the dashboard shows data points going back to the earliest CI run that produced a measurable compile-time value, not just points recorded from today onward.
2. **Given** a new CI run completes on any commit, **When** I check the dashboard afterward, **Then** it shows exactly one new data point for that commit's compile-time value, in chronological order with the rest of the history.

---

### User Story 2 - Catch regressions on feature branches before merge (Priority: P2)

As the maintainer working on a feature branch, I want performance data recorded for that branch's CI runs too, not only for `main`, so I can see a regression while it's still in review instead of discovering it after merging.

**Why this priority**: Secondary to having history at all (P1), but it's the difference between "I can see regressions happened" and "I can see one before I merge it."

**Independent Test**: Can be tested by pushing a commit to a feature branch, letting CI run, and confirming the dashboard gains a new entry attributed to that branch/commit — independently valuable even without the historical backfill from Story 1.

**Acceptance Scenarios**:

1. **Given** a pull request branch's CI run completes, **When** I check the dashboard, **Then** I see an entry for that run's commit alongside the existing history.
2. **Given** a CI run comes from a contributor's fork without write access to this repository, **When** that run completes, **Then** CI still passes or fails solely on the existing performance budget check — it is never failed because history couldn't be recorded.

---

### Edge Cases

- What happens when a historical CI run's logs no longer contain a usable performance value (the run failed before reaching the performance step, or predates the performance test's existence)? That run is skipped during backfill — no fabricated or estimated value is inserted.
- What happens when two CI runs on different branches finish at nearly the same time and both try to record a result? Both results must still end up represented in the history — neither silently overwrites or discards the other.
- What happens when a run comes from a fork PR lacking write access? No history entry is recorded for that run, but the run's own pass/fail outcome (the existing budget check) is unaffected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST record the project's existing compile-time performance measurement for every CI run, on every branch and pull request — not only runs on the main branch.
- **FR-002**: System MUST append each recorded measurement to a single cumulative history rather than overwriting or discarding previously recorded values.
- **FR-003**: System MUST present the accumulated history as a browsable visual chart, reachable by a URL, without requiring the viewer to download or manually parse the underlying data.
- **FR-004**: System MUST seed the history with measurements recovered from the project's pre-existing CI run history at the time this feature is introduced, so the chart reflects the project's full lifespan rather than starting empty on the day this ships.
- **FR-005**: System MUST NOT fail or block a CI run solely because that run lacks permission to record history (e.g., a pull request from a fork).
- **FR-006**: Recording performance history MUST NOT change the pass/fail outcome of the project's existing performance budget check.
- **FR-007**: Running the performance test locally (outside CI) MUST continue to work exactly as it does today and MUST NOT be required to contribute to the recorded history.

### Key Entities

- **Performance Record**: a single historical measurement — attributes include which commit and branch produced it, when it was recorded, and the compile-time value measured. One record is produced per CI run that successfully measures the metric.
- **Performance History**: the full, ordered collection of Performance Records, spanning from the earliest recoverable CI run to the present, growing by exactly one record per qualifying CI run.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A maintainer can view the complete compile-time trend across the project's entire CI history — including pre-existing runs from before this feature shipped — in a single chart reachable from one URL.
- **SC-002**: Every qualifying CI run, from the point this ships onward, adds exactly one new point to that trend with no manual step beyond the run itself completing.
- **SC-003**: A pull request from a contributor without write access to the repository completes CI with the same pass/fail outcome it would have had without this feature — this feature introduces zero new CI failure modes for such contributors.
- **SC-004**: Comparing the backfilled history against live recording going forward, every CI run that produced a measurable compile-time value is represented in the history exactly once — no duplicates, no gaps for runs that had a usable value.

## Assumptions

- The project's single existing compile-time metric (median of 10 compiles, largest fitting page) is the complete scope of "performance data" for this feature. Other existing checks that only produce pass/fail (not a magnitude) are out of scope.
- The project's CI run history at the time of writing is recent and complete enough that backfilling does not need to account for expired or unavailable historical logs.
- This is maintainer-facing internal tooling. There's no requirement for end users of the habits-grid app itself to see or use this dashboard, though it is acceptable for it to be publicly reachable.
- Local performance test runs on a developer's own machine are not required or expected to contribute to the recorded history — only CI runs do.
