# Baseline Measurements

Rendered height of `#options` (the options form), measured via
`document.querySelector('#options').getBoundingClientRect().height` through the `run-project`
skill's Playwright driver, before any redesign changes (commit `16464e2`).

| Viewport                            | Width used | `#options` height |
| ----------------------------------- | ---------- | ----------------- |
| Desktop                             | 1280×800   | 553.25px          |
| Mobile (below the 720px breakpoint) | 600×900    | 553.25px          |

Both match because the current CSS's `@media (max-width: 720px)` block only changes `main`'s grid
columns/padding — the form's own label-above-input layout is identical at both widths today.

A ≥30% reduction (SC-002/SC-003) means the post-redesign height should be **≤387.3px** at both
viewport widths.

## After (User Story 1 — desktop, before User Story 2's polish additions)

| Viewport | Width used | `#options` height | Reduction |
| -------- | ---------- | ----------------- | --------- |
| Desktop  | 1280×800   | 256.09px          | 53.7%     |

53.7% exceeds the 30% target (SC-002). This figure predates User Story 2's divider/button-margin
additions (T011/T012), which add back a small amount of height — see the final figure below.

## After (User Story 3 — mobile)

| Viewport                 | Width used | `#options` height | Reduction |
| ------------------------ | ---------- | ----------------- | --------- |
| Mobile                   | 375×800    | 272.48px          | 50.7%     |
| Mobile (320px edge case) | 320×800    | 272.48px          | 50.7%     |

50.7% exceeds the 30% target (SC-003). Every control measured ≥92×29px at both widths — well
above the 24×24 CSS px floor (SC-007). No mobile-specific CSS changes were needed: the compact
styles from User Stories 1–2 aren't desktop-only, so they already apply at every width.

## Final figure (all user stories, desktop)

Since the panel's height doesn't vary by viewport width (confirmed above), the final desktop
figure is the same as the final mobile one, 272.48px (also independently reconfirmed by a
`/quickstart-verify` pass): a **50.75% reduction** from the 553.25px baseline — still comfortably
clearing SC-002's 30% target. The 256.09px figure recorded for User Story 1 above is real but
stale: it was measured before User Story 2 added the field-group divider (`padding-top` +
`border-top`) and the download button's `margin-top`, which together account for the ~16px
difference.
