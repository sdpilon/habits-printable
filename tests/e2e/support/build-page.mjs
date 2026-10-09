// Builds the production page for the e2e suite into the folder given as the first argument.
// When the build fails, the message says the page could not be reached, so the cause is clear
// before Playwright's generic webServer error.
import { spawnSync } from 'node:child_process';

const outDir = process.argv[2];
const build = spawnSync(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'build', '--outDir', outDir],
  {
    stdio: 'inherit',
  },
);

if (build.status !== 0) {
  console.error(
    'The page could not be built, so the page could not be reached. Fix the build error above, then run `pnpm e2e` again.',
  );
  process.exit(build.status ?? 1);
}
