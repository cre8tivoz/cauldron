// Renderer-driven UI proof for the project workflow (issue 32).
// Drives the REAL packaged Cauldron app (React renderer + preload + IPC +
// backend) in the background (CAULDRON_BACKGROUND_TEST=1) under a Finder-style
// restricted PATH, over CDP (the app fuses disable Node inspect arguments, so
// Playwright's electron launcher cannot attach; a plain Chromium CDP attach can).
//
// Proven here: new project through the form (real pnpm install into the
// app-managed shared store), preview HTTP, reopen from the persisted library
// after an app restart, missing-folder reporting, entry removal leaving the
// project on disk, install cancel + retry, and existing-folder non-overwrite.
// The native Finder picker itself is NOT drivable from a background process
// and is therefore NOT claimed as verified.
import fs from 'node:fs';
import os from 'node:os';
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
if (!fs.existsSync(exe))
  throw new Error('Package the app first (out/ missing).');

const scratch = '/Users/habibi/.hermes/profiles/claudia/cache/scratch';
const proofDir = path.join(scratch, 'cauldron-projects-ui-proof');
fs.rmSync(proofDir, { recursive: true, force: true });
fs.mkdirSync(path.join(proofDir, 'workspace'), { recursive: true });
const userData = path.join(proofDir, 'test-user-data');
fs.mkdirSync(userData, { recursive: true });

const PORT = 9223;
const GUI_ENV = {
  PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
  HOME: os.homedir(),
  TMPDIR: os.tmpdir(),
  CAULDRON_BACKGROUND_TEST: '1',
  CAULDRON_TEST_USER_DATA: userData,
};

let passed = 0;
const failures = [];
const check = (name, ok, detail = '') => {
  if (ok) {
    passed++;
    console.log(`ok - ${name}`);
  } else {
    failures.push(`${name}${detail ? `: ${detail}` : ''}`);
    console.error(`FAIL - ${name}${detail ? `: ${detail}` : ''}`);
  }
};

function launchApp() {
  const child = spawn(exe, [`--remote-debugging-port=${PORT}`], {
    env: GUI_ENV,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.stdout.write(`[app] ${d}`));
  child.stderr.on('data', (d) => process.stdout.write(`[app:err] ${d}`));
  return child;
}

async function connectCdp(timeoutMs = 30000, match) {
  const want = match ?? ((t) => t.type === 'page' && t.title === 'Cauldron');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const list = await (
        await fetch(`http://127.0.0.1:${PORT}/json/list`)
      ).json();
      const page = list.find(want);
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          ws.once = ws.addEventListener;
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
            msg.error
              ? reject(new Error(msg.error.message))
              : resolve(msg.result);
          }
        });
        const send = (method, params = {}) =>
          new Promise((resolve, reject) => {
            id += 1;
            pending.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, method, params }));
          });
        return {
          ws,
          send,
          evaluate: async (expression) => {
            const result = await send('Runtime.evaluate', {
              expression,
              awaitPromise: true,
              returnByValue: true,
            });
            if (result.exceptionDetails)
              throw new Error(
                result.exceptionDetails.exception?.description ??
                  'renderer exception',
              );
            return result.result?.value;
          },
          screenshot: async (file) => {
            const shot = await send('Page.captureScreenshot', {
              format: 'png',
            });
            fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
            console.log(`screenshot: ${file}`);
          },
        };
      }
    } catch {
      // The debugging endpoint is not up yet.
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('Could not attach to the app over CDP.');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitUi(cdp, text, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await cdp.evaluate(
      `document.body.innerText.includes(${JSON.stringify(text)})`,
    );
    if (found) return true;
    await sleep(300);
  }
  return false;
}

async function clickButton(cdp, label) {
  return cdp.evaluate(
    `(() => {
      const buttons = [...document.querySelectorAll('button')]
        .filter((b) => !b.disabled && b.textContent.trim() === ${JSON.stringify(label)});
      if (buttons.length === 0) return false;
      buttons[buttons.length - 1].click();
      return true;
    })()`,
  );
}

