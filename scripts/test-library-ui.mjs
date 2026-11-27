// Packaged-app acceptance for the component library browser (WDL-263).
// Drives the REAL packaged Cauldron app over CDP in the background, like
// test-projects-ui.mjs, and checks what a person actually uses:
//   - the category bar is fully visible (not squeezed) at the supported
//     1280×800 minimum and at 1440×900;
//   - every category answers a real mouse click and the keyboard;
//   - every component can be selected and shown at desktop and phone width.
// With --capture it refreshes docs/reference/library-audit/components/*.png.
// Run: npm run package && npm run test:library:ui
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
  throw new Error('Package the app first (out/ missing).');
const capture = process.argv.includes('--capture');
const shots = path.join(
  repo,
  'docs',
  'reference',
  'library-audit',
  'components',
);

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cauldron-library-ui-'));
const site = path.join(work, 'library-site');
fs.mkdirSync(path.join(site, 'src', 'pages'), { recursive: true });
fs.writeFileSync(
  path.join(site, 'src/pages/index.astro'),
  '<html lang="en"><head><title>Library</title></head><body><main><h1>Library</h1></main></body></html>\n',
);
fs.writeFileSync(
  path.join(site, 'package.json'),
  JSON.stringify({
    name: 'library-site',
    type: 'module',
    scripts: { dev: 'astro dev' },
    dependencies: { astro: '6.4.8' },
  }),
);

