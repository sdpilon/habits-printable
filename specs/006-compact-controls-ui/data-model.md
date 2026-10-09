# Data Model: Compact, Polished Options UI

No data entities are introduced, changed, or removed by this feature.

Per the spec's Assumptions, this is a layout and visual-design change only. The form continues to
collect exactly the same `TrackerOptions` shape already defined in `web/src/options.ts` and
documented in `specs/001-printable-habit-grid/contracts/tracker-options.schema.json`:

- `layout`: `'rows' | 'columns' | 'calendars'`
- `habits`: integer, 1–20
- `days`: integer, 1–365
- `perRow`: integer, 1–31
- `dotDiameterMm`: number, 2–5
- `dotSpacingMm`: number, 0.5–5
- `paper`: `'letter'`

Field names, types, limits, and validation rules are unchanged. No new state, no persistence, no
lifecycle/state transitions beyond what the existing form already has (valid/invalid, fits/doesn't
fit on one page).
