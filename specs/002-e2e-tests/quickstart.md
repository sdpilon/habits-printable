# Quickstart: Automated End-to-End Tests

How to run the suite and what each scenario proves. Nothing here installs anything.

## Prerequisites

- Node.js 24 and pnpm (the project uses pnpm, with no `bun.lock`).
- `@playwright/test` is installed (dev dependency). The suite needs a Chromium browser: locally the one in `~/Library/Caches/ms-playwright`, and in CI the Google Chrome on the runner.
- Dependencies already installed for the project (`pnpm install`).

## Run the suite

```bash
pnpm install
pnpm e2e
```

`pnpm e2e` builds the production page, serves it locally on a fixed port, and runs every scenario. It exits with a non-zero status if any scenario fails.

Open the HTML report after a run. Each run writes to its own folder, named by its run ID. Set `E2E_RUN_ID` to choose the name, or let it default to a timestamp and process ID:

```bash
pnpm exec playwright show-report playwright-report/<runId>
```

## Where results go

| Output | Location | Kept |
|--------|----------|------|
| HTML report | `playwright-report/<runId>/` | Until you delete it locally; 7 days in CI (artifact) |
| Failure screenshots, traces, and the downloaded PDF copy | `test-results/<runId>/` | Until you delete it locally; 7 days in CI (artifact) |

Both folders are git-ignored. Two runs on one machine write to different folders, so one run cannot read another run's PDF.

## Scenarios

Every scenario starts from the defaults below. Reset the form to them first, then change only the listed options. Paper is always US Letter, and the form offers no other paper size, so paper is not a scenario option.

| Setting | Default |
|---------|---------|
| Layout | one row per habit (`rows`) |
| Habits | 5 |
| Days | 31 |
| Per row | 7 |
| Dot diameter | 4 mm |
| Dot spacing | 1.5 mm |
| Paper | US Letter (set explicitly; see research.md §8) |

### User Story 1: download path

1. **Defaults download.** No changes. Click download. Expect one US Letter page and a file named `habit-grid.pdf`.
2. **Non-default counts.** Habits 6, days 14, layout `columns`. Expect the preview to settle, `data-habits` to read `6` and `data-days` to read `14`, and download to be enabled.

### User Story 2: preview and input

3. **Each option updates the preview.** For each option below, change only that option and expect: the preview settles within 5 seconds, the preview canvas changes, and download stays enabled. Habits and days also check their count attributes.
   - Habits 5 → 6 (`data-habits` = `6`)
   - Days 31 → 14 (`data-days` = `14`)
   - Per row 7 → 5
   - Dot diameter 4 → 3
   - Dot spacing 1.5 → 2
   - Layout → `columns`

   Each option is its own test, so a broken option fails only its own scenario.
4. **Invalid habit count, each kind.** For each of empty, `0`, `-1`, `abc`, and `21`: expect a message in `#messages`, the field flagged `aria-invalid="true"`, and download disabled. Run once per kind.
5. **Recovery.** After an invalid value, enter `5`. Expect the message to clear and download to be enabled again.

### User Story 3: overflow block

6. **Overflow, rows.** Habits 20, days 365, per row 1. Expect `#warning` visible, download disabled, and the counts to read `20` and `365` (the overflowing layout is still drawn).
7. **Overflow, columns.** Layout `columns`, days 365 (habits at the default 5). Expect the same warning and blocked download, with counts `5` and `365`.
8. **Overflow, calendars.** Layout `calendars`, habits 20, days 365, per row 1. Expect the same warning, blocked download, and counts `20` and `365`.
9. **Fix an overflow.** From scenario 6, habits 20 → 5. Expect the warning to clear, download to be enabled, and `data-habits` to read `5`.

## Checks each scenario makes

- Preview settles (`#preview-section` `aria-busy="false"`) within 5 seconds of a valid change.
- Download is enabled only when the layout fits and every option is valid.
- Where a valid layout has been drawn, `data-habits` and `data-days` match the layout last drawn into `#preview`.
- A download that is expected produces a file. A missing file is a failure, not a pass (FR-008).
- The downloaded PDF has exactly one page and a US Letter page size (612 × 792 points).

## Expected outcome

- Every scenario passes on an unchanged codebase, and in 10 consecutive runs (SC-004).
- A deliberate break in any covered behaviour fails the matching scenario and nothing else (SC-003).
- A failing run prints each failing scenario with its step name and a screenshot path (SC-005).
- A full run finishes within 3 minutes on a typical machine (SC-001).

## Troubleshooting

- **Browser not found**: check that `~/Library/Caches/ms-playwright/chromium-1243` exists. Playwright needs a Chromium binary, and a browser download needs a separate approval.
- **Port already in use**: the config uses a fixed port with `--strictPort`. Stop the other process, or run with the existing server reused locally.
- **Preview never settles**: check the browser console in the screenshot path under `test-results/<runId>/`; the suite waits 5 seconds and then reports the step.
