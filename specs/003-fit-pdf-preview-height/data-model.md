# Data Model: Fit PDF Preview To Viewport Height

This feature introduces no persisted entities, no storage, and no server-side data.
What it does introduce is a small piece of transient UI state and a pure
computation over three existing, already-known quantities. Documented here in
place of a traditional entity model.

## FitMode (UI state)

| Field | Type | Values | Notes |
|---|---|---|---|
| `fitMode` | enum | `"page"` \| `"height"` \| `"width"` | In-memory only (module-level variable in `main.ts`); not persisted across reloads; resets to `"page"` on fresh load (FR-006, spec Assumptions). |

Lifecycle: set once on load (`"page"`), updated whenever the user changes the
selector (FR-007), read on every preview re-render and every `ResizeObserver`
callback (FR-008, FR-009, FR-010). No validation needed beyond "one of the three
enum values" — the `<select>` control itself constrains input.

## PageSize (derived, not stored)

| Field | Type | Source |
|---|---|---|
| `width` | number (PDF points) | `page.getViewport({ scale: 1 }).width`, already computed in `renderPreview()` |
| `height` | number (PDF points) | `page.getViewport({ scale: 1 }).height`, already computed in `renderPreview()` |

Not a new concept — this is the existing `base` viewport already read in
`web/src/preview.ts`. Documented here only because it's one of
`computePreviewScale()`'s two inputs.

## ContainerSize (derived, not stored)

| Field | Type | Source |
|---|---|---|
| `width` | number (CSS px) | `ResizeObserver` entry `contentRect.width` on `#preview` |
| `height` | number (CSS px) | `ResizeObserver` entry `contentRect.height` on `#preview` |

## Computed: PreviewScale

Pure output of `computePreviewScale(page: PageSize, container: ContainerSize, mode: FitMode)`:

| Field | Type | Meaning |
|---|---|---|
| `scale` | number | Multiplier applied uniformly to both page dimensions — see [contracts/preview-fit.md](./contracts/preview-fit.md) for the exact formula per mode. |
| `displayWidth` | number (CSS px) | `page.width * scale` |
| `displayHeight` | number (CSS px) | `page.height * scale` |

No relationships, no identity/uniqueness rules, no state transitions beyond the
`FitMode` enum swap — this is intentionally the entire model for a display-only
feature.
