# Research: Compact, Polished Options UI

All Technical Context items were resolved directly against the existing codebase and the spec's
clarifications — no items were left as NEEDS CLARIFICATION. This file records the implementation
decisions made for the questions the spec deliberately left at the "what/why" level.

## 1. Label placement for compactness

**Decision**: Move each label beside its input (two-column layout: label text in a narrow left
column, control in the remaining width) instead of the current stacked label-above-input pattern,
keeping the existing implicit `<label>Text <input></label>` wrapping (no `for`/`id` pairing
needed — the implicit association already satisfies FR-004 and needs no markup change beyond
layout).

**Rationale**: Stacking is what currently doubles each control's vertical footprint (one line for
the label, one for the input). Side-by-side is the standard compact-form pattern and needs no new
markup semantics, so it carries no accessibility regression risk.

**Alternatives considered**:
- *Floating/placeholder-as-label*: rejected — placeholder text disappears on input and fails
  FR-004 (label must stay associated/visible), and is a known accessibility anti-pattern.
- *Collapsible/accordion sections*: rejected explicitly by FR-003 (no hiding controls behind an
  extra interaction).

## 2. Grouping related numeric fields

**Decision**: Lay `habits`, `days`, and `perRow` out as a single row of three narrower fields
(each keeping its own label above/beside it within the group), and `dotDiameterMm` /
`dotSpacingMm` as a second row of two. `layout` and `paper` (selects) and the download button stay
full-width.

**Rationale**: These five numeric fields are the ones User Story 2's acceptance scenario calls out
as needing to "read as a group"; putting counts in one row and dot-geometry fields in another
roughly halves the vertical space five single-column rows would need, within the sidebar's
existing `minmax(16rem, 20rem)` width.

**Alternatives considered**: A single auto-fit CSS grid across all fields — rejected because
`layout`/`paper` selects are naturally wider than the numeric fields and forcing them into the
same column rhythm would either clip the select text or waste the gained space elsewhere.

## 3. Trimming control padding while keeping a 24×24px tappable area

**Decision**: Reduce `input, select, button` padding from the current `0.4rem 0.5rem` to roughly
`0.3rem 0.4rem`, and add `min-height: 24px; min-width: 24px; box-sizing: border-box` so the
reduction can never cross the FR-007/SC-007 floor regardless of font metrics in a given browser.

**Rationale**: `min-height`/`min-width` make the 24×24px floor a hard CSS guarantee rather than
something that has to be manually re-checked whenever padding or font metrics change.

**Alternatives considered**: Relying on padding math alone (no explicit `min-height`) — rejected
as fragile; a future padding tweak could silently drop below the floor with no warning.

## 4. Border/contrast finding — `--line` fails the 3:1 non-text contrast floor

**Decision**: Introduce a dedicated `--control-border` custom property for input/select/button
borders, distinct from the existing `--line` (which stays as-is for lighter decorative use, e.g.
the preview canvas's outline). Target values: `#8a8a8a` in light mode (~3.45:1 against `#ffffff`)
and `#707070` in dark mode (~3.44:1 against `#1c1c1e`).

**Rationale**: Computing the actual WCAG contrast ratios for the current palette (see table below)
shows every *text* color already clears 4.5:1 comfortably, but `--line` — used today for every
input/select/button border — is only ~1.5:1 against the background in both color schemes, well
under the 3:1 floor FR-009/SC-006 require for UI component boundaries. This was not visible from
reading the CSS; it only showed up by computing the ratios.

| Pair | Light | Dark |
|---|---|---|
| text (`--ink`) on `--bg` | 16.83:1 | 15.63:1 |
| muted text (`--muted`) on `--bg` | 5.07:1 | 6.61:1 |
| warning text (`--warn`) on `--bg` | 7.26:1 | 7.45:1 |
| **current border (`--line`) on `--bg`** | **1.51:1 (fails)** | **1.50:1 (fails)** |
| proposed control border on `--bg` | 3.45:1 (passes) | 3.44:1 (passes) |

**Alternatives considered**: Raising `--line` itself globally — rejected because `--line` is also
used for the preview canvas's decorative outline (`box-shadow: 0 0 0 1px var(--line)`), which is
not an "essential UI component" under WCAG 1.4.11 and doesn't need the darker, more visually heavy
value; keeping it separate avoids an unintended visual change outside the options form.

## 5. Hover/focus state

**Decision**: Add a `:focus-visible` style (a slightly stronger border/outline using the new
`--control-border` value plus a subtle box-shadow) shared by inputs, selects, and the download
button, with any transition wrapped in `@media (prefers-reduced-motion: no-preference)` so motion
is skipped for users who've asked for it.

**Rationale**: `:focus-visible` (rather than `:focus`) avoids showing the ring on mouse clicks
where it isn't useful, while still showing it for keyboard navigation — satisfying FR-009's
keyboard-tab-order requirement without changing the actual tab order (a CSS-only change never
touches DOM order or `tabindex`).

**Alternatives considered**: Animating the hover/focus transition unconditionally — rejected per
the Assumptions section's reduced-motion note.

## 6. Verifying the ≥30% vertical space reduction (SC-002/SC-003)

**Decision**: Measure the options panel's rendered height before and after, at default option
values, using the `run-project` skill's existing screenshot/DOM-measurement capability (desktop
and the <720px mobile breakpoint). This is a manual verification step recorded in quickstart.md,
not a new automated test.

**Rationale**: SC-004 already frames the overall "looks less cluttered" outcome as an informal,
qualitative review; adding a new pixel-snapshot regression test for one specific metric would be
more tooling than this feature's scope justifies (Constitution Principle V — avoid configurability
or infrastructure no spec requires). The existing automated suites (SC-005) already guard against
functional regressions; this measurement is specifically about the "how much did it shrink"
number, which is naturally a one-time manual check.

**Alternatives considered**: Adding a Playwright test that asserts a specific pixel height —
rejected as brittle (would need updating on every future unrelated style tweak) and not something
the spec asked for as an ongoing automated gate.