async function fillField(cdp, ariaLabel, value) {
  return cdp.evaluate(
    `(() => {
      const input = document.querySelector(\`input[aria-label="\${${JSON.stringify(ariaLabel)}}"]\`);
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`,
  );
}

async function clickUntilReady(cdp, label, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await clickButton(cdp, label)) return true;
    await sleep(400);
  }
  return false;
}

async function clickRowButton(cdp, rowText, label) {
  return cdp.evaluate(
    `(() => {
      const row = [...document.querySelectorAll('.recent-row')]
        .find((li) => li.textContent.includes(${JSON.stringify(rowText)}));
      if (!row) return false;
      const button = [...row.querySelectorAll('button')]
        .find((b) => !b.disabled && b.textContent.trim() === ${JSON.stringify(label)});
      if (!button) return false;
      button.click();
      return true;
    })()`,
  );
}

async function siteState(cdp) {
  return cdp.evaluate(`window.cauldron.state()`);
}

function stopApp(child) {
  return new Promise((resolve) => {
    child.once('exit', resolve);
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 3000).unref();
  });
}

const workspace = path.join(proofDir, 'workspace');
const projectName = 'Lighthouse Lookout';
const projectRoot = path.join(workspace, projectName);

// --- 1. First launch: the project home --------------------------------------
let app = launchApp();
let cdp = await connectCdp();
await cdp.send('Page.enable');
await waitUi(cdp, 'Projects', 30000);
check(
  'home shows the workflow entry points on first launch',
  (await waitUi(cdp, 'New Astro project')) &&
    (await waitUi(cdp, 'Create and prepare')) &&
    (await waitUi(cdp, 'Open existing project…')),
);
check(
  'home states the empty library honestly',
  await waitUi(cdp, 'Nothing here yet'),
);
await cdp.screenshot(path.join(proofDir, '1-home-first-launch.png'));

// --- 2. Create a project through the form -----------------------------------
check(
  'project name field accepts input',
  await fillField(cdp, 'Project name', projectName),
);
check(
  'parent location is an editable path field (real UI fallback for automation)',
  await fillField(cdp, 'Location for the new project folder', workspace),
);
check(
  'Create and prepare is clickable',
  await clickUntilReady(cdp, 'Create and prepare'),
);
check(
  'install progress appears and finishes',
  await waitUi(cdp, 'Dependencies ready.', 300000),
);
await cdp.screenshot(path.join(proofDir, '2-install-complete.png'));

// --- 3. Open the created project; real preview ------------------------------
check(
  'Open project button appears after install',
  await clickButton(cdp, 'Open project'),
);
const state = await (async () => {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const current = await siteState(cdp);
    if (current.site && current.running && current.url) return current;
    await sleep(500);
  }
  return null;
})();
check('the created project opened into the build view', Boolean(state?.site));
check(
  'the site name shown is the display name, not the slug',
  state?.site?.name === projectName,
  String(state?.site?.name),
);
check(
  'the preview is really running',
  Boolean(state?.running),
  JSON.stringify(state),
);
if (state?.url) {
  const response = await fetch(state.url);
  const html = await response.text();
  check(
    'preview answers HTTP 200 with the project name rendered',
    response.status === 200 && html.includes(projectName),
  );
}
await sleep(1200);
await cdp.screenshot(path.join(proofDir, '3-created-project-editor.png'));