const server = net.createServer().listen(0, '127.0.0.1');
await once(server, 'listening');
const { port } = server.address();
await new Promise((r) => server.close(r));
const child = spawn(exe, [`--remote-debugging-port=${port}`], {
  env: {
    PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
    HOME: os.homedir(),
    TMPDIR: os.tmpdir(),
    CAULDRON_BACKGROUND_TEST: '1',
    CAULDRON_TEST_USER_DATA: path.join(work, 'userdata'),
  },
  stdio: ['ignore', 'ignore', 'ignore'],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// A hidden test app that outlives its run sits in the person's Dock forever and
// holds the single-instance lock, so every later launch just quits. Stop it
// hard, and do it even when this script is interrupted.
async function stopApp() {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  const exited = await Promise.race([once(child, 'exit'), sleep(3000)]);
  if (exited !== undefined && child.exitCode !== null) return;
  child.kill('SIGKILL');
  await Promise.race([once(child, 'exit'), sleep(2000)]);
}
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'])
  process.on(signal, () => {
    child.kill('SIGKILL');
    process.exit(130);
  });
process.on('exit', () => child.kill('SIGKILL'));
let passed = 0;
const failures = [];
const check = (name, ok, detail = '') => {
  if (ok) {
    passed++;
    console.log(`ok - ${name}`);
  } else {
    failures.push(name);
    console.error(`FAIL - ${name}${detail ? `: ${detail}` : ''}`);
  }
};

let ws;
try {
  let target;
  for (let i = 0; i < 160 && !target; i++) {
    if (child.exitCode !== null)
      throw new Error(`App exited ${child.exitCode}`);
    try {
      target = (
        await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      ).find((t) => t.type === 'page' && t.title === 'Cauldron');
    } catch {}
    if (!target) await sleep(250);
  }
  if (!target) throw new Error('The packaged renderer never appeared.');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await once(ws, 'open');
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
  const until = async (expr, label) => {
    for (let i = 0; i < 160; i++) {
      if (await js(`Boolean(${expr})`)) return;
      await sleep(250);
    }
    throw new Error(`Timed out: ${label}`);
  };
  const size = (width, height) =>
    send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
  const mouse = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount: 1,
    });
  };
  const press = async (key, code, keyCode, text) => {
    // keyDown with text, not rawKeyDown: Chromium only turns Enter on a focused
    // button into a click when the character is part of the event.
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      nativeVirtualKeyCode: keyCode,
      ...(text ? { text, unmodifiedText: text } : {}),
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code,
      windowsVirtualKeyCode: keyCode,
    });
  };

  // Open the site and the component library.
  await until(
    `document.querySelector('[aria-label="Path of the existing project folder"]')`,
    'home',
  );
  await js(
    `(() => { const f = document.querySelector('[aria-label="Path of the existing project folder"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(f, ${JSON.stringify(site)}); f.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await js(
    `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Open by path').click()`,
  );
  await until(
    `document.querySelector('button[title="Components"]')`,
    'site open',
  );
  await js(`document.querySelector('button[title="Components"]').click()`);
  await until(
    `document.querySelector('.library-piece-list button')`,
    'component library',
  );

  for (const [w, h] of [
    [1280, 800],
    [1440, 900],
  ]) {
    await size(w, h);
    await sleep(400);
    const bar = await js(
      `(() => { const b = document.querySelector('.library-category-bar'); const r = b.getBoundingClientRect(); const pills = [...b.querySelectorAll('.category-pill')].map((p) => { const q = p.getBoundingClientRect(); return { text: p.textContent.trim(), top: q.top, bottom: q.bottom, h: q.height }; }); return { client: b.clientHeight, scroll: b.scrollHeight, top: r.top, bottom: r.bottom, pills }; })()`,
    );
    check(
      `${w}×${h}: the category bar is not squeezed`,
      bar.client >= bar.scroll && bar.client >= 28,
      `client ${bar.client}px, content ${bar.scroll}px`,
    );
    check(
      `${w}×${h}: every category pill is fully inside the bar`,
      bar.pills.length >= 5 &&
        bar.pills.every(
          (p) =>
            p.top >= bar.top - 0.5 && p.bottom <= bar.bottom + 0.5 && p.h >= 24,
        ),
      JSON.stringify(bar.pills.map((p) => [p.text, Math.round(p.h)])),
    );
  }

  // Every category: a real mouse click lands on the pill (hit-test) and selects it.
  await size(1280, 800);
  await sleep(300);
  const categories = await js(
    `[...document.querySelectorAll('.category-pill')].map((p) => p.textContent.trim())`,
  );
  for (const category of categories) {
    const at = await js(
      `(() => { const p = [...document.querySelectorAll('.category-pill')].find((x) => x.textContent.trim() === ${JSON.stringify(category)}); p.scrollIntoView({ block: 'nearest', inline: 'center' }); const r = p.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; return { x, y, hit: document.elementFromPoint(x, y) === p }; })()`,
    );
    check(`"${category}" is under the pointer where it is drawn`, at.hit);
    await mouse(at.x, at.y);
    await sleep(250);
    const state = await js(
      `(() => { const p = [...document.querySelectorAll('.category-pill')].find((x) => x.textContent.trim() === ${JSON.stringify(category)}); return { active: p.classList.contains('active-pill'), count: document.querySelectorAll('.library-piece-list button').length }; })()`,
    );
    check(
      `clicking "${category}" selects it and lists its components`,
      state.active && state.count > 0,
      JSON.stringify(state),
    );
  }
  // Keyboard: Enter on a focused pill selects it. Focused explicitly rather than
  // by Tab order: the list re-renders and the landed pill is not predictable.
  const keyboardTarget = await js(
    `(() => { const p = [...document.querySelectorAll('.category-pill')][2]; p.focus(); return p.textContent.trim(); })()`,
  );
  await press('Enter', 'Enter', 13, '\r');
  await sleep(400);
  const selected = await js(
    `[...document.querySelectorAll('.category-pill.active-pill')].map((p) => p.textContent.trim())`,
  );
  check(
    'Enter selects the focused category',
    selected.includes(keyboardTarget),
    `${keyboardTarget} -> ${JSON.stringify(selected)}`,
  );
  await js(`document.querySelector('.category-pill').focus()`);
  await press('Tab', 'Tab', 9);
  check(
    'Tab moves between category pills',
    Boolean(
      await js(`document.activeElement?.classList.contains('category-pill')`),
    ),
  );

  // Every component: select it, see it at desktop and phone width.
  await js(
    `[...document.querySelectorAll('.category-pill')].find((p) => p.textContent.trim() === 'All').click()`,
  );
  await sleep(300);
  const names = await js(
    `[...document.querySelectorAll('.library-piece-list button')].map((b) => b.textContent.trim())`,
  );
  check(
    'the catalogue lists all 25 components',
    names.length === 25,
    String(names.length),
  );
  if (capture) {
    fs.mkdirSync(shots, { recursive: true });
    await send('Emulation.clearDeviceMetricsOverride');
    await sleep(600);
  }
  const captureSizes = [];
  const shot = async (file) => {
    // Captured with the geometry override cleared: under the emulated 1280x800
    // the canvas is smaller than the specimen and the frame comes back cropped.
    // Two identical reads 400ms apart mean the specimen has finished laying out;
    // a single read can catch it mid-reflow with dead space below the component.
    let png = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const rect = await js(
        `(() => { const r = document.querySelector('.library-specimen').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`,
      );
      const { data } = await send('Page.captureScreenshot', {
        clip: { ...rect, scale: 0.5 },
      });
      const next = Buffer.from(data, 'base64');
      if (png && next.equals(png)) break;
      png = next;
      await sleep(400);
    }
    fs.writeFileSync(path.join(shots, file), png);
    captureSizes.push([file, png.length]);
  };
  for (let i = 0; i < names.length; i++) {
    await js(
      `document.querySelectorAll('.library-piece-list button')[${i}].click()`,
    );
    await until(
      `document.querySelectorAll('.library-piece-list button')[${i}].getAttribute('aria-pressed') === 'true' && document.querySelector('.library-specimen iframe')?.srcdoc.length > 500`,
      `select ${names[i]}`,
    );
    // The specimen iframe is sandboxed, so its paint can only be waited out,
    // not polled: coverflow needs about a second before it composites.
    await sleep(1600);
    const slug = `${String(i + 1).padStart(2, '0')}-${names[i].toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    if (capture) await shot(`${slug}-desktop.png`);
    await js(
      `[...document.querySelectorAll('.library-viewport button')].find((b) => b.textContent.trim() === 'Phone').click()`,
    );
    await until(
      `document.querySelector('.library-specimen iframe').style.width === '375px'`,
      `phone ${names[i]}`,
    );
    await sleep(500);
    if (capture) await shot(`${slug}-phone.png`);
    await js(
      `[...document.querySelectorAll('.library-viewport button')].find((b) => b.textContent.trim() === 'Desktop').click()`,
    );
    await until(
      `document.querySelector('.library-specimen iframe').style.width === '960px'`,
      `desktop ${names[i]}`,
    );
    passed++;
  }
  console.log(
    `ok - all ${names.length} components shown at desktop and phone width${capture ? ' (captured)' : ''}`,
  );
  if (capture) {
    // A blank frame compresses to almost nothing (the blank Coverflow capture was
    // 1.5KB). 2.5KB is the boundary that separates it from a plain phone frame.
    const blank = captureSizes.filter(([, bytes]) => bytes < 2500);
    check(
      `all ${captureSizes.length} captures have content`,
      blank.length === 0,
      JSON.stringify(blank),
    );
  }
} catch (error) {
  failures.push(String(error.message));
  console.error(`FAIL - ${error.message}`);
} finally {
  ws?.close();
  await stopApp();
  fs.rmSync(work, { recursive: true, force: true });
}
console.log(`${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
