import { expect, test } from '@playwright/test';

// Symptom 2 (specs/005-mobile-preview-crashes/bug-report.md): on a real Android phone, the Typst WASM
// compiler module (~28MB) could fail to load with `WebAssembly compilation aborted: Network error:
// Response body loading was aborted` — the browser's streaming WebAssembly.instantiateStreaming aborting
// mid-download. The fix (web/src/typst-init.ts) buffers the module via fetch()+arrayBuffer() first instead
// of handing typst.ts a bare URL, which never reaches instantiateStreaming at all.
//
// The original failure was tied to intermittent mobile-network/resource conditions that can't be forced to
// order here, so this doesn't prove the old bug can never recur. What it does prove: given a download that
// genuinely never arrives intact (simulated below via a truncated response with its original Content-Length
// header kept, so the browser detects the body ended early), the failure is a plain network/fetch error —
// never the old instantiateStreaming-specific error, since that code path is no longer reachable at all.
test.describe('Symptom 2: WASM load resilience', () => {
  test('an interrupted WASM download fails as a network error, never as instantiateStreaming', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    let intercepted = false;
    await page.route('**/*.wasm', async (route) => {
      intercepted = true;
      const response = await route.fetch();
      const body = await response.body();
      // Keep the original headers (including Content-Length for the full size) but deliver only half the
      // bytes, so the browser's own network stack detects the body ended early — the same shape of failure
      // as a connection that drops mid-download, without depending on real flaky hardware.
      await route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: body.subarray(0, Math.floor(body.length / 2)),
      });
    });

    await page.goto('/');
    // No successful compile is possible with a truncated module; just give the failure time to surface
    // instead of waiting on a success signal that will never come.
    await page.waitForTimeout(5_000);

    expect(
      intercepted,
      'the WASM request was not intercepted — test is not exercising the real path',
    ).toBe(true);

    const allMessages = [...consoleErrors, ...pageErrors].join('\n');
    expect(allMessages).not.toMatch(/instantiateStreaming/i);
    expect(allMessages).not.toMatch(/WebAssembly compilation aborted/i);

    // The page must not have silently produced a working preview from a module that never fully arrived.
    await expect(page.locator('#preview canvas')).toHaveCount(0);
  });
});
