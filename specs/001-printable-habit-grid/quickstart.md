# Quickstart: Printable Habit Grid

How to run the feature and check that it works. Build steps and dependencies are in tasks.md; nothing here installs anything.

## Prerequisites

- Node.js 24 (as in CI) and pnpm
- The packages listed in plan.md (Typst WASM engine, Vite, Vitest, PDF.js, the margin check's canvas). **Installing them needs your approval first.**

## Run the page

```bash
pnpm install
pnpm dev
```

Open the printed local URL. The form starts at these defaults:

| Setting | Default |
|---------|---------|
| Layout | one row per habit |
| Habits | 5 |
| Days | 31 |
| Per row | 7 |
| Dot diameter | 4 mm |
| Dot spacing | 1.5 mm |
| Paper | A4 |

## Scenarios to check by hand

Every scenario starts from the defaults above. Reset the form to them first, then make only the changes listed.

1. **Defaults download** (User Story 1, scenario 1). No changes.
   - Click download. Expect a one-page A4 PDF with 5 habits. Each habit's 31 dots wrap across 5 lines of 7, with a 40 mm label area on the left and day numbers on days 5, 10, 15, … 30.
2. **Live preview** (User Story 2). Change:
   - Habits: 5 → 6.
   - Expect the preview to show 6 rows within 0.2 s (see the timing check below), with no reload.
3. **Invalid input** (FR-012). Change:
   - Habits: clear the field (leave it empty).
   - Expect a message, the last valid preview still visible, and download disabled.
4. **Over the habit cap** (FR-001). Change:
   - Habits: 21.
   - Expect a message and download disabled.
5. **Overflow** (FR-013). Change:
   - Layout: habits as columns.
   - Days: 365.
   - Expect the overflow warning and download disabled, with no pagination.
6. **Layout 3** (FR-003). Change:
   - Layout: one mini calendar per habit.
   - Habits: 20.
   - Expect calendars in a wrapping grid, with the overflow block applied when the grid runs past the page.
7. **Printed size** (SC-004). No changes. Print the default PDF at 100% scale on home paper, once on A4 and once on US Letter (set Paper to US Letter for the second print). All dots and labels should be inside the 10 mm margin on both.

## Margin check (Principle III)

```bash
pnpm margins
```

Compiles each fitting case, rasterizes its PDF at 300 dpi with PDF.js (through `@napi-rs/canvas`), and fails if printed content falls inside the 10 mm margin. It needs no native tools on the machine. The preview draws the same PDF as the download, so this check covers both.

## Unit tests

```bash
pnpm test
```

Covers the validation rules and limits in `TrackerOptions` (data-model.md).

## Timing check (SC-002)

```bash
pnpm perf
```

Compiles the fitting page with the most dots (A4, layout `calendars`, 9 habits, 360 days, 24 per row, 2 mm dots; 3,240 dots) ten times and fails if the median compile time is above 0.2 s. PDF.js drawing is not timed.
