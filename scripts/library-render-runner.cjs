// Runs inside Electron (spawned by scripts/test-library-render.mjs). Renders
// every page in the manifest in a hidden window and reports measurements; the
// Node side turns them into pass/fail. Input is real (sendInputEvent), pixels
// are real (capturePage), nothing here judges by CSS strings.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('force-color-profile', 'srgb');
app.disableHardwareAcceleration();

const dir = process.argv[process.argv.length - 1];
const manifest = JSON.parse(
  fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'),
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Leaf text runs: elements with their own visible text.
const COLLECT = `(() => {
  const out = [];
  const W = innerWidth, H = innerHeight;
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE'].includes(el.tagName)) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own && !(el.tagName === 'INPUT' && (el.value || el.placeholder))) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.right <= 0 || r.bottom <= 0 || r.left >= W || r.top >= H) continue;
    let weight = parseInt(cs.fontWeight, 10) || 400;
    out.push({
      text: (el.value || el.textContent || el.placeholder || '').trim().slice(0, 32),
      x: Math.max(0, Math.floor(r.left)), y: Math.max(0, Math.floor(r.top)),
      w: Math.min(W, Math.ceil(r.right)) - Math.max(0, Math.floor(r.left)),
      h: Math.min(H, Math.ceil(r.bottom)) - Math.max(0, Math.floor(r.top)),
      size: parseFloat(cs.fontSize), weight,
      clipped: (' ' + cs.webkitBackgroundClip + ' ' + cs.backgroundClip).indexOf('text') > -1,
    });
  }
  return out;
})()`;

const STYLE_ID = '__cauldron_audit_mode';
const MODE = (mode) => `(() => {
  document.getElementById('${STYLE_ID}')?.remove();
  for (const el of document.querySelectorAll('[data-audit-bg]')) { el.style.background = el.dataset.auditBg; delete el.dataset.auditBg; }
  if (!'${mode}') return true;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    // Two gradient layers compute as "text, text", so test for the keyword, not equality.
    if ((' ' + cs.webkitBackgroundClip + ' ' + cs.backgroundClip).indexOf('text') > -1) { el.dataset.auditBg = el.style.background; el.style.background = 'none'; }
  }
  const s = document.createElement('style'); s.id = '${STYLE_ID}';
  const fill = '${mode}' === 'mask' ? '#ff00ff' : 'transparent';
  s.textContent = '*, *::placeholder { color: ' + fill + ' !important; -webkit-text-fill-color: ' + fill + ' !important; text-shadow: none !important; caret-color: transparent !important; }';
  document.head.appendChild(s);
  return true;
})()`;

// Pausing in CSS as well as through the animation API: a compositor-driven
// animation (a translate) only holds its phase for every capture if the phase is
// part of the style, not just the animation's time.
const FREEZE = `(() => {
  if (document.getElementById('__cauldron_freeze')) return true;
  const s = document.createElement('style'); s.id = '__cauldron_freeze';
  s.textContent = '*, *::before, *::after { animation-play-state: paused !important; }';
  document.head.appendChild(s);
  for (const a of document.getAnimations()) a.pause();
  return true;
})()`;
// Entrance animations (a one-shot fade/rise) are judged at their settled state:
// judging 12% opacity against 4.5:1 would fail every entrance animation ever
// written. Looping animations (a sheen, a drift) are judged at eight frames.
const SETTLE = `(() => {
  for (const a of document.getAnimations()) {
    a.pause();
    const t = a.effect?.getComputedTiming?.();
    if (t && Number.isFinite(t.endTime)) a.currentTime = t.endTime;
  }
  return document.getAnimations().length;
})()`;
const ANIMATIONS = `(() => {
  const a = document.getAnimations();
  return { count: a.length, looping: a.some((x) => { const t = x.effect?.getComputedTiming?.(); return !t || !Number.isFinite(t.iterations); }) };
})()`;
const FRAME = (k, n) => `(() => {
  const anims = document.getAnimations();
  for (const a of anims) {
    a.pause();
    const t = a.effect?.getComputedTiming?.();
    const d = t && Number.isFinite(t.duration) ? t.duration : 0;
    a.currentTime = (t?.delay || 0) + d * ((${k} + 0.5) / ${n});
  }
  return anims.length;
})()`;

// A hidden window serves its last committed tile until something forces a
// commit. invalidate() is the supported way: nudging the DOM with a transform
// promotes the page to its own layer and the capture comes back nearly blank.
async function flush(win) {
  win.webContents.invalidate();
  await win.webContents.executeJavaScript(
    'new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))))',
  );
}

// Capture only the band the text occupies (CSS px), so the pixel work stays
// small. capturePage takes DIP, which is CSS px here.
async function bitmap(win, clip) {
  await flush(win);
  const img = await win.webContents.capturePage({
    x: Math.max(0, Math.floor(clip.x)),
    y: Math.max(0, Math.floor(clip.y)),
    width: Math.ceil(clip.width),
    height: Math.ceil(clip.height),
  });
  const { width, height } = img.getSize();
  return { width, height, data: img.toBitmap() }; // BGRA
}

const lin = (v) => {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = (b, g, r) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

function measure(cssRun, A, B, C, scale, ox, oy, pageMax) {
  // The capture is in device pixels (2x on a Retina Mac) and starts at (ox, oy).
  cssRun = { ...cssRun, x: cssRun.x - ox, y: cssRun.y - oy };
  // Interior glyph pixels: where the magenta mask render is (nearly) fully
  // covered relative to the background-only render. Contrast per pixel of the
  // real render against the background render; report the 5th percentile.
  const W = A.width,
    H = A.height;
  const x0 = Math.max(0, Math.floor(cssRun.x * scale)),
    y0 = Math.max(0, Math.floor(cssRun.y * scale));
  const x1 = Math.min(W, Math.ceil((cssRun.x + cssRun.w) * scale)),
    y1 = Math.min(H, Math.ceil((cssRun.y + cssRun.h) * scale));
  const idx = [];
  const cov = [];
  let amax = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      // Magenta is B255 G0 R255 (BGRA); solve coverage on the channel with most room.
      let best = 0,
        room = -1;
      for (let c = 0; c < 3; c++) {
        const r = Math.abs((c === 1 ? 0 : 255) - B.data[i + c]);
        if (r > room) {
          room = r;
          best = c;
        }
      }
      if (room < 40) continue;
      const target = best === 1 ? 0 : 255;
      const a =
        (C.data[i + best] - B.data[i + best]) / (target - B.data[i + best]);
      if (a > 0.05) {
        idx.push(i);
        cov.push(a);
        if (a > amax) amax = a;
      }
    }
  }
  if (!idx.length) return null;
  // Compare against the page's most opaque glyph, not this run's: text sitting
  // inside a vignette or a fade has no fully opaque pixel, and is reported as
  // unmeasurable rather than quietly passing.
  const ratios = [];
  // 0.98, not 0.95: on 13px strokes the extra 3% lets anti-aliasing fringes in,
  // which read a colour the text never actually is.
  const floor = 0.98 * Math.max(amax, pageMax);
  for (let k = 0; k < idx.length; k++) {
    if (cov[k] < floor) continue;
    const i = idx[k];
    const la = lum(A.data[i], A.data[i + 1], A.data[i + 2]);
    const lb = lum(B.data[i], B.data[i + 1], B.data[i + 2]);
    ratios.push((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05));
  }
  if (ratios.length < 6) return null;
  ratios.sort((p, q) => p - q);
  return {
    p5: ratios[Math.floor(ratios.length * 0.05)],
    min: ratios[0],
    pixels: ratios.length,
  };
}

