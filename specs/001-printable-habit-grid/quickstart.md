# Quickstart: Printable Habit Grid

How to run the feature and check that it works. Build steps and dependencies are in tasks.md; nothing here installs anything.

## Prerequisites

- Node.js (LTS) and pnpm
- The packages listed in plan.md (Typst WASM engine, Vite, Vitest). **Installing them needs your approval first.**
- For the preview-vs-PDF check: a PDF rasterizer and an SVG rasterizer (see research.md §6). Also needs approval before install.

## Run the page

```bash
pnpm install
pnpm dev
```

Open the printed local URL. Expect the form with defaults: layout "one row per habit", 5 habits, 31 days, 7 per row, 4 mm dots, A4.

## Scenarios to check by hand

1. **Defaults download** (User Story 1, scenario 1): click download with no changes. Expect a one-page A4 PDF with 5 habits. Each habit's 31 dots wrap across 5 lines of 7 (the default per-row count), with a 40 mm label area on the left and day numbers on days 5, 10, 15, … 30.
2. **Live preview** (User Story 2): change habits from 5 to 6. The preview should show 6 rows within 0.2 s (the timing check below), with no reload.
3. **Invalid input** (FR-012): clear the habits field. Expect a message, the last valid preview still visible, and download disabled.
4. **Over the habit cap** (FR-001): enter 21 habits. Expect a message and download disabled.
5. **Overflow** (FR-013): set layout "habits as columns", 365 days. Expect the overflow warning and download disabled, with no pagination.
6. **Layout 3** (FR-003): switch to "one mini calendar per habit", then set 20 habits. Expect calendars in a wrapping grid, with the overflow block applied when the grid runs past the page.
7. **Printed size** (SC-004): print the default PDF at 100% scale on home paper, once on A4 and once on US Letter. All dots and labels should be inside the 10 mm margin on both.

## Preview equals print (Principle II)

```bash
pnpm compare
```

Runs each case in `tests/comparison/cases.json`, rasterizes the SVG preview and the PDF at 300 dpi, and fails on any pixel difference. Record the result in the review for any change that touches layout or rendering.

## Unit tests

```bash
pnpm test
```

Covers the validation rules and limits in `TrackerOptions` (data-model.md).

## Timing check (SC-002)

```bash
pnpm perf
```

Compiles the largest page that fits (20 habits, 31 days, layout `calendars`, 7 per row) ten times and fails if the median compile time is above 0.2 s.