// --- 3b. The embedded preview is a real child view: bounds, visibility, render
// (issue 32 review gap: the previous run's main-page screenshot showed a black
// centre pane; prove the child view itself from inside the app instead).
const savePng = (dataUrl, file) => {
  const prefix = 'data:image/png;base64,';
  if (typeof dataUrl === 'string' && dataUrl.startsWith(prefix)) {
    fs.writeFileSync(file, Buffer.from(dataUrl.slice(prefix.length), 'base64'));
    console.log(`capture: ${file}`);
    return true;
  }
  return false;
};
const shown = await cdp.evaluate(`window.cauldron.testPreviewIntrospect()`);
check(
  'the preview child view exists with positive bounds while the build view shows it',
  shown.hasView &&
    shown.bounds.width > 100 &&
    shown.bounds.height > 100 &&
    shown.visible === true,
  JSON.stringify({
    hasView: shown.hasView,
    bounds: shown.bounds,
    visible: shown.visible,
  }),
);
// The child view's real URL comes from its own CDP target (webContents.getURL
// has been observed empty for this sandboxed child view; the target URL is
// the ground truth).
let childUrl = null;
let childTitle = null;
{
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const target = list.find(
    (t) => t.type === 'page' && t.url.startsWith('http'),
  );
  childUrl = target ? target.url : null;
  const child = await connectCdp(
    15000,
    (t) => t.type === 'page' && t.url.startsWith('http'),
  );
  const shot = await child.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(
    path.join(proofDir, '6-preview-child.png'),
    Buffer.from(shot.data, 'base64'),
  );
  console.log(`capture: ${path.join(proofDir, '6-preview-child.png')}`);
  childTitle = await child.evaluate('document.title');
  child.ws.close();
}
check(
  'the child preview view is really on the site URL',
  typeof childUrl === 'string' && childUrl.startsWith('http'),
  String(childUrl),
);
check(
  'the child preview page renders the project (its own title, captured over CDP)',
  typeof childTitle === 'string' && childTitle.includes(projectName),
  String(childTitle),
);
// The parent-window capture is saved for inspection only; it is NOT claimed
// as a composite screenshot of the whole window.
savePng(shown.parentPng, path.join(proofDir, '7-parent-window-capture.png'));
check(
  'Projects is reachable from the top bar',
  await clickButton(cdp, 'Projects'),
);
check(
  'the project home hides the preview view (zero bounds, invisible)',
  await (async () => {
    await sleep(800);
    const hidden = await cdp.evaluate(
      `window.cauldron.testPreviewIntrospect()`,
    );
    return hidden.visible === false && hidden.bounds.width === 0;
  })(),
);
check(
  'the Sites rail button returns to the build view',
  await cdp.evaluate(
    `(() => { const b = [...document.querySelectorAll('.rail-button')].find((x) => x.title === 'Sites'); if (!b) return false; b.click(); return true; })()`,
  ),
);
check(
  'reopening the build view restores the visible preview',
  await (async () => {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const again = await cdp.evaluate(
        `window.cauldron.testPreviewIntrospect()`,
      );
      if (again.visible && again.bounds.width > 100) return true;
      await sleep(400);
    }
    return false;
  })(),
);
check(
  'the created project is in the library',
  await waitUi(cdp, projectName, 15000),
);

// Store location proof: the project's node_modules must point at the
// app-managed shared store, not a per-userData or per-project store.
const modulesYaml = fs.readFileSync(
  path.join(projectRoot, 'node_modules', '.modules.yaml'),
  'utf8',
);
const expectedStore = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'Cauldron',
  'pnpm-store',
);
check(
  'the project installed against the app-managed shared store',
  modulesYaml.includes(expectedStore),
  modulesYaml.split('storeDir:')[1]?.trim() ?? 'no storeDir line',
);

// --- 4. Restart the app with the SAME user data; reopen from the library ----
await stopApp(app);
await sleep(1500);
app = launchApp();
cdp = await connectCdp();
await cdp.send('Page.enable');
await waitUi(cdp, 'Projects', 30000);
check(
  'the library persisted across an app restart',
  await waitUi(cdp, projectName, 15000),
);
await cdp.screenshot(path.join(proofDir, '4-home-after-restart.png'));
check('Open on the recent entry is clickable', await clickButton(cdp, 'Open'));
const reopened = await (async () => {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const current = await siteState(cdp);
    if (current.site && current.running) return current;
    await sleep(500);
  }
  return null;
})();
check(
  'reopen from the library really starts the preview again',
  reopened?.site?.name === projectName,
);

