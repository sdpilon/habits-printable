// Checks the planning fit model (data-model.md) against the page count from the same engine the page uses (T011).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileSource } from '../../web/src/typst-compile.ts';
import type { TrackerOptions } from '../../web/src/options.ts';
import { predictFits } from './fit-model.ts';

const root = process.cwd();
const source = readFileSync(join(root, 'typst/tracker.typ'), 'utf8');
const cases = JSON.parse(readFileSync(join(root, 'tests/comparison/cases.json'), 'utf8')) as {
  cases: { name: string; options: TrackerOptions }[];
};

describe('fit model', () => {
  it.each(cases.cases.map((c) => [c.name, c.options] as const))(
    '%s agrees with the page count',
    async (_name, options) => {
      const { pageCount } = await compileSource(source, options);
      expect(predictFits(options)).toBe(pageCount === 1);
    },
    30_000,
  );
});