// The most opaque glyph coverage anywhere in the band: fully painted text hits
// ~1, text inside a fade or vignette never does.
function bandMaxCoverage(A, B, C) {
  let max = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    let best = 0,
      room = -1;
    for (let c = 0; c < 3; c++) {
      const r = Math.abs((c === 1 ? 0 : 255) - B.data[i + c]);
      if (r > room) {
        room = r;
        best = c;
      }
    }
    if (room < 40) continue;
    const target = best === 1 ? 0 : 255;
    const a =
      (C.data[i + best] - B.data[i + best]) / (target - B.data[i + best]);
    if (a > max) max = a;
  }
  return max;
}

async function audit(win, page) {
  await win.loadFile(page.file);
  await win.webContents.executeJavaScript(
    'document.fonts.ready.then(() => true)',
  );
  await sleep(150);
  const runsFor = [];
  const anim = await win.webContents.executeJavaScript(ANIMATIONS);
  const frames = anim.looping ? 8 : 1;
  // Discard a full capture round before measuring: the first commit after a
  // navigation can still be the pre-paint surface, which reads as invisible text.
  await win.webContents.executeJavaScript(MODE('bg'));
  await bitmap(win, { x: 0, y: 0, width: 960, height: 600 });
  await win.webContents.executeJavaScript(MODE(''));
  await bitmap(win, { x: 0, y: 0, width: 960, height: 600 });
  const results = [];
  for (let k = 0; k < frames; k++) {
    if (anim.count) await win.webContents.executeJavaScript(FREEZE);
    if (anim.looping) await win.webContents.executeJavaScript(FRAME(k, frames));
    else if (anim.count) await win.webContents.executeJavaScript(SETTLE);
    await win.webContents.executeJavaScript(MODE(''));
    const runs = await win.webContents.executeJavaScript(COLLECT);
    // One band covering every run, with a margin for descenders and outlines.
    const clip = runs.length
      ? (() => {
          const x0 = Math.min(...runs.map((r) => r.x)),
            y0 = Math.min(...runs.map((r) => r.y));
          const x1 = Math.max(...runs.map((r) => r.x + r.w)),
            y1 = Math.max(...runs.map((r) => r.y + r.h));
          return {
            x: Math.max(0, x0 - 6),
            y: Math.max(0, y0 - 6),
            width: Math.min(960, x1 - x0 + 12),
            height: Math.min(600, y1 - y0 + 12),
          };
        })()
      : { x: 0, y: 0, width: 960, height: 600 };
    const band = { x: clip.x, y: clip.y };
    band.scale = 1;
    // Order matters: a hidden window's surface only repaints when a style change
    // lands, so the real render is captured LAST, right after the styles are
    // restored. Capturing it first returns a stale frame still mid-animation.
    await sleep(60);
    await win.webContents.executeJavaScript(MODE('bg'));
    await sleep(60);
    const B = await bitmap(win, clip);
    await win.webContents.executeJavaScript(MODE('mask'));
    await sleep(60);
    const C = await bitmap(win, clip);
    await win.webContents.executeJavaScript(MODE(''));
    await sleep(60);
    const A = await bitmap(win, clip);
    band.scale = A.width / Math.max(1, Math.round(clip.width));
    if (
      process.env.DEBUG_PAGE &&
      page.id === process.env.DEBUG_PAGE &&
      (!process.env.DEBUG_PALETTE || page.palette === process.env.DEBUG_PALETTE)
    ) {
      const dir = process.env.DEBUG_DIR || '/tmp';
      for (const [n, img] of [
        ['A', A],
        ['B', B],
        ['C', C],
      ])
        fs.writeFileSync(path.join(dir, `audit-${n}.bin`), img.data);
      fs.writeFileSync(
        path.join(dir, 'audit-meta.json'),
        JSON.stringify({
          clip,
          band,
          size: [A.width, A.height],
          runs,
          page: await win.webContents.executeJavaScript(
            `(() => { const h = document.querySelector('h2,h1,p'); return { href: location.pathname.split('/').pop(), bodyBg: getComputedStyle(document.body).backgroundColor, ink: h ? getComputedStyle(h).color : null, vars: ['--cauldron-c-bg', '--cauldron-c-ink', '--cauldron-c-surface'].map((v) => getComputedStyle(document.body).getPropertyValue(v).trim() || '(unset)'), sheets: [...document.styleSheets].map((s) => (s.href || '(inline)') + ':' + s.cssRules.length) }; })()`,
          ),
        }),
      );
    }
    const pageMax = bandMaxCoverage(A, B, C);
    for (const run of runs) {
      const m = measure(run, A, B, C, band.scale, band.x, band.y, pageMax);
      if (m) results.push({ frame: k, ...run, ...m });
    }
    runsFor.push(runs.length);
  }
  return { frames, runs: runsFor, results };
}

