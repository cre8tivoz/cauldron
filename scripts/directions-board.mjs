// Bundles scripts/directions-board-entry.tsx with esbuild and runs it, so the
// board is rendered from the real component and the real direction data rather
// than a hand-maintained copy.
//   node scripts/directions-board.mjs [out.html]
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(new URL('..', import.meta.url).pathname);
// Emitted inside the repo so react and react-dom resolve from node_modules.
const cache = path.join(repo, 'node_modules/.cache');
const outfile = path.join(cache, 'cauldron-board.mjs');
fs.mkdirSync(cache, { recursive: true });

await build({
  entryPoints: [path.join(repo, 'scripts/directions-board-entry.tsx')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile,
  jsx: 'automatic',
  // The board is a single self-contained page, so photographs inline.
  loader: { '.webp': 'dataurl' },
  logLevel: 'error',
  external: ['react', 'react-dom', 'react-dom/server'],
  absWorkingDir: repo,
});

try {
  const target =
    process.argv[2] ?? path.join(repo, 'docs/directions-audit/board.html');
  process.stdout.write(
    execFileSync(process.execPath, [outfile, target], {
      encoding: 'utf8',
      env: { ...process.env, CAULDRON_REPO: repo },
    }),
  );
} finally {
  fs.rmSync(outfile, { force: true });
}
