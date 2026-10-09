import { expect, test } from '@playwright/test';
import { expectOnePageUsLetter } from './support/pdf.ts';
import {
  isDownloadEnabled,
  openPage,
  readPreviewCounts,
  resetDefaults,
  setOption,
  waitForSettled,
} from './support/page.ts';

test.describe('US1: download path', () => {
  test('defaults download a one-page US Letter PDF', async ({ page }) => {
    await test.step('open page with defaults and wait for preview', async () => {
      await openPage(page);
      await resetDefaults(page);
      await waitForSettled(page);
    });

    // Without a download event this step fails with a timeout, so a missing file never passes (FR-008).
    const download = await test.step('download', async () => {
      const started = page.waitForEvent('download', { timeout: 10_000 });
      await page.click('#download');
      return started;
    });

    expect(download.suggestedFilename()).toBe('habit-grid.pdf');
    // Saved into this run's own output folder, so the check reads only the file from this run (FR-003).
    const copy = test.info().outputPath('habit-grid.pdf');
    await download.saveAs(copy);

    await test.step('check PDF', async () => {
      await expectOnePageUsLetter(copy);
    });
  });

  test('non-default counts and layout are drawn', async ({ page }) => {
    await test.step('open page with defaults', async () => {
      await openPage(page);
      await resetDefaults(page);
      await waitForSettled(page);
    });

    await test.step('set habits 6, days 14, layout columns', async () => {
      await setOption(page, 'habits', '6');
      await setOption(page, 'days', '14');
      await setOption(page, 'layout', 'columns');
      await waitForSettled(page);
    });

    await test.step('check drawn counts', async () => {
      expect(await readPreviewCounts(page)).toEqual({ habits: '6', days: '14' });
      await expect(page.locator('select[name="layout"]')).toHaveValue('columns');
      expect(await isDownloadEnabled(page)).toBe(true);
    });
  });
});
