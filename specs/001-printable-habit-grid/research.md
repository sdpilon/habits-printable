# Research: Printable Habit Grid

No NEEDS CLARIFICATION markers remained in the spec after `/speckit-clarify`, so the decisions below were made directly. Items marked **verify** must be confirmed at implementation time against current package versions.

## 1. Where Typst compiles: in the browser

- **Decision**: Compile Typst to WebAssembly in the browser (`@myriad-dreamin/typst.ts`). The preview is SVG; the download is PDF; both come from the same template and inputs.
- **Rationale**: "Preview is instant" (spec intro) rules out a server round trip on each option change. Using one engine for both outputs is the simplest way to meet Principle II. No backend keeps the scope to what the spec asks for (no accounts, no storage).
- **Alternatives considered**:
  - Server-side Typst CLI, with the page requesting SVG/PDF over HTTP. Rejected: adds latency against SC-002 and needs a server.
  - Preview drawn in SVG/Canvas by JavaScript, PDF from Typst. Rejected: two drawing implementations, which Principle I forbids.
- **Verify**: the typst.ts version that supports Typst 0.13.x; its SVG output and PDF output for the same source.

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

## 6. Test strategy for preview equals print

- **Decision**: For each case in `tests/comparison/cases.json`, render the SVG preview and the PDF at 300 dpi, rasterize both, and report any pixel difference. A non-empty diff fails the case.
- **Rationale**: Principle II says any difference is a defect. Pixel comparison at print resolution is what SC-003 measures.
- **Verify**: rasterizer choice (e.g., poppler's `pdftoppm` for PDF, a Node SVG rasterizer for the preview). Tools that need installing require approval before installation.

## 7. Tooling

- **Decision**: pnpm for packages (no bun.lock in the repo), Vite for the dev server and build, Vitest for unit tests.
- **Rationale**: Project preference recorded in the user's global instructions.

## 8. Verified typst.ts API (T009)

- Package: `@myriaddreamin/typst.ts` 0.7.0, with peers `@myriaddreamin/typst-ts-renderer` 0.7.0 and `@myriaddreamin/typst-ts-web-compiler` 0.7.0 (both required at load time).
- `$typst.svg({ mainContent, inputs })` and `$typst.pdf({ mainContent, inputs })` match the engine's calls. `pdf()` can return `undefined`, which the engine handles.
- Each call compiles separately, so the engine compiles twice per update. Tracked as an open question in the implementation review.
- The bundled Typst is 0.14.2: `typst-assets` 0.14.2 is in the wasm, and the Typst source commit it was built from has workspace version 0.14.2. The fit test and the comparison harness compile through this same engine, so they test the version the page uses.
