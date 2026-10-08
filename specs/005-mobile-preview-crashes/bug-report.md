# Bug Report: Mobile preview reliability (blank preview, WASM load abort risk)

**Branch**: `005-mobile-preview-crashes`

**Created**: 2026-10-08

**Status**: Fixed, pending review

**Format note**: this directory deliberately skips the standard `spec.md` (user
stories / P1-P3 / MVP slices) — there's no new capability here, just two
reliability bugs in already-shipped code (`004-fit-pdf-preview-to-page`,
merged as PR #4). SpecKit's own templates and this repo's constitution are
shaped around "every **feature** MUST begin with a specification"; a fix with
a fully understood root cause, small diff, and no prior failed attempt doesn't
fit that mold, so this is a plain bug report instead: symptom, root cause,
fix, verification.

## Symptom 1 (confirmed via live device): blank preview, everything else works

Reported by the user testing on their phone via LAN (`http://<LAN-IP>:5173/`,
`pnpm dev --host`). Compile, option changes, and PDF download all worked
correctly; only the on-page preview stayed blank, with no visible error.

- **Browser**: IronFox (a privacy-hardened Firefox-for-Android fork),
  `rv:143.0`/Gecko 143. Confirmed working on standard Android Chrome.
- No remote-debugging option was available in IronFox's settings, and no
  canvas-permission control existed either (both were checked and ruled out
  before this investigation). Root cause was found instead via a temporary
  on-screen diagnostic overlay added to `web/src/main.ts` (see "Diagnostic
  overlay" below), since `update()` had no `catch` around the compile step
  and the render-queue `catch` only logged to `console.error` — invisible
  without devtools.
- **Captured error** (via the overlay, on-device):
  ```
  TypeError: this[#methodPromises].getOrInsertComputed is not a function
  #cacheSimpleMethod@.../pdfjs-dist.js:13797:31
  getOptionalContentConfig@.../pdfjs-dist.js:14195:33
  render@.../pdfjs-dist.js:13344:52
  renderPreview@src/preview.ts:42:17
  ```

### Root cause

`pdfjs-dist@6.4.299` calls `Map.prototype.getOrInsertComputed` internally (17
call sites in the main bundle, 16 more in the worker bundle) — a method from
the TC39 "Map upsert" proposal. Chrome already ships it; Firefox/Gecko (and
therefore IronFox) doesn't yet as of Firefox 143. The call throws a
`TypeError`, which `renderPreview`'s rejection is swallowed into a
`console.error` with no on-screen trace — so the preview just silently never
draws, while everything that doesn't touch the canvas (compile, download,
option validation) keeps working normally.

### Fix

Polyfill `Map.prototype.getOrInsertComputed` (feature-detected, a no-op once
the browser ships the real one) in **both** realms that need it:

- `web/src/map-upsert-polyfill.ts` — the shared polyfill function.
- `web/src/preview.ts` — installs it on the main thread before `pdfjs-dist` is
  used.
- `web/src/pdf-worker-entry.ts` — a wrapper around PDF.js's own worker script.
  `pdfjs.GlobalWorkerOptions.workerSrc` now points here instead of directly at
  `pdf.worker.mjs`, since the polyfill also needs to exist inside the
  worker's own separate global realm (a Worker doesn't inherit the main
  thread's `Map.prototype`). The wrapper installs the polyfill, then
  **dynamically** `import()`s the real `pdf.worker.mjs` — a *static* import
  would evaluate the dependency's top-level code before the importer's own
  statements regardless of source order, which would run the real worker
  code before the polyfill was in place.
- `vite.config.ts` — added `worker: { format: 'es' }`. Vite's default worker
  build output is IIFE, which can't contain the wrapper's top-level
  `await import(...)`; this needed the worker bundler's own ES-module output
  format, reached via the `?worker&url` import suffix in `preview.ts` (a
  plain `?url` on a `.ts` source file does **not** bundle it — it just
  base64-inlines the literal TypeScript text as a `data:` URL, which silently
  breaks at runtime the moment the browser actually tries to execute it as a
  module).

## Symptom 2 (not reproduced today, pre-existing known risk): WASM compile abort on mobile

See prior memory [[mobile-wasm-compile-abort]]: on a real Android phone,
`typst_ts_web_compiler_bg.wasm` (28MB uncompressed) can fail to load with
`WebAssembly compilation aborted: Network error: Response body loading was
aborted`, stuck on "compiling" forever with no visible error. That memory's
own suggested next step was: try a non-streaming (buffer-then-compile)
instantiate instead of `WebAssembly.instantiateStreaming`.

### Fix

`web/src/typst-init.ts`: `getModule()` now fetches the WASM module itself and
resolves to the buffered `ArrayBuffer`, instead of handing `typst.ts` a bare
URL. A URL return value makes the generated wasm-bindgen glue
(`typst_ts_web_compiler.mjs`) route through `fetch(url)` →
`WebAssembly.instantiateStreaming(response, imports)` — the exact path whose
body-read abort produces the error above. An `ArrayBuffer` return value
instead takes the glue's plain `WebAssembly.instantiate(bytes, imports)`
branch, decoupling the network fetch from compilation.

**Caveat**: not verified against a real flaky mobile connection — if the
network itself aborts the download outright (not just the streaming-compile
path specifically), `response.arrayBuffer()` could still throw, just with a
different error. This at least would confirm whether it's a genuine network
issue rather than something `instantiateStreaming`-specific.

## Diagnostic overlay (kept on this branch only — must not reach `main`)

`web/src/main.ts` had a temporary on-screen `<pre>` overlay added during this
investigation (`debugLog(...)`, a `window.onerror`/`unhandledrejection`
listener, and inline calls around the compile/render steps) — this is how
Symptom 1's error was actually captured on-device, since IronFox has no
working remote-debugging path and `console.error` alone is invisible without
devtools. It's being kept, committed as its own separate commit on this
branch, specifically so it doesn't have to be rebuilt from scratch next time
a mobile-only bug needs on-device diagnosis. It is **not** part of what gets
merged to `main` — see the commit log on this branch for the exact commit to
cherry-pick back out when needed again.

## Verification

- `pnpm build` — clean, no errors.
- `pnpm test` — 32/32 unit tests pass.
- Headless Chromium smoke tests (via `.claude/skills/run-project` and a
  one-off mobile-viewport-emulated Playwright script) against both `pnpm dev`
  and the production `dist/` build (`vite preview`) — preview canvas renders
  correctly in both, no console errors beyond a pre-existing unrelated
  favicon 404.
- **Symptom 1 confirmed fixed live**, on the user's actual IronFox/Android
  device, via the diagnostic overlay:
  ```
  compile ok {"pages":1,"bytes":9715}
  render start {"previewW":382,"previewH":141,...}
  render ok {"canvas":true}
  ```
- Symptom 2's fix is unverified on a real flaky mobile connection (see
  caveat above) — no device reproduction was available this session.

## Files changed

- `web/src/typst-init.ts` — buffered WASM instantiate (Symptom 2).
- `web/src/map-upsert-polyfill.ts` (new) — shared `Map.prototype` polyfill.
- `web/src/pdf-worker-entry.ts` (new) — PDF.js worker wrapper that installs
  the polyfill before the real worker code runs.
- `web/src/preview.ts` — installs the polyfill on the main thread; points
  `workerSrc` at the new wrapper.
- `vite.config.ts` — `worker: { format: 'es' }`.
- `web/src/main.ts` — temporary diagnostic overlay (separate commit, not for
  `main`).
