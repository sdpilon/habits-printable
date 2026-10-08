import { expect, test } from '@playwright/test';
import {
  openPage,
  readCanvasAspectRatio,
  readWindowFits,
  resetDefaults,
  setFitMode,
  setOption,
  waitForSettled,
} from './support/page.ts';

// US Letter in points (page.getViewport({ scale: 1 })'s width/height) — the ratio stays this value
// regardless of fit mode, since this feature never changes the exported PDF's own page size.
const LETTER_RATIO = 612 / 792;

test.describe('US1: default fit-page mode never requires a window scroll', () => {
  test('default load shows the full page with no window scroll and the correct ratio', async ({ page }) => {
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

test.describe('US2: choose how the page fits the preview', () => {
  test('fit-height fills the available height exactly with no window scroll', async ({ page }) => {
    await openPage(page);
    await resetDefaults(page);
    await waitForSettled(page);

    await setFitMode(page, 'height');

    const canvas = await page.locator('#preview canvas').boundingBox();
    const container = await page.locator('#preview').boundingBox();
    expect(Math.abs(canvas!.height - container!.height)).toBeLessThan(1);
    expect(await readWindowFits(page)).toBe(true);
  });

  test('fit-width fills the available width exactly with no window scroll', async ({ page }) => {
    await openPage(page);
    await resetDefaults(page);
    await waitForSettled(page);

    await setFitMode(page, 'width');

    const canvas = await page.locator('#preview canvas').boundingBox();
    const container = await page.locator('#preview').boundingBox();
    expect(Math.abs(canvas!.width - container!.width)).toBeLessThan(1);
    expect(await readWindowFits(page)).toBe(true);
  });

  test('selected mode persists across an option change', async ({ page }) => {
    await openPage(page);
    await resetDefaults(page);
    await waitForSettled(page);
    await setFitMode(page, 'height');

    await setOption(page, 'habits', '8');
    await waitForSettled(page);

    expect(await page.locator('select[name="fitMode"]').inputValue()).toBe('height');
    expect(await readWindowFits(page)).toBe(true);
  });

  test('selected mode persists across a window resize', async ({ page }) => {
    await openPage(page);
    await resetDefaults(page);
    await waitForSettled(page);
    await setFitMode(page, 'height');

    const before = await page.locator('#preview canvas').boundingBox();
    await page.setViewportSize({ width: 1000, height: 600 });
    // Same race as US1's resize test: wait for the canvas to actually change before asserting.
    await expect
      .poll(async () => page.locator('#preview canvas').boundingBox())
      .not.toEqual(before);
    await waitForSettled(page);

    expect(await page.locator('select[name="fitMode"]').inputValue()).toBe('height');
    expect(await readWindowFits(page)).toBe(true);
  });

  test('switching fit mode updates the preview in under 1 second (SC-006)', async ({ page }) => {
    await openPage(page);
    await resetDefaults(page);
    await waitForSettled(page);

    const start = Date.now();
    await setFitMode(page, 'height');
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

test.describe('US1/US2: narrow-viewport breakpoint (FR-011)', () => {
  test('all three fit modes work with no window scroll below the 720px breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await openPage(page);
    await resetDefaults(page);
    await waitForSettled(page);

    for (const mode of ['page', 'height', 'width'] as const) {
      await test.step(`fit-${mode}`, async () => {
        await setFitMode(page, mode);
        expect(await readWindowFits(page)).toBe(true);
        expect(await readCanvasAspectRatio(page)).toBeCloseTo(LETTER_RATIO, 2);
      });
    }
  });
});
