// Temporary on-screen diagnostic overlay for on-device mobile debugging (specs/005-mobile-preview-crashes).
// Kept on this branch only — must not reach main (see bug-report.md "Diagnostic overlay"). Imported for its
// side effect (installs the overlay + global error listeners); `debugLog` is what callers use directly.
//
// pointer-events:none so the overlay can never intercept clicks on the page underneath it — without this,
// it silently broke the e2e download test (#download sits partly behind the overlay's bottom strip).
const debugOverlay = document.createElement('pre');
debugOverlay.style.cssText =
  'position:fixed;bottom:0;left:0;right:0;max-height:40vh;overflow:auto;margin:0;pointer-events:none;' +
  'padding:4px;background:#000;color:#0f0;font-size:10px;line-height:1.3;white-space:pre-wrap;z-index:99999;';
document.body.appendChild(debugOverlay);

export function debugLog(...parts: unknown[]): void {
  const line = parts
    .map((p) => (p instanceof Error ? `${p.name}: ${p.message}\n${p.stack}` : typeof p === 'object' ? JSON.stringify(p) : String(p)))
    .join(' ');
  debugOverlay.textContent += `[${new Date().toISOString().slice(11, 23)}] ${line}\n`;
}

window.addEventListener('error', (e) => debugLog('window error:', e.message, e.error));
window.addEventListener('unhandledrejection', (e) => debugLog('unhandledrejection:', e.reason));
debugLog('boot', { ua: navigator.userAgent, dpr: window.devicePixelRatio, innerW: window.innerWidth, innerH: window.innerHeight });
