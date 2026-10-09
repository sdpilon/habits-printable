# Quickstart: Compact, Polished Options UI

How to verify the redesigned options form, beyond what the automated suites already check. The
data/behavior contract is unchanged (see `contracts/page-interface.md` and `data-model.md`) — this
guide is about the visual/layout outcome.

## Prerequisites

- Dependencies installed (`pnpm install`).
- The app runnable locally — use the `run-project` skill, or `pnpm dev` directly.

## Automated checks (run first)

These must all still pass unmodified — they're the regression guard for SC-005:

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

Every scenario starts from the defaults below. Reset the form to them first, then change only
what's listed.

| Setting      | Default                    |
| ------------ | -------------------------- |
| Layout       | one row per habit (`rows`) |
| Habits       | 5                          |
| Days         | 31                         |
| Per row      | 7                          |
| Dot diameter | 4 mm                       |
| Dot spacing  | 1.5 mm                     |
| Paper        | US Letter                  |

### User Story 1: compact options panel

1. **Desktop, default window size.** Load the app. Expect every control (layout, habits, days,
   per row, dot diameter, dot spacing, paper, messages area, download button) visible without
   scrolling the options panel.
2. **Vertical space reduction (SC-002).** Measure the options panel's rendered height (e.g. via
   browser devtools, or the `run-project` skill's screenshot). Compare against the pre-redesign
   height. Expect at least a 30% reduction.
3. **Reduced window height.** Resize the browser window shorter (e.g. ~600px tall). Expect all
   controls to stay legible, correctly labeled, and usable, with nothing overlapping or clipped.

### User Story 2: visual polish

4. **Field grouping.** Expect `habits`, `days`, and `perRow` to read as one visually grouped row,
   and `dotDiameterMm`/`dotSpacingMm` as another — not seven identical stacked rows.
5. **Hover/focus state.** Tab through the controls with the keyboard. Expect each control to show
   a clear, consistent focus indicator. Hover each control with a mouse and expect a visible but
   distinct (non-focus) hover state.
6. **Primary action.** Glance at the panel. Expect the download button to be visually
   distinguishable as the primary action, not styled like the other controls.
7. **Reduced motion.** In OS/browser settings, enable "reduce motion", then hover/focus controls
   again. Expect no animated transition (an instant state change is fine).

### User Story 3: mobile

8. **Narrow viewport.** Resize below the existing 720px breakpoint (or use a phone-sized device
   emulation). Expect the options panel to take up visibly less vertical space than before,
   leaving more room for the preview below it.
9. **Touch target floor (SC-007).** At a mobile width, inspect computed styles for each input,
   select, and the download button. Expect each to measure at least 24×24 CSS px.

### Accessibility (SC-006)

10. **Contrast.** Using browser devtools' contrast checker (or the values in `research.md` §4),
    confirm text meets ≥4.5:1 and control borders meet ≥3:1 against the background, in both light
    and dark mode (toggle via OS color-scheme setting).
11. **Tab order unchanged.** Confirm keyboard tab order visits the controls in the same sequence
    as before the redesign (layout → habits → days → perRow → dotDiameterMm → dotSpacingMm →
    paper → download).

### Edge cases

12. **Validation message.** Enter an invalid habit count (e.g. empty). Expect the message in
    `#messages` to remain clearly visible, with no overlap with adjacent controls, in the
    compacted layout.
13. **Overflow warning.** Set habits 20, days 365, per row 1. Expect `#warning` to remain clearly
    visible, not visually lost in the tightened layout.
14. **Dark mode.** Toggle OS dark mode. Expect both the compaction and the polish (spacing,
    grouping, borders, focus state) to hold up, matching the contrast figures above.

## Expected outcome

- All automated checks above pass unmodified (SC-005).
- Options panel height is reduced ≥30% on both desktop and mobile (SC-002, SC-003).
- No control's tappable area is below 24×24 CSS px on mobile (SC-007).
- Text and control borders meet WCAG AA contrast in both color schemes (SC-006).
- Nothing in `contracts/page-interface.md` changed.
