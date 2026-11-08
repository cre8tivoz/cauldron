// Focused React regressions, not an IPC/provider proof. Serves the actual built
// renderer with an explicit bridge fixture to exercise picker/discard scheduling.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ||
    '/Users/habibi/hermes/apps-codebases/axial-app/node_modules/playwright/index.mjs'
);
const root = path.resolve('.vite/renderer/main_window');
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
const browser = await chromium.launch({ headless: true });
let failed = 0;
try {
  for (const scenario of ['picker', 'discard']) {
    const page = await browser.newPage();
    await page.addInitScript(() => {
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
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page
      .getByRole('heading', { name: 'Projects', exact: true })
      .waitFor();
    try {
      if (scenario === 'picker') {
        await page
          .getByRole('button', { name: 'Open existing project…', exact: true })
          .click();
        await page.waitForTimeout(500);
        assert.deepEqual(await page.evaluate(() => window.proof.opens), [
          '/fixture/picked',
        ]);
        console.log(
          'PASS picker result reaches the shared open handler after async selection',
        );
      } else {
        await page.locator('button[title="Sites"]').click();
        const text = page.locator('.inspector-pane textarea').first();
        await text.fill('Typed unsaved edit');
        await page
          .getByRole('button', { name: 'Projects', exact: true })
          .click();
        await page
          .getByLabel('Path of the existing project folder')
          .fill('/fixture/another');
        await page
          .getByRole('button', { name: 'Open by path', exact: true })
          .click();
        await page.getByRole('dialog', { name: 'Unsaved edits' }).waitFor();
        assert.deepEqual(await page.evaluate(() => window.proof.opens), []);
        await page
          .getByRole('button', {
            name: 'Discard changes and open',
            exact: true,
          })
          .click();
        await page.waitForTimeout(400);
        assert.deepEqual(await page.evaluate(() => window.proof.opens), [
          '/fixture/another',
        ]);
        assert.equal(
          await page.getByRole('dialog', { name: 'Unsaved edits' }).count(),
          0,
        );
        assert.equal(await page.evaluate(() => window.proof.discards), 1);
        console.log(
          'PASS typed-unsaved edits require confirmation and explicit discard opens once',
        );
      }
    } catch (error) {
      failed++;
      console.error(`FAIL ${scenario}: ${error.message}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
process.exitCode = failed ? 1 : 0;
