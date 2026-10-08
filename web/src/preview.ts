// Draws the downloaded PDF into the preview with PDF.js, so the preview shows the exact file.
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { computePreviewScale, type FitMode } from './preview-fit.ts';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Renders page 1 (the whole grid when it fits). Overflowing layouts also show page 1 with the warning.
// `container` is measured directly (not passed as a size) so the scale always matches its current,
// live box — the caller (main.ts) only needs to know *when* to re-render, via ResizeObserver.
export async function renderPreview(container: HTMLElement, pdf: Uint8Array, mode: FitMode): Promise<void> {
  const task = pdfjs.getDocument({ data: pdf.slice() });
  const doc = await task.promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const available = {
      width: Math.max(1, container.clientWidth),
      height: Math.max(1, container.clientHeight),
    };
    const { displayWidth, displayHeight } = computePreviewScale(
      { width: base.width, height: base.height },
      available,
      mode,
    );
    const dpr = window.devicePixelRatio;
    const viewport = page.getViewport({ scale: (displayWidth / base.width) * dpr });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    // Both style dimensions are set before the canvas is attached below, so the preview never shows
    // an intermediate unfit/distorted frame (spec Edge Cases).
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is unavailable.');

    await page.render({ canvasContext: context, viewport, canvas }).promise;
    container.replaceChildren(canvas);
  } finally {
    await task.destroy();
  }
}
