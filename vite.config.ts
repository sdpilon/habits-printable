import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  // The Typst template lives outside web/ and is imported as raw text.
  server: { fs: { allow: ['..'] } },
  build: { outDir: '../dist', emptyOutDir: true },
  // pdf-worker-entry.ts uses a top-level `await import(...)`, which needs ES module worker output
  // (Vite's default worker format is IIFE, which can't contain a static import/top-level await).
  worker: { format: 'es' },
});
