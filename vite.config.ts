import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  // Relative so the same build works unmodified at the origin root (vite preview, e2e)
  // and under a subpath (the GitHub Pages project page).
  base: './',
  // The Typst template lives outside web/ and is imported as raw text.
  server: { fs: { allow: ['..'] } },
  build: { outDir: '../dist', emptyOutDir: true },
  // pdf-worker-entry.ts uses a top-level `await import(...)`, which needs ES module worker output
  // (Vite's default worker format is IIFE, which can't contain a static import/top-level await).
  worker: { format: 'es' },
});
