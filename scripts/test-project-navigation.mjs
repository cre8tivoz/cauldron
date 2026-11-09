// Focused React regressions, not an IPC/provider proof. Serves the actual built
// renderer with an explicit bridge fixture to exercise picker/discard scheduling.
// Driven over CDP using Electron's bundled binary without external test dependencies.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import electron from 'electron';

const electronExe =
  typeof electron === 'string'
    ? electron
    : path.resolve(
        'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
      );

const root = path.resolve('.vite/renderer/main_window');
if (!fs.existsSync(root)) {
  throw new Error(
    'Build the renderer first (.vite/renderer/main_window missing).',
  );
}

const server = http.createServer((req, res) => {
  const file = path.join(
    root,
    decodeURIComponent(
      req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0],
    ),
  );
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader(
    'Content-Type',
    file.endsWith('.js')
      ? 'text/javascript'
      : file.endsWith('.css')
        ? 'text/css'
        : 'text/html',
  );
  res.end(fs.readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const httpPort = server.address().port;

const cdpPort = await new Promise((resolve) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => {
    const port = s.address().port;
    s.close(() => resolve(port));
  });
});

const child = spawn(
  electronExe,
  ['--headless', `--remote-debugging-port=${cdpPort}`],
  {
    stdio: 'ignore',
  },
);

async function connectCdp(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const list = await (
        await fetch(`http://127.0.0.1:${cdpPort}/json/list`)
      ).json();
      const page = list.find((t) => t.type === 'page');
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          ws.addEventListener('open', resolve, { once: true });
          ws.addEventListener('error', reject, { once: true });
        });
        let id = 0;
        const pending = new Map();
        ws.addEventListener('message', (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) {
              reject(new Error(msg.error.message));
            } else {
              resolve(msg.result);
            }
          }
        });
        const send = (method, params = {}) =>
          new Promise((resolve, reject) => {
            id += 1;
            pending.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, method, params }));
          });
        const evaluate = async (expression) => {
          const result = await send('Runtime.evaluate', {
            expression,
            awaitPromise: true,
            returnByValue: true,
          });
          if (result.exceptionDetails) {
            throw new Error(
              result.exceptionDetails.exception?.description ??
                'renderer exception',
            );
          }
          return result.result?.value;
        };
        return {
          ws,
          send,
          evaluate,
          close: () => ws.close(),
        };
      }
    } catch {
      // endpoint not ready
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Could not attach to Electron over CDP.');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) return;
    await sleep(100);
  }
  throw new Error('Timed out waiting for condition');
}

const initScript = `
  const listeners = new Map();
  const initial = {
    root: '/fixture/original',
    name: 'Original',
    astroVersion: '7.4.7',
    packageManager: 'pnpm',
    hasDependencies: true,
  };
  const selected = {
    id: 'heading',
    file: 'src/pages/index.astro',
    line: 1,
    column: 1,
    name: 'h1',
    text: 'Original heading',
    baseHash: 'fixture',
    textEditable: true,
    attributes: [],
    style: {},
    pageUrl: '/',
    domPath: 'h1',
    history: { canUndo: false, canRedo: false },
  };
  window.proof = { opens: [], discards: 0 };
  const emit = (channel, value) => {
    for (const fn of listeners.get(channel) || []) fn(value);
  };
  window.cauldron = new Proxy(
    {
      direction: async () => null,
      state: async () => ({
        site: initial,
        running: false,
        url: null,
        selection: selected,
        drafts: [],
        status: [],
      }),
      projectsHome: async () => ({ projects: [], problem: null }),
      runs: async () => [],
      mcpInfo: async () => null,
      openSiteDialog: async () => {
        await new Promise((r) => setTimeout(r, 120));
        return { picked: '/fixture/picked' };
      },
      openSite: async (root) => {
        window.proof.opens.push(root);
        const site = { ...initial, root, name: 'Opened' };
        emit('cauldron:site', { site, drafts: [] });
        return { site };
      },
      discardDrafts: async () => {
        window.proof.discards++;
        return true;
      },
      on: (channel, fn) => {
        const set = listeners.get(channel) || new Set();
        set.add(fn);
        listeners.set(channel, set);
        return () => set.delete(fn);
      },
    },
    { get: (target, key) => target[key] || (async () => true) },
  );
`;

