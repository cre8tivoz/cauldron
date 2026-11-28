// Packaged-app acceptance for the app shell (WDL-263).
// Drives the REAL packaged Cauldron app over CDP in the background and checks
// the two things a person hits before any site exists:
//   - every screen that is built from a site's own files says so and offers
//     the two real actions, instead of rendering controls that do nothing;
//   - creating a project with "Create and prepare" lands you in that project.
// Run: CAULDRON_BUNDLE_E2E=1 npm run package && node scripts/test-app-shell.mjs
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const repo = path.resolve(new URL('..', import.meta.url).pathname);
const exe = path.join(
  repo,
  'out',
  'Cauldron-darwin-arm64',
  'Cauldron.app',
  'Contents',
  'MacOS',
  'Cauldron',
);
if (!fs.existsSync(exe))
  throw new Error(
    'Package a harness-enabled build first (CAULDRON_BUNDLE_E2E=1 npm run package).',
  );

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-shell-'));
const parent = path.join(work, 'projects');
fs.mkdirSync(parent, { recursive: true });

const server = net.createServer().listen(0, '127.0.0.1');
await once(server, 'listening');
const { port } = server.address();
await new Promise((r) => server.close(r));

const child = spawn(exe, [`--remote-debugging-port=${port}`], {
  env: {
    // A person's machine has node and pnpm on PATH; "Create and prepare"
    // downloads through them. A stripped PATH is not a supported state.
    PATH: [
      path.join(os.homedir(), '.nvm/versions/node/v26.13.0/bin'),
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin',
    ].join(':'),
    HOME: os.homedir(),
    TMPDIR: os.tmpdir(),
    CAULDRON_BACKGROUND_TEST: '1',
    CAULDRON_TEST_USER_DATA: path.join(work, 'userdata'),
  },
  stdio: ['ignore', 'ignore', 'ignore'],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Never leave a hidden test app behind: it holds the single-instance lock and
// makes every later launch quit at once.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'])
  process.on(signal, () => {
    child.kill('SIGKILL');
    process.exit(130);
  });
process.on('exit', () => child.kill('SIGKILL'));
const failures = [];
let passed = 0;
const check = (name, ok, detail = '') => {
  if (ok) {
    passed++;
    console.log(`ok - ${name}`);
  } else {
    failures.push(`${name}${detail ? `: ${detail}` : ''}`);
    console.error(`FAIL - ${name}${detail ? `: ${detail}` : ''}`);
  }
};

let ws;
for (let i = 0; i < 160 && !ws; i++) {
  if (child.exitCode !== null)
    throw new Error(
      `App exited ${child.exitCode} before the renderer appeared.`,
    );
  try {
    const list = await (
      await fetch(`http://127.0.0.1:${port}/json/list`)
    ).json();
    const target = list.find(
      (t) => t.type === 'page' && t.title === 'Cauldron',
    );
    if (target) {
      ws = new WebSocket(target.webSocketDebuggerUrl);
      await once(ws, 'open');
    }
  } catch {}
  if (!ws) await sleep(250);
}
if (!ws) throw new Error('The packaged renderer never appeared.');

let seq = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  const cb = pending.get(m.id);
  if (cb) {
    pending.delete(m.id);
    cb(m);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`timeout ${method}`));
    }, 20000);
    pending.set(id, (r) => {
      clearTimeout(timer);
      if (r.error) reject(new Error(r.error.message));
      else resolve(r.result);
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
const js = async (expression) => {
  const r = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails)
    throw new Error(
      r.exceptionDetails.exception?.description ?? r.exceptionDetails.text,
    );
  return r.result.value;
};
const bodyText = async () => (await js('document.body.innerText')) ?? '';
const clickLabel = async (label) =>
  js(`(() => {
    const want = ${JSON.stringify(label)}.toLowerCase();
    const els = [...document.querySelectorAll('button, a, [role=button], [role=tab]')];
    const flat = (e) => (e.innerText || '').replace(/\\s+/g, ' ').trim();
    const hit = els.find(e => flat(e).toLowerCase() === want)
      || els.find(e => flat(e).toLowerCase().startsWith(want));
    if (!hit) return 'NOT FOUND';
    if (hit.disabled) return 'DISABLED';
    hit.click();
    return 'clicked';
  })()`);
const until = async (expr, label) => {
  for (let i = 0; i < 120; i++) {
    if (await js(`Boolean(${expr})`)) return true;
    await sleep(500);
  }
  throw new Error(`Timed out: ${label}`);
};

try {
  await until(
    `document.body.innerText.includes('New Astro project')`,
    'project home',
  );

  // 0. The rail says where you are, and which site its tools act on (WDL-265).
  const rail = () =>
    js(`(() => {
      const current = document.querySelector('.rail [aria-current="page"]');
      const group = document.querySelector('.rail [role="group"]');
      const labelId = group && group.getAttribute('aria-labelledby');
      const nav = document.querySelector('.rail');
      return {
        current: current ? current.innerText.trim() : null,
        caption: labelId ? document.getElementById(labelId).innerText.trim() : null,
        tools: group ? [...group.querySelectorAll('.rail-label')].map(l => l.innerText.trim()) : [],
        fits: nav.scrollHeight <= nav.clientHeight,
      };
    })()`);
  const home = await rail();
  check(
    'the rail marks Projects as where you are on launch',
    home.current === 'Projects',
    JSON.stringify(home),
  );
  check(
    'the rail admits no site is open',
    home.caption === 'No site open',
    JSON.stringify(home),
  );
  check(
    'the site tools are grouped under that caption',
    JSON.stringify(home.tools) ===
      JSON.stringify([
        'Editor',
        'Content',
        'SEO',
        'Components',
        'Design',
        'Quality',
        'Publishing',
      ]),
    JSON.stringify(home.tools),
  );
  check(
    'the rail fits the window without scrolling',
    home.fits === true,
    JSON.stringify(home),
  );

  // 1. Every site screen explains itself with no site open, and offers both
  // real actions.
  for (const [nav, copy] of [
    ['Content', 'Open a site to use Content'],
    ['SEO', 'Open a site to use SEO'],
    ['Design', 'Open a site to use Design directions'],
    ['Quality', 'Open a site to use Quality checks'],
    ['Publishing', 'Open a site to use Publishing'],
  ]) {
    await clickLabel(nav);
    await sleep(900);
    const text = (await bodyText()).replace(/\s+/g, ' ');
    check(
      `${nav} with no site explains itself`,
      text.includes(copy),
      text.slice(0, 120),
    );
    const actions = await js(
      `[...document.querySelectorAll('.no-site-gate button')].map(b => b.innerText.trim())`,
    );
    check(
      `${nav} with no site offers the two actions`,
      Array.isArray(actions) &&
        actions.includes('Open a site') &&
        actions.includes('Start a new project'),
      JSON.stringify(actions),
    );
    // Nothing from the real screen may be left behind to click.
    const leftovers = await js(
      `document.querySelectorAll('.no-site-gate').length`,
    );
    check(`${nav} shows one empty state`, leftovers === 1, String(leftovers));
    check(`the rail marks ${nav} as current`, (await rail()).current === nav);
  }

  // 2. Creating a project lands the person in it.
  await clickLabel('Start a new project');
  await sleep(1200);
  const setInput = (startsWith, value) =>
    js(`(() => {
      const i = [...document.querySelectorAll('input')]
        .find(i => (i.placeholder || '').startsWith(${JSON.stringify(startsWith)}));
      if (!i) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(i, ${JSON.stringify(value)});
      i.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
  check(
    'the new-project form is reachable',
    (await setInput('Project name', 'Shell Check')) === true,
  );
  await setInput('Folder to create', parent);
  await sleep(300);
  await clickLabel('Create and prepare');
  await until(
    `!document.body.innerText.includes('No site open') && document.body.innerText.includes('Shell Check')`,
    'the new project opens itself',
  );
  const text = (await bodyText()).replace(/\s+/g, ' ');
  check('creating a project opens it', text.includes('Shell Check'));
  const opened = await rail();
  check(
    'the rail names the open site above its tools',
    opened.caption === 'Shell Check',
    JSON.stringify(opened),
  );
  check(
    'the new project is a real Astro site',
    fs.existsSync(
      path.join(parent, 'Shell Check', 'src', 'pages', 'index.astro'),
    ),
  );
  check(
    'the new project has its dependencies installed',
    fs.existsSync(path.join(parent, 'Shell Check', 'node_modules')),
  );
} finally {
  child.kill('SIGKILL');
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
fs.rmSync(work, { recursive: true, force: true });
