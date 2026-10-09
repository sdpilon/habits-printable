// REPL driver for habits-grid (Vite + vanilla TS web app).
// Run with: node .claude/skills/run-project/driver.mjs
// Wrap in tmux for interactive use (see SKILL.md). Commands arrive one
// per line on stdin; each prints its result and the prompt returns.
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '../../..'); // repo root
const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/habits-grid-shots';

const PORT = process.env.PORT || '5173';
const BASE_URL = `http://localhost:${PORT}/`;

// pnpm doesn't hoist playwright-core (it's a transitive dep of
// @playwright/test), so resolve it inside .pnpm by prefix instead of
// hardcoding the version.
function resolvePlaywrightCore() {
  const pnpmDir = path.join(ROOT, 'node_modules/.pnpm');
  const entry = fs.readdirSync(pnpmDir).find((d) => d.startsWith('playwright-core@'));
  if (!entry)
    throw new Error('playwright-core not found under node_modules/.pnpm - run `pnpm install`');
  return path.join(pnpmDir, entry, 'node_modules/playwright-core/index.js');
}

// Relative path from a Playwright chromium-<rev>/ dir to its binary, per
// platform. Only the darwin-arm64 entry is verified (this session ran on
// Apple Silicon macOS); the rest follow Playwright's documented cache
// layout but have not been exercised here - see SKILL.md's
// "Machine-specific notes" section.
const CHROMIUM_BINARY_BY_PLATFORM = {
  'darwin-arm64':
    'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  'darwin-x64': 'chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  'linux-x64': 'chrome-linux/chrome',
  'linux-arm64': 'chrome-linux/chrome',
};

function cacheRoots() {
  const home = process.env.HOME;
  if (process.platform === 'darwin') return [path.join(home, 'Library/Caches/ms-playwright')];
  if (process.platform === 'linux') return [path.join(home, '.cache/ms-playwright')];
  return [];
}

// playwright-core pins an exact Chromium revision in its own browsers.json
// (e.g. revision "1243" for 1.63.0 == Chrome for Testing 153.0.8010.12).
// A cached chromium-<rev>/ dir for a different revision came from some
// other project's Playwright version on this machine - it may well launch
// fine, but it's not the build this project's Playwright was tested
// against, so it's not an equivalent, interchangeable choice.
function expectedChromiumRevision(playwrightCoreIndexPath) {
  const pkgRoot = path.dirname(playwrightCoreIndexPath);
  const browsersJsonPath = path.join(pkgRoot, 'browsers.json');
  if (!fs.existsSync(browsersJsonPath)) return null;
  const { browsers } = JSON.parse(fs.readFileSync(browsersJsonPath, 'utf8'));
  return browsers.find((b) => b.name === 'chromium')?.revision ?? null;
}

function findAllCachedChromium(expectedRevision) {
  const key = `${process.platform}-${process.arch}`;
  const binarySuffix = CHROMIUM_BINARY_BY_PLATFORM[key];
  if (!binarySuffix) return [];
  const found = [];
  for (const cacheRoot of cacheRoots()) {
    if (!fs.existsSync(cacheRoot)) continue;
    for (const entry of fs.readdirSync(cacheRoot)) {
      const match = entry.match(/^chromium-(\d+)$/);
      if (!match) continue;
      const candidate = path.join(cacheRoot, entry, binarySuffix);
      if (fs.existsSync(candidate)) {
        found.push({ path: candidate, revision: match[1], matches: match[1] === expectedRevision });
      }
    }
  }
  return found;
}

// Which Chromium binary to launch is confirmed once (see `launch` below)
// and remembered as a symlink, machine-local - gitignored, not carried
// across machines on purpose (see .gitignore). A symlink rather than a
// path written to a text file: fs.existsSync follows symlinks, so a
// dangling link (the target got removed/moved) already reads as "not
// confirmed" for free, no separate staleness check needed.
const CHROMIUM_LINK = path.join(ROOT, '.claude/skills/run-project/.chromium-bin');

function readConfirmedChromium() {
  return fs.existsSync(CHROMIUM_LINK) ? fs.realpathSync(CHROMIUM_LINK) : null;
}

function saveConfirmedChromium(execPath) {
  fs.rmSync(CHROMIUM_LINK, { force: true });
  fs.symlinkSync(execPath, CHROMIUM_LINK);
}

