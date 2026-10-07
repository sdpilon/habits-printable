import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

// Removes this run's build folder (dist/e2e-<runId>). Each run builds into its own folder (see playwright.config.ts).
export default function globalTeardown(): void {
  rmSync(resolve('dist', `e2e-${process.env.E2E_RUN_ID}`), { recursive: true, force: true });
}
