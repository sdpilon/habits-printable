import { expect, test } from '@playwright/test';
import {
  isDownloadEnabled,
  openPage,
  readPreviewCounts,
  resetDefaults,
  setOption,
  typeOption,
  waitForSettled,
} from './support/page.ts';

// Phone-sized viewport for every test in this file (research.md §4). Stepper/slider clicks use
// Playwright's normal `.click()`: the implementation reacts to `click`/`input`/`change`, not
// touch-specific events, so a dedicated touch-enabled browser context isn't needed to exercise it.
const PHONE_VIEWPORT = { width: 390, height: 844 };

test.describe('US1: integer steppers', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE_VIEWPORT);
    await openPage(page);
    await resetDefaults(page);
    await waitForSettled(page);
  });

  test('tapping + on Habits increments the value and redraws the preview', async ({ page }) => {
    // Habits 6 at the default 31 days overflows and blocks download (known gotcha, not a bug
    // here) — drop Days first so this test only exercises the stepper, not the overflow path.
    await setOption(page, 'days', '14');
    await waitForSettled(page);
    const before = await readPreviewCounts(page);
    expect(before.habits).toBe('5');

    await page.locator('[data-stepper="habits"][data-direction="increase"]').click();
    await waitForSettled(page);

    await expect(page.locator('#options [name="habits"]')).toHaveValue('6');
    expect((await readPreviewCounts(page)).habits).toBe('6');
    expect(await isDownloadEnabled(page)).toBe(true);
  });

  test('decreasing Habits to its minimum disables the decrease button', async ({ page }) => {
    const decrease = page.locator('[data-stepper="habits"][data-direction="decrease"]');
    for (let i = 0; i < 4; i++) {
      await decrease.click();
      await waitForSettled(page);
    }
    await expect(page.locator('#options [name="habits"]')).toHaveValue('1');
    await expect(decrease).toBeDisabled();
  });

  test('increasing Habits to its maximum disables the increase button', async ({ page }) => {
    await setOption(page, 'habits', '20');
    await waitForSettled(page);
    const increase = page.locator('[data-stepper="habits"][data-direction="increase"]');
    await expect(increase).toBeDisabled();
  });

  test('decreasing Days to its minimum disables the decrease button', async ({ page }) => {
    await setOption(page, 'days', '1');
    await waitForSettled(page);
    const decrease = page.locator('[data-stepper="days"][data-direction="decrease"]');
    await expect(decrease).toBeDisabled();
  });

  test('increasing Dots per row to its maximum disables the increase button', async ({ page }) => {
    await setOption(page, 'perRow', '31');
    await waitForSettled(page);
    const increase = page.locator('[data-stepper="perRow"][data-direction="increase"]');
    await expect(increase).toBeDisabled();
  });

  test('stepping from an empty Days field goes to the limit in the tapped direction', async ({
    page,
  }) => {
    await typeOption(page, 'days', '');
    await page.locator('[data-stepper="days"][data-direction="increase"]').click();
    await expect(page.locator('#options [name="days"]')).toHaveValue('1');

    await typeOption(page, 'days', '');
    await page.locator('[data-stepper="days"][data-direction="decrease"]').click();
    await expect(page.locator('#options [name="days"]')).toHaveValue('365');
  });

  test('each stepper button has an accessible name and a 44×44 tap target', async ({ page }) => {
    for (const [field, label] of [
      ['habits', 'habits'],
      ['days', 'days'],
      ['perRow', 'dots per row'],
    ] as const) {
      const increase = page.getByRole('button', { name: `Increase ${label}`, exact: true });
      const decrease = page.getByRole('button', { name: `Decrease ${label}`, exact: true });
      await expect(increase).toHaveAttribute('data-stepper', field);
      await expect(decrease).toHaveAttribute('data-stepper', field);
      for (const button of [increase, decrease]) {
        const box = await button.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('native spinners are hidden on all five numeric fields', async ({ page }) => {
    for (const field of ['habits', 'days', 'perRow', 'dotDiameterMm', 'dotSpacingMm']) {
      const appearance = await page
        .locator(`#options [name="${field}"]`)
        .evaluate((el) => getComputedStyle(el).appearance || (el as HTMLElement).style.appearance);
      expect(appearance).toBe('none');
    }
  });
});

test.describe('US2: mm sliders', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE_VIEWPORT);
    await openPage(page);
    await resetDefaults(page);
    await waitForSettled(page);
  });

  // Driven via keyboard (Home/End/Arrow keys), not a mouse drag: a focused <input type="range">
  // fires the same `input`/`change` events for both, so this exercises the real sync code while
  // staying reliable in a headless run.
  test('dragging Dot diameter to each end sets the field, readout, and preview', async ({
    page,
  }) => {
    // 5mm dots at the default day count overflow the page (same class of gotcha as the habits/days
    // case above) — drop Days first so this test only exercises the slider, not the overflow path.
    await setOption(page, 'days', '14');
    await waitForSettled(page);
    const slider = page.locator('[data-slider-for="dotDiameterMm"]');
    await slider.focus();
    await slider.press('End');
    await waitForSettled(page);
    await expect(page.locator('#options [name="dotDiameterMm"]')).toHaveValue('5');
    await expect(page.locator('output[data-readout-for="dotDiameterMm"]')).toHaveText('5');
    expect(await isDownloadEnabled(page)).toBe(true);

    await slider.press('Home');
    await waitForSettled(page);
    await expect(page.locator('#options [name="dotDiameterMm"]')).toHaveValue('2');
    await expect(page.locator('output[data-readout-for="dotDiameterMm"]')).toHaveText('2');
  });

  test('dragging Dot spacing to its left end sets 0.5', async ({ page }) => {
    const slider = page.locator('[data-slider-for="dotSpacingMm"]');
    await slider.focus();
    await slider.press('Home');
    await waitForSettled(page);
    await expect(page.locator('#options [name="dotSpacingMm"]')).toHaveValue('0.5');
    await expect(page.locator('output[data-readout-for="dotSpacingMm"]')).toHaveText('0.5');
  });

  test('typing 3.7 into Dot diameter moves the slider and readout to 3.7, with no rounding', async ({
    page,
  }) => {
    await typeOption(page, 'dotDiameterMm', '3.7');
    await waitForSettled(page);
    await expect(page.locator('[data-slider-for="dotDiameterMm"]')).toHaveValue('3.7');
    await expect(page.locator('output[data-readout-for="dotDiameterMm"]')).toHaveText('3.7');
  });

  test('exactly one element carries each slider field name', async ({ page }) => {
    await expect(page.locator('#options [name="dotDiameterMm"]')).toHaveCount(1);
    await expect(page.locator('#options [name="dotSpacingMm"]')).toHaveCount(1);
  });

  test('each slider has an accessible name identifying its field', async ({ page }) => {
    await expect(page.getByRole('slider', { name: 'Dot diameter (mm)' })).toHaveAttribute(
      'data-slider-for',
      'dotDiameterMm',
    );
    await expect(page.getByRole('slider', { name: 'Dot spacing (mm)' })).toHaveAttribute(
      'data-slider-for',
      'dotSpacingMm',
    );
  });

  test('releasing a slider at its current value triggers no recompile', async ({ page }) => {
    const slider = page.locator('[data-slider-for="dotDiameterMm"]');
    await slider.focus();
    // ArrowRight then ArrowLeft returns to the starting value (4), so the final `change` is a
    // no-op: aria-busy should already be back to "false" immediately, not pending.
    await slider.press('ArrowRight');
    await slider.press('ArrowLeft');
    await expect(page.locator('#preview-section')).toHaveAttribute('aria-busy', 'false');
  });

  test('every reachable value lands on a 0.1 mm increment', async ({ page }) => {
    const slider = page.locator('[data-slider-for="dotSpacingMm"]');
    await slider.focus();
    for (let i = 0; i < 5; i++) await slider.press('ArrowRight');
    const value = await page.locator('#options [name="dotSpacingMm"]').inputValue();
    expect(Number((Number(value) * 10).toFixed(0)) / 10).toBeCloseTo(Number(value), 10);
  });
});

