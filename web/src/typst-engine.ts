/// <reference types="vite/client" />
// The page's compile entry point: the single Typst template, imported as raw text.
import trackerSource from '../../typst/tracker.typ?raw';
import { compileSource, type Compiled } from './typst-compile.ts';
import type { TrackerOptions } from './options.ts';

export type { Compiled };

export function compileTracker(options: TrackerOptions): Promise<Compiled> {
  return compileSource(trackerSource, options);
}
