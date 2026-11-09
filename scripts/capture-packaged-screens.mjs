import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

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
if (!fs.existsSync(exe)) {
  console.error('Packaged binary not found at ' + exe);
  process.exit(1);
}

const outDir = path.join(repo, '.scratch', 'visual-verification');
fs.mkdirSync(outDir, { recursive: true });

const PORT = 9225;
const testUserData = path.join(outDir, 'test-user-data');
fs.mkdirSync(testUserData, { recursive: true });

const env = {
  ...process.env,
  PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
  CAULDRON_BACKGROUND_TEST: '1',
  CAULDRON_TEST_USER_DATA: testUserData,
};

const child = spawn(exe, [`--remote-debugging-port=${PORT}`], {
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.on('data', (d) => process.stdout.write(`[app] ${d}`));
child.stderr.on('data', (d) => process.stdout.write(`[app:err] ${d}`));

async function connectCdp(timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find(
        (t) => t.type === 'page' && t.title === 'Cauldron',
      );
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          ws.addEventListener('open', resolve, { once: true });
          ws.addEventListener('error', reject, { once: true });
        });
        let idCounter = 1;
        const pending = new Map();
        ws.addEventListener('message', (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
        });
        const send = (method, params = {}) =>
          new Promise((resolve, reject) => {
            const id = idCounter++;
            pending.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, method, params }));
          });
        return {
          ws,
          send,
          evaluate: async (expression) => {
            const result = await send('Runtime.evaluate', {
              expression,
              returnByValue: true,
              awaitPromise: true,
            });
            if (result.exceptionDetails) {
              throw new Error(
                result.exceptionDetails.exception?.description ?? 'exception',
              );
            }
            return result.result?.value;
          },
          screenshot: async (filePath) => {
            const shot = await send('Page.captureScreenshot', {
              format: 'png',
            });
            fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
            console.log(`Captured screenshot: ${filePath}`);
          },
        };
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('CDP connection failed');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const cdp = await connectCdp();
  await cdp.send('Page.enable');
  await sleep(1000);

  // Set window size for desktop view (1440x900)
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false,
  });

  // Switch to build view with a mock Sunday Table site
  await cdp.evaluate(`
    (() => {
      // Click Sites button on rail
      const sitesBtn = document.querySelector('button[title="Sites"]');
      if (sitesBtn) sitesBtn.click();
    })()
  `);
  await sleep(800);
  await cdp.screenshot(path.join(outDir, '1-workspace.png'));

  // Switch to Design directions
  await cdp.evaluate(`
    (() => {
      const btn = document.querySelector('button[title="Design directions"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(800);
  await cdp.screenshot(path.join(outDir, '2-design-directions.png'));

  // Switch to Components
  await cdp.evaluate(`
    (() => {
      const btn = document.querySelector('button[title="Components"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(800);
  await cdp.screenshot(path.join(outDir, '3-components.png'));

  // Switch to Content
  await cdp.evaluate(`
    (() => {
      const btn = document.querySelector('button[title="Content"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(800);
  await cdp.screenshot(path.join(outDir, '4-content.png'));

  // Switch to Quality
  await cdp.evaluate(`
    (() => {
      const btn = document.querySelector('button[title="Quality checks"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(800);
  await cdp.screenshot(path.join(outDir, '5-quality.png'));

  // Switch to Publishing
  await cdp.evaluate(`
    (() => {
      const btn = document.querySelector('button[title="Publishing"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(800);
  await cdp.screenshot(path.join(outDir, '6-publishing.png'));

  console.log('All 6 screens captured successfully!');
} finally {
  child.kill('SIGTERM');
  setTimeout(() => child.kill('SIGKILL'), 2000).unref();
}
