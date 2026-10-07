import { createHash } from 'node:crypto';
import { expect, type Page } from '@playwright/test';

// The quickstart.md defaults. Paper is fixed to letter: the form offers no other size.
export const DEFAULTS = {
  layout: 'rows',
  habits: '5',
  days: '31',
  perRow: '7',
  dotDiameterMm: '4',
  dotSpacingMm: '1.5',
  paper: 'letter',
} as const;

export type OptionName = keyof typeof DEFAULTS;

const SELECTS: ReadonlySet<OptionName> = new Set(['layout', 'paper']);

// Waits for the first preview to be drawn. Startup loads the compiler, so this uses a longer limit than
// the 5-second settle rule, which applies to option changes only.
export async function openPage(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('#preview canvas').first().waitFor({ timeout: 30_000 });
}

export async function resetDefaults(page: Page): Promise<void> {
  for (const name of Object.keys(DEFAULTS) as OptionName[]) {
    await setOption(page, name, DEFAULTS[name]);
  }
}

export async function setOption(page: Page, name: OptionName, value: string): Promise<void> {
  const control = page.locator(`#options [name="${name}"]`);
  if (SELECTS.has(name)) {
    await control.selectOption(value);
  } else {
    await control.fill(value);
  }
}

// Types the text one key at a time, so the browser's own number-input filtering applies.
export async function typeOption(page: Page, name: OptionName, text: string): Promise<void> {
  const control = page.locator(`#options [name="${name}"]`);
  await control.fill('');
  await control.pressSequentially(text);
}

// Fails with a timeout error if the preview has not settled within 5 seconds (clarified 2026-10-06).
export async function waitForSettled(page: Page): Promise<void> {
  await expect(page.locator('#preview-section')).toHaveAttribute('aria-busy', 'false', { timeout: 5_000 });
}

export async function readMessages(page: Page): Promise<string[]> {
  return page.locator('#messages li').allTextContents();
}

export async function isDownloadEnabled(page: Page): Promise<boolean> {
  return page.locator('#download').isEnabled();
}

export async function isWarningVisible(page: Page): Promise<boolean> {
  return page.locator('#warning').isVisible();
}

export async function readPreviewCounts(page: Page): Promise<{ habits: string | null; days: string | null }> {
  return page.locator('#preview-section').evaluate((section) => ({
    habits: (section as HTMLElement).dataset.habits ?? null,
    days: (section as HTMLElement).dataset.days ?? null,
  }));
}

// Hash of the preview canvas pixels. Used only to confirm that a change happened, never to detect settling.
export async function readCanvasHash(page: Page): Promise<string> {
  const canvas = page.locator('#preview canvas').first();
  await canvas.waitFor();
  const dataUrl = await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL('image/png'));
  return createHash('sha256').update(dataUrl).digest('hex');
}
