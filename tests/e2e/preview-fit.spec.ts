import { expect, test } from '@playwright/test';
import {
  openPage,
  readCanvasAspectRatio,
  readWindowFits,
  resetDefaults,
  setOption,
  waitForSettled,
} from './support/page.ts';

// US Letter in points (page.getViewport({ scale: 1 })'s width/height) — the ratio stays this value,
// since this feature never changes the exported PDF's own page size.
const LETTER_RATIO = 612 / 792;

test.describe('US1: preview always fits the viewport without distortion', () => {
  test('default load shows the full page with no window scroll and the correct ratio', async ({
    page,
  }) => {
    await test.step('open page with defaults', async () => {
      await openPage(page);
      await resetDefaults(page);
      await waitForSettled(page);
    });

    await test.step('check no window scroll and correct ratio', async () => {
      expect(await readWindowFits(page)).toBe(true);
      expect(await readCanvasAspectRatio(page)).toBeCloseTo(LETTER_RATIO, 2);
    });
  });

  test('re-fits with no window scroll after an option change', async ({ page }) => {
    await test.step('open page with defaults', async () => {
      await openPage(page);
      await resetDefaults(page);
      await waitForSettled(page);
    });

    await test.step('change habits', async () => {
      await setOption(page, 'habits', '8');
      await waitForSettled(page);
    });

    await test.step('check no window scroll and correct ratio', async () => {
      expect(await readWindowFits(page)).toBe(true);
      expect(await readCanvasAspectRatio(page)).toBeCloseTo(LETTER_RATIO, 2);
    });
  });

  test('re-fits with no window scroll after the browser window is resized', async ({ page }) => {
    await test.step('open page with defaults', async () => {
      await openPage(page);
      await resetDefaults(page);
      await waitForSettled(page);
    });

    const before = await page.locator('#preview canvas').boundingBox();

    await test.step('resize the viewport and wait for the canvas to actually change size', async () => {
      await page.setViewportSize({ width: 1000, height: 600 });
      // The resize's own re-fit runs in a ResizeObserver callback, async relative to setViewportSize,
      // so waitForSettled() alone can race it (aria-busy may already read "false" from before the
      // callback even fires). Poll the canvas's own box instead, which only changes once the re-fit
      // the resize triggered has actually run.
      await expect
        .poll(async () => page.locator('#preview canvas').boundingBox())
        .not.toEqual(before);
      await waitForSettled(page);
    });

    await test.step('check no window scroll and correct ratio', async () => {
      expect(await readWindowFits(page)).toBe(true);
      expect(await readCanvasAspectRatio(page)).toBeCloseTo(LETTER_RATIO, 2);
    });
  });
});

test.describe('US1: narrow-viewport breakpoint (FR-005)', () => {
  test('fits with no window scroll below the 720px breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await openPage(page);
    await resetDefaults(page);
    await waitForSettled(page);

    expect(await readWindowFits(page)).toBe(true);
    expect(await readCanvasAspectRatio(page)).toBeCloseTo(LETTER_RATIO, 2);
  });
});
