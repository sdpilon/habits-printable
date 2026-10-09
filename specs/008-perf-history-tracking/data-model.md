# Phase 1 Data Model: CI Performance History Tracking

No application data model changes — this feature introduces no new
entities in the habits-grid app itself. The two entities below (named
in `spec.md`'s Key Entities) describe the shape of data accumulating
in the **external** gh-pages history file, not anything stored or
modeled within the application's own code.

## Performance Record

One measurement, produced per qualifying CI run.

| Field | Type | Notes |
|---|---|---|
| `commit.id` | string (SHA) | The commit the CI run measured. |
| `commit.message` | string | For dashboard readability; sourced from `git log` (backfill) or the action's own commit context (live runs). |
| `commit.timestamp` | ISO 8601 string | Commit time, not CI-run time. |
| `branch` | string | Which branch/PR the run was on. Stored in the action's optional `extra` field (`"branch: <name>"`) — the only place this schema has for free-form per-entry metadata; not a dedicated top-level field. |
| `date` | epoch ms | When the measurement was recorded. |
| `value` | number | The `median compile: X ms` value. |
| `unit` | string | Always `"ms"`. |
| `name` | string | Fixed: `"Typst compile (largest fitting page, median of 10)"` — identifies this metric within the action's `entries` map. |

**Validation rules**: `value` MUST be a positive finite number (the
underlying test already guarantees this — it's a `performance.now()`
delta). A Performance Record MUST NOT be created for a CI run whose
"Timing check" step didn't complete (no value to record) — per spec
Edge Cases, such runs are skipped, not represented with a null/zero
value.

**State transitions**: None — a Performance Record is immutable once
written; the action only ever appends, never edits existing entries.

## Performance History

The full ordered collection of Performance Records for this one named
metric, held in the action's `entries["<name>"]` array (see
`research.md` for the surrounding file schema) on the `gh-pages`
branch.

**Relationships**: Performance History *contains* many Performance
Records, ordered by `date`. There's exactly one metric name in scope
for this feature (see spec Assumptions — margins-check pass/fail isn't
included), so there's exactly one populated array under `entries` for
now; the schema supports more without migration if that's ever
extended.

**Validation rules**: Append-only — no record, once written (by
backfill or by a live CI run), is edited or removed as part of normal
operation. The full history after backfill, compared against the
history after any number of subsequent live runs, MUST contain every
run that produced a measurable value exactly once (spec SC-004) — no
duplicates between the backfilled set and the first live-recorded
runs. This is an ordering/sequencing concern (backfill must complete
and push before the live step ships for real), not a schema constraint.
