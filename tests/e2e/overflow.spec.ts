import { expect, test, type Page } from '@playwright/test';
import { openPage, readPreviewCounts, resetDefaults, setOption, waitForSettled } from './support/page.ts';

// The warning shows and download is blocked, but the overflowing layout is still drawn (main.ts render path).
async function expectOverflowBlocked(page: Page): Promise<void> {
  await expect(page.locator('#warning')).toBeVisible();
  await expect(page.locator('#download')).toBeDisabled();
}

test.describe('US3: overflow blocking', () => {
  test('rows overflow shows the warning and blocks download', async ({ page }) => {
    await test.step('open page with defaults', async () => {
      await openPage(page);
      await resetDefaults(page);
      await waitForSettled(page);
    });

    await test.step('set habits 20, days 365, per row 1', async () => {
      await setOption(page, 'habits', '20');
      await setOption(page, 'days', '365');
      await setOption(page, 'perRow', '1');
      await waitForSettled(page);
    });

    await test.step('check warning, blocked download, and drawn counts', async () => {
      await expectOverflowBlocked(page);
      expect(await readPreviewCounts(page)).toEqual({ habits: '20', days: '365' });
    });
  });

  test('columns overflow shows the warning and blocks download', async ({ page }) => {
    await test.step('open page with defaults', async () => {
      await openPage(page);
      await resetDefaults(page);
      await waitForSettled(page);
    });

    await test.step('set layout columns and days 365', async () => {
      await setOption(page, 'layout', 'columns');
      await setOption(page, 'days', '365');
      await waitForSettled(page);
    });

    await test.step('check warning, blocked download, and drawn counts', async () => {
      await expectOverflowBlocked(page);
      // Habits stays at the default 5. Whether the drawn columns sit side by side (US3 AC2) is not asserted here.
      expect(await readPreviewCounts(page)).toEqual({ habits: '5', days: '365' });
    });
  });

  test('calendars overflow shows the warning and blocks download', async ({ page }) => {
    await test.step('open page with defaults', async () => {
      await openPage(page);
      await resetDefaults(page);
      await waitForSettled(page);
    });

    await test.step('set layout calendars, habits 20, days 365, per row 1', async () => {
      await setOption(page, 'layout', 'calendars');
      await setOption(page, 'habits', '20');
      await setOption(page, 'days', '365');
      await setOption(page, 'perRow', '1');
      await waitForSettled(page);
    });

    await test.step('check warning, blocked download, and drawn counts', async () => {
      await expectOverflowBlocked(page);
      expect(await readPreviewCounts(page)).toEqual({ habits: '20', days: '365' });
    });
  });

  test('reducing habits until the tracker fits clears the warning', async ({ page }) => {
    await test.step('open page and set 20 habits (overflows at the default days)', async () => {
      await openPage(page);
      await resetDefaults(page);
      await waitForSettled(page);
      await setOption(page, 'habits', '20');
      await waitForSettled(page);
      await expectOverflowBlocked(page);
    });

    await test.step('set habits 5 and wait for preview', async () => {
      await setOption(page, 'habits', '5');
      await waitForSettled(page);
    });

    await test.step('check warning cleared and download enabled', async () => {
      await expect(page.locator('#warning')).toBeHidden();
      await expect(page.locator('#download')).toBeEnabled();
      expect(await readPreviewCounts(page)).toEqual({ habits: '5', days: '31' });
    });
  });
});
