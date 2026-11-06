// Builds the app, then launches it hidden to confirm the window and interface render.
import { execSync, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

execSync('npx electron-forge package', { stdio: 'inherit' });
const outDir = readdirSync('out').find((d) => d.startsWith('Cauldron-'));
if (!outDir) throw new Error('No packaged app found in out/');
const exe =
  process.platform === 'darwin'
    ? path.join('out', outDir, 'Cauldron.app', 'Contents', 'MacOS', 'Cauldron')
    : path.join('out', outDir, 'Cauldron');
const res = spawnSync(exe, [], {
  env: { ...process.env, CAULDRON_SMOKE: '1' },
  encoding: 'utf8',
  timeout: 60000,
});
process.stdout.write(res.stdout ?? '');
process.stderr.write(res.stderr ?? '');
if (res.status !== 0) {
  console.error(`Smoke test failed (exit ${res.status}).`);
  process.exit(1);
}
