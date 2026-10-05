# Research: Printable Habit Grid

No NEEDS CLARIFICATION markers remained in the spec after `/speckit-clarify`, so the decisions below were made directly. Items marked **verify** must be confirmed at implementation time against current package versions.

## 1. Where Typst compiles: in the browser

- **Decision**: Compile Typst to WebAssembly in the browser (`@myriaddreamin/typst.ts`). The engine produces one PDF; the preview draws that PDF with PDF.js, and the download is the same file.
- **Rationale**: "Preview is instant" (spec intro) rules out a server round trip on each option change. Using one engine for both outputs is the simplest way to meet Principle II. No backend keeps the scope to what the spec asks for (no accounts, no storage).
- **Alternatives considered**:
  - Server-side Typst CLI, with the page requesting SVG/PDF over HTTP. Rejected: adds latency against SC-002 and needs a server.
  - Preview drawn in SVG/Canvas by JavaScript, PDF from Typst. Rejected: two drawing implementations, which Principle I forbids.
- **Verify**: the typst.ts version that supports Typst 0.13.x; its PDF output for the same source. (Resolved: typst.ts 0.7.0 bundles Typst 0.14.2; see section 8.)

## 2. Overflow detection

- **Decision**: Compile the template and read the page count from Typst. If it's more than one page, show the overflow warning and disable download.
- **Rationale**: Typst already knows the layout. Checking page count means the rule that decides "does it fit" comes from the same code that draws the grid, so the warning can't disagree with the output.
- **Alternatives considered**: Compute fit in TypeScript from dot and label sizes. Rejected: a second copy of layout logic, which is what Principle I rules out.

## 3. Layout definition

- **Decision**: One `typst/tracker.typ` file takes a JSON-like input dictionary (see contracts/tracker-options.schema.json) and draws all three layouts through a `layout` switch.
- **Rationale**: One file keeps Principle I intact. A switch inside one template is simpler than three templates that have to match.
- **Alternatives considered**: Three separate `.typ` files. Rejected: shared pieces (dots, labels, day numbers) would be copied and could drift.

## 4. Day numbers

- **Decision**: Print a small number on every fifth day (5, 10, 15, …) in every layout, as printed text outside the dot circles.
- **Rationale**: Spec FR-015 and the clarification answer.

## 5. Dot sizing defaults

- **Decision**: Default dot diameter 4 mm; allowed range 2–5 mm. Default per-row 7 for layout (1), default habits 5, default days 31.
- **Rationale**: 4 mm is large enough for a pen tip and within FR-004's hand-fill requirement. The 7 default matches a week, which reads well. Defaults can change without touching the spec's limits.
- **Alternatives considered**: 31 per row by default. Rejected: a full month on one line is hard to read on A4 with a 40 mm label area.

## 6. Preview and download

- **Decision**: The preview draws the same PDF file as the download, using PDF.js on a canvas. The SVG pipeline and the pixel comparison were removed.
- **Rationale**: Two renderings of one layout can never match exactly. Measured in Chromium, PDF.js renders the default page in 17 ms and the largest fitting page in 17 ms, both well under 0.2 s. A single file makes Principle II true by construction.
- **Margin check**: each fitting case's PDF is rasterized at 300 dpi with Ghostscript (through ImageMagick), and printed content must sit inside 10 mm on every side (`tests/comparison/margins.ts`).
- **Alternatives considered**: a pixel comparison of SVG against PDF (tested with two renderer stacks, neither reached zero differences); geometry comparison of SVG and PDF (large effort and needs a tolerance).

## 7. Tooling

- **Decision**: pnpm for packages (no bun.lock in the repo), Vite for the dev server and build, Vitest for unit tests.
- **Rationale**: Project preference recorded in the user's global instructions.

## 8. Verified typst.ts API (T009)

- Package: `@myriaddreamin/typst.ts` 0.7.0, with peers `@myriaddreamin/typst-ts-renderer` 0.7.0 and `@myriaddreamin/typst-ts-web-compiler` 0.7.0 (both required at load time).
- `$typst.pdf({ mainContent, inputs })` matches the engine's call. `pdf()` can return `undefined`, which the engine handles. The engine no longer calls `$typst.svg`.
- The bundled Typst is 0.14.2: `typst-assets` 0.14.2 is in the wasm, and the Typst source commit it was built from has workspace version 0.14.2. The fit test and the comparison harness compile through this same engine, so they test the version the page uses.