async function phone(win, page) {
  win.setContentSize(375, 740);
  await win.loadFile(page.file);
  await sleep(150);
  const r = await win.webContents.executeJavaScript(
    `({ scroll: document.scrollingElement.scrollWidth, section: Math.round(document.querySelector('body > section')?.getBoundingClientRect().width || 0) })`,
  );
  win.setContentSize(960, 600);
  return r;
}

// ── Real input helpers for the behaviour pages ─────────────────────────────
async function click(win, sel) {
  // A 3D-transformed card's bounding box is bigger than what it paints, so the
  // rect centre can land on a neighbour. Find a point that really hits it.
  const point = await win.webContents.executeJavaScript(`(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    for (let gy = 0.5; gy >= 0.1; gy -= 0.1) {
      for (let gx = 0.5; gx >= 0.1; gx -= 0.1) {
        for (const signX of [1, -1]) {
          for (const signY of [1, -1]) {
            const x = Math.round(r.left + r.width / 2 + signX * (r.width * (0.5 - gx)));
            const y = Math.round(r.top + r.height / 2 + signY * (r.height * (0.5 - gy)));
            const hit = document.elementFromPoint(x, y);
            if (hit && (hit === el || el.contains(hit))) return { x, y };
          }
        }
      }
    }
    return null;
  })()`);
  if (!point) throw new Error(`nothing clickable found inside ${sel}`);
  win.webContents.sendInputEvent({ type: 'mouseMove', x: point.x, y: point.y });
  win.webContents.sendInputEvent({
    type: 'mouseDown',
    x: point.x,
    y: point.y,
    button: 'left',
    clickCount: 1,
  });
  win.webContents.sendInputEvent({
    type: 'mouseUp',
    x: point.x,
    y: point.y,
    button: 'left',
    clickCount: 1,
  });
  await sleep(120);
}
async function key(win, keyCode) {
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode });
  if (keyCode.length === 1)
    win.webContents.sendInputEvent({ type: 'char', keyCode });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode });
  await sleep(60);
}
async function type(win, text) {
  for (const c of text) await key(win, c);
  await sleep(80);
}
const js = (win, expr) => win.webContents.executeJavaScript(expr);
// Records a link the page would really follow (a click it did not cancel).
const NO_NAV = `document.addEventListener('click', (e) => { const a = e.target.closest('a'); if (!a) return; if (!e.defaultPrevented) window.__opened = a.getAttribute('href'); e.preventDefault(); }); true`;

