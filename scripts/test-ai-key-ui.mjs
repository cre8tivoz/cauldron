// Packaged-app acceptance for Your AI key (WDL-243).
//
//   npm run package && npm run test:ai-key:ui
//
// Drives the real Cauldron.app hidden, on a scratch profile and Chromium's mock
// keychain, against a local stand-in for an OpenAI-compatible provider. No real
// provider is called and no money is spent. Checks, through the interface:
// choosing "Your AI key", saving a key (which never comes back to the window),
// testing it, a job that edits the site through Cauldron's own actions, and
// removing the key.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const exe = path.resolve(
  'out',
  'Cauldron-darwin-arm64',
  'Cauldron.app',
  'Contents',
  'MacOS',
  'Cauldron',
);
if (!fs.existsSync(exe))
  throw new Error('Package the app first (out/ missing).');

const FAKE_KEY = 'sk-or-v1-acceptance-0000000000000000';
const PROOF_FILE = 'src/pages/key-agent-proof.astro';
const PROOF_BODY = '---\n---\n<h1>Written by the key agent</h1>\n';

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-aikey-'));
const parent = path.join(work, 'projects');
fs.mkdirSync(parent, { recursive: true });

// --- the stand-in provider ------------------------------------------------
const requests = [];
const chunk = (delta, finish = null) =>
  `data: ${JSON.stringify({ id: 'c', object: 'chat.completion.chunk', created: 0, model: 'm', choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
const provider = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (part) => (raw += part));
  req.on('end', () => {
    const body = raw ? JSON.parse(raw) : {};
    requests.push({
      url: req.url,
      auth: req.headers.authorization,
      model: body.model,
      tools: (body.tools ?? []).map((t) => t.function?.name),
      hasToolResult: (body.messages ?? []).some((m) => m.role === 'tool'),
      carriesFirstJob: JSON.stringify(body.messages ?? []).includes(
        'Add a proof page',
      ),
    });
    if (!body.stream) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          id: 'c',
          object: 'chat.completion',
          created: 0,
          model: 'm',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'ready' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      );
      return;
    }
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const answered = (body.messages ?? []).some((m) => m.role === 'tool');
    if (!answered) {
      res.write(
        chunk({
          role: 'assistant',
          tool_calls: [
            {
              index: 0,
              id: 'call_1',
              type: 'function',
              function: {
                name: 'write_source',
                arguments: JSON.stringify({
                  file: PROOF_FILE,
                  content: PROOF_BODY,
                  baseHash: null,
                }),
              },
            },
          ],
        }),
      );
      res.write(chunk({}, 'tool_calls'));
    } else {
      res.write(chunk({ role: 'assistant', content: 'Made the proof page.' }));
      res.write(chunk({}, 'stop'));
    }
    res.end('data: [DONE]\n\n');
  });
});
provider.listen(0, '127.0.0.1');
await once(provider, 'listening');
const providerUrl = `http://127.0.0.1:${provider.address().port}/v1`;

// --- the app ---------------------------------------------------------------
const server = net.createServer().listen(0, '127.0.0.1');
await once(server, 'listening');
const { port } = server.address();
await new Promise((r) => server.close(r));

const appLog = fs.openSync(path.join(work, 'app.log'), 'w');
const child = spawn(exe, [`--remote-debugging-port=${port}`], {
  env: {
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
    CAULDRON_TEST_AI_BASE_URL: providerUrl,
  },
  // The app's own output, kept for diagnosis and printed on failure.
  stdio: ['ignore', appLog, appLog],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
    }, 30000);
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
const text = async () =>
  ((await js('document.body.innerText')) ?? '').replace(/\s+/g, ' ');
const clickLabel = (label) =>
  js(`(() => {
    const want = ${JSON.stringify(label)}.toLowerCase();
    const els = [...document.querySelectorAll('button, a, [role=button], summary')];
    const flat = (e) => (e.innerText || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    const hit = els.find((e) => flat(e) === want) || els.find((e) => flat(e).startsWith(want));
    if (!hit) return 'NOT FOUND';
    if (hit.disabled) return 'DISABLED';
    hit.click();
    return 'clicked';
  })()`);
