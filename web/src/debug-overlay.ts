// On-screen diagnostic overlay for on-device mobile debugging — useful any time a mobile-only bug needs
// on-device diagnosis without working remote-debugging access (how the IronFox crash in
// specs/005-mobile-preview-crashes was actually found).
//
// Two layers keep this off by default:
// - import.meta.env.DEV: Vite replaces this with a literal `false` for production builds, so esbuild
//   dead-code-eliminates every branch below in `pnpm build` output — it's not just inactive there, it's
//   absent from the bundle, regardless of the runtime flag below.
// - The `debug` URL param: even under `pnpm dev`, the overlay should only show up when actively debugging,
//   not on every normal dev-server load. Visit `?debug` (e.g. `http://<host>:5173/?debug`) to turn it on
//   for that page load.
const enabled = import.meta.env.DEV && new URLSearchParams(location.search).has('debug');

// pointer-events:none so the overlay can never intercept clicks on the page underneath it — without this,
// it silently broke the e2e download test (#download sits partly behind the overlay's bottom strip) when
// this was still unconditionally active in dev.
let debugOverlay: HTMLPreElement | null = null;
if (enabled) {
  debugOverlay = document.createElement('pre');
  debugOverlay.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;max-height:40vh;overflow:auto;margin:0;pointer-events:none;' +
    'padding:4px;background:#000;color:#0f0;font-size:10px;line-height:1.3;white-space:pre-wrap;z-index:99999;';
  document.body.appendChild(debugOverlay);
}

export function debugLog(...parts: unknown[]): void {
  if (!debugOverlay) return;
  const line = parts
    .map((p) =>
      p instanceof Error
        ? `${p.name}: ${p.message}\n${p.stack}`
        : typeof p === 'object'
          ? JSON.stringify(p)
          : String(p),
    )
    .join(' ');
  debugOverlay.textContent += `[${new Date().toISOString().slice(11, 23)}] ${line}\n`;
}

if (enabled) {
  window.addEventListener('error', (e) => debugLog('window error:', e.message, e.error));
  window.addEventListener('unhandledrejection', (e) => debugLog('unhandledrejection:', e.reason));
  debugLog('boot', {
    ua: navigator.userAgent,
    dpr: window.devicePixelRatio,
    innerW: window.innerWidth,
    innerH: window.innerHeight,
  });
}
