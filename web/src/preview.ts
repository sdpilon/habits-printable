// Draws the downloaded PDF into the preview with PDF.js, so the preview shows the exact file.
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { computePreviewScale } from './preview-fit.ts';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PreviewDocument {
  page: pdfjs.PDFPageProxy;
  base: { width: number; height: number };
  destroy(): Promise<void>;
}

// Loads page 1 once per compiled PDF. The returned handle is reused across every re-fit (resize) so a
// pure scale change never re-parses the document through the PDF.js worker again — recreating a document
// per re-fit raced the worker on slow mobile connections (getOptionalContentConfig crash when several
// loads overlapped during the initial layout-settling window).
export async function loadPreviewDocument(pdf: Uint8Array): Promise<PreviewDocument> {
  const task = pdfjs.getDocument({ data: pdf.slice() });
  const doc = await task.promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  return {
    page,
    base: { width: viewport.width, height: viewport.height },
    destroy: () => task.destroy(),
  };
}

// Renders page 1 (the whole grid when it fits). Overflowing layouts also show page 1 with the warning.
export async function renderPreview(doc: PreviewDocument, container: HTMLElement): Promise<void> {
  const available = {
    width: Math.max(1, container.clientWidth),
    height: Math.max(1, container.clientHeight),
  };
  const { displayWidth, displayHeight } = computePreviewScale(doc.base, available);
  const dpr = window.devicePixelRatio;
  const viewport = doc.page.getViewport({ scale: (displayWidth / doc.base.width) * dpr });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  // Both style dimensions are set before the canvas is attached below, so the preview never shows
  // an intermediate unfit/distorted frame (spec Edge Cases).
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');

  await doc.page.render({ canvasContext: context, viewport, canvas }).promise;
  container.replaceChildren(canvas);
}
