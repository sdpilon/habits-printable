// On-screen diagnostic overlay for on-device mobile debugging — useful any time a mobile-only bug needs
// on-device diagnosis without working remote-debugging access (how the IronFox crash in
// specs/005-mobile-preview-crashes was actually found). Gated on import.meta.env.DEV so `pnpm build`'s
// production output never contains it: Vite replaces that with a literal `false` for production builds,
// so esbuild dead-code-eliminates every branch below — it's not just inactive, it's absent from the bundle.
//
// pointer-events:none so the overlay can never intercept clicks on the page underneath it — without this,
// it silently broke the e2e download test (#download sits partly behind the overlay's bottom strip) when
// this was still unconditionally active in dev (and would have again, had it reached prod unguarded).
let debugOverlay: HTMLPreElement | null = null;
if (import.meta.env.DEV) {
  debugOverlay = document.createElement('pre');
  debugOverlay.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;max-height:40vh;overflow:auto;margin:0;pointer-events:none;' +
    'padding:4px;background:#000;color:#0f0;font-size:10px;line-height:1.3;white-space:pre-wrap;z-index:99999;';
  document.body.appendChild(debugOverlay);
}

export function debugLog(...parts: unknown[]): void {
  if (!debugOverlay) return;
  const line = parts
    .map((p) => (p instanceof Error ? `${p.name}: ${p.message}\n${p.stack}` : typeof p === 'object' ? JSON.stringify(p) : String(p)))
    .join(' ');
  debugOverlay.textContent += `[${new Date().toISOString().slice(11, 23)}] ${line}\n`;
}

if (import.meta.env.DEV) {
  window.addEventListener('error', (e) => debugLog('window error:', e.message, e.error));
  window.addEventListener('unhandledrejection', (e) => debugLog('unhandledrejection:', e.reason));
  debugLog('boot', { ua: navigator.userAgent, dpr: window.devicePixelRatio, innerW: window.innerWidth, innerH: window.innerHeight });
}
