# Quickstart: Mobile Preview Reliability

How to manually check this bugfix. Automated coverage (`pnpm test`, `pnpm e2e`,
`pnpm perf`, `pnpm margins`) is listed in `bug-report.md`'s Verification
section — this is the hand-run checklist on top of that, pulled from
001/002's quickstarts where still valid, plus new checks specific to this fix.

## Prerequisites

- `pnpm install`, then `pnpm dev --host` to reach it from a phone on the same
  network (see `.claude/skills/run-project/SKILL.md` for the driver-based
  alternative if you'd rather automate this on desktop Chromium).
- A Firefox-based mobile browser (Firefox for Android, or a fork like
  IronFox) for the checks that are specific to this fix — a desktop or
  Chromium-based run alone will not exercise either bug.

Form defaults (unchanged by this fix):

| Setting | Default |
|---------|---------|
| Layout | one row per habit |
| Habits | 5 |
| Days | 31 |
| Per row | 7 |
| Dot diameter | 4 mm |
| Dot spacing | 1.5 mm |
| Paper | US Letter (only option offered) |

## This fix's own checks

Run these on the Firefox-based mobile browser. Every scenario starts from
the defaults above.

1. **Preview actually renders.** No changes. Load the page. Expect the
   preview to show the 5×31 grid, not a blank area — this is the IronFox
   symptom (`getOrInsertComputed is not a function`) this fix addresses.
2. **Preview survives an option change.** Change Habits 5 → 6. Expect the
   preview to redraw with 6 rows, not go blank.
3. **Preview survives a resize.** No option changes. Rotate the phone (or
   resize the window) once the default preview is showing. Expect the
   preview to re-fit and stay visible, not go blank.
4. **Download still matches what compiled** (sanity that the WASM-buffering
   change in `typst-init.ts` didn't change output). No changes. Click
   download. Expect a one-page US Letter PDF with 5 habits × 31 days,
   matching the preview exactly.
5. **Dev-only overlay doesn't leak to production.** Build and serve the
   production bundle (`pnpm build && pnpm exec vite preview`) and load it —
   in *any* browser. Expect no diagnostic overlay strip at the bottom of the
   screen. Then load the same page via `pnpm dev` and confirm the overlay
   *is* present there, printing `boot`/`compile`/`render` lines as you
   change options.

## Regression checks (reused from 001/002, still valid as-is)

These aren't specific to this bug, but since every one of them exercises the
preview-render path this fix touches, they're worth re-running once by hand
rather than trusting the e2e suite alone. Every scenario starts from the
defaults above; dropped from the original 001 quickstart: its "printed
size" scenario (printed A4 vs. Letter) — A4 is no longer offered
(constitution Technical Constraints), and print-margin correctness is
already covered mechanically by `pnpm margins`, unrelated to this fix.

6. **Non-default counts** (002, US1 scenario 2). Change:
   - Habits: 5 → 6.
   - Days: 31 → 14.
   - Layout: one row per habit → habits as columns.
   - Expect the preview to settle, counts to read 6 and 14, and download
     enabled.
7. **Invalid input clears to last valid preview** (001 FR-012 / 002 US2
   scenario 4). Change:
   - Habits: clear the field (leave it empty).
   - Expect a message, the last valid preview still visible (not blank),
     and download disabled.
8. **Over the habit cap** (001 FR-001). Change:
   - Habits: 21.
   - Expect a message and download disabled.
9. **Overflow still draws page 1** (001 FR-013 / 002 US3 scenario 6). Change:
   - Layout: one row per habit → habits as columns.
   - Days: 31 → 365.
   - Expect the overflow warning, download disabled, and the overflowing
     layout's page 1 still drawn in the preview (not blank).
10. **Calendars layout** (001 FR-003). Change:
    - Layout: one row per habit → one mini calendar per habit.
    - Habits: 5 → 20.
    - Expect calendars in a wrapping grid, drawn correctly in the preview.
