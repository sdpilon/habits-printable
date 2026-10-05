// Preview-vs-PDF comparison (Principle II) and the printable-margin check (Principle III).
// Compiles with the same typst.ts engine as the page. The SVG stands in for the on-screen preview,
// and the PDF is the download.
// Needs: pdftoppm (poppler), rsvg-convert (librsvg), magick (ImageMagick). See Brewfile.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileSource } from '../../web/src/typst-compile.ts';
import type { TrackerOptions } from '../../web/src/options.ts';

const root = process.cwd();
const DPI = 300;
const MARGIN_PX = Math.round((10 / 25.4) * DPI);

interface Case {
  name: string;
  options: TrackerOptions;
}

const { cases } = JSON.parse(readFileSync(join(root, 'tests/comparison/cases.json'), 'utf8')) as { cases: Case[] };
const source = readFileSync(join(root, 'typst/tracker.typ'), 'utf8');

function run(cmd: string, args: string[]): string {
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  return `${result.stdout}${result.stderr}`;
}

// Pixels that differ between two PNGs. Zero means identical.
function differingPixels(a: string, b: string, diff: string): number {
  const out = run('magick', ['compare', '-metric', 'AE', a, b, diff]).trim();
  const count = Number(out.split(/\s+/)[0]);
  if (Number.isNaN(count)) throw new Error(`magick compare failed: ${out}`);
  return count;
}

// Bounding box of the printed content, from ImageMagick's trim. Must sit inside the 10 mm margin.
function insideMargin(png: string): { ok: boolean; box: string } {
  const [width, height] = run('magick', ['identify', '-format', '%w %h', png]).trim().split(' ').map(Number);
  const box = run('magick', [png, '-fuzz', '10%', '-trim', '-format', '%@', 'info:']).trim();
  const match = box.match(/^(\d+)x(\d+)\+(\d+)\+(\d+)$/);
  if (!match) return { ok: false, box: 'no content' };
  const [, w, h, x, y] = match.map(Number);
  const ok = x >= MARGIN_PX && y >= MARGIN_PX && x + w <= width - MARGIN_PX && y + h <= height - MARGIN_PX;
  return { ok, box };
}

const work = mkdtempSync(join(tmpdir(), 'compare-'));
let failures = 0;

for (const testCase of cases) {
  const dir = join(work, testCase.name);
  mkdirSync(dir, { recursive: true });

  const compiled = await compileSource(source, testCase.options);
  if (compiled.overflowing) {
    console.log(`${testCase.name}: skipped (overflow, ${compiled.pageCount} pages; download is blocked)`);
    continue;
  }

  writeFileSync(join(dir, 'preview.svg'), compiled.svg);
  writeFileSync(join(dir, 'doc.pdf'), compiled.pdf);
  run('pdftoppm', ['-r', String(DPI), '-png', '-singlefile', join(dir, 'doc.pdf'), join(dir, 'pdf')]);
  run('rsvg-convert', ['-d', String(DPI), '-p', String(DPI), '-o', join(dir, 'svg.png'), join(dir, 'preview.svg')]);

  const diff = differingPixels(join(dir, 'pdf.png'), join(dir, 'svg.png'), join(dir, 'diff.png'));
  const margin = insideMargin(join(dir, 'pdf.png'));
  const passed = diff === 0 && margin.ok;
  if (!passed) failures++;
  console.log(`${testCase.name}: ${passed ? 'PASS' : 'FAIL'} (differing pixels: ${diff}, content box: ${margin.box})`);
}

console.log(failures === 0 ? 'All compared cases passed.' : `${failures} case(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
