// One-off backfill for the gh-pages performance history (specs/008-perf-history-tracking).
// Run once via `node scripts/backfill-perf-history.ts`, before the live CI step
// (tests/perf/timing.test.ts + .github/workflows/ci.yml) first runs for real on
// main — see that feature's tasks.md T003 for the sequencing requirement.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const METRIC_NAME = 'Typst compile (largest fitting page, median of 10)';
const OUTPUT_DIR = 'backfill-output';
const OUTPUT_FILE = `${OUTPUT_DIR}/data.js`;

interface Run {
  databaseId: number;
  headSha: string;
  headBranch: string;
  createdAt: string;
  conclusion: string | null;
}

interface CommitInfo {
  id: string;
  message: string;
  timestamp: string;
  authorName: string;
}

interface Bench {
  name: string;
  unit: string;
  value: number;
  extra: string;
}

interface Entry {
  commit: {
    id: string;
    message: string;
    timestamp: string;
    url: string;
    author: { username: string };
    committer: { username: string };
  };
  date: number;
  tool: string;
  benches: Bench[];
}

function gh(args: string[]): string {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 });
}

function git(args: string[]): string | null {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function extractMedianMs(log: string): number | null {
  const match = log.match(/median compile:\s*([\d.]+)\s*ms/);
  return match ? Number(match[1]) : null;
}

function commitInfoFromGit(sha: string): CommitInfo | null {
  const raw = git(['log', '-1', '--format=%H%x1f%aI%x1f%an%x1f%s', sha]);
  if (!raw) return null;
  const [id, timestamp, authorName, message] = raw.split('\x1f');
  if (!id) return null;
  return { id, timestamp, authorName, message };
}

function commitInfoFromApi(repoFullName: string, sha: string): CommitInfo | null {
  try {
    const raw = gh(['api', `repos/${repoFullName}/commits/${sha}`]);
    const data = JSON.parse(raw);
    return {
      id: data.sha,
      message: String(data.commit.message).split('\n')[0],
      timestamp: data.commit.author.date,
      authorName: data.commit.author.name,
    };
  } catch {
    return null;
  }
}

function main() {
  const repoFullName = gh([
    'repo',
    'view',
    '--json',
    'nameWithOwner',
    '-q',
    '.nameWithOwner',
  ]).trim();
  const repoUrl = `https://github.com/${repoFullName}`;

  const runsRaw = gh([
    'run',
    'list',
    '--workflow=ci.yml',
    '--limit',
    '200',
    '--json',
    'databaseId,headSha,headBranch,createdAt,conclusion',
  ]);
  const runs: Run[] = JSON.parse(runsRaw);

  const entries: Entry[] = [];
  let skipped = 0;

  for (const run of runs) {
    let log: string;
    try {
      log = gh(['run', 'view', String(run.databaseId), '--log']);
    } catch {
      skipped++;
      continue;
    }

    const value = extractMedianMs(log);
    if (value === null) {
      skipped++;
      continue;
    }

    const info = commitInfoFromGit(run.headSha) ?? commitInfoFromApi(repoFullName, run.headSha);
    if (!info) {
      skipped++;
      continue;
    }

    entries.push({
      commit: {
        id: info.id,
        message: info.message,
        timestamp: info.timestamp,
        url: `${repoUrl}/commit/${info.id}`,
        // The dashboard template's tooltip reads `committer.username` (not
        // `.name`) — confirmed against the pinned action's own
        // default_index_html.js. We only have the commit author's display
        // name available locally/via the commits API, not a verified GitHub
        // handle, so it's used as a reasonable stand-in here.
        author: { username: info.authorName },
        committer: { username: info.authorName },
      },
      date: new Date(info.timestamp).getTime(),
      tool: 'customSmallerIsBetter',
      benches: [
        {
          name: METRIC_NAME,
          unit: 'ms',
          value,
          extra: `branch: ${run.headBranch}`,
        },
      ],
    });
  }

  entries.sort((a, b) => a.date - b.date);

  const data = {
    lastUpdate: Date.now(),
    repoUrl,
    entries: {
      [METRIC_NAME]: entries,
    },
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  // No trailing `;` — the action's own `loadDataJs` does a bare
  // `script.slice(SCRIPT_PREFIX.length)` then `JSON.parse`, with no
  // semicolon stripping. A trailing `;` breaks that parse, which silently
  // falls back to an empty default and discards all prior entries instead
  // of appending to them (confirmed by reproducing this exact failure
  // against the live action once already — see T003 implementation notes).
  writeFileSync(OUTPUT_FILE, `window.BENCHMARK_DATA = ${JSON.stringify(data, null, 2)}`);

  console.log(
    `Wrote ${entries.length} entries to ${OUTPUT_FILE} (skipped ${skipped} run(s) with no usable value).`,
  );
}

main();