test.describe('US3: typing still works', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE_VIEWPORT);
    await openPage(page);
    await resetDefaults(page);
    await waitForSettled(page);
  });

  test('typing 12 into Days updates the preview', async ({ page }) => {
    await typeOption(page, 'days', '12');
    await waitForSettled(page);
    expect((await readPreviewCounts(page)).days).toBe('12');
    expect(await isDownloadEnabled(page)).toBe(true);
  });

  test('typing 0 into Habits shows an error and blocks download', async ({ page }) => {
    await typeOption(page, 'habits', '0');
    await waitForSettled(page);
    await expect(page.locator('#messages li')).toHaveCount(1);
    await expect(page.locator('input[name="habits"][aria-invalid="true"]')).toHaveCount(1);
    expect(await isDownloadEnabled(page)).toBe(false);
  });

  test('typing 9 into Dot spacing shows an error and pins the slider to its maximum', async ({
    page,
  }) => {
    await typeOption(page, 'dotSpacingMm', '9');
    await waitForSettled(page);
    await expect(page.locator('#messages li')).toHaveCount(1);
    await expect(page.locator('[data-slider-for="dotSpacingMm"]')).toHaveValue('5');
    await expect(page.locator('output[data-readout-for="dotSpacingMm"]')).toHaveText('9');
    expect(await isDownloadEnabled(page)).toBe(false);
  });
});
