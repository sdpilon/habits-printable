// Draws the downloaded PDF into the preview with PDF.js, so the preview shows the exact file.
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Renders page 1 (the whole grid when it fits). Overflowing layouts also show page 1 with the warning.
export async function renderPreview(container: HTMLElement, pdf: Uint8Array): Promise<void> {
  const task = pdfjs.getDocument({ data: pdf.slice() });
  const doc = await task.promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const width = Math.max(1, container.clientWidth);
    const scale = (width / base.width) * window.devicePixelRatio;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${(width * base.height) / base.width}px`;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is unavailable.');

    await page.render({ canvasContext: context, viewport, canvas }).promise;
    container.replaceChildren(canvas);
  } finally {
    await task.destroy();
  }
}
