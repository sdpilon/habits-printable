# Phase 0 Research: Fit PDF Preview To Viewport Height

No `NEEDS CLARIFICATION` markers remain in the Technical Context — the project's
stack (vanilla TypeScript, Vite, pdfjs-dist, vitest, Playwright) is already fixed
project-wide. The research below resolves the open implementation questions this
feature introduces.

## 1. Why the preview currently overflows the window

**Finding**: `web/src/preview.ts`'s `renderPreview()` scales the PDF page to match
`container.clientWidth` only (`scale = (width / base.width) * devicePixelRatio`),
then sets `canvas.style.height` proportionally from that same width. The ratio math
is already correct (width and height are derived from the same scale factor), but
nothing bounds `main`/`#preview-section`/`#preview`'s own height to the viewport —
`main` is an unconstrained CSS grid block, so the whole page simply grows as tall
as the rendered canvas and the browser adds a window scrollbar.

**Decision**: The root cause is a missing height constraint on the layout shell, not
distorted aspect-ratio math. Fixing it requires two independent changes: (a) give
`main`/`#preview-section`/`#preview` a real, viewport-bounded height so "available
space" is a concrete, measurable number; (b) make the scale computation itself
mode-aware (height-only, width-only, or both) instead of always width-only.

## 2. Detecting available space

**Decision**: Use `ResizeObserver` on `#preview` (the canvas's direct parent), not
on `#preview-section` or `window`.

**Rationale**: `#preview` already sits below the (possibly hidden) `#warning`
banner inside `#preview-section`. Observing `#preview`'s own box means its
`contentRect` already reflects whatever space is left after the banner's current
height is subtracted by normal CSS flow — no manual bookkeeping of the banner's
height is needed. A `window resize` listener alone would miss cases where the
*available* space changes without the window resizing (e.g., the warning banner
appearing/disappearing), which `ResizeObserver` catches for free.

**Alternatives considered**:
- `window.addEventListener('resize', …)` only — rejected: misses banner
  show/hide and any other sibling-driven layout shift.
- `ResizeObserver` on `#preview-section` with manual banner-height subtraction —
  rejected: strictly more code for the same result `#preview`'s own box already
  gives.
- Observing the canvas itself — rejected: the canvas's size is the *output* of the
  fit computation, so observing it would create a feedback loop.

## 3. Making "available space" a real number (layout shell)

**Decision**: Bound `html`/`body`/`main` to the viewport using `100svh` (small
viewport height — stable across mobile browser chrome show/hide, unlike `100vh`),
with `main` as the existing CSS grid and `#preview-section` using
`display: flex; flex-direction: column; min-height: 0` so it can shrink below its
content's intrinsic size (required for a flex/grid child to ever be smaller than
its content — the classic "min-height: auto" trap). `#preview` becomes
`flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center;`
so it both reports a determinate height to `ResizeObserver` and centers the scaled
canvas within whatever space it has.

