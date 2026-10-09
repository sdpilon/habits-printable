# Quickstart: Improve PDF Output Design

How to verify the four design changes by hand, beyond what the automated suites check. The page's
data/behavior contract is extended, not broken (see `contracts/page-interface.md` and
`data-model.md`) — this guide is about the visual outcome in the preview and the downloaded PDF.

## Prerequisites

- Dependencies installed (`pnpm install`).
- The app runnable locally — use the `run-project` skill, or `pnpm dev` directly.

## Automated checks (run first)

These must all still pass — they're the regression guard for FR-008/SC-005:

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run perf
pnpm run margins
pnpm run e2e
```

## Manual verification

Every scenario starts from the defaults below. Reset the form to them first, then change only what
is listed.

| Setting      | Default                    |
| ------------ | --------------------------- |
| Layout       | one row per habit (`rows`) |
| Habits       | 5                            |
| Days         | 31                           |
| Per row      | 7                             |
| Dot diameter | 4 mm                         |
| Dot spacing  | 1.5 mm                       |
| Paper        | US Letter                   |
| Title        | (blank)                      |

### User Story 1: page title

1. **Blank by default.** Load the app with no changes. Expect no header area at the top of the
   preview — the page looks exactly as it did before this feature (FR-002).
2. **Typing a title.** Type "Morning Routine" into the new title field. Expect the preview to show
   it as a header at the top immediately, with no reload (FR-001).
3. **Title in the download.** With the title still set, download the PDF. Expect the exported file
   to show the identical title in the identical position as the preview (FR-001, SC-001).
4. **Clearing the title.** Clear the field. Expect the header to disappear from the preview again,
   matching scenario 1.
5. **Very long title.** Type a title much longer than the page is wide (e.g. paste 150+ characters).
   Expect it to be clipped at the printable margin on one line — not wrapped to a second line, not
   auto-shrunk to fit (spec Edge Cases).

### User Story 2: rows-layout label placement

6. **Label above, not beside.** With defaults (layout `rows`), look at any habit's block. Expect the
   blank writing area for the habit's name directly above its row(s) of dots, not in a separate
   column to the left (FR-003).
7. **Narrower block.** Compare the habit block's width to the dot grid's width. Expect them to
   match (plus only a small margin) — no leftover wide blank column beside the dots (SC-002).
8. **Still fits.** Set habits 20, days 365, per row 7 (`rows-max-habits-and-days` in
   `tests/comparison/cases.json`). Expect the same fit/overflow behavior as before this feature —
   confirm by running `pnpm run margins`.

### User Story 3: every dot numbered

9. **Every dot, every layout.** For each layout (`rows`, `columns`, `calendars`) at the defaults,
   look at the dots. Expect every single dot to have its own day number next to or above it — not
   just days 5, 10, 15, … (FR-004).
10. **No mismatch.** Pick any printed number at random and find the dot nearest to it. Expect that
    dot to be the exact day the number names, with no dot left unlabeled and no number left without
    a dot (FR-005, SC-003).
11. **Smallest dots, most per row.** Set dot diameter to 2 mm, dot spacing to 0.5 mm, per row to 31
    (`rows-31-small-dots` in `tests/comparison/cases.json`). Expect every number to stay legible
    and non-overlapping even at this extreme (spec Edge Cases, research.md §3).

### User Story 4: consistent polish

12. **Side by side.** Generate one tracker per layout with the same habit/day counts. Expect the
    same line weights, label styling, and spacing conventions across all three — no layout looking
    rougher or more "finished" than the others (SC-004).
13. **Black and white.** Print (or print-preview) any layout without color. Expect every design
    change — title, repositioned label, per-dot numbers — to stay fully legible (FR-007).

## Margin check (Principle III)

```bash
pnpm margins
```

Re-run against `tests/comparison/cases.json` (extended with a title-present case for this feature)
to confirm the title header, the repositioned rows-layout label, and the denser day numbering all
still keep printed content inside the 10 mm margin on every case.

## Expected outcome

- All automated checks above pass (FR-008, SC-005).
- A title, when set, appears identically in the preview and the download; when blank, the page is
  unchanged from before this feature (SC-001).
- The rows layout's habit blocks are no wider than their dot grid (SC-002).
- Every dot on every layout has exactly one correctly-matched day number (SC-003).
- All three layouts look like one consistent design (SC-004).
