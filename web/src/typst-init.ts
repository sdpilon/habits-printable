/// <reference types="vite/client" />
// Browser only: point typst.ts at its WebAssembly module as a bundled asset. Node tests skip this file.
import { $typst } from '@myriaddreamin/typst.ts';
import compilerWasmUrl from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';

$typst.setCompilerInitOptions({ getModule: () => compilerWasmUrl });
