# Data Model: Automated End-to-End Tests

The suite stores nothing and has no database. These two entities describe the test records the spec names (Key Entities). They exist in the test code and in the run report.

## Scenario

A named check with a fixed starting point and a fixed expected result.

| Field | Meaning |
|-------|---------|
| `name` | Plain-language title, e.g. "invalid habit count is rejected" |
| `story` | The user story it belongs to: US1 (download), US2 (preview and input), or US3 (overflow) |
| `layout` | `rows`, `columns`, or `calendars` |
| `paper` | Always `letter` (constitution: US Letter only) |
| `options` | The option values set through the form, as listed in the scenario table in quickstart.md |
| `steps` | Ordered user actions, each with a name, so a failure can name the step |
| `expected` | The observable result: preview state, message text, download enabled or disabled, PDF page count and size |

**Rules**:
- Values come from fixed constants in the test code, not random data (spec assumption), so every failure can be reproduced.
- A scenario passes only if every expected result holds. A scenario that produces no download where one is expected fails (FR-008).
- Each scenario starts from the form defaults, changing only the listed options. Defaults are set by a reset helper before each scenario, so one scenario cannot leak state into the next.

## Run report

The result of one suite execution.

| Field | Meaning |
|-------|---------|
| `runId` | Playwright's run identifier (one per invocation) |
| `scenarios` | List of Scenario results |
| `status` | `passed`, `failed`, or `skipped` per scenario. A skipped scenario is never counted as passed (FR-008). |
| `failingStep` | For each failed scenario, the step name where it stopped |
| `screenshot` | Path to the failure screenshot inside the output directory (FR-007) |
| `startedAt`, `durationMs` | For the 3-minute target (SC-001) |

**Rules**:
- Every scenario runs even if an earlier one fails (FR-013). The report lists all failures from the same run.
- In CI, the report and screenshots are uploaded as artifacts and kept for 7 days (FR-014).
- Output goes to git-ignored directories (`test-results/`, `playwright-report/`), so reports never enter the repository.

## Relationships

- A run report contains many scenarios.
- Each scenario has one `expected` result and at most one failure step.
