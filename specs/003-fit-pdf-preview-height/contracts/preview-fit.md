# Contract: `computePreviewScale`

The one pure function this feature adds. No network/API surface exists for this
project (a static, backend-less web app) — this is the internal contract that
replaces a traditional API/CLI contract, and is the thing `tests/unit/preview-fit.test.ts`
tests directly.

## Signature

```text
computePreviewScale(page: PageSize, container: ContainerSize, mode: FitMode): PreviewScale
```

- `PageSize = { width: number; height: number }` — PDF page size in points (both > 0).
- `ContainerSize = { width: number; height: number }` — available box in CSS px (both > 0).
- `FitMode = "page" | "height" | "width"`
- `PreviewScale = { scale: number; displayWidth: number; displayHeight: number }`

## Behavior

| Mode | `scale` formula |
|---|---|
| `"page"` | `min(container.width / page.width, container.height / page.height)` |
| `"height"` | `container.height / page.height` |
| `"width"` | `container.width / page.width` |

In every mode:

```text
displayWidth  = page.width  * scale
displayHeight = page.height * scale
```

## Invariants (what the unit tests assert)

1. **Aspect ratio is always preserved**: `displayWidth / displayHeight` equals
   `page.width / page.height` exactly (within floating-point tolerance), for all
   three modes. The same `scale` always drives both dimensions — there is no code
   path that sets width and height independently.
2. **`"page"` mode never exceeds the container in either dimension**:
   `displayWidth <= container.width` and `displayHeight <= container.height`.
3. **`"height"` mode always matches the container's height exactly**:
   `displayHeight === container.height` (up to floating-point tolerance);
   `displayWidth` may be smaller *or larger* than `container.width` (the
   "non-primary dimension may overflow — handled by the preview area's own
   `overflow: auto`, never the window" case from research.md §5).
4. **`"width"` mode always matches the container's width exactly**: symmetric to
   invariant 3.
5. **Pure function**: no DOM access, no side effects, same inputs always produce
   the same outputs — callable from a unit test with plain object literals, no
   browser/JSDOM required.

## Non-goals

- This contract does not cover *when* `computePreviewScale` is called (that's
  `main.ts`'s `ResizeObserver`/option-change wiring, covered by e2e tests) — only
  the math itself.
- Does not cover the exported PDF's own dimensions/scale, which this feature never
  touches (constitution: exports stay at 100% scale, independent of on-screen
  preview magnification).
