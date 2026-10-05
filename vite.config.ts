import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  // The Typst template lives outside web/ and is imported as raw text.
  server: { fs: { allow: ['..'] } },
  build: { outDir: '../dist', emptyOutDir: true },
});