const setValue = (selector, value) =>
  js(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype
      : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    return true;
  })()`);
const until = async (expr, label, tries = 120) => {
  for (let i = 0; i < tries; i++) {
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

  // A real project, created through the interface, with a direction chosen.
  await clickLabel('Start a new project');
  await sleep(800);
  await js(`(() => {
    const set = (start, value) => {
      const i = [...document.querySelectorAll('input')].find((i) => (i.placeholder || '').startsWith(start));
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, value);
      i.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('Project name', 'Key Check');
    set('Folder to create', ${JSON.stringify(parent)});
  })()`);
  await sleep(300);
  await clickLabel('Create and prepare');
  await until(
    `document.body.innerText.includes('Key Check') && !document.body.innerText.includes('No site open')`,
    'the project opens',
  );
  // Choose a direction the way a person does: Design, then a card's button.
  await clickLabel('Design');
  await until(
    `[...document.querySelectorAll('button')].some((b) => b.innerText.trim() === 'Use this direction')`,
    'direction cards',
  );
  await clickLabel('Use this direction');
  await sleep(1500);
  await clickLabel('Sites');
  await until(
    `document.querySelector('select[aria-label="Agent tool"]')`,
    'agent panel',
  );
  check(
    'a design direction is set for the job',
    await js(`document.body.innerText.includes('Building to')`),
  );

  // 1. Choose Your AI key: the settings appear, with no key yet.
  check(
    'the agent menu offers Your AI key',
    await js(
      `[...document.querySelectorAll('select[aria-label="Agent tool"] option')].some((o) => o.value === 'key' && o.textContent === 'Your AI key')`,
    ),
  );
  await setValue('select[aria-label="Agent tool"]', 'key');
  await until(
    `document.querySelector('.ai-key-settings')`,
    'key settings appear',
  );
  const fresh = await text();
  check(
    'settings say no key is saved yet',
    fresh.includes('OpenRouter') && fresh.includes('no key yet'),
    fresh.slice(0, 200),
  );

  // 2. Save a key: it goes in and never comes back to the window.
  await setValue('input[aria-label="OpenRouter key"]', FAKE_KEY);
  await clickLabel('Save key');
  await until(
    `document.body.innerText.includes('Key saved in your keychain.')`,
    'key saved',
  );
  const html = await js('document.documentElement.outerHTML');
  check(
    'the saved key is not anywhere in the window',
    !html.includes(FAKE_KEY),
  );
  check(
    'the key field is cleared after saving',
    (await js(
      `document.querySelector('input[aria-label="OpenRouter key"]').value`,
    )) === '',
  );
  const status = await js('window.cauldron.aiStatus()');
  check(
    'the renderer is told only that a key exists',
    status.keys.openrouter === true &&
      !JSON.stringify(status).includes(FAKE_KEY),
    JSON.stringify(status),
  );
  check('the summary says key saved', (await text()).includes('key saved'));
  check(
    'nothing on disk holds the key in plain text',
    !fs
      .readdirSync(path.join(work, 'userdata', 'ai', 'keys'))
      .some((f) =>
        fs
          .readFileSync(path.join(work, 'userdata', 'ai', 'keys', f), 'utf8')
          .includes(FAKE_KEY),
      ),
  );

  // 3. Test: one small request, with the key the main process decrypted.
  await clickLabel('Test');
  await until(
    `document.body.innerText.includes('OpenRouter answered. Ready to go.')`,
    'test answered',
  );
  const probe = requests.at(-1);
  check(
    'the test reaches the provider with the saved key',
    probe?.auth === `Bearer ${FAKE_KEY}`,
    JSON.stringify(probe),
  );
  check(
    'the test asks for the default model',
    probe?.model === 'anthropic/claude-sonnet-5.5',
    String(probe?.model),
  );

  // 4. A job: the provider asks for a write through Cauldron's own action.
  const before = requests.length;
  await setValue('.agent-docked-composer textarea', 'Add a proof page');
  await js(`document.querySelector('.agent-send-btn').click()`);
  await until(
    `document.body.innerText.includes('Made the proof page.')`,
    'the reply arrives',
    120,
  );
  const jobRequests = requests.slice(before);
  check(
    'the job offers the model Cauldron\u2019s checked actions',
    jobRequests[0]?.tools?.includes('write_source') &&
      jobRequests[0]?.tools?.includes('edit_css_rule'),
    JSON.stringify(jobRequests[0]?.tools),
  );
  check(
    'the tool result goes back to the model',
    jobRequests.some((r) => r.hasToolResult),
  );
  check(
    'the run is announced with the provider',
    (await text()).includes('Starting OpenRouter'),
  );
  const proof = path.join(parent, 'Key Check', PROOF_FILE);
  check(
    'the agent\u2019s change is a real file in the site',
    fs.existsSync(proof) && fs.readFileSync(proof, 'utf8') === PROOF_BODY,
  );
  // A run that changed files ends with a real site build before it settles.
  await until(
    `!document.querySelector('.agent-send-btn')?.innerText.includes('Working')`,
    'the run settles',
    360,
  );
  const after = await text();
  const runs = await js('window.cauldron.runs()');
  const run = runs.find((r) =>
    (r.files ?? []).some(
      (f) =>
        (f.file ?? f.path ?? f) === PROOF_FILE ||
        JSON.stringify(f).includes('key-agent-proof'),
    ),
  );
  check(
    'the job is recorded as a Your AI key run',
    run?.tool === 'key',
    JSON.stringify(runs.map((r) => ({ tool: r.tool, files: r.files }))).slice(
      0,
      300,
    ),
  );
  check(
    'the run can be undone from the panel',
    after.includes('Undo this run'),
  );

  // 5. A follow-up job carries the first one, so "do that again" makes sense.
  const beforeFollowUp = requests.length;
  await setValue(
    '.agent-docked-composer textarea',
    'Do the same for the about page',
  );
  await js(`document.querySelector('.agent-send-btn').click()`);
  // The panel clears its transcript per job, so wait on the provider having
  // been asked, then on the run settling.
  for (let i = 0; i < 240; i++) {
    const working = await js(
      `Boolean(document.querySelector('.agent-send-btn')?.innerText.includes('Working'))`,
    );
    if (requests.length > beforeFollowUp && !working) break;
    await sleep(500);
  }
  check(
    'a follow-up sends the earlier job to the provider',
    requests.slice(beforeFollowUp).some((r) => r.carriesFirstJob),
    JSON.stringify(requests.slice(beforeFollowUp)),
  );

  // 6. Remove the key: the next job is refused with a plain reason.
  check(
    'the settings stay open after saving, so the confirmation is visible',
    await js(`document.querySelector('.ai-key-settings').open`),
  );
  await clickLabel('Remove key');
  await until(
    `document.body.innerText.includes('Key removed.')`,
    'key removed',
  );
  check(
    'after removing, settings say no key yet',
    (await text()).includes('no key yet'),
  );
  const refused = await js(
    `window.cauldron.agentSend({ tool: 'key', request: 'again' })`,
  );
  check(
    'a job without a key is refused before anything runs',
    refused.ok === false &&
      /Add your OpenRouter key/.test(refused.problem ?? ''),
    JSON.stringify(refused),
  );
} finally {
  child.kill('SIGKILL');
  provider.close();
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(' - ' + f);
  console.error(`\nApp log tail (${path.join(work, 'app.log')}):`);
  console.error(
    fs
      .readFileSync(path.join(work, 'app.log'), 'utf8')
      .split('\n')
      .slice(-25)
      .join('\n'),
  );
  process.exit(1);
}
fs.rmSync(work, { recursive: true, force: true });