async function behaviourPalette(win, page) {
  const out = {};
  await win.loadFile(page.file);
  await sleep(200);
  win.webContents.focus();
  await js(win, NO_NAV);
  out.hintShown = await js(win, `!document.querySelector('.cp-hint').hidden`);
  out.combobox = await js(
    win,
    `document.querySelector('[data-cp] input').getAttribute('role') === 'combobox' && Boolean(document.getElementById(document.querySelector('[data-cp] input').getAttribute('aria-controls')))`,
  );
  const shown = () =>
    js(
      win,
      `[...document.querySelectorAll('.cp-item')].filter((i) => !i.hidden).map((i) => i.textContent.trim())`,
    );
  await click(win, '[data-cp] input');
  out.focusedByClick = await js(
    win,
    `document.activeElement === document.querySelector('[data-cp] input')`,
  );
  await type(win, 'pri');
  out.afterPri = await shown();
  out.groupsAfterPri = await js(
    win,
    `[...document.querySelectorAll('.cp-group')].filter((g) => !g.hidden).map((g) => g.textContent.trim())`,
  );
  await key(win, 'Escape');
  out.afterEscape = {
    value: await js(win, `document.querySelector('[data-cp] input').value`),
    shown: (await shown()).length,
  };
  await type(win, 'zzz');
  out.noMatch = {
    shown: (await shown()).length,
    emptyShown: await js(win, `!document.querySelector('.cp-empty').hidden`),
  };
  await key(win, 'Escape');
  await type(win, 'book');
  out.keyword = await shown();
  await key(win, 'Escape');
  await key(win, 'Down');
  await key(win, 'Down');
  out.activeAfterDown2 = await js(
    win,
    `(() => { const a = document.querySelector('.cp-item.cp-active'); const i = document.querySelector('[data-cp] input'); return { text: a?.textContent.trim(), selected: a?.getAttribute('aria-selected'), descendant: i.getAttribute('aria-activedescendant') === a?.id }; })()`,
  );
  await key(win, 'Up');
  await key(win, 'Up');
  await key(win, 'Up');
  out.wrapUp = await js(
    win,
    `document.querySelector('.cp-item.cp-active')?.textContent.trim()`,
  );
  await key(win, 'Escape');
  await key(win, 'Down');
  await key(win, 'Down');
  await key(win, 'Return');
  out.enterOpened = await js(win, `window.__opened ?? null`);
  await js(win, `document.activeElement.blur(); true`);
  // A real "/" keydown; the page must take it (preventDefault) and move focus.
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: '/' });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: '/' });
  await sleep(80);
  out.slashFocuses = await js(
    win,
    `document.activeElement === document.querySelector('[data-cp] input') && document.querySelector('[data-cp] input').value === ''`,
  );
  return out;
}

