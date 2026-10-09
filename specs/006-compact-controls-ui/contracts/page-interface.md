# Contract: Page Interface (unchanged by this feature)

This feature does not introduce a new interface. It must preserve the existing one, defined in
[`specs/002-e2e-tests/contracts/page-test-interface.md`](../../002-e2e-tests/contracts/page-test-interface.md),
in full:

- Every control inside `#options` keeps its current `name` attribute (`layout`, `habits`, `days`,
  `perRow`, `dotDiameterMm`, `dotSpacingMm`, `paper`) — the e2e suite selects controls by `name`,
  not by position, so reordering or regrouping fields visually is safe as long as the `name`
  attributes and their valid value ranges don't change.
- `#messages`, `input[aria-invalid="true"]`, `#warning`, `#download`, `#preview-section` (and its
  `aria-busy`/`data-habits`/`data-days` attributes), and `#preview canvas` all keep their current
  ids/attributes and meaning.

**What this feature is allowed to change**: the visual layout, spacing, padding, label placement,
border color, and focus/hover styling of everything inside `#options` — i.e. anything not listed
above as part of the contract.

**Verification**: the existing `tests/e2e/*.spec.ts` suite exercises this contract directly;
passing it unmodified (SC-005) is the acceptance check for this contract, not a new test file.
