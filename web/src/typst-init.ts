/// <reference types="vite/client" />
// Browser only: point typst.ts at its WebAssembly module as a bundled asset. Node tests skip this file.
import { $typst } from '@myriaddreamin/typst.ts';
import compilerWasmUrl from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';

// Buffer the module fully before compiling instead of handing typst.ts a URL: a URL routes
// into WebAssembly.instantiateStreaming, which some mobile browsers abort mid-download of this
// ~28MB module (memory: mobile-wasm-compile-abort). Fetching the bytes ourselves keeps the
// compile on the plain WebAssembly.instantiate(buffer) path instead.
$typst.setCompilerInitOptions({
  getModule: async () => {
    const response = await fetch(compilerWasmUrl);
    if (!response.ok) throw new Error(`Failed to fetch Typst compiler module: ${response.status}`);
    return response.arrayBuffer();
  },
});