async function behaviourCoverflow(win, page) {
  const out = {};
  await win.loadFile(page.file);
  await sleep(200);
  win.webContents.focus();
  await js(win, NO_NAV);
  const state = () =>
    js(
      win,
      `({ centre: document.querySelector('.cf-card[data-pos="0"] h4')?.textContent, status: document.querySelector('.cf-status').textContent, current: document.querySelector('.cf-card[aria-current="true"] h4')?.textContent, left: document.querySelector('.cf-card[data-pos="-1"] h4')?.textContent, centreHref: document.querySelector('.cf-card[data-pos="0"]')?.getAttribute('href') })`,
    );
  out.controlsShown = await js(
    win,
    `!document.querySelector('.cf-controls').hidden`,
  );
  out.start = await state();
  await click(win, '.cf-next');
  await sleep(650);
  out.afterNext = await state();
  await js(win, `document.querySelector('[data-cf]').focus(); true`);
  await key(win, 'Left');
  await sleep(650);
  out.afterLeft = await state();
  await key(win, 'Right');
  await key(win, 'Right');
  await key(win, 'Right');
  await sleep(650);
  out.wrapped = await state();
  // A side card brings its own project forward and must not leave the page.
  out.sideTarget = (await state()).left;
  await js(win, `window.__opened = null; true`);
  await click(win, '.cf-card[data-pos="-1"]');
  await sleep(650);
  out.sideClick = await state();
  out.sideOpened = await js(win, `window.__opened`);
  // The centre card is a real link.
  out.centreHref = (await state()).centreHref;
  await js(win, `window.__opened = null; true`);
  await click(win, '.cf-card[data-pos="0"]');
  await sleep(300);
  out.centreOpened = await js(win, `window.__opened`);
  // A drag with the button held down; the click it ends with must not fire.
  await js(win, `window.__opened = null; true`);
  out.swipeFrom = (await state()).centre;
  const r = await js(
    win,
    `(() => { const s = document.querySelector('.cf-stage').getBoundingClientRect(); return { x: Math.round(s.left + s.width / 2), y: Math.round(s.top + 40) }; })()`,
  );
  win.webContents.sendInputEvent({
    type: 'mouseDown',
    x: r.x + 80,
    y: r.y,
    button: 'left',
    clickCount: 1,
  });
  for (const step of [40, 0, -40])
    win.webContents.sendInputEvent({
      type: 'mouseMove',
      x: r.x + step,
      y: r.y,
      modifiers: ['leftButtonDown'],
    });
  win.webContents.sendInputEvent({
    type: 'mouseUp',
    x: r.x - 40,
    y: r.y,
    button: 'left',
    clickCount: 1,
  });
  await sleep(700);
  out.afterSwipe = await state();
  out.swipeOpened = await js(win, `window.__opened`);
  return out;
}

async function noScript(page) {
  const win = new BrowserWindow({
    show: false,
    width: 960,
    height: 600,
    webPreferences: { javascript: false },
  });
  await win.loadFile(page.file);
  await sleep(150);
  // With JavaScript off we can only read the DOM through the debugger.
  win.webContents.debugger.attach('1.3');
  const { result } = await win.webContents.debugger.sendCommand(
    'Runtime.evaluate',
    {
      expression: `({ links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')), hiddenControls: [...document.querySelectorAll('[hidden]')].map((e) => e.className), visibleButtons: [...document.querySelectorAll('button')].filter((b) => b.offsetParent).length })`,
      returnByValue: true,
    },
  );
  win.destroy();
  return result.value;
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 960,
    height: 600,
    useContentSize: true,
    webPreferences: { backgroundThrottling: false },
  });
  const report = { audits: [], phones: [], behaviour: {}, noScript: {} };
  try {
    for (const page of manifest.audit) {
      win.setContentSize(960, 600);
      const a = await audit(win, page);
      report.audits.push({ ...page, ...a });
      if (page.phone)
        report.phones.push({ ...page, ...(await phone(win, page)) });
    }
    for (const page of manifest.behaviour) {
      win.setContentSize(960, 700);
      report.behaviour[page.id] =
        page.id === 'command-palette'
          ? await behaviourPalette(win, page)
          : await behaviourCoverflow(win, page);
      report.noScript[page.id] = await noScript(page);
    }
  } catch (error) {
    report.error = String(error?.stack || error);
  }
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report));
  app.quit();
});
