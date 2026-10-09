// Printable-margin check (Principle III) on the PDF the page downloads. The preview draws that same
// PDF, so one check covers both. Each fitting case is rasterized at 300 dpi with PDF.js onto a Skia
// canvas (@napi-rs/canvas), and the printed content must sit inside the 10 mm margin on every side.
// Runs with `pnpm margins` on Node 24; no native tools are needed.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { compileSource } from '../../web/src/typst-compile.ts';
import type { TrackerOptions } from '../../web/src/options.ts';

const DPI = 300;
const MARGIN_PX = Math.round((10 / 25.4) * DPI);
const INK_THRESHOLD = 255 - 0.1 * 255; // a channel darker than this counts as printed (10% fuzz, as before)
const root = process.cwd();

interface Case {
  name: string;
  options: TrackerOptions;
}

const { cases } = JSON.parse(readFileSync(join(root, 'tests/comparison/cases.json'), 'utf8')) as {
  cases: Case[];
};
const source = readFileSync(join(root, 'typst/tracker.typ'), 'utf8');

class CanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }
  reset(cc: { canvas: ReturnType<typeof createCanvas> }, width: number, height: number) {
    cc.canvas.width = width;
    cc.canvas.height = height;
  }
  destroy(cc: { canvas: ReturnType<typeof createCanvas> | null; context: unknown }) {
    if (cc.canvas) {
      cc.canvas.width = 0;
      cc.canvas.height = 0;
    }
    cc.canvas = null;
    cc.context = null;
  }
}

async function rasterize(
  pdf: Uint8Array,
): Promise<{ width: number; height: number; rgba: Uint8ClampedArray }> {
  const doc = await pdfjs.getDocument({
    data: pdf.slice(),
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
  }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: DPI / 72 });
  const canvasFactory = new CanvasFactory();
  const cc = canvasFactory.create(Math.round(viewport.width), Math.round(viewport.height));
  await page.render({
    canvasContext: cc.context as never,
    viewport,
    canvasFactory: canvasFactory as never,
  }).promise;
  const { width, height } = cc.canvas;
  return { width, height, rgba: cc.context.getImageData(0, 0, width, height).data };
}

// Bounding box of printed content, checked against the margin on each side.
function insideMargin(page: { width: number; height: number; rgba: Uint8ClampedArray }): {
  ok: boolean;
  box: string;
} {
  const { width, height, rgba } = page;
  let minX = Infinity,
    minY = Infinity,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (rgba[i] < INK_THRESHOLD || rgba[i + 1] < INK_THRESHOLD || rgba[i + 2] < INK_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { ok: false, box: 'no content' };
  const box = `${maxX - minX + 1}x${maxY - minY + 1}+${minX}+${minY}`;
  const ok =
    minX >= MARGIN_PX && minY >= MARGIN_PX && maxX < width - MARGIN_PX && maxY < height - MARGIN_PX;
  return { ok, box };
}

let failures = 0;

for (const testCase of cases) {
  const compiled = await compileSource(source, testCase.options);
  if (compiled.overflowing) {
    console.log(
      `${testCase.name}: skipped (overflow, ${compiled.pageCount} pages; download is blocked)`,
    );
    continue;
  }

  const margin = insideMargin(await rasterize(compiled.pdf));
  if (!margin.ok) failures++;
  console.log(
    `${testCase.name}: ${margin.ok ? 'PASS' : 'FAIL'} (content box: ${margin.box}, margin ${MARGIN_PX}px)`,
  );
}

console.log(
  failures === 0 ? 'All margin checks passed.' : `${failures} case(s) outside the margin.`,
);
process.exit(failures === 0 ? 0 : 1);
