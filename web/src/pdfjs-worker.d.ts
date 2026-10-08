// pdfjs-dist doesn't ship a declaration for this deep subpath; pdf-worker-entry.ts dynamically imports
// it directly (not through a `?url`-typed Vite import), so TS needs an ambient module declaration.
declare module 'pdfjs-dist/build/pdf.worker.mjs';
