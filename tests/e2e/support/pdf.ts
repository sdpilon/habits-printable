import { readFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import { countPdfPages } from '../../../web/src/typst-compile.ts';

// US Letter in PDF points (1 pt = 1/72 in).
export const US_LETTER = { width: 612, height: 792 };

export async function readFirstPageSize(path: string): Promise<{ width: number; height: number }> {
  const text = (await readFile(path)).toString('latin1');
  const match = text.match(/\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/);
  if (!match) throw new Error(`No /MediaBox found in ${path}`);
  const [x0, y0, x1, y1] = match.slice(1).map(Number);
  return { width: x1 - x0, height: y1 - y0 };
}

export async function expectOnePageUsLetter(path: string): Promise<void> {
  const pdf = new Uint8Array(await readFile(path));
  expect(countPdfPages(pdf), 'page count').toBe(1);
  expect(await readFirstPageSize(path), 'first page size (points)').toEqual(US_LETTER);
}
