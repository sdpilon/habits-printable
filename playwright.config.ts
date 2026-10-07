import { createServer, type AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

async function freePort(): Promise<number> {
  return new Promise((ok, fail) => {
    const server = createServer();
    server.once('error', fail);
    server.listen(0, 'localhost', () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => ok(port));
    });
  });
}

// Set once in the main process. Worker processes inherit these values, so every process agrees on the
// run's port, output folders, and build folder.
process.env.E2E_RUN_ID ??= `${Date.now()}-${process.pid}`;
process.env.E2E_PORT ??= String(await freePort());

const runId = process.env.E2E_RUN_ID;
const port = Number(process.env.E2E_PORT);
// Each run builds into its own folder under dist/, so two runs cannot overwrite each other's build.
const buildDir = resolve('dist', `e2e-${runId}`);

export default defineConfig({
  testDir: 'tests/e2e',
  // Each run writes to its own folders, so two runs on one machine cannot read each other's files.
  outputDir: `test-results/${runId}`,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Removes this run's build folder once the run ends, so folders don't pile up under dist/.
  globalTeardown: './tests/e2e/support/global-teardown.ts',
  reporter: [
    ['list'],
    ['html', { outputFolder: `playwright-report/${runId}`, open: 'never' }],
  ],
  use: {
    baseURL: `http://localhost:${port}`,
    acceptDownloads: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // CI uses the Chrome preinstalled on the runner; locally the bundled Chromium is already cached.
    ...(process.env.CI ? { channel: 'chrome' } : {}),
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // Always build and start a fresh server. A server left running from an older build must never be tested.
    // build-page.mjs prints a clear message when the build fails.
    command: `node tests/e2e/support/build-page.mjs "${buildDir}" && node node_modules/vite/bin/vite.js preview --outDir "${buildDir}" --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