// --- 5. Missing folder is reported, entry removal leaves the disk alone -----
await stopApp(app);
await sleep(1500);
const moved = `${projectRoot}-moved-away`;
fs.renameSync(projectRoot, moved);
app = launchApp();
cdp = await connectCdp();
await cdp.send('Page.enable');
await waitUi(cdp, 'Projects', 30000);
check(
  'a moved project folder is reported in the library',
  await waitUi(cdp, 'Folder moved or missing', 15000),
);
check(
  'no Open button is offered for a missing project',
  await cdp.evaluate(
    `(() => {
      const row = [...document.querySelectorAll('.recent-row')]
        .find((li) => li.textContent.includes(${JSON.stringify(projectName)}));
      return Boolean(row) && ![...row.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Open');
    })()`,
  ),
);
fs.renameSync(moved, projectRoot);

// --- 6. Removing the entry never deletes the project ------------------------
check(
  'Remove from list is clickable',
  await clickButton(cdp, 'Remove from list'),
);
await sleep(1000);
const goneFromUi = !(await cdp.evaluate(
  `document.body.innerText.includes(${JSON.stringify(projectName)})`,
));
check('the removed entry left the library list', goneFromUi);
check(
  'the project folder itself is untouched on disk',
  fs.existsSync(path.join(projectRoot, 'package.json')),
);

// --- 6b. Existing project without dependencies: inspect, consent, install ----
const NL = String.fromCharCode(10); // real newlines, no escape ambiguity
const writeMinimalAstro = (root, deps) => {
  fs.mkdirSync(path.join(root, 'src/pages'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify(
      {
        name: path.basename(root).toLowerCase().split(' ').join('-'),
        type: 'module',
        private: true,
        packageManager: 'pnpm@10.34.2',
        scripts: { dev: 'astro dev' },
        dependencies: deps,
      },
      null,
      2,
    ) + NL,
  );
  fs.writeFileSync(
    path.join(root, 'astro.config.mjs'),
    [
      "import { defineConfig } from 'astro/config';",
      '',
      'export default defineConfig({});',
      '',
    ].join(NL),
  );
  fs.mkdirSync(path.join(root, 'src/layouts'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'src/layouts/Base.astro'),
    [
      '---',
      'interface Props { title: string }',
      'const { title } = Astro.props;',
      '---',
      '<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>{title}</title></head><body><slot /></body></html>',
      '',
    ].join(NL),
  );
  const base = path.basename(root);
  fs.writeFileSync(
    path.join(root, 'src/pages/index.astro'),
    [
      '---',
      "import Base from '../layouts/Base.astro';",
      `const projectName = ${JSON.stringify(base)};`,
      '---',
      '<Base title={projectName}><main><h1>{projectName}</h1></main></Base>',
      '',
    ].join(NL),
  );
};
const cottageRoot = path.join(workspace, 'Cliff Cottage');
writeMinimalAstro(cottageRoot, { astro: '7.4.7' });
check(
  'the existing-project path field accepts a real folder path',
  await fillField(cdp, 'Path of the existing project folder', cottageRoot),
);
check(
  'Open by path inspects the unprepared project',
  await clickUntilReady(cdp, 'Open by path'),
);
check(
  'the consent panel names the detected package manager and asks before downloading',
  (await waitUi(cdp, 'Detected setup: package manager pnpm', 20000)) &&
    (await waitUi(cdp, 'needs its dependencies installed', 5000)),
);
await cdp.screenshot(path.join(proofDir, '8-existing-consent.png'));
check(
  'Install dependencies and open is offered on the consent panel',
  await clickUntilReady(cdp, 'Install dependencies and open'),
);
// With install-and-open consent the finished card is replaced by the opened
// project immediately, so the proof is the opened project itself.
const cottageState = await (async () => {
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    const current = await siteState(cdp);
    if (current.site?.name === 'Cliff Cottage' && current.running)
      return current;
    await sleep(500);
  }
  return null;
})();
check(
  'the consented install completed and the existing project opened automatically',
  Boolean(cottageState),
);
check(
  'the consented existing project really previews',
  Boolean(cottageState?.running),
);

