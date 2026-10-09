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
  **dynamically** `import()`s the real `pdf.worker.mjs` — a _static_ import
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

**Verified without a real device**: `tests/e2e/wasm-load-resilience.spec.ts`
intercepts the WASM request and fulfills it with a truncated body (original
`Content-Length` kept, so the browser detects the body ended early — the
same shape of failure as a connection dropping mid-download). Confirmed this
test fails against the pre-fix code with a real
`WebAssembly.instantiateStreaming(): section ... extends past end of the
module` error, and passes against the fix. This proves the fix does what it
claims — a genuinely interrupted download no longer reaches
`instantiateStreaming` at all — without needing to force a real flaky mobile
connection.

**Caveat that remains**: the original bug's exact trigger (resource
exhaustion/throttling after repeated loads in one tab/session, per
[[mobile-wasm-compile-abort]]) is still unconfirmed and wasn't
independently reproduced this session — only the _mechanism_ (what happens
when the download is interrupted) is now verified, not the _root cause_ of
why mobile browsers interrupted it in the first place.

## Diagnostic overlay (kept permanently, `web/src/debug-overlay.ts`)

An on-screen `<pre>` overlay (`debugLog(...)`, a
`window.onerror`/`unhandledrejection` listener, and inline calls around the
compile/render steps in `main.ts`) was added during this investigation — this
is how Symptom 1's error was actually captured on-device, since IronFox has
no working remote-debugging path and `console.error` alone is invisible
without devtools.

It's kept as a standing tool rather than thrown away or branch-isolated,
guarded by two independent layers:

- `import.meta.env.DEV`: Vite replaces this with a literal `false` in
  production builds, so `pnpm build`'s output contains zero trace of it
  (confirmed: grepped the built bundle for the overlay's marker strings
  after building — no matches), regardless of the runtime flag below.
- A `?debug` URL param, checked at runtime: even under `pnpm dev`, the
  overlay should only show up when actively debugging, not on every normal
  dev-server page load. Visit `http://<host>:5173/?debug` to turn it on for
  that load; the bare URL stays overlay-free.

It's safe in `main`, opt-in under `pnpm dev`, and needs no cherry-picking to
reuse next time a mobile-only bug needs on-device diagnosis.

## Verification

For hand-run checks (including ones reused from 001/002's quickstarts where
still valid), see [`quickstart.md`](quickstart.md).

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
- **Symptom 2's fix mechanism verified** via `tests/e2e/wasm-load-resilience.spec.ts`
  (confirmed to fail against the pre-fix code, pass against the fix — see
  caveat above for what this does and doesn't prove). `pnpm e2e` — 23/23
  e2e tests pass, including this one.

## Files changed

- `web/src/typst-init.ts` — buffered WASM instantiate (Symptom 2).
- `web/src/map-upsert-polyfill.ts` (new) — shared `Map.prototype` polyfill.
- `web/src/pdf-worker-entry.ts` (new) — PDF.js worker wrapper that installs
  the polyfill before the real worker code runs.
- `web/src/preview.ts` — installs the polyfill on the main thread; points
  `workerSrc` at the new wrapper.
- `vite.config.ts` — `worker: { format: 'es' }`.
- `web/src/debug-overlay.ts` (new) — the `DEV` + `?debug`-gated diagnostic
  overlay.
- `web/src/main.ts` — wires in the overlay's `debugLog(...)` calls.
- `web/src/pdfjs-worker.d.ts` (new) — ambient module declaration CI's
  `tsc --noEmit` needed for `pdf-worker-entry.ts`'s dynamic import.
- `tests/e2e/wasm-load-resilience.spec.ts` (new) — verifies Symptom 2's fix
  mechanism (see Verification above).
