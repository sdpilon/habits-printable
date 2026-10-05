// Checks the planning fit model (data-model.md) against Typst's page count (T011) for every case.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toTypstInputs, type TrackerOptions } from '../../web/src/options.ts';
import { predictFits } from './fit-model.ts';

const root = process.cwd();
const cases = JSON.parse(readFileSync(join(root, 'tests/comparison/cases.json'), 'utf8')) as {
  cases: { name: string; options: TrackerOptions }[];
};

// Page count from the Typst CLI: one SVG file per page.
function typstPageCount(options: TrackerOptions): number {
  const out = mkdtempSync(join(tmpdir(), 'fit-'));
  const args = ['compile', '--root', root];
  for (const [key, value] of Object.entries(toTypstInputs(options))) args.push('--input', `${key}=${value}`);
  args.push(join(root, 'typst/tracker.typ'), join(out, 'page-{p}.svg'));
  execFileSync('typst', args, { stdio: 'pipe' });
  return readdirSync(out).length;
}

describe('fit model', () => {
  it.each(cases.cases.map((c) => [c.name, c.options] as const))('%s agrees with the page count', (_name, options) => {
    const pages = typstPageCount(options);
    expect(predictFits(options)).toBe(pages === 1);
  });
});
