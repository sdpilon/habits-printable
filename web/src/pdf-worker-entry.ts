// The PDF.js worker's own entry point, in place of pointing workerSrc straight at pdf.worker.mjs: the
// dynamic import (not static) ensures installMapUpsertPolyfill() runs in this worker's realm before any of
// pdf.worker.mjs's top-level code does — a static import would evaluate pdf.worker.mjs first regardless of
// source order, since ES module dependencies evaluate before the importing module's own statements.
import { installMapUpsertPolyfill } from './map-upsert-polyfill.ts';

installMapUpsertPolyfill();

await import('pdfjs-dist/build/pdf.worker.mjs');