let browser = null;
let page = null;
let devServer = null; // { proc, port }
const pageErrors = [];

function attachErrorCapture(p) {
  pageErrors.length = 0;
  p.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });
  p.on('pageerror', (err) => pageErrors.push(String(err)));
}

const COMMANDS = {
  async 'server-start'() {
    if (devServer) return console.log('dev server already running (pid', devServer.proc.pid, ')');
    // stdio ignored throughout: readiness is checked by polling the URL
    // below, not by parsing output, and nothing else reads these streams -
    // piping them unread risks the child blocking once the OS pipe buffer
    // fills.
    const proc = spawn('pnpm', ['dev', '--port', PORT, '--strictPort'], {
      cwd: ROOT,
      stdio: 'ignore',
      detached: true,
    });
    devServer = { proc };
    let ready = false;
    const deadline = Date.now() + 20_000;
    while (!ready && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 300));
      try {
        const res = await fetch(BASE_URL);
        if (res.ok) ready = true;
      } catch {}
    }
    console.log(ready ? `dev server up at ${BASE_URL}` : 'TIMEOUT waiting for dev server');
  },

  async 'server-stop'() {
    if (!devServer) return console.log('no dev server tracked here');
    try {
      process.kill(-devServer.proc.pid, 'SIGTERM'); // kill the process group (vite forks)
    } catch (e) {
      console.log('kill failed:', e.message);
    }
    devServer = null;
    console.log('dev server stopped');
  },

  // launch [execPath] - launches the given binary and remembers it as the
  // confirmed choice. With no argument, uses the previously-confirmed
  // binary if one is saved; otherwise this is a first run on this machine,
  // so it only reports what it found and asks for confirmation rather than
  // picking one on its own - see SKILL.md's "Run (agent path)" section.
  async launch(execPath) {
    if (browser) return console.log('already launched');
    const playwrightCorePath = resolvePlaywrightCore();
    const chosenPath = execPath || readConfirmedChromium();
    if (!chosenPath) {
      const expectedRevision = expectedChromiumRevision(playwrightCorePath);
      const candidates = findAllCachedChromium(expectedRevision);
      if (candidates.length === 0) {
        console.log('No cached Chromium binary found on this machine.');
        console.log('Ask the user whether to run `playwright install chromium` to fetch one.');
        return;
      }
      const describe = (c) =>
        `  ${c.path}  (revision ${c.revision}${c.matches ? ", matches this project's pinned Playwright" : ", from some other project's Playwright install"})`;
      if (candidates.length === 1) {
        console.log('Found one cached Chromium binary:');
        console.log(describe(candidates[0]));
        console.log(`Ask the user to confirm using it, then run: launch ${candidates[0].path}`);
        console.log(
          '(no quotes - this REPL takes the rest of the line as-is, paths with spaces included)',
        );
        return;
      }
      console.log(`Found ${candidates.length} cached Chromium binaries:`);
      candidates.forEach((c) => {
        console.log(describe(c));
      });
      const matching = candidates.filter((c) => c.matches);
      if (matching.length === 1) {
        console.log(
          `Recommended: the one at revision ${matching[0].revision} - it's the exact build this`,
        );
        console.log(
          "project's pinned Playwright version expects; the other(s) are from unrelated projects.",
        );
      }
      console.log('Ask the user which one to use, then run: launch <path> (no quotes, see above)');
      return;
    }
    const { chromium } = (await import(playwrightCorePath)).default; // CJS: dynamic import() exposes it under .default
    browser = await chromium.launch({ executablePath: chosenPath, headless: true });
    page = await (await browser.newContext()).newPage();
    attachErrorCapture(page);
    if (execPath) saveConfirmedChromium(chosenPath); // confirmed explicitly just now - remember it
    console.log('launched. Chromium:', chosenPath);
  },

  async goto(p) {
    if (!page) return console.log('ERROR: launch first');
    await page.goto(new URL(p || '/', BASE_URL).toString());
    console.log('goto ->', page.url());
  },

  async ss(name) {
    if (!page) return console.log('ERROR: launch first');
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    const f = path.join(SHOT_DIR, `${name || `ss-${Date.now()}`}.png`);
    await page.screenshot({ path: f });
    console.log('screenshot:', f);
  },

  async fill(args) {
    if (!page) return console.log('ERROR: launch first');
    const sp = args.indexOf(' ');
    const sel = args.slice(0, sp);
    const value = args.slice(sp + 1);
    await page.fill(sel, '');
    await page.fill(sel, value);
    console.log('fill', sel, '->', JSON.stringify(value));
  },

  async click(sel) {
    if (!page) return console.log('ERROR: launch first');
    await page.click(sel);
    console.log('click', sel);
  },

  async select(args) {
    if (!page) return console.log('ERROR: launch first');
    const [sel, value] = args.split(/\s+/);
    await page.selectOption(sel, value);
    console.log('select', sel, '->', value);
  },

  async wait(sel) {
    if (!page) return console.log('ERROR: launch first');
    try {
      await page.waitForSelector(sel, { timeout: 10_000 });
      console.log('found:', sel);
    } catch {
      console.log('TIMEOUT:', sel);
    }
  },

  async 'wait-settled'() {
    if (!page) return console.log('ERROR: launch first');
    try {
      await page.waitForSelector('#preview-section[aria-busy="false"]', { timeout: 10_000 });
      console.log('settled');
    } catch {
      console.log('TIMEOUT waiting for aria-busy=false');
    }
  },

  async counts() {
    if (!page) return console.log('ERROR: launch first');
    const habits = await page.getAttribute('#preview-section', 'data-habits');
    const days = await page.getAttribute('#preview-section', 'data-days');
    console.log(`data-habits=${habits}`, `data-days=${days}`);
  },

  async 'download-enabled'() {
    if (!page) return console.log('ERROR: launch first');
    console.log(await page.isEnabled('#download'));
  },

  async 'canvas-hash'() {
    if (!page) return console.log('ERROR: launch first');
    const data = await page.evaluate(() => {
      const canvas = document.querySelector('#preview canvas');
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      return Array.from(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
    });
    if (!data) return console.log('NOT_FOUND: #preview canvas');
    console.log(createHash('sha1').update(Buffer.from(data)).digest('hex'));
  },

  async eval(expr) {
    if (!page) return console.log('ERROR: launch first');
    try {
      console.log(JSON.stringify(await page.evaluate(expr)));
    } catch (e) {
      console.log('ERROR:', e.message);
    }
  },

  async text(sel) {
    if (!page) return console.log('ERROR: launch first');
    console.log(
      await page.evaluate(
        (s) => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)',
        sel || null,
      ),
    );
  },

  async errors() {
    console.log(pageErrors.length ? pageErrors : '(none)');
  },

  async quit() {
    if (browser) await browser.close().catch(() => {});
    browser = null;
    page = null;
    if (devServer) await COMMANDS['server-stop']();
  },

  help() {
    console.log('commands:', Object.keys(COMMANDS).join(', '));
  },
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'driver> ',
});

