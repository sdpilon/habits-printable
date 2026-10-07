import { expect, test, type Page } from '@playwright/test';
import {
  isDownloadEnabled,
  openPage,
  readCanvasHash,
  readPreviewCounts,
  resetDefaults,
  setOption,
  typeOption,
  waitForSettled,
  type OptionName,
} from './support/page.ts';

// One test per option, so a broken option fails only its own scenario (FR-004, US2 AC1).
// Paper is not listed: the form offers only letter. Each value is chosen so the layout still fits one page:
// habits 6 and dots per row 5 overflow at the default days, which leaves page 1 unchanged.
const changes: {
  option: OptionName;
  value: string;
  counts?: { habits: string; days: string };
}[] = [
  { option: 'habits', value: '4', counts: { habits: '4', days: '31' } },
  { option: 'days', value: '14', counts: { habits: '5', days: '14' } },
  { option: 'perRow', value: '10' },
  { option: 'dotDiameterMm', value: '3' },
  { option: 'dotSpacingMm', value: '2' },
  { option: 'layout', value: 'columns' },
];

test.describe('US2: preview and input', () => {
  for (const change of changes) {
    test(`preview updates when ${change.option} changes`, async ({ page }) => {
      await test.step('open page with defaults and wait for preview', async () => {
        await openPage(page);
        await resetDefaults(page);
        await waitForSettled(page);
      });
      const before = await readCanvasHash(page);

      await test.step(`change ${change.option} to ${change.value}`, async () => {
        await setOption(page, change.option, change.value);
        await waitForSettled(page);
      });

      await test.step('check preview changed and download stays enabled', async () => {
        expect(await readCanvasHash(page)).not.toBe(before);
        if (change.counts) expect(await readPreviewCounts(page)).toEqual(change.counts);
        expect(await isDownloadEnabled(page)).toBe(true);
      });
    });
  }
});

test.describe('US2: invalid habit count', () => {
  // Each kind is its own test, so every kind runs even if another fails (FR-013).
  const invalid: { kind: string; enter: (page: Page) => Promise<void> }[] = [
    { kind: 'empty', enter: (page) => setOption(page, 'habits', '') },
    { kind: 'zero', enter: (page) => setOption(page, 'habits', '0') },
    { kind: 'negative', enter: (page) => setOption(page, 'habits', '-1') },
    // Chromium drops letters from a number input, so the browser flags the value as bad input (badInput).
    // Typing 'e' is accepted, so '1e' produces that state. Confirm with the probe in T014 before relying on it.
    { kind: 'non-numeric', enter: (page) => typeOption(page, 'habits', '1e') },
    { kind: 'above maximum', enter: (page) => setOption(page, 'habits', '21') },
  ];

  for (const { kind, enter } of invalid) {
    test(`invalid habit count (${kind}) shows a message and blocks download`, async ({ page }) => {
      await test.step('open page with defaults', async () => {
        await openPage(page);
        await resetDefaults(page);
        await waitForSettled(page);
      });

      await test.step(`enter ${kind} habit count`, async () => {
        await enter(page);
      });

      await test.step('check message, flag, and blocked download', async () => {
        await expect(page.locator('#messages li').first()).toBeVisible();
        await expect(page.locator('input[name="habits"][aria-invalid="true"]')).toHaveCount(1);
        await expect(page.locator('#download')).toBeDisabled();
        // The non-numeric kind must reach the page as bad input, not as a number the page could misread.
        if (kind === 'non-numeric') {
          expect(await page.locator('input[name="habits"]').evaluate((el) => (el as HTMLInputElement).validity.badInput)).toBe(true);
        }
      });
    });
  }

  test('a valid value after an invalid one clears the message and restores download', async ({ page }) => {
    await test.step('open page and enter an empty habit count', async () => {
      await openPage(page);
      await resetDefaults(page);
      await waitForSettled(page);
      await setOption(page, 'habits', '');
      await expect(page.locator('#download')).toBeDisabled();
    });

    await test.step('enter 5 and wait for preview', async () => {
      await setOption(page, 'habits', '5');
      await waitForSettled(page);
    });

    await test.step('check message cleared and download enabled', async () => {
      await expect(page.locator('#messages li')).toHaveCount(0);
      await expect(page.locator('input[name="habits"][aria-invalid="true"]')).toHaveCount(0);
      await expect(page.locator('#download')).toBeEnabled();
    });
  });
});
