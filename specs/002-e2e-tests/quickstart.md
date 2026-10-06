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

Open the HTML report after a run:

```bash
pnpm exec playwright show-report
```

## Where results go

| Output | Location | Kept |
|--------|----------|------|
| HTML report | `playwright-report/` | Until the next run |
| Failure screenshots and traces | `test-results/` | Until the next run locally; 7 days in CI (artifact) |

Both folders are git-ignored.

## Scenarios

Every scenario starts from the defaults below. Reset the form to them first, then change only the listed options. Paper is always US Letter.

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

### User Story 2: preview and input

2. **Live preview.** Habits 5 → 6. Expect the preview to settle within 5 seconds with 6 habit rows and no reload.
3. **Layout change.** Layout → `columns`. Expect the preview to settle and download to stay enabled.
4. **Dot size change.** Dot diameter 4 → 3. Expect the preview to settle.
5. **Invalid habit count, each kind.** For each of empty, `0`, `-1`, `abc`, and `21`: expect a message in `#messages`, the field flagged `aria-invalid="true"`, and download disabled. Run once per kind.
6. **Recovery.** After an invalid value, enter `5`. Expect the message to clear and download to be enabled again.

### User Story 3: overflow block

7. **Overflow, rows.** Habits 20, days 365, per row 1. Expect `#warning` visible and download disabled.
8. **Overflow, columns.** Layout `columns`, days 365. Expect the same warning and blocked download, with no side-by-side columns.
9. **Overflow, calendars.** Layout `calendars`, habits 20, days 365, per row 1. Expect the same warning and blocked download.
10. **Fix an overflow.** From scenario 7, habits 20 → 5. Expect the warning to clear and download to be enabled.

## Checks each scenario makes

- Preview settles (`#preview-section` `aria-busy="false"`) within 5 seconds of a valid change.
- Download is enabled only when the layout fits and every option is valid.
- A download that is expected produces a file. A missing file is a failure, not a pass (FR-008).
- The downloaded PDF has exactly one page and a US Letter page size (612 × 792 points).

## Expected outcome

- All 10 scenarios pass on an unchanged codebase, and in 10 consecutive runs (SC-004).
- A deliberate break in any covered behaviour fails the matching scenario and nothing else (SC-003).
- A failing run prints each failing scenario with its step name and a screenshot path (SC-005).
- A full run finishes within 3 minutes on a typical machine (SC-001).

## Troubleshooting

- **Browser not found**: check that `~/Library/Caches/ms-playwright/chromium-1243` exists. Playwright needs a Chromium binary, and a browser download needs a separate approval.
- **Port already in use**: the config uses a fixed port with `--strictPort`. Stop the other process, or run with the existing server reused locally.
- **Preview never settles**: check the browser console in the screenshot path; the suite waits 5 seconds and then reports the step.