// Piped (non-TTY) stdin delivers every line immediately, so 'line' events
// fire back-to-back without waiting for the previous async command to
// finish. Serialize through a queue or e.g. "launch" races "server-start"
// and "quit" can tear the server down mid-boot.
let queue = Promise.resolve();
let quitting = false;
// Piped (non-TTY) stdin hits EOF and fires 'close' as soon as all lines
// are delivered - well before the queued async commands finish running.
// rl.prompt() after that throws ERR_USE_AFTER_CLOSE, so gate it.
let rlOpen = true;

function safePrompt() {
  if (rlOpen) rl.prompt();
}

async function runLine(rawLine) {
  const line = rawLine.trim();
  const sp = line.indexOf(' ');
  const cmd = sp === -1 ? line : line.slice(0, sp);
  const rest = sp === -1 ? '' : line.slice(sp + 1);
  if (!cmd) return safePrompt();
  const fn = COMMANDS[cmd];
  if (!fn) {
    console.log('unknown:', cmd, '- try: help');
    return safePrompt();
  }
  try {
    await fn(rest);
  } catch (e) {
    console.log('ERROR:', e.message);
  }
  if (cmd === 'quit') {
    quitting = true;
    process.exit(0);
  }
  safePrompt();
}

rl.on('line', (line) => {
  queue = queue.then(() => runLine(line));
});
rl.on('close', () => {
  rlOpen = false;
  queue = queue.then(async () => {
    if (!quitting) await COMMANDS.quit();
    process.exit(0);
  });
});

console.log('habits-grid driver - "help" for commands, "server-start" then "launch" to begin');
rl.prompt();
