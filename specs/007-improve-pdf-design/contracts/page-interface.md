# Contract: Page Interface (extended)

This feature extends the existing interface defined in
[`specs/002-e2e-tests/contracts/page-test-interface.md`](../../002-e2e-tests/contracts/page-test-interface.md)
and reaffirmed unchanged by `specs/006-compact-controls-ui/contracts/page-interface.md`. All
existing guarantees hold:

- Every existing control inside `#options` keeps its current `name` attribute (`layout`, `habits`,
  `days`, `perRow`, `dotDiameterMm`, `dotSpacingMm`, `paper`) and valid value ranges.
- `#messages`, `input[aria-invalid="true"]`, `#warning`, `#download`, `#preview-section` (and its
  `aria-busy`/`data-habits`/`data-days` attributes), and `#preview canvas` all keep their current
  ids/attributes and meaning.

**What this feature adds**: one new optional text control inside `#options`, `name="title"` — a
plain single-line text input, no `min`/`max`/`step` (freeform text, not numeric). Like every
existing control, it is read on the form's `input` event and re-validated/re-compiled immediately
(FR-001); an empty value is valid and omits the header (FR-002). It has no dedicated error message
state: the only invalid case (over the 200-character defensive cap, see
`tracker-options.schema.json`) is prevented by an HTML `maxlength="200"` attribute on the control
itself, so it can never reach `#messages`.

**What this feature is allowed to change**: the visual appearance of the exported PDF and preview
(title header, rows-layout label placement, day-number density, typography/line weights) — none of
that is part of the DOM/e2e contract, only the PDF's own content, which `tests/comparison/margins.ts`
and the e2e suite's content assertions cover directly.

**Verification**: `tests/e2e/preview-and-input.spec.ts` is extended to cover typing into `#options
[name="title"]` and seeing it reflected in the preview. The "every fifth day" numbering rule lives
only in `typst/tracker.typ` (`calc.rem(day, 5) == 0`, two call sites) — no existing test hard-codes
it, so FR-004's change to "every day" needs no test-expectation updates beyond the fit-model and
margin-check regression passes already covered by data-model.md's Fit rules.