let failed = 0;
let cdp;

try {
  cdp = await connectCdp();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: initScript,
  });

  for (const scenario of ['picker', 'discard']) {
    try {
      await cdp.send('Page.navigate', {
        url: `http://127.0.0.1:${httpPort}/`,
      });
      await waitFor(async () =>
        cdp.evaluate(`(() => {
          const headings = [...document.querySelectorAll('h1, h2, h3, [role="heading"]')];
          return headings.some((h) => h.textContent.trim() === 'Projects');
        })()`),
      );

      if (scenario === 'picker') {
        const clicked = await cdp.evaluate(`(() => {
          const btn = [...document.querySelectorAll('button')].find(
            (b) => b.textContent.trim() === 'Open existing project…',
          );
          if (!btn) return false;
          btn.click();
          return true;
        })()`);
        assert.ok(clicked, 'Button "Open existing project…" found and clicked');
        await sleep(500);
        assert.deepEqual(await cdp.evaluate('window.proof.opens'), [
          '/fixture/picked',
        ]);
        console.log(
          'PASS picker result reaches the shared open handler after async selection',
        );
      } else {
        const sitesClicked = await cdp.evaluate(`(() => {
          const btn = document.querySelector('button[title="Sites"]');
          if (!btn) return false;
          btn.click();
          return true;
        })()`);
        assert.ok(sitesClicked, 'Sites button found');
        await waitFor(async () =>
          cdp.evaluate(
            `Boolean(document.querySelector('.inspector-pane textarea'))`,
          ),
        );
        await cdp.evaluate(`(() => {
          const text = document.querySelector('.inspector-pane textarea');
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value',
          ).set;
          setter.call(text, 'Typed unsaved edit');
          text.dispatchEvent(new Event('input', { bubbles: true }));
          text.dispatchEvent(new Event('change', { bubbles: true }));
        })()`);

        await cdp.evaluate(`(() => {
          const btn = [...document.querySelectorAll('button')].find(
            (b) => b.textContent.trim() === 'Projects',
          );
          btn.click();
        })()`);

        await waitFor(async () =>
          cdp.evaluate(
            `Boolean(document.querySelector('input[aria-label="Path of the existing project folder"]'))`,
          ),
        );
        await cdp.evaluate(`(() => {
          const input = document.querySelector(
            'input[aria-label="Path of the existing project folder"]',
          );
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value',
          ).set;
          setter.call(input, '/fixture/another');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        })()`);

        await cdp.evaluate(`(() => {
          const btn = [...document.querySelectorAll('button')].find(
            (b) => b.textContent.trim() === 'Open by path',
          );
          btn.click();
        })()`);

        await waitFor(async () =>
          cdp.evaluate(
            `Boolean(document.querySelector('[role="dialog"][aria-label="Unsaved edits"]'))`,
          ),
        );
        assert.deepEqual(await cdp.evaluate('window.proof.opens'), []);

        await cdp.evaluate(`(() => {
          const btn = [...document.querySelectorAll('button')].find(
            (b) => b.textContent.trim() === 'Discard changes and open',
          );
          btn.click();
        })()`);

        await sleep(400);
        assert.deepEqual(await cdp.evaluate('window.proof.opens'), [
          '/fixture/another',
        ]);
        assert.equal(
          await cdp.evaluate(
            'document.querySelectorAll(\'[role="dialog"][aria-label="Unsaved edits"]\').length',
          ),
          0,
        );
        assert.equal(await cdp.evaluate('window.proof.discards'), 1);
        console.log(
          'PASS typed-unsaved edits require confirmation and explicit discard opens once',
        );
      }
    } catch (error) {
      failed++;
      console.error(`FAIL ${scenario}: ${error.message}`);
    }
  }
} finally {
  if (cdp) cdp.close();
  child.kill('SIGTERM');
  await new Promise((resolve) => server.close(resolve));
}

process.exitCode = failed ? 1 : 0;