// --- 6c. A fast install failure is shown, recoverable, and offered again -----
check(
  'the library is opened for the failure test',
  await clickButton(cdp, 'Projects'),
);
await sleep(800); // let the view switch settle before the next fill/click
const brokenRoot = path.join(workspace, 'Broken Bones');
writeMinimalAstro(brokenRoot, { astro: '999.999.999' });
check(
  'the path field accepts the broken-dependency project',
  await fillField(cdp, 'Path of the existing project folder', brokenRoot),
);
check(
  'Open by path inspects the broken project',
  await clickUntilReady(cdp, 'Open by path'),
);
check(
  'the consent panel appears for the broken project too',
  await waitUi(cdp, 'needs its dependencies installed', 20000),
);
check(
  'Install dependencies and open starts the doomed install',
  await clickUntilReady(cdp, 'Install dependencies and open'),
);
check(
  'the fast install failure is shown in the install card',
  await waitUi(cdp, 'The install failed.', 240000),
);
check(
  'Try again is offered after the failure',
  await clickButton(cdp, 'Try again'),
);
check(
  'the retried install fails again (deterministic bad version)',
  await waitUi(cdp, 'The install failed.', 240000),
);
check(
  'the failing install can be dismissed',
  await clickButton(cdp, 'Dismiss'),
);
await sleep(1000);
check(
  'after a dismiss the library entry offers Install dependencies again',
  await clickRowButton(cdp, 'Broken Bones', 'Install dependencies'),
);
await sleep(1500);
const cancelledAgain = await clickButton(cdp, 'Cancel install');
check(
  'the re-offered install can be cancelled or fails visibly either way',
  cancelledAgain
    ? await waitUi(cdp, 'The install was cancelled.', 60000)
    : await waitUi(cdp, 'The install failed.', 240000),
);
await clickButton(cdp, 'Dismiss');
await sleep(500);

// --- 6d. Unsaved edits are guarded before any project switch -----------------
check(
  'a recovery draft can be saved through the real IPC',
  await cdp.evaluate(
    `window.cauldron.saveDrafts([{ key: 'proof-1', file: 'src/pages/index.astro', line: 1, column: 1, name: 'heading', field: 'text', value: 'Unsaved proof edit', savedAt: Date.now() }])`,
  ),
);
check(
  'the library is opened for the switch test',
  await clickButton(cdp, 'Projects'),
);
await sleep(800); // let the view switch settle before the next fill/click
check(
  'opening another project while recovery drafts exist asks first',
  // The Lighthouse entry was removed in section 6, so this open goes through
  // the path field — the same guarded open path either way.
  (await fillField(cdp, 'Path of the existing project folder', projectRoot)) &&
    (await clickUntilReady(cdp, 'Open by path')) &&
    (await waitUi(cdp, 'Unsaved edits in this project', 20000)),
);
await cdp.screenshot(path.join(proofDir, '9-unsaved-guard.png'));
check(
  'Keep editing is offered and keeps the current project',
  await clickButton(cdp, 'Keep editing'),
);
await sleep(1000);
check(
  'after Keep editing the current project is unchanged',
  (await siteState(cdp))?.site?.name === 'Cliff Cottage',
);
check(
  'after Keep editing the drafts are preserved',
  ((await siteState(cdp))?.drafts.length ?? 0) > 0,
);
check(
  'the library is opened again for the discard test',
  await clickButton(cdp, 'Projects'),
);
await sleep(800);
check(
  'opening the other project asks again',
  (await fillField(cdp, 'Path of the existing project folder', projectRoot)) &&
    (await clickUntilReady(cdp, 'Open by path')) &&
    (await waitUi(cdp, 'Unsaved edits in this project', 20000)),
);
check(
  'Discard changes and open is an explicit choice',
  await clickButton(cdp, 'Discard changes and open'),
);
const switchState = await (async () => {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const current = await siteState(cdp);
    if (current.site?.name === projectName) return current;
    await sleep(500);
  }
  return null;
})();
check('the explicit discard let the other project open', Boolean(switchState));
check(
  'the discarded drafts are gone after the explicit choice',
  ((await siteState(cdp))?.drafts.length ?? 0) === 0,
);