**Rationale**: Without `min-height: 0` on the flex chain, a flex item never shrinks
below its content's natural size, which would silently defeat the whole feature
(the container would just grow to fit the canvas again, recreating today's bug).
This is the standard, well-known fix for that CSS trap.

**Alternatives considered**:
- `position: fixed`/absolute positioning for the preview pane — rejected: more
  disruptive to the existing two-column grid (`main { grid-template-columns: … }`)
  and to the narrow-viewport stacked layout at `720px`, for no benefit over flex.
- JS-measured `window.innerHeight` math instead of CSS `svh` — rejected: CSS units
  already solve this declaratively and stay correct through the existing
  `@media (max-width: 720px)` breakpoint without extra JS.

## 4. Scale computation per fit mode

**Decision**: A single pure function, `computePreviewScale(page, container, mode)`,
where `page = { width, height }` (the PDF page's own points, from
`page.getViewport({ scale: 1 })`) and `container = { width, height }` (from the
`ResizeObserver` entry on `#preview`):

- `fit-page`: `scale = min(container.width / page.width, container.height / page.height)`
- `fit-height`: `scale = container.height / page.height`
- `fit-width`: `scale = container.width / page.width`

In every mode, `displayWidth = page.width * scale` and
`displayHeight = page.height * scale` — the same `scale` drives both dimensions, so
the ratio can never be distorted by construction (this also documents, precisely,
why "fit-height scales the width" and "fit-width scales the height": the *other*
dimension is a consequence of the same scale factor, never set independently).

**Rationale**: This is the standard "contain"/"cover-one-axis" scaling math
(equivalent to CSS `object-fit: contain` for `fit-page`), expressed as a pure,
synchronous function with no DOM dependency — directly unit-testable the same way
`tests/unit/fit-model.ts` tests `predictFits()` in isolation from the DOM/Typst
pipeline.

**Alternatives considered**:
- CSS `object-fit` on an `<img>` wrapping a data-URL of the canvas — rejected: adds
  an extra encode/decode round-trip and a second element for no benefit, since
  PDF.js already renders directly onto a canvas whose `style.width`/`style.height`
  we fully control.
- Letting the browser's native `max-width: 100%; height: auto` CSS do `fit-width`
  implicitly (today's de facto behavior) and only hand-writing `fit-height`/
  `fit-page` — rejected: three different code paths for three modes is harder to
  keep correct than one function with a `mode` parameter; also the implicit CSS
  path doesn't participate correctly once the container has a bounded height.

## 5. Where the non-primary dimension overflows (fit-height / fit-width)

**Finding**: In `fit-height` mode, the computed width can exceed the container's
width (e.g., a very wide/short generated page); symmetrically for `fit-width`'s
height. Per the spec's Assumptions, the browser window must never scroll, but the
preview area itself may.

**Decision**: Keep `#preview { overflow: auto; }` (already present in
`web/src/style.css`) unchanged. Because `#preview` is viewport-bounded (§3), any
overflow on the non-primary axis scrolls only within that fixed-size box, never the
page/window.

## 6. UI control placement and state

**Decision**: A plain three-option `<select name="fitMode">` (or radio group — a
`<select>` matches the existing form's pattern for `layout`/`paper`) added to
`#preview-section`, above `#preview`, next to or near the `#warning` banner. Mode
state is a single module-level variable in `main.ts` (no persistence, resets to
`fit-page` on reload per spec Assumptions), read on every `renderPreview()` call
and on every `ResizeObserver` callback.

**Rationale**: Matches the existing form's own conventions (`<select>` for
enumerated choices) rather than introducing a new control pattern. Living in
`#preview-section` (not the options `<form>`) keeps it visually and semantically
tied to the preview it affects, not to the grid-generation options.

**Alternatives considered**: Radio buttons — visually heavier for a 3-way toggle
with no strong accessibility advantage over a labeled `<select>` here; rejected for
consistency with the rest of the form.

## 7. Test strategy

**Decision**:
- Unit: `tests/unit/preview-fit.test.ts` tests `computePreviewScale()` directly
  against representative `(page, container, mode)` triples, asserting the exact
  `scale`/`displayWidth`/`displayHeight` math (including the "other dimension
  overflows the container" case from §5).
- E2E: extend the Playwright suite (and `tests/e2e/support/page.ts`) with helpers
  to switch fit mode, read `document.documentElement.scrollHeight` vs
  `window.innerHeight` (window-scroll assertion), and read the rendered canvas's
  `style.width`/`style.height` ratio against the PDF page's own ratio (distortion
  assertion) — reusing the same `page.ts` helper pattern already used for
  `readCanvasHash`/`waitForSettled`.
- Manual: the `run-project` skill's `driver.mjs` REPL (already used earlier this
  session) is sufficient for ad hoc screenshot verification in each mode; no new
  driver commands are required — `eval` already exposes arbitrary `page.evaluate`
  calls for the scroll/ratio checks above.

**Rationale**: Mirrors the project's existing split between fast pure-function unit
tests and DOM-dependent e2e tests (see `fit-model.ts`/`fit.test.ts` for the
established pattern), and reuses existing driver/helper infrastructure instead of
adding new tooling.
