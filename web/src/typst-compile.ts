// Compiles a Typst source with the options as inputs, to a preview (SVG) and a PDF.
// Has no build-time imports, so Node scripts and tests can use it with any source string.
import { $typst } from '@myriaddreamin/typst.ts';
import { toTypstInputs, type TrackerOptions } from './options.ts';

export interface Compiled {
  svg: string;
  pdf: Uint8Array;
  pageCount: number;
  // More than one page means the grid does not fit (FR-013); download is then blocked.
  overflowing: boolean;
}

export async function compileSource(source: string, options: TrackerOptions): Promise<Compiled> {
  const inputs = toTypstInputs(options);
  const [svg, pdf] = await Promise.all([
    $typst.svg({ mainContent: source, inputs }),
    $typst.pdf({ mainContent: source, inputs }),
  ]);
  if (!pdf) throw new Error('Typst did not return a PDF for the current options.');
  const pageCount = countPdfPages(pdf);
  return { svg, pdf, pageCount, overflowing: pageCount > 1 };
}

// Counts page objects (/Type /Page), not the /Pages tree node.
export function countPdfPages(pdf: Uint8Array): number {
  const text = new TextDecoder('latin1').decode(pdf);
  return (text.match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
}