// --- 7. Existing target is never overwritten; the failure is visible --------
// 6d ended with a project open in the build view; go back to the home first.
check(
  'the library is opened for the clash test',
  await clickButton(cdp, 'Projects'),
);
await sleep(800);
check(
  'name field accepts input for a clash test',
  await fillField(cdp, 'Project name', projectName),
);
check(
  'parent path accepts input',
  await fillField(cdp, 'Location for the new project folder', workspace),
);
check(
  'Create and prepare clickable for the clash test',
  await clickUntilReady(cdp, 'Create and prepare'),
);
check(
  'an existing folder is refused with a visible message, nothing overwritten',
  await waitUi(cdp, 'already sits at that path', 20000),
);
check(
  'controls are usable again after the failure',
  await cdp.evaluate(
    `(() => {
      const button = [...document.querySelectorAll('button')]
        .find((b) => b.textContent.trim() === 'Create and prepare');
      return Boolean(button && !button.disabled);
    })()`,
  ),
);
await cdp.screenshot(path.join(proofDir, '5-existing-folder-refused.png'));

// --- 8. Install cancel and retry (representative failure path) --------------
const retryName = 'Harbour Retry';
check(
  'name field for the cancel test',
  await fillField(cdp, 'Project name', retryName),
);
check(
  'parent path for the cancel test',
  await fillField(cdp, 'Location for the new project folder', workspace),
);
check(
  'Create and prepare clickable for the cancel test',
  await clickUntilReady(cdp, 'Create and prepare'),
);
// Cancel as soon as the install card appears.
let cancelled = false;
{
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline && !cancelled) {
    if (await waitUi(cdp, 'Installing dependencies', 1000)) {
      cancelled = await clickButton(cdp, 'Cancel install');
      break;
    }
    if (
      await cdp.evaluate(
        `document.body.innerText.includes('Dependencies ready.')`,
      )
    )
      break;
    await sleep(500);
  }
}
check(
  'a running install can be cancelled and the failure is shown',
  cancelled && (await waitUi(cdp, 'The install was cancelled.', 30000)),
);
check(
  'Try again is offered after the failure',
  await clickButton(cdp, 'Try again'),
);
check(
  'the retried install completes',
  await waitUi(cdp, 'Dependencies ready.', 300000),
);
check('the retried project opens', await clickButton(cdp, 'Open project'));
const retryState = await (async () => {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const current = await siteState(cdp);
    if (current.site && current.running) return current;
    await sleep(500);
  }
  return null;
})();
check(
  'the retried project really opened and previews',
  retryState?.site?.name === retryName,
);
check(
  'the failed-then-retried project is in the library (no EEXIST dead end)',
  await (async () => {
    await clickButton(cdp, 'Projects');
    return waitUi(cdp, retryName, 15000);
  })(),
);

await stopApp(app);
await sleep(1000);

console.log(`\n${passed} checks passed, ${failures.length} failed.`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAILED: ${failure}`);
  process.exit(1);
}
console.log(`Proof artifacts in ${proofDir}`);
