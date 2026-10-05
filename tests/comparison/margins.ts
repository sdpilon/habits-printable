// Printable-margin check (Principle III) on the PDF the page downloads. The preview draws that same
// PDF, so one check covers both. Each fitting case is rasterized at 300 dpi with Ghostscript (through
// ImageMagick), and the printed content must sit inside the 10 mm margin on every side.
// Needs: magick (ImageMagick 7) and gs (Ghostscript). Runs in the dev container (see README).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileSource } from '../../web/src/typst-compile.ts';
import type { TrackerOptions } from '../../web/src/options.ts';

const DPI = 300;
const MARGIN_PX = Math.round((10 / 25.4) * DPI);
const root = process.cwd();

interface Case {
  name: string;
  options: TrackerOptions;
}

const { cases } = JSON.parse(readFileSync(join(root, 'tests/comparison/cases.json'), 'utf8')) as { cases: Case[] };
const source = readFileSync(join(root, 'typst/tracker.typ'), 'utf8');

function magick(args: string[]): string {
  const result = spawnSync('magick', args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`magick ${args.join(' ')} failed (exit ${result.status}): ${result.stderr}`);
  return result.stdout.trim();
}

// Bounding box of printed content (non-white), checked against the margin on each side.
function insideMargin(png: string): { ok: boolean; box: string } {
  const [width, height] = magick(['identify', '-format', '%w %h', png]).split(' ').map(Number);
  const box = magick([png, '-background', 'white', '-alpha', 'remove', '-fuzz', '10%', '-format', '%@', 'info:']);
  const match = box.match(/^(\d+)x(\d+)\+(\d+)\+(\d+)$/);
  if (!match) return { ok: false, box: 'no content' };
  const [, w, h, x, y] = match.map(Number);
  const ok = x >= MARGIN_PX && y >= MARGIN_PX && x + w <= width - MARGIN_PX && y + h <= height - MARGIN_PX;
  return { ok, box };
}

const work = mkdtempSync(join(tmpdir(), 'margins-'));
let failures = 0;

for (const testCase of cases) {
  const dir = join(work, testCase.name);
  mkdirSync(dir, { recursive: true });

  const compiled = await compileSource(source, testCase.options);
  if (compiled.overflowing) {
    console.log(`${testCase.name}: skipped (overflow, ${compiled.pageCount} pages; download is blocked)`);
    continue;
  }

  const pdfPath = join(dir, 'doc.pdf');
  const pngPath = join(dir, 'page.png');
  writeFileSync(pdfPath, compiled.pdf);
  magick(['-density', String(DPI), `${pdfPath}[0]`, '-background', 'white', '-alpha', 'remove', '-flatten',
    '-colorspace', 'sRGB', '-depth', '8', pngPath]);

  const margin = insideMargin(pngPath);
  if (!margin.ok) failures++;
  console.log(`${testCase.name}: ${margin.ok ? 'PASS' : 'FAIL'} (content box: ${margin.box}, margin ${MARGIN_PX}px)`);
}

console.log(failures === 0 ? 'All margin checks passed.' : `${failures} case(s) outside the margin.`);
process.exit(failures === 0 ? 0 : 1);
