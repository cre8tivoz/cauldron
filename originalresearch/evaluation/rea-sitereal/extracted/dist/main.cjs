"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/main.ts
var import_electron2 = require("electron");
var import_node_child_process12 = require("node:child_process");
var import_node_net = require("node:net");
var import_node_crypto4 = require("node:crypto");
var import_promises9 = require("node:fs/promises");
var import_node_path12 = require("node:path");

// ../engine/scaffold.ts
var import_promises4 = require("node:fs/promises");
var import_node_path5 = require("node:path");
var import_node_child_process3 = require("node:child_process");

// ../src/builder-core/model.ts
function attrText(v2) {
  if (typeof v2 === "string") return v2;
  if (v2 === true) return "";
  if (v2 === false || v2 === null || v2 === void 0) return void 0;
  if (typeof v2 === "number" || typeof v2 === "bigint") return String(v2);
  try {
    return JSON.stringify(v2);
  } catch {
    return String(v2);
  }
}
function propText(v2) {
  if (typeof v2 === "string") return v2;
  if (typeof v2 === "boolean" || typeof v2 === "number" || typeof v2 === "bigint") return String(v2);
  if (v2 === null || v2 === void 0) return void 0;
  try {
    return JSON.stringify(v2);
  } catch {
    return String(v2);
  }
}
function stringValues(nodes) {
  let changed = 0;
  const words = (v2) => typeof v2 === "number" || typeof v2 === "boolean" ? String(v2) : void 0;
  const walk = (list2) => {
    for (const raw of list2) {
      if (!raw || typeof raw !== "object") continue;
      const n = raw;
      for (const key of ["attrs", "props"]) {
        const rec = n[key];
        if (rec === void 0) continue;
        if (!rec || typeof rec !== "object" || Array.isArray(rec)) {
          delete n[key];
          changed += 1;
          continue;
        }
        const r2 = rec;
        for (const [k, v2] of Object.entries(r2)) {
          if (typeof v2 === "string") continue;
          const s = key === "attrs" ? attrText(v2) : propText(v2);
          if (s === void 0) delete r2[k];
          else r2[k] = s;
          changed += 1;
        }
      }
      for (const key of ["text", "html"]) {
        const v2 = n[key];
        if (v2 === void 0 || typeof v2 === "string") continue;
        const s = words(v2);
        if (s === void 0) delete n[key];
        else n[key] = s;
        changed += 1;
      }
      if (Array.isArray(n.classes) && n.classes.some((c2) => typeof c2 !== "string")) {
        n.classes = n.classes.map((c2) => typeof c2 === "string" ? c2 : words(c2)).filter((c2) => c2 !== void 0);
        changed += 1;
      }
      if (Array.isArray(n.children)) walk(n.children);
    }
  };
  if (Array.isArray(nodes)) walk(nodes);
  return changed;
}
function stringItem(item) {
  if (!item || typeof item !== "object") return 0;
  const x = item;
  let changed = stringValues(x.root) + stringValues(x.header) + stringValues(x.footer);
  if (Array.isArray(x.props)) {
    for (const p of x.props) {
      if (!p || typeof p !== "object") continue;
      const prop = p;
      if (prop.value === void 0 || typeof prop.value === "string") continue;
      prop.value = propText(prop.value) ?? "";
      changed += 1;
    }
  }
  return changed;
}

// ../src/builder-core/placeholder.ts
var MARK = "sitereal-placeholder";
var BLOCK = "M791.015,1773.232C813.965,1773.232 832.57,1791.839 832.57,1814.791C832.57,1815.991 832.57,1817.192 832.57,1818.391C832.57,1841.344 813.965,1859.951 791.015,1859.951L787.407,1859.951C764.456,1859.951 745.851,1841.344 745.851,1818.391C745.851,1817.192 745.851,1815.991 745.851,1814.791C745.851,1791.839 764.456,1773.232 787.407,1773.232C788.609,1773.232 789.813,1773.232 791.015,1773.232Z";
var POINTER = "M15.708,8.331C16.651,9.265 15.142,16.863 13.594,16.997C12.296,17.109 11.891,14.548 11.617,13.736C11.348,12.935 11.047,12.646 10.253,12.384C8.234,11.716 7.225,11.382 7.025,10.853C6.496,9.453 14.504,7.137 15.708,8.331Z";
var LOGO = `<g transform="matrix(1,0,0,1,-1282.311206,-1909.676926)"><path d="${BLOCK}" transform="matrix(-0.930001,0.2279,-0.227876,-0.929906,2572.427732,3469.27643)"/><path d="${BLOCK}" transform="matrix(-0.93012,0.227929,-0.227876,-0.929906,2482.502559,3568.262013)"/><path d="${BLOCK}" transform="matrix(-0.93012,0.227929,-0.227876,-0.929906,2480.539872,3475.773969)"/><path d="${POINTER}" transform="matrix(1.296243,-7.982939,7.982939,1.296243,1307.043316,2128.525388)"/></g>`;
function waves(w, h2) {
  const base = Math.min(w, h2);
  const gap = Math.max(6, Math.round(base * 0.05));
  const period = Math.round(base * 1.1);
  const amp = Math.round(gap * 2.4);
  const d = `M0 0C${Math.round(period / 6)} ${-amp} ${Math.round(period / 3)} ${-amp} ${period / 2} 0S${Math.round(period * 5 / 6)} ${amp} ${period} 0`;
  const copies = [-2, -1, 1, 2, 3].map((k) => `<use href="#l" y="${k * gap}"/>`).join("");
  return `<pattern id="w" width="${period}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)"><g fill="none" stroke="#cbcbcf" stroke-width="${Math.max(1, Math.round(gap * 0.14 * 10) / 10)}"><path id="l" d="${d}"/>${copies}</g></pattern><rect width="${w}" height="${h2}" fill="url(#w)"/>`;
}
var PLACEHOLDER_SRC = "/placeholder.svg";
function placeholderSvg(width = 1200, height = 800) {
  const w = Math.round(width), h2 = Math.round(height);
  const m = Math.round(Math.min(w, h2) * 0.24);
  const mx = Math.round((w - m) / 2), my = Math.round((h2 - m) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h2}" width="${w}" height="${h2}" preserveAspectRatio="xMidYMid slice" data-name="${MARK}"><rect width="${w}" height="${h2}" fill="#d8d8db"/>` + waves(w, h2) + `<svg x="${mx}" y="${my}" width="${m}" height="${m}" viewBox="0 0 193 200" fill="#8e8e96">${LOGO}</svg></svg>`;
}
var placeholderImage = (width = 1200, height = 800) => "data:image/svg+xml," + encodeURIComponent(placeholderSvg(width, height));

// ../src/builder-core/entry-url.ts
var entryUrlSource = (ts) => {
  const t = (type) => ts ? `: ${type}` : "";
  return String.raw`const entrySlugify = (s${t("unknown")}) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/** The row's slug as the site spells it: the one it was given, else its title, else its id. */
const entrySlugOf = (r${t("{ slug?: unknown; title?: unknown }")}, id${t("unknown")}) => String(r.slug ?? '').split('/').map(entrySlugify).filter(Boolean).join('/')
  || entrySlugify(String(r.title ?? '')) || String(id);`;
};
var ENTRY_URL_JS = entryUrlSource(false);
var ENTRY_URL_TS = entryUrlSource(true);

// ../src/builder-core/framework-source.ts
var frameworkSourceOf = (cfg) => cfg.source === "custom" ? "custom" : "builtin";
function parseCssRules(text) {
  const src = text.replace(/^\uFEFF/, "");
  const rules = [];
  const skipped = [];
  let i = 0;
  let head = "";
  const skip2 = (at) => {
    const ch = src[at];
    if (ch === "/" && src[at + 1] === "*") {
      const end = src.indexOf("*/", at + 2);
      return end === -1 ? src.length : end + 2;
    }
    if (ch === '"' || ch === "'") {
      let j = at + 1;
      while (j < src.length && src[j] !== ch) j += src[j] === "\\" ? 2 : 1;
      return j + 1;
    }
    return at;
  };
  while (i < src.length) {
    const next = skip2(i);
    if (next !== i) {
      if (src[i] !== "/") head += src.slice(i, next);
      i = next;
      continue;
    }
    const ch = src[i];
    if (ch === ";") {
      const stmt = head.trim();
      if (/^@layer\b/i.test(stmt)) rules.push({ selector: `${stmt.replace(/\s+/g, " ")};`, css: "" });
      else if (stmt && !/^@charset\b/i.test(stmt)) skipped.push(stmt + ";");
      head = "";
      i += 1;
      continue;
    }
    if (ch === "{") {
      let depth = 1;
      let j = i + 1;
      while (j < src.length && depth > 0) {
        const n = skip2(j);
        if (n !== j) {
          j = n;
          continue;
        }
        if (src[j] === "{") depth += 1;
        else if (src[j] === "}") depth -= 1;
        j += 1;
      }
      const selector = head.trim().replace(/\s+/g, " ");
      const body = src.slice(i + 1, depth === 0 ? j - 1 : j).trim();
      if (selector) rules.push({ selector, css: body });
      head = "";
      i = j;
      continue;
    }
    if (ch === "}") {
      head = "";
      i += 1;
      continue;
    }
    head += ch;
    i += 1;
  }
  const tail = head.trim();
  if (tail) skipped.push(tail);
  return { rules, skipped };
}
function customFrameworkSheet(cfg) {
  return { id: "framework", name: "Framework (custom)", generated: true, rules: parseCssRules(cfg.customCss ?? "").rules };
}

// ../src/builder-core/html-scan.ts
var HTML_SCAN_JS = String.raw`const SCAN_HEAD = /<(\/?)([a-zA-Z][^\t\n\f\r \/>]*)/y;
const SCAN_GAP = /[\t\n\f\r \/]*/y;
const SCAN_NAME = /[^\t\n\f\r \/>][^\t\n\f\r \/>=]*/y;
const SCAN_VALUE = /[\t\n\f\r ]*=[\t\n\f\r ]*("[^"]*"?|'[^']*'?|[^\t\n\f\r >]*)/y;
/** The tag that starts at s[i] (a '<'), or null when what is there is not a
    tag. Each attribute comes as written: the gap before it, the whole of it,
    its name, the name in lower case, its value without the quotes and the
    quote it was in; bare when it has no value. The tail is the gap before
    the '>', and cut says the text ended inside the tag, which a browser
    then drops. */
function scanTag(s = '', i = 0) {
  SCAN_HEAD.lastIndex = i;
  const head = SCAN_HEAD.exec(s);
  if (!head) return null;
  const tag = {
    name: head[2].toLowerCase(), written: head[2], close: head[1] === '/', end: s.length, cut: true, tail: '',
    /* an empty list of these, typed by its one example */
    attrs: [{ gap: '', whole: '', name: '', key: '', value: '', quote: '', bare: true }].slice(0, 0),
  };
  let j = SCAN_HEAD.lastIndex;
  for (;;) {
    SCAN_GAP.lastIndex = j;
    const gap = (SCAN_GAP.exec(s) || [''])[0];
    j += gap.length;
    if (j >= s.length) return tag;
    if (s[j] === '>') {
      tag.end = j + 1;
      tag.cut = false;
      tag.tail = gap;
      return tag;
    }
    SCAN_NAME.lastIndex = j;
    const name = (SCAN_NAME.exec(s) || [''])[0];
    j += name.length;
    SCAN_VALUE.lastIndex = j;
    const v = SCAN_VALUE.exec(s);
    const raw = v ? v[1] : '';
    const quote = raw[0] === '"' || raw[0] === "'" ? raw[0] : '';
    const value = quote ? raw.slice(1, raw.length > 1 && raw.endsWith(quote) ? -1 : raw.length) : raw;
    tag.attrs.push({ gap, whole: name + (v ? v[0] : ''), name, key: name.toLowerCase(), value, quote, bare: !v });
    j += v ? v[0].length : 0;
  }
}
/** Where something at s[i] (a '<') that is not a tag ends: a comment where a
    browser ends it, a doctype, a processing instruction or a stray end tag
    at its '>'. -1 when the '<' is only a character. A comment's end is found
    by one search forward, whichever of '-->' and '--!>' comes first: two
    searches each to the first of its own ran to the end of the text for
    every comment that ended the other way, once per comment. */
function scanSkip(s = '', i = 0) {
  if (s.startsWith('<!--', i)) {
    const end = /--!?>/g;
    end.lastIndex = i + 2;
    const m = end.exec(s);
    return m ? m.index + m[0].length : s.length;
  }
  if (/^<[!?\/]/.test(s.slice(i, i + 2))) {
    const e = s.indexOf('>', i + 1);
    return e < 0 ? s.length : e + 1;
  }
  return -1;
}
/** Where the text of a script, a style, a textarea or an iframe opened
    before s[i] ends: at its end tag, as a browser ends it. -1 when it has none. */
function scanRawEnd(s = '', i = 0, name = '') {
  const end = new RegExp('</' + name + '[\t\n\f\r />]', 'gi');
  end.lastIndex = i;
  const m = end.exec(s);
  return m ? m.index : -1;
}
const SCAN_REFS = new Map([['amp', '&'], ['lt', '<'], ['gt', '>'], ['quot', '"'], ['apos', "'"], ['nbsp', ' '], ['colon', ':'], ['Tab', '\t'], ['NewLine', '\n'],
  ['quest', '?'], ['num', '#'], ['sol', '/'], ['bsol', '\\'], ['commat', '@'], ['period', '.']]);
/** A value with its character references read: the numeric ones and the
    names above — every one that spells a character an address is cut at
    (':', '/', '?', '#', '\\', '@', '.'), so a host is read where a browser
    reads it. A value that had any is written anew from what this reads,
    so what a browser reads is exactly what was checked. */
function scanDecode(v = '') {
  return v.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);?/g, (all, ref) => {
    if (ref[0] !== '#') return all.endsWith(';') ? SCAN_REFS.get(ref) ?? all : all;
    const n = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
    return n > 0 && n < 0x110000 && !(n >= 0xd800 && n < 0xe000) ? String.fromCodePoint(n) : '�';
  });
}
/** The scheme an address is read with, in lower case: what comes before its
    first ':', once the spaces and control characters a browser skips are
    taken out. '' for an address relative to the page. */
function scanScheme(v = '') {
  const m = /^([a-zA-Z][a-zA-Z0-9+.\-]*):/.exec(v.replace(/[\u0000- \u007f]+/g, ''));
  return m ? m[1].toLowerCase() : '';
}`;
var HTML_SCAN_NAMES = ["SCAN_HEAD", "SCAN_GAP", "SCAN_NAME", "SCAN_VALUE", "scanTag", "scanSkip", "scanRawEnd", "SCAN_REFS", "scanDecode", "scanScheme"];
var CMS_FRAMES_JS = String.raw`const CMS_FRAME_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com',
  'player.vimeo.com', 'www.dailymotion.com', 'geo.dailymotion.com', 'open.spotify.com', 'embed.spotify.com', 'w.soundcloud.com',
  'www.mixcloud.com', 'player-widget.mixcloud.com', 'embed.ted.com', 'www.kickstarter.com', 'e.issuu.com', 'www.scribd.com',
  'speakerdeck.com', 'videopress.com', 'video.wordpress.com', 'pca.st', 'www.wolframcloud.com', 'animoto.com', 'cloudup.com',
  'www.reverbnation.com', 'widget.anghami.com', 'www.screencast.com', 'www.google.com', 'maps.google.com']);
/** May an iframe in a CMS's content load this address? https, from a host above or the CMS's own.
    The src is kept as written, so one with a named reference scanDecode does
    not read is refused: a browser reads it as a character this never saw. */
const cmsFrameOk = (src = '', own = '') => {
  let unread = false;
  String(src).replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (all, ref) => { unread ||= !SCAN_REFS.has(ref); return all; });
  if (unread) return false;
  try {
    const u = new URL(scanDecode(src).trim());
    return u.protocol === 'https:' && (CMS_FRAME_HOSTS.has(u.hostname) || (!!own && u.host === own));
  } catch { return false; }
};
/** The elements scrub takes out with their text, up to their end tag (its
    SCRUB_DROP, which sanitize:check holds this to): their text is skipped
    here as there, so both read the same tags. */
const CMS_FRAME_RAW = new Set(['script', 'style', 'object', 'noscript', 'template', 'textarea', 'title', 'xmp', 'noembed', 'noframes']);
/** Where the embeds held back came from, and how many, since a test last
    said so (cmsFramesSaid). */
const CMS_FRAMES_HELD = new Map();
/** Count one embed held back, by its host. */
const cmsFrameHeld = (src = '') => {
  let host = 'an address that is not https://';
  try {
    const u = new URL(scanDecode(src).trim());
    if (u.protocol === 'https:' || u.protocol === 'http:') host = u.protocol === 'https:' ? u.host : u.origin;
  } catch { /* relative, or no address */ }
  CMS_FRAMES_HELD.set(host, (CMS_FRAMES_HELD.get(host) ?? 0) + 1);
};
/** The embeds held back since the last time, as one sentence (or none) —
    what a test says beside the rows. */
const cmsFramesSaid = () => {
  const held = [...CMS_FRAMES_HELD].sort((a, b) => b[1] - a[1]);
  CMS_FRAMES_HELD.clear();
  if (!held.length) return [];
  const n = held.reduce((sum, h) => sum + h[1], 0);
  const named = held.slice(0, 8).map(([h, k]) => h + ' (' + k + ')').join(', ') + (held.length > 8 ? ' and ' + (held.length - 8) + ' more' : '');
  return [n + (n === 1 ? ' embed was' : ' embeds were') + ' held back, from ' + named
    + ': an iframe in a CMS’s content loads only from a player WordPress itself would embed, or the CMS’s own site, over https.'];
};
/** A CMS's markup with each iframe from anywhere else left without its src.
    Read exactly as scrub reads it, the same steps in the same order — a
    comment, a doctype, the text of a raw text element and an iframe's own
    body skipped as scrub skips them, and a tag cut off at the end stopping
    both — so every iframe scrub writes out is one looked at here. Where a
    raw text's end tag is (or that it has none) is remembered, so markup of
    many unclosed ones is read once, not once for each. */
function cmsFrames(html = '', own = '') {
  const s = String(html);
  if (!/<iframe/i.test(s)) return s;
  const ends = new Map();
  const rawEnd = (from = 0, name = '') => {
    const e = ends.get(name);
    if (e && from >= e.from && (e.at < 0 || from <= e.at)) return e.at;
    const at = scanRawEnd(s, from, name);
    ends.set(name, { from, at });
    return at;
  };
  let out = '';
  let last = 0;
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    if (lt < 0) break;
    const t = scanTag(s, lt);
    if (!t) {
      const e = scanSkip(s, lt);
      i = e < 0 ? lt + 1 : e;
      continue;
    }
    const frame = !t.close && t.name === 'iframe';
    const bad = frame ? t.attrs.filter((a) => a.key === 'src' && !cmsFrameOk(a.bare ? '' : a.value, own)) : [];
    if (bad.length) {
      for (const a of bad) cmsFrameHeld(a.bare ? '' : a.value);
      /* a tag cut off at the end is dropped by scrub and a browser alike, and
         loses its src all the same, in case something is ever written after it */
      out += s.slice(last, lt) + '<' + t.written + t.attrs.filter((a) => a.key !== 'src').map((a) => a.gap + a.whole).join('') + t.tail + (t.cut ? '' : '>');
      last = t.end;
    }
    if (t.cut) break;
    i = t.end;
    if (CMS_FRAME_RAW.has(t.name)) {
      const e = t.close ? -1 : rawEnd(i, t.name);
      if (e >= 0) i = e;
      continue;
    }
    if (!frame) continue;
    const e = rawEnd(i, 'iframe');
    if (e >= 0) i = e;
  }
  return out + s.slice(last);
}`;
var CMS_FRAMES_NAMES = ["CMS_FRAME_HOSTS", "cmsFrameOk", "CMS_FRAME_RAW", "CMS_FRAMES_HELD", "cmsFrameHeld", "cmsFramesSaid", "cmsFrames"];

// ../src/builder-core/cms/row-frames.ts
var CMS_ROW_FRAMES_JS = String.raw`/** A CMS's row with every string in it held to the embeds its content is
    held to (cmsFrames): records and lists all the way down. Past sixty-four
    levels nothing is kept — no page binds that deep, and nothing goes
    through unread. */
function cmsRowFrames(v, own = '', depth = 0) {
  if (typeof v === 'string') return /<iframe/i.test(v) ? cmsFrames(v, own) : v;
  if (!v || typeof v !== 'object') return v;
  if (depth > 64) return null;
  if (Array.isArray(v)) return v.map((x) => cmsRowFrames(x, own, depth + 1));
  /* fromEntries, so a key named __proto__ stays a key */
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cmsRowFrames(x, own, depth + 1)]));
}`;
var CMS_ROW_FRAMES_NAMES = ["cmsRowFrames"];

// ../src/builder-core/cms/wordpress.ts
var js = (v2) => JSON.stringify(v2);
function wpRoot(url) {
  const clean2 = url.trim().replace(/[?#].*$/, "").replace(/\/+$/, "");
  if (!clean2) return "";
  const at = clean2.indexOf("/wp-json");
  return `${at >= 0 ? clean2.slice(0, at) : clean2}/wp-json`;
}
var wpLimitOf = (s) => Math.max(0, Math.floor(Number(s.wpLimit) || 0));
function wpEndpoint(s, perPage = Math.min(100, wpLimitOf(s) || 100)) {
  const extra = (s.wpQuery ?? "").trim().replace(/^[?&]+/, "");
  return `${wpRoot(s.url)}/wp/v2/${(s.wpType || "posts").replace(/^\/+|\/+$/g, "")}?per_page=${perPage}&_embed=1${extra ? `&${extra}` : ""}`;
}
var wpTypesEndpoint = (url) => `${wpRoot(url)}/wp/v2/types`;
var wpCompanionEndpoint = (url) => `${wpRoot(url)}/sitereal/v1/status`;
var wpCompanionStylesEndpoint = (url) => `${wpRoot(url)}/sitereal/v1/styles`;
var WP_COMPANION_ZIP = "https://sitereal.app/downloads/sitereal-wordpress.zip";
var SOURCE_WP_JS = String.raw`const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };
/** WordPress answers a title as markup with its characters as references. */
const decode = (s) => String(s ?? '').replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, n) =>
  n[0] !== '#' ? ENTITIES[n.toLowerCase()] ?? m
    : String.fromCodePoint(n[1].toLowerCase() === 'x' ? parseInt(n.slice(2), 16) : Number(n.slice(1))));
const plain = (html) => decode(String(html ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

/* Custom fields arrive in three plugins' own shapes, and a binding is a path
   of plain keys: ACF and Meta Box are records already, ACPT is a list of
   boxes each holding a list of {name, value}. All three come out as one
   record of plain keys, so the field picker offers each field by name. */
/** A field's name as a binding can say it: report-water-temp is a
    subtraction in a page, report_water_temp is a key. */
const cfKey = (k) => {
  const s = String(k ?? '').trim().replace(/[^A-Za-z0-9_$]+/g, '_').replace(/^_+|_+$/g, '');
  return /^\d/.test(s) ? 'f_' + s : s;
};
const cfObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const CF_IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i;
/** The address of a picture or a link field returned as a record. */
const cfUrl = (v) => {
  if (!cfObj(v)) return undefined;
  const u = v.url ?? v.full_url ?? v.source_url ?? v.src ?? v.guid?.rendered;
  return typeof u === 'string' && u ? u : undefined;
};
/** [{name, value}, …] — how ACPT says a box, and a repeater's row in it. */
const cfNamed = (a) => Array.isArray(a) && a.length > 0
  && a.every((x) => cfObj(x) && ('name' in x || 'field_name' in x) && 'value' in x);
const cfFromNamed = (a, depth) => {
  const out = {};
  for (const f of a) {
    const k = cfKey(f.name ?? f.field_name);
    if (k && !(k in out)) Object.assign(out, cfEntry(k, f.value, depth));
  }
  return out;
};
/** A list: a gallery becomes [{src, alt}], the shape a collection's gallery
    has, and anything else keeps its items with their keys made sayable. */
const cfList = (a, depth) => {
  if (cfNamed(a)) return cfFromNamed(a, depth);
  const pics = a.length > 0 && a.every((x) => cfUrl(x) || (typeof x === 'string' && CF_IMAGE.test(x)));
  if (pics) return a.map((x) => (typeof x === 'string' ? { src: x, alt: '' }
    : { src: cfUrl(x), alt: x.alt ?? x.alt_text ?? '', width: x.width ?? '', height: x.height ?? '' }));
  return a.map((x) => (cfNamed(x) ? cfFromNamed(x, depth + 1) : cfObj(x) ? cfRecord(x, depth + 1) : x));
};
/** One field as the keys it becomes: a picture or a link record is its
    address, with its alt, title and size beside it the way image_alt sits
    beside image. */
function cfEntry(k, v, depth) {
  const url = cfUrl(v);
  if (url) {
    const out = { [k]: url };
    for (const [from, to] of [['alt', 'alt'], ['alt_text', 'alt'], ['title', 'title'], ['width', 'width'], ['height', 'height']]) {
      const x = v[from];
      if (x != null && typeof x !== 'object' && !((k + '_' + to) in out)) out[k + '_' + to] = x;
    }
    return out;
  }
  if (depth > 4) return { [k]: v };
  if (Array.isArray(v)) return { [k]: cfList(v, depth) };
  if (cfObj(v)) return { [k]: cfRecord(v, depth + 1) };
  return { [k]: v ?? '' };
}
/** A record of fields. ACF answers an empty one as [], PHP's empty array. */
function cfRecord(o, depth = 0) {
  if (Array.isArray(o)) return cfNamed(o) ? cfFromNamed(o, depth) : {};
  if (!cfObj(o)) return {};
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    const key = cfKey(k);
    if (key && !(key in out)) Object.assign(out, cfEntry(key, v, depth));
  }
  return out;
}
/** ACPT: every box's fields as one record, a field named in two boxes taken
    from the first. What ACPT sent is kept under it, so meta still reads. */
const acptRecord = (a) => {
  const out = {};
  for (const box of Array.isArray(a?.meta) ? a.meta : []) {
    const fields = box?.meta_fields ?? box?.fields;
    if (!Array.isArray(fields)) continue;
    for (const [k, v] of Object.entries(cfFromNamed(fields.filter((f) => cfObj(f) && 'value' in f), 0))) if (!(k in out)) out[k] = v;
  }
  return { ...(cfObj(a) ? a : {}), ...out };
};

/** One row of the REST API as the fields a page places. Everything else the
    API sent — custom REST fields — is kept as it came, and the custom fields
    of ACF, ACPT and Meta Box are made into plain keys. */
function wpRow(p) {
  const {
    _links, _embedded, guid, class_list, comment_status, ping_status, date_gmt, modified_gmt, featured_media, template,
    title, excerpt, content, author, categories, tags, ...rest
  } = p ?? {};
  const em = _embedded ?? {};
  const media = em['wp:featuredmedia']?.[0];
  const terms = (em['wp:term'] ?? []).flat().filter(Boolean);
  /* WordPress has already made the smaller versions of the picture, and says
     where each one is: offered to the browser as a srcset, so a phone takes
     the small one. Only the sizes that are the same picture — a square
     thumbnail cropped out of a wide photo is a different one. */
  const full = media?.media_details ?? {};
  const sizes = Object.values(full.sizes ?? {})
    .filter((x) => x?.source_url && x.width && x.height && full.width && full.height
      && Math.abs(x.width / x.height - full.width / full.height) < 0.03)
    .sort((a, b) => a.width - b.width);
  const srcset = [...new Map(sizes.map((x) => [x.width, x.source_url + ' ' + x.width + 'w'])).values()];
  const named = (taxonomy, ids) => (terms.some((t) => t.taxonomy === taxonomy)
    ? terms.filter((t) => t.taxonomy === taxonomy).map((t) => t.name) : ids ?? []);
  /* the site's own host: an embed of one of its posts is its own */
  let own = '';
  try { own = new URL(String(rest.link ?? '')).host; } catch { /* no link */ }
  /* What arrives as markup keeps an iframe only from a player or the site
     itself — content, and an ACF WYSIWYG or a plugin's REST field as much
     (cmsRowFrames). The title and the excerpt are text once plain() has
     read them, and the image's alt, the author and the terms are text as
     they come: an iframe written there is words, and stays as written. */
  const hold = (v) => cmsRowFrames(v, own);
  /* the custom fields are held once each, as the records they become */
  const custom = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, k === 'acf' || k === 'acpt' || k === 'meta_box' ? v : hold(v)]));
  return {
    title: plain(title?.rendered ?? title),
    excerpt: plain(excerpt?.rendered ?? excerpt),
    content: hold(String(content?.rendered ?? content ?? '')),
    image: media?.source_url ?? '',
    image_alt: media?.alt_text ?? '',
    image_srcset: srcset.length > 1 ? srcset.join(', ') : '',
    image_width: full.width ?? '',
    image_height: full.height ?? '',
    author: em.author?.[0]?.name ?? author ?? '',
    categories: named('category', categories),
    tags: named('post_tag', tags),
    ...custom,
    ...('acf' in rest ? { acf: hold(cfRecord(rest.acf)) } : {}),
    ...('acpt' in rest ? { acpt: hold(acptRecord(rest.acpt)) } : {}),
    ...('meta_box' in rest ? { meta_box: hold(cfRecord(rest.meta_box)) } : {}),
  };
}
/** What a test says beside a WordPress source's rows: the embeds held back. */
const wpNotes = () => cmsFramesSaid();`;
function wpBasePath(url) {
  try {
    return new URL(wpRoot(url).replace(/\/wp-json$/, "")).pathname.replace(/\/+$/, "");
  } catch {
    return "";
  }
}
var wpContentCss = () => [
  '&::after { content: ""; display: block; clear: both; }',
  /* zero, like the layouts below: a gallery that crops its pictures sets their height */
  ":where(& img, & video) { max-inline-size: 100%; block-size: auto; }",
  "& iframe { inline-size: 100%; block-size: auto; aspect-ratio: 16 / 9; border: 0; }",
  "& figure { margin-inline: 0; }",
  "& figcaption { font-size: var(--text-s, 0.875em); text-align: center; margin-block-start: var(--space-xs, 0.5rem); }",
  "& .aligncenter { margin-inline: auto; text-align: center; }",
  "& .alignleft { float: inline-start; max-inline-size: 50%; margin-inline-end: var(--space-m, 1.5rem); }",
  "& .alignright { float: inline-end; max-inline-size: 50%; margin-inline-start: var(--space-m, 1.5rem); }",
  "& .has-text-align-center { text-align: center; }",
  "& .has-text-align-right { text-align: end; }",
  "& blockquote { margin-inline: 0; padding-inline-start: var(--space-m, 1.5rem); border-inline-start: 3px solid var(--border-light, currentColor); }",
  "& .wp-block-button__link { display: inline-block; padding: var(--space-xs, 0.5rem) var(--space-m, 1.5rem); border: 1px solid currentColor; border-radius: var(--radius-m, 0.5rem); text-decoration: none; }",
  "& table { inline-size: 100%; border-collapse: collapse; }",
  "& th, & td { padding: var(--space-xs, 0.5rem); border: 1px solid var(--border-light, currentColor); text-align: start; }",
  "& pre { overflow-x: auto; }",
  "& hr { border: 0; border-block-start: 1px solid var(--border-light, currentColor); }",
  "& .screen-reader-text { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }"
].join("\n");
var WP_GAP = "var(--wp--style--block-gap, var(--content-spacing, 1.5rem))";
var wpLayoutCss = () => [
  ":where(& .is-layout-flex) { display: flex; flex-wrap: wrap; align-items: center; gap: " + WP_GAP + "; }",
  /* auto-fit: the count WordPress was given lives in the block's own rule;
     without it, two pictures fill the row as two columns rather than taking
     two of five tracks (tester) */
  ":where(& .is-layout-grid) { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(12rem, 100%), 1fr)); gap: " + WP_GAP + "; }",
  ":where(& .is-layout-flex > *, & .is-layout-grid > *) { margin: 0; }",
  ":where(& .is-layout-flex.is-vertical, & .wp-block-buttons.is-vertical) { flex-direction: column; align-items: flex-start; }",
  ":where(& .is-layout-flex.is-nowrap) { flex-wrap: nowrap; }",
  ":where(& .is-content-justification-left) { justify-content: flex-start; }",
  ":where(& .is-content-justification-center) { justify-content: center; }",
  ":where(& .is-content-justification-right) { justify-content: flex-end; }",
  ":where(& .is-content-justification-space-between) { justify-content: space-between; }",
  ":where(& .is-vertical.is-content-justification-left) { align-items: flex-start; }",
  ":where(& .is-vertical.is-content-justification-center) { align-items: center; }",
  ":where(& .is-vertical.is-content-justification-right) { align-items: flex-end; }",
  ":where(& .is-layout-constrained > :not(.alignleft, .alignright, .alignfull)) { max-inline-size: var(--wp--style--global--content-size, var(--content-width, 100%)); margin-inline: auto; }",
  ":where(& .is-layout-constrained > .alignwide) { max-inline-size: var(--wp--style--global--wide-size, 100%); }",
  ":where(& .is-layout-constrained > .alignfull) { max-inline-size: none; }",
  ":where(& .wp-block-columns) { display: flex; flex-wrap: nowrap; align-items: normal; gap: " + WP_GAP + "; }",
  ":where(& .wp-block-columns.are-vertically-aligned-top) { align-items: flex-start; }",
  ":where(& .wp-block-columns.are-vertically-aligned-center) { align-items: center; }",
  ":where(& .wp-block-columns.are-vertically-aligned-bottom) { align-items: flex-end; }",
  ":where(& .wp-block-column) { flex: 1 1 0; min-inline-size: 0; overflow-wrap: break-word; }",
  ':where(& .wp-block-column[style*="flex-basis"]) { flex-grow: 0; }',
  ":where(& .wp-block-column.is-vertically-aligned-top) { align-self: flex-start; }",
  ":where(& .wp-block-column.is-vertically-aligned-center) { align-self: center; }",
  ":where(& .wp-block-column.is-vertically-aligned-bottom) { align-self: flex-end; }",
  "@media (max-width: 781px) { :where(& .wp-block-columns:not(.is-not-stacked-on-mobile)) { flex-direction: column; } }",
  ":where(& .wp-block-gallery) { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(12rem, 100%), 1fr)); align-items: normal; gap: var(--wp--style--block-gap, var(--space-s, 1rem)); }",
  `@media (min-width: 600px) { ${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `:where(& .wp-block-gallery.columns-${n}) { grid-template-columns: repeat(${n}, minmax(0, 1fr)); }`).join(" ")} }`,
  ":where(& .wp-block-gallery .wp-block-image) { margin: 0; }",
  ":where(& .wp-block-image) { margin-inline: 0; }",
  ":where(& .wp-block-image img) { max-inline-size: 100%; block-size: auto; vertical-align: bottom; }",
  ":where(& .wp-block-image.aligncenter) { text-align: center; }",
  ":where(& .wp-block-image.alignwide img, & .wp-block-image.alignfull img) { inline-size: 100%; }",
  ":where(& .wp-block-image.is-style-rounded img) { border-radius: 9999px; }",
  /* after the image's own, which it overrides */
  ":where(& .wp-block-gallery.is-cropped .wp-block-image img) { inline-size: 100%; block-size: 100%; object-fit: cover; }",
  ":where(& .wp-block-buttons) { display: flex; flex-wrap: wrap; gap: var(--wp--style--block-gap, var(--space-s, 1rem)); }",
  /* the cover, as core's block style draws it: the picture behind, the dim
     over it, the content on top, whichever order the markup has them in */
  ":where(& .wp-block-cover, & .wp-block-cover-image) { position: relative; isolation: isolate; display: flex; justify-content: center; align-items: center; box-sizing: border-box; min-block-size: 430px; padding: 1em; overflow: clip; background-position: center; }",
  ":where(& .wp-block-cover:not(.has-text-color), & .wp-block-cover-image:not(.has-text-color)) { color: #fff; }",
  ":where(& .wp-block-cover.is-light:not(.has-text-color), & .wp-block-cover-image.is-light:not(.has-text-color)) { color: #000; }",
  ":where(& .wp-block-cover__image-background, & .wp-block-cover__video-background, & .wp-block-cover__embed-background) { position: absolute; inset: 0; inline-size: 100%; block-size: 100%; max-inline-size: none; max-block-size: none; margin: 0; padding: 0; border: none; box-shadow: none; object-fit: cover; }",
  ":where(& .wp-block-cover__background, & .wp-block-cover__gradient-background) { position: absolute; inset: 0; z-index: 1; opacity: 0.5; }",
  ':where(& .wp-block-cover__background.has-background-dim:not([class*="-background-color"])) { background-color: #000; }',
  ...[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => `:where(& .wp-block-cover__background.has-background-dim-${n}, & .wp-block-cover__gradient-background.has-background-dim-${n}) { opacity: ${n / 100}; }`),
  ":where(& .wp-block-cover__inner-container) { position: relative; z-index: 1; inline-size: 100%; color: inherit; }",
  ...["top", "center", "bottom"].flatMap((v2) => ["left", "center", "right"].map((h2) => `:where(& .wp-block-cover.is-position-${v2}-${h2}) { align-items: ${v2 === "top" ? "flex-start" : v2 === "bottom" ? "flex-end" : "center"}; justify-content: ${h2 === "left" ? "flex-start" : h2 === "right" ? "flex-end" : "center"}; }`)),
  ":where(& .wp-block-cover.has-custom-content-position:not(.is-position-center-center) .wp-block-cover__inner-container) { margin: 0; inline-size: auto; }",
  ":where(& .wp-block-cover.alignleft, & .wp-block-cover.alignright) { max-inline-size: 420px; inline-size: 100%; }",
  ":where(& .wp-block-cover.has-parallax) { background-attachment: fixed; background-repeat: no-repeat; background-size: cover; }",
  ":where(& .wp-block-cover.is-repeated) { background-repeat: repeat; background-size: auto; }"
].join("\n");
var WP_PALETTE = [
  ["black", "#000000"],
  ["cyan-bluish-gray", "#abb8c3"],
  ["white", "#ffffff"],
  ["pale-pink", "#f78da7"],
  ["vivid-red", "#cf2e2e"],
  ["luminous-vivid-orange", "#ff6900"],
  ["luminous-vivid-amber", "#fcb900"],
  ["light-green-cyan", "#7bdcb5"],
  ["vivid-green-cyan", "#00d084"],
  ["pale-cyan-blue", "#8ed1fc"],
  ["vivid-cyan-blue", "#0693e3"],
  ["vivid-purple", "#9b51e0"]
];
var WP_GRADIENTS = [
  ["vivid-cyan-blue-to-vivid-purple", "linear-gradient(135deg,rgb(6,147,227) 0%,rgb(155,81,224) 100%)"],
  ["light-green-cyan-to-vivid-green-cyan", "linear-gradient(135deg,rgb(122,220,180) 0%,rgb(0,208,130) 100%)"],
  ["luminous-vivid-amber-to-luminous-vivid-orange", "linear-gradient(135deg,rgb(252,185,0) 0%,rgb(255,105,0) 100%)"],
  ["luminous-vivid-orange-to-vivid-red", "linear-gradient(135deg,rgb(255,105,0) 0%,rgb(207,46,46) 100%)"],
  ["very-light-gray-to-cyan-bluish-gray", "linear-gradient(135deg,rgb(238,238,238) 0%,rgb(169,184,195) 100%)"],
  ["cool-to-warm-spectrum", "linear-gradient(135deg,rgb(74,234,220) 0%,rgb(151,120,209) 20%,rgb(207,42,186) 40%,rgb(238,44,130) 60%,rgb(251,105,98) 80%,rgb(254,248,76) 100%)"],
  ["blush-light-purple", "linear-gradient(135deg,rgb(255,206,236) 0%,rgb(152,150,240) 100%)"],
  ["blush-bordeaux", "linear-gradient(135deg,rgb(254,205,165) 0%,rgb(254,45,45) 50%,rgb(107,0,62) 100%)"],
  ["luminous-dusk", "linear-gradient(135deg,rgb(255,203,112) 0%,rgb(199,81,192) 50%,rgb(65,88,208) 100%)"],
  ["pale-ocean", "linear-gradient(135deg,rgb(255,245,203) 0%,rgb(182,227,212) 50%,rgb(51,167,181) 100%)"],
  ["electric-grass", "linear-gradient(135deg,rgb(202,248,128) 0%,rgb(113,206,126) 100%)"],
  ["midnight", "linear-gradient(135deg,rgb(2,3,129) 0%,rgb(40,116,252) 100%)"]
];
var WP_FONT_SIZES = [["small", "13px"], ["medium", "20px"], ["large", "36px"], ["x-large", "42px"]];
var WP_SPACING = [["20", "0.44rem"], ["30", "0.67rem"], ["40", "1rem"], ["50", "1.5rem"], ["60", "2.25rem"], ["70", "3.38rem"], ["80", "5.06rem"]];
var WP_SHADOWS = [
  ["natural", "6px 6px 9px rgba(0, 0, 0, 0.2)"],
  ["deep", "12px 12px 50px rgba(0, 0, 0, 0.4)"],
  ["sharp", "6px 6px 0px rgba(0, 0, 0, 0.2)"],
  ["outlined", "6px 6px 0px -3px rgb(255, 255, 255), 6px 6px rgb(0, 0, 0)"],
  ["crisp", "6px 6px 0px rgb(0, 0, 0)"]
];
var wpCorePresetCss = () => {
  const vars = [
    ...WP_PALETTE.map(([k, v2]) => `--wp--preset--color--${k}: ${v2}`),
    ...WP_GRADIENTS.map(([k, v2]) => `--wp--preset--gradient--${k}: ${v2}`),
    ...WP_FONT_SIZES.map(([k, v2]) => `--wp--preset--font-size--${k}: ${v2}`),
    ...WP_SPACING.map(([k, v2]) => `--wp--preset--spacing--${k}: ${v2}`),
    ...WP_SHADOWS.map(([k, v2]) => `--wp--preset--shadow--${k}: ${v2}`)
  ];
  return [
    `:root { ${vars.join("; ")}; }`,
    ...WP_PALETTE.flatMap(([k]) => [
      `.has-${k}-color { color: var(--wp--preset--color--${k}) !important; }`,
      `.has-${k}-background-color { background-color: var(--wp--preset--color--${k}) !important; }`,
      `.has-${k}-border-color { border-color: var(--wp--preset--color--${k}) !important; }`
    ]),
    ...WP_GRADIENTS.map(([k]) => `.has-${k}-gradient-background { background: var(--wp--preset--gradient--${k}) !important; }`),
    ...WP_FONT_SIZES.map(([k]) => `.has-${k}-font-size { font-size: var(--wp--preset--font-size--${k}) !important; }`)
  ].join("\n");
};
var WP_BLOCK_CLASS = /^wp-container-[a-z0-9-]+-[0-9a-f]{8}$/;
function wpBlockClasses(html) {
  const out2 = /* @__PURE__ */ new Set();
  for (const m of String(html ?? "").matchAll(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    for (const c2 of (m[1] ?? m[2] ?? "").split(/\s+/)) if (WP_BLOCK_CLASS.test(c2)) out2.add(c2);
  }
  return [...out2];
}
var wpInlineStyle = (html, id) => new RegExp(`<style[^>]*\\sid\\s*=\\s*["']${id}["'][^>]*>([\\s\\S]*?)</style>`, "i").exec(html)?.[1] ?? "";
function wpPageCss(html) {
  const presets = [];
  const vars = [];
  for (const r2 of parseCssRules(wpInlineStyle(html, "global-styles-inline-css")).rules) {
    const sels = r2.selector.split(",").map((x) => x.trim());
    if (sels.every((x) => x === ":root" || x === "body")) {
      vars.push(...r2.css.split(";").map((d) => d.trim()).filter((d) => /^--wp--(preset|custom)--[\w-]+\s*:/.test(d)));
    } else if (sels.every((x) => /^\.has-[a-z0-9-]+$/.test(x))) presets.push(`${r2.selector} { ${r2.css} }`);
  }
  const blocks = parseCssRules(wpInlineStyle(html, "core-block-supports-inline-css")).rules.filter((r2) => !r2.selector.startsWith("@") && r2.selector.split(",").every((x) => {
    const sel = x.trim();
    const lead = /^\.([\w-]+)/.exec(sel)?.[1] ?? "";
    return WP_BLOCK_CLASS.test(lead) && ![...sel.slice(lead.length + 1).matchAll(/\.(wp-(?:elements|container)-[\w-]+)/g)].some((m) => !WP_BLOCK_CLASS.test(m[1]));
  })).map((r2) => `${r2.selector} { ${r2.css} }`);
  return { presets: [...vars.length ? [`:root { ${vars.join("; ")}; }`] : [], ...presets].join("\n"), blocks: blocks.join("\n") };
}
var wpOriginOf = (url) => {
  try {
    const o = new URL(url.trim()).origin;
    return /^https?:\/\//.test(o) ? o : "";
  } catch {
    return "";
  }
};
function wpPagesToRead(rows, known, presets, max, origin) {
  const seen = new Set([...known.matchAll(/\.(wp-container-[\w-]+)/g)].map((m) => m[1]));
  const own = new Set((typeof origin === "string" ? [origin] : origin).map(wpOriginOf).filter(Boolean));
  const linkOf = (r2) => {
    const l = r2?.link;
    return typeof l === "string" && /^https?:\/\//.test(l) && own.has(wpOriginOf(l)) ? l : "";
  };
  const out2 = [];
  for (const r2 of rows) {
    if (out2.length >= max) break;
    const link = linkOf(r2);
    const fresh = link ? wpBlockClasses(String(r2.content ?? "")).filter((c2) => !seen.has(c2)) : [];
    if (!fresh.length) continue;
    fresh.forEach((c2) => seen.add(c2));
    out2.push(link);
  }
  const first = rows.map(linkOf).find(Boolean);
  if (!out2.length && presets && first) out2.push(first);
  return out2;
}
var WP_FIELD_TYPES = {
  title: "text",
  excerpt: "text",
  content: "html",
  image: "image",
  image_alt: "text",
  image_srcset: "text",
  image_width: "number",
  image_height: "number",
  author: "text",
  link: "url",
  date: "date",
  modified: "date",
  categories: "list",
  tags: "list"
};
var WP_INTERNAL = /* @__PURE__ */ new Set([
  "attachment",
  "nav_menu_item",
  "wp_block",
  "wp_template",
  "wp_template_part",
  "wp_navigation",
  "wp_global_styles",
  "wp_font_family",
  "wp_font_face",
  /* Jetpack's own bookkeeping, which it registers as public post types:
     form responses (somebody's submissions), activity logs, shop orders and
     its search overlay — none of them is content a site shows. */
  "feedback",
  "jetpack_form",
  "jp_search_overlay",
  "jp_act_log_event",
  "jp_pay_order",
  "jp_pay_product"
]);
function wpReadTypes(data) {
  return Object.entries(data).filter(([key, t]) => !WP_INTERNAL.has(key) && t?.rest_base && (t.rest_namespace ?? "wp/v2") === "wp/v2").map(([key, t]) => ({ slug: t.slug ?? key, name: t.name ?? key, base: String(t.rest_base) }));
}
var WORDPRESS = {
  kind: "wordpress",
  label: "WordPress site",
  short: "WordPress",
  name: "WordPress posts",
  root: (url) => wpRoot(url).replace(/\/wp-json$/, ""),
  hint: "Enter the site\u2019s address and pick posts, pages or a custom post type. Titles, content, featured images, authors and categories arrive as plain fields.",
  about: "The address of the WordPress site. Its REST API is asked for one content type \u2014 posts, pages or a custom post type \u2014 and every entry is flattened to the fields a page places: title, excerpt, content, image, author, categories, plus whatever else the site exposes (ACF, custom fields).",
  address: { label: "Site address", placeholder: "https://example.com", noun: "the site\u2019s address", missing: "No site address yet." },
  keys: { type: "wpType", limit: "wpLimit", query: "wpQuery" },
  /* WPML and Polylang both take ?lang=; Polylang says each post's versions in
     `translations` ({ en: 12, de: 34 }), which the row keeps */
  language: { param: "lang", group: "translations" },
  types: {
    label: "Content type",
    hint: "What the site\u2019s REST API lists \u2014 posts, pages and every custom post type registered with show_in_rest. Press Find content types to pick one by name.",
    button: "Find content types",
    placeholder: "posts",
    optionHint: (t) => `/wp/v2/${t.base}`,
    url: wpTypesEndpoint,
    read: wpReadTypes,
    unreadable: "That address did not answer as a WordPress REST API."
  },
  limitHint: "At most this many, newest first. Empty is every entry of the type \u2014 a hundred per request, which on a large site is a slow build for a page that shows three.",
  queryHint: "Added to the request as typed \u2014 categories=3, orderby=title&order=asc, lang=de. Anything the REST API takes.",
  queryPlaceholder: "categories=3",
  defaults: { wpType: "posts" },
  endpoint: (s) => wpEndpoint(s),
  /* The first hundred — one request — so a loop that sorts or limits has
     enough to be right about on the canvas for all but the largest types. */
  previewUrl: (s, max) => `${wpEndpoint(s, Math.min(max, wpLimitOf(s) || max))}&page=1`,
  readPreview: (data, headers, s) => !Array.isArray(data) ? { error: "The answer is not a list of entries." } : { list: data, total: Math.min(Number(headers.get("x-wp-total")) || data.length, wpLimitOf(s) || Infinity) },
  notJson: " \u2014 is the REST API switched off on that site?",
  texts: [HTML_SCAN_JS, CMS_FRAMES_JS, CMS_ROW_FRAMES_JS, SOURCE_WP_JS],
  row: "wpRow",
  /* what the test says beside the rows: the embeds held back (cmsFramesSaid) */
  notes: "wpNotes",
  reserved: [...HTML_SCAN_NAMES, ...CMS_FRAMES_NAMES, ...CMS_ROW_FRAMES_NAMES, "plain", "decode", "wpRow", "wpNotes", "CF_IMAGE", "cfKey", "cfObj", "cfUrl", "cfNamed", "cfFromNamed", "cfList", "cfEntry", "cfRecord", "acptRecord"],
  moduleLoad: (s, p) => {
    const limit = wpLimitOf(s);
    return [
      `const ENDPOINT = ${js(wpEndpoint(s))};`,
      ...limit ? [`/** How many entries are taken at most. */`, `const LIMIT = ${limit};`] : [],
      "",
      ...p.headers,
      "async function load() {",
      ...p.guard,
      "  const all = [];",
      "  /* The REST API hands out a hundred at a time and says how many pages there are. */",
      "  let pages = 1;",
      `  for (let page = 1; page <= pages && page <= 50${limit ? " && all.length < LIMIT" : ""}; page++) {`,
      `    const res = await fetch(ENDPOINT + '&page=' + page, ${p.init(p.hdr)});`,
      `  ${p.bad}`,
      `    pages = Number(res.headers.get('x-wp-totalpages')) || 1;`,
      "    all.push(...(await res.json()));",
      "  }",
      /* Said rather than swallowed: past the cap the list is cut, and a cut
         list looks exactly like a complete one. */
      `  if (pages > 50${limit ? " && all.length < LIMIT" : ""}) console.warn(${js(`${p.label}: more than 5,000 entries \u2014 only the first 5,000 were fetched.`)});`,
      `  return ${p.finish(`all${limit ? ".slice(0, LIMIT)" : ""}`)};`,
      "}"
    ];
  },
  fieldTypes: WP_FIELD_TYPES,
  entryLink: { label: "Same as on WordPress", hint: "the permalink each entry already has \u2014 /2026/09/my-post", base: (s) => wpBasePath(s.url) },
  localLinks: "content",
  linksRoute: true,
  contentCss: wpContentCss,
  /* the block layouts, beside every design rather than in its starter */
  layoutCss: wpLayoutCss,
  /* the theme's colors, gradients and sizes a block picked in the editor —
     only the companion can say them; the theme's own body and heading styles
     are left behind, since the design is this app's */
  styles: {
    url: (s) => wpCompanionStylesEndpoint(s.url),
    read: (d) => d && typeof d === "object" && typeof d.css === "string" ? d.css : null
  },
  /* without the companion's answer, core's own presets — and what the
     theme's pages print, read off the entries' own pages while they answer */
  presetCss: wpCorePresetCss,
  pageCss: { pages: wpPagesToRead, read: wpPageCss },
  media: { uploads: "/wp-content/uploads/", server: "the WordPress server" },
  access: { basicHint: "A WordPress application password \u2014 user:password", headers: false },
  companion: {
    status: (s) => wpCompanionEndpoint(s.url),
    settings: (s) => `${s.url.trim().replace(/\/wp-json.*$/, "").replace(/\/+$/, "")}/wp-admin/admin.php?page=sitereal`,
    /* the zip WordPress's own Plugins → Upload takes */
    page: WP_COMPANION_ZIP
  },
  checks: (s) => !(s.wpType ?? "").trim() ? [{ level: "stop", text: "No content type chosen." }] : []
};

// ../src/builder-core/cms/portable-text.ts
var SOURCE_PT_JS = String.raw`const PT_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const ptEsc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => PT_ESC[c]);
/** Text between tags needs only these three: a quote or an apostrophe reads as itself. */
const ptText = (s) => String(s ?? '').replace(/[&<>]/g, (c) => PT_ESC[c]);
/** An address a page may carry — http(s), mailto, tel, a fragment, or a path
    made absolute — and nothing else, which is what EmDash's own sanitizeHref
    lets through. */
const ptHref = (h, o) => {
  const s = String(h ?? '').trim();
  if (/^(https?:|mailto:|tel:)/i.test(s) || s.startsWith('#')) return s;
  if (s.startsWith('/') && !s.startsWith('//')) return o.abs(s);
  return '';
};
const ptLink = (href, blank, inner) => '<a href="' + ptEsc(href) + '"' + (blank ? ' target="_blank" rel="noopener"' : '') + '>' + inner + '</a>';
const PT_MARKS = { strong: 'strong', em: 'em', code: 'code', underline: 'u', 'strike-through': 's', strike: 's', subscript: 'sub', superscript: 'sup' };
/** A run of spans: a decorator is a tag, any other mark is looked up in the block's markDefs (a link). */
const ptSpans = (children, markDefs, o) => (Array.isArray(children) ? children : []).map((span) => {
  if (!span || typeof span !== 'object') return '';
  let html = ptText(span.text ?? '').replace(/\n/g, '<br>');
  for (const mark of Array.isArray(span.marks) ? span.marks : []) {
    const tag = PT_MARKS[mark];
    if (tag) { html = '<' + tag + '>' + html + '</' + tag + '>'; continue; }
    const def = (Array.isArray(markDefs) ? markDefs : []).find((d) => d && d._key === mark);
    const href = def && def._type === 'link' ? ptHref(def.href, o) : '';
    if (href) html = ptLink(href, def.blank, html);
  }
  return html;
}).join('');
/** Left, the default, says nothing; the rest are said the way a logical
    property is, and a value that is not an alignment says nothing either. */
const PT_TEXT_ALIGN = new Map([['center', 'center'], ['right', 'end'], ['justify', 'justify'], ['start', 'start'], ['end', 'end']]);
const ptAlign = (b) => (b && PT_TEXT_ALIGN.has(b.textAlign) ? ' style="text-align: ' + PT_TEXT_ALIGN.get(b.textAlign) + '"' : '');
const PT_STYLES = { __proto__: null, normal: 'p', h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6' };
/** Consecutive list items as nested lists, by their level. */
const ptList = (run, o) => {
  let html = '';
  const open = [];
  for (const b of run) {
    const level = Math.max(1, Math.floor(Number(b.level) || 1));
    const tag = b.listItem === 'number' ? 'ol' : 'ul';
    while (open.length > level) html += '</li></' + open.pop() + '>';
    if (open.length === level && open[level - 1] !== tag) html += '</li></' + open.pop() + '>';
    if (open.length === level) html += '</li>';
    while (open.length < level) {
      open.push(tag);
      html += '<' + tag + (tag === 'ol' && Number(b.listStart) > 1 && open.length === 1 ? ' start="' + Number(b.listStart) + '"' : '') + '>';
    }
    html += '<li' + ptAlign(b) + '>' + ptSpans(b.children, b.markDefs, o);
  }
  while (open.length) html += '</li></' + open.pop() + '>';
  return html;
};
const ptSize = (w, h) => (Number(w) > 0 ? ' width="' + Math.round(Number(w)) + '"' : '') + (Number(h) > 0 ? ' height="' + Math.round(Number(h)) + '"' : '');
/** A picture, linked where it says so, captioned where it has one. */
const ptImage = (b, o) => {
  const src = o.asset(b.asset ?? {});
  if (!src) return '';
  let img = '<img src="' + ptEsc(src) + '" alt="' + ptEsc(b.alt ?? '') + '"' + ptSize(b.displayWidth ?? b.width, b.displayHeight ?? b.height) + ' loading="lazy">';
  const link = typeof b.link === 'string' ? { href: b.link } : b.link;
  const href = link && typeof link === 'object' ? ptHref(link.href, o) : '';
  if (href) img = ptLink(href, link.blank, img);
  return img + (b.caption ? '<figcaption>' + ptText(b.caption) + '</figcaption>' : '');
};
/* What EmDash calls an image's alignment, in the class names a post's
   content has always had for it — the entry design's starter rule styles them. */
const PT_ALIGNS = { __proto__: null, left: 'alignleft', center: 'aligncenter', right: 'alignright', wide: 'alignwide', full: 'alignfull' };
/* An HTML block shown inline keeps what EmDash's own site keeps of it
   (SITE_HTML_ALLOWED_* in @emdash-cms/admin, which its HtmlBlock hands to
   sanitize-html): these tags and attributes, http(s), ftp, mailto, tel and
   relative addresses, and an iframe's src only from YouTube and Vimeo. It is
   read with scanTag (html-scan.ts) and written anew from what is kept, so
   nothing reaches the page that was not looked at; what runs, styles or is
   not shown goes with everything in it. */
const PT_TAGS = new Set(('address article aside footer header h1 h2 h3 h4 h5 h6 hgroup main nav section blockquote dd div dl dt figcaption figure hr li menu ol p pre ul'
  + ' a abbr b bdi bdo br cite code data dfn em i kbd mark q rb rp rt rtc ruby s samp small span strong sub sup time u var wbr'
  + ' caption col colgroup table tbody td tfoot th thead tr img iframe').split(' '));
const PT_TAG_ATTRS = { a: ['href', 'name', 'target'], img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'], iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen'] };
const PT_SCHEMES = new Set(['', 'http', 'https', 'ftp', 'mailto', 'tel']);
const PT_FRAMES = new Set(['www.youtube.com', 'player.vimeo.com']);
const PT_VOID = new Set(['br', 'hr', 'img', 'wbr', 'col']);
const PT_GONE = new Set(['script', 'style', 'textarea', 'option', 'title', 'xmp', 'noembed', 'noframes', 'noscript', 'template', 'svg', 'math']);
/** What opening a tag closes first, as a browser closes it: a paragraph before a block, an item before the next. */
const PT_BLOCKS = new Set('address article aside blockquote dd div dl dt figcaption figure footer h1 h2 h3 h4 h5 h6 header hgroup hr li main menu nav ol p pre section table ul'.split(' '));
const PT_ENDS = { li: ['li'], dt: ['dt', 'dd'], dd: ['dt', 'dd'], tr: ['tr', 'td', 'th'], td: ['td', 'th'], th: ['td', 'th'],
  thead: ['td', 'th', 'tr', 'thead', 'tbody', 'tfoot'], tbody: ['td', 'th', 'tr', 'thead', 'tbody', 'tfoot'], tfoot: ['td', 'th', 'tr', 'thead', 'tbody', 'tfoot'] };
/** Text between tags, with the references in it kept as they were written. */
const ptKeep = (s) => String(s).replace(/&(?!#?[a-zA-Z0-9]+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ptUrl = (v, frame) => {
  if (!frame) return PT_SCHEMES.has(scanScheme(v));
  try {
    const u = new URL(v, 'https://relative.invalid');
    return (u.protocol === 'https:' || u.protocol === 'http:') && PT_FRAMES.has(u.hostname);
  } catch { return false; }
};
/** A path on EmDash's site, as an address on it; any other address as it is. */
const ptAbsOf = (v, o) => (v.startsWith('/') && !v.startsWith('//') ? o.abs(v) : v);
/** A kept tag's attributes, written anew: an address read and checked, any other value as it was written. */
function ptAttrs(t, o) {
  const allowed = PT_TAG_ATTRS[t.name] || [];
  const seen = new Set();
  let out = '';
  for (const a of t.attrs) {
    if (seen.has(a.key)) continue;
    seen.add(a.key);
    if (!(a.key === 'class' || a.key === 'id' || /^data-[a-z0-9_.\-]+$/.test(a.key) || allowed.includes(a.key))) continue;
    if (a.bare) { out += ' ' + a.key; continue; }
    if (a.key === 'srcset') {
      const each = scanDecode(a.value).split(',').map((c) => c.trim()).filter(Boolean).map((c) => ({ url: c.split(/\s+/)[0], rest: c.slice(c.split(/\s+/)[0].length) }));
      if (!each.every((c) => ptUrl(c.url, false))) continue;
      out += ' srcset="' + ptEsc(each.map((c) => ptAbsOf(c.url, o) + c.rest).join(', ')) + '"';
    } else if (a.key === 'href' || a.key === 'src') {
      const v = scanDecode(a.value).trim();
      if (!ptUrl(v, t.name === 'iframe')) continue;
      out += ' ' + a.key + '="' + ptEsc(t.name === 'iframe' ? v : ptAbsOf(v, o)) + '"';
    } else out += ' ' + a.key + '="' + ptKeep(a.value).replace(/"/g, '&quot;') + '"';
  }
  return out;
}
function ptClean(html, o) {
  const s = String(html ?? '');
  const open = [];
  let out = '';
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    out += ptKeep(s.slice(i, lt < 0 ? s.length : lt));
    if (lt < 0) break;
    const t = scanTag(s, lt);
    if (!t) {
      const e = scanSkip(s, lt);
      if (e < 0) { out += '&lt;'; i = lt + 1; } else i = e;
      continue;
    }
    if (t.cut || t.name === 'plaintext') break;
    i = t.end;
    if (t.close) {
      const at = open.lastIndexOf(t.name);
      while (at >= 0 && open.length > at) out += '</' + open.pop() + '>';
      continue;
    }
    if (PT_GONE.has(t.name)) {
      const e = scanRawEnd(s, i, t.name);
      if (e < 0) break;
      i = e;
      continue;
    }
    if (!PT_TAGS.has(t.name)) continue;
    if (PT_BLOCKS.has(t.name)) while (open[open.length - 1] === 'p') out += '</' + open.pop() + '>';
    const ends = PT_ENDS[t.name];
    if (ends) while (ends.includes(open[open.length - 1])) out += '</' + open.pop() + '>';
    out += '<' + t.name + ptAttrs(t, o) + '>';
    if (t.name === 'iframe') {
      out += '</iframe>';
      const e = scanRawEnd(s, i, 'iframe');
      if (e < 0) break;
      i = e;
    } else if (!PT_VOID.has(t.name)) open.push(t.name);
  }
  while (open.length) out += '</' + open.pop() + '>';
  return out;
}
const ptCell = (c, head, defs, o) => {
  const tag = head || c.isHeader ? 'th' : 'td';
  return '<' + tag + (Number(c.colspan) > 1 ? ' colspan="' + Number(c.colspan) + '"' : '') + (Number(c.rowspan) > 1 ? ' rowspan="' + Number(c.rowspan) + '"' : '')
    + ptAlign(c) + '>' + ptSpans(c.content, c.markDefs ?? defs, o) + '</' + tag + '>';
};
const ptRow = (r, head, defs, o) => '<tr>' + (Array.isArray(r && r.cells) ? r.cells : []).map((c) => ptCell(c ?? {}, head, defs, o)).join('') + '</tr>';
/** An address a picture or a player loads from: http(s), or a path on the CMS's site made absolute. */
const ptSrc = (u, o) => {
  const s = String(u ?? '').trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/') && !s.startsWith('//')) return o.abs(s);
  return '';
};
/** A length (430px, 50%, 60vh) or a color (#000, rgb(0 0 0 / 50%)) as the CMS
    wrote it, and nothing else: either is written into a style. */
const ptLength = (v) => { const s = String(v ?? '').trim(); return /^\d+(\.\d+)?(px|%|r?em|vh|vw|svh|dvh)$/.test(s) ? s : ''; };
/** The colors of WordPress's own palette, by the slug a Gutenberg block names
    one with (an imported cover's "overlayColor": "black"). A theme's own slug
    means nothing without the theme, and is left out like any other word. */
const PT_PRESETS = { black: '#000000', 'cyan-bluish-gray': '#abb8c3', white: '#ffffff', 'pale-pink': '#f78da7', 'vivid-red': '#cf2e2e',
  'luminous-vivid-orange': '#ff6900', 'luminous-vivid-amber': '#fcb900', 'light-green-cyan': '#7bdcb5', 'vivid-green-cyan': '#00d084',
  'pale-cyan-blue': '#8ed1fc', 'vivid-cyan-blue': '#0693e3', 'vivid-purple': '#9b51e0' };
const ptColor = (v) => {
  const s = String(v ?? '').trim();
  if (Object.prototype.hasOwnProperty.call(PT_PRESETS, s)) return PT_PRESETS[s];
  return /^#[0-9a-f]{3,8}$/i.test(s) || /^(rgb|hsl)a?\([0-9.,%\s\/]+\)$/i.test(s) ? s : '';
};
/** The blocks inside a block — a cover's, a column's — drawn the same way, a few levels deep at most. */
const ptInner = (blocks, o) => ((o.depth || 0) >= 6 ? '' : ptHtml(blocks, { ...o, depth: (o.depth || 0) + 1 }));
/** A button: a link styled as one, or its text where it links nowhere. */
const ptButton = (b, o) => {
  if (!b || typeof b !== 'object' || !String(b.text ?? '').trim()) return '';
  const href = ptHref(b.url, o);
  const text = ptText(b.text);
  return '<div class="wp-block-button' + (b.style === 'outline' || b.style === 'fill' ? ' is-style-' + b.style : '') + '">'
    + (href ? '<a class="wp-block-button__link" href="' + ptEsc(href) + '">' + text + '</a>' : '<span class="wp-block-button__link">' + text + '</span>') + '</div>';
};
/* The players EmDash's own Embed draws in a frame: YouTube and Vimeo, by the id in the address. */
const PT_YOUTUBE = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const PT_VIMEO = /vimeo\.com\/(\d+)/;
/** An embed: YouTube's or Vimeo's player, a sound or a video of the site's own, and any other a link to it. */
const ptEmbed = (b, o) => {
  const url = ptSrc(b.url, o);
  if (!url) return '';
  const yt = PT_YOUTUBE.exec(url);
  const vimeo = yt ? null : PT_VIMEO.exec(url);
  const inner = b.provider === 'video' || b.provider === 'audio'
    ? '<' + b.provider + ' src="' + ptEsc(url) + '" controls preload="metadata"></' + b.provider + '>'
    : yt ? '<iframe src="https://www.youtube.com/embed/' + yt[1] + '" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>'
    : vimeo ? '<iframe src="https://player.vimeo.com/video/' + vimeo[1] + '" title="Vimeo video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>'
    : ptLink(url, false, ptText(url));
  return '<figure class="wp-block-embed">' + inner + (b.caption ? '<figcaption>' + ptText(b.caption) + '</figcaption>' : '') + '</figure>';
};
/** One block that is not part of a list or a quote. */
function ptBlock(b, o) {
  switch (b._type) {
    case 'block': {
      const tag = PT_STYLES[b.style] ?? 'p';
      return '<' + tag + ptAlign(b) + '>' + ptSpans(b.children, b.markDefs, o) + '</' + tag + '>';
    }
    case 'image': {
      const inner = ptImage(b, o);
      return inner ? '<figure' + (PT_ALIGNS[b.alignment] ? ' class="' + PT_ALIGNS[b.alignment] + '"' : '') + '>' + inner + '</figure>' : '';
    }
    case 'gallery': {
      const pics = (Array.isArray(b.images) ? b.images : []).map((i) => (i ? ptImage(i, o) : '')).filter(Boolean);
      return pics.length ? '<div class="gallery"' + (Number(b.columns) > 0 ? ' style="--columns: ' + Math.round(Number(b.columns)) + '"' : '') + '>'
        + pics.map((p) => '<figure>' + p + '</figure>').join('') + '</div>' : '';
    }
    case 'code': {
      const code = '<pre><code' + (b.language ? ' class="language-' + ptEsc(b.language) + '"' : '') + '>' + ptText(b.code ?? '') + '</code></pre>';
      return b.filename ? '<figure class="code"><figcaption>' + ptText(b.filename) + '</figcaption>' + code + '</figure>' : code;
    }
    case 'table': {
      const rows = Array.isArray(b.rows) ? b.rows : [];
      const head = b.hasHeaderRow && rows.length ? '<thead>' + ptRow(rows[0], true, b.markDefs, o) + '</thead>' : '';
      return '<table>' + head + '<tbody>' + rows.slice(head ? 1 : 0).map((r) => ptRow(r, false, b.markDefs, o)).join('') + '</tbody></table>';
    }
    case 'break': return '<hr>';
    case 'htmlBlock': return b.isolated ? '' : ptClean(b.html, o);
    case 'iframe': {
      /* an embed from a player or widget WordPress would embed, or the CMS's own site (cmsFrames) */
      const src = String(b.src ?? '').trim();
      let own = '';
      try { own = new URL(o.abs('/')).host; } catch { /* no site address */ }
      if (!/^https:\/\//i.test(src) || !cmsFrameOk(src, own)) { if (src) cmsFrameHeld(src); return ''; }
      return '<iframe src="' + ptEsc(src) + '" title="' + ptEsc(b.title ?? '') + '"' + ptSize(b.width, b.height)
        + (b.allow ? ' allow="' + ptEsc(b.allow) + '"' : '') + (b.allowFullscreen ? ' allowfullscreen' : '') + ' loading="lazy"></iframe>';
    }
    case 'video': {
      const src = b.asset && b.asset.url ? o.asset(b.asset) : '';
      return src ? '<figure><video src="' + ptEsc(src) + '" controls preload="metadata"' + ptSize(b.width, b.height) + '></video>'
        + (b.caption ? '<figcaption>' + ptText(b.caption) + '</figcaption>' : '') + '</figure>' : '';
    }
    case 'cover': {
      /* The picture is a picture, behind the content, and the dim over it
         its own element; its height and its color are custom properties
         the content rule reads, written only when they are what they say. */
      const img = ptSrc(b.backgroundImage, o);
      const vid = ptSrc(b.backgroundVideo, o);
      const min = ptLength(b.minHeight);
      const color = ptColor(b.overlayColor);
      const dim = b.overlayOpacity == null || b.overlayOpacity === '' ? NaN : Number(b.overlayOpacity);
      const vars = [min ? '--cover-min-height: ' + min : '', color ? '--cover-overlay: ' + color : '',
        dim >= 0 && dim <= 1 ? '--cover-dim: ' + dim : ''].filter(Boolean).join('; ');
      return '<div class="wp-block-cover' + (b.alignment === 'left' || b.alignment === 'right' ? ' is-position-center-' + b.alignment : '') + '"'
        + (vars ? ' style="' + ptEsc(vars) + '"' : '') + '>'
        + (vid ? '<video class="wp-block-cover__video-background" src="' + ptEsc(vid) + '" autoplay muted loop playsinline></video>'
          : img ? '<img class="wp-block-cover__image-background" src="' + ptEsc(img) + '" alt="" loading="lazy">' : '')
        + (img || vid ? '<span class="wp-block-cover__background" aria-hidden="true"></span>' : '')
        + '<div class="wp-block-cover__inner-container">' + ptInner(b.content, o) + '</div></div>';
    }
    case 'pullquote':
      return String(b.text ?? '').trim() ? '<figure class="wp-block-pullquote"><blockquote><p>' + ptText(b.text).replace(/\n/g, '<br>') + '</p></blockquote>'
        + (String(b.citation ?? '').trim() ? '<figcaption>' + ptText(b.citation) + '</figcaption>' : '') + '</figure>' : '';
    case 'columns': {
      const cols = (Array.isArray(b.columns) ? b.columns : []).filter((c) => c && typeof c === 'object');
      return cols.length ? '<div class="wp-block-columns">' + cols.map((c) => {
        const w = ptLength(c.width);
        return '<div class="wp-block-column"' + (w ? ' style="flex-basis: ' + w + '"' : '') + '>' + ptInner(c.content, o) + '</div>';
      }).join('') + '</div>' : '';
    }
    case 'embed': return ptEmbed(b, o);
    case 'button': return ptButton(b, o);
    case 'buttons': {
      const all = (Array.isArray(b.buttons) ? b.buttons : []).map((x) => ptButton(x, o)).join('');
      return all ? '<div class="wp-block-buttons' + (b.layout === 'vertical' ? ' is-vertical' : '') + '">' + all + '</div>' : '';
    }
    case 'file': {
      const href = ptHref(b.url, o);
      if (!href) return '';
      /* its name, or the last part of its address — never a word in one language */
      const name = String(b.filename ?? '').trim() || href.split(/[?#]/)[0].split('/').filter(Boolean).pop() || href;
      return '<div class="wp-block-file"><a href="' + ptEsc(href) + '" download>' + ptText(name) + '</a></div>';
    }
    default: return '';
  }
}
/** A list of blocks as HTML. Consecutive list items become one nested list,
    and consecutive quote blocks one blockquote, as EmDash draws them. */
function ptHtml(blocks, o) {
  const list = Array.isArray(blocks) ? blocks : [];
  let out = '';
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (!b || typeof b !== 'object') continue;
    if (b._type === 'block' && b.listItem) {
      const run = [];
      while (i < list.length && list[i] && list[i]._type === 'block' && list[i].listItem) run.push(list[i++]);
      i--;
      out += ptList(run, o);
      continue;
    }
    if (b._type === 'block' && b.style === 'blockquote') {
      const run = [];
      while (i < list.length && list[i] && list[i]._type === 'block' && !list[i].listItem && list[i].style === 'blockquote') run.push(list[i++]);
      i--;
      out += '<blockquote>' + run.map((q) => '<p' + ptAlign(q) + '>' + ptSpans(q.children, q.markDefs, o) + '</p>').join('') + '</blockquote>';
      continue;
    }
    out += ptBlock(b, o);
  }
  return out;
}
const PT_DRAWN = new Set(['block', 'image', 'gallery', 'code', 'table', 'break', 'iframe',
  'cover', 'pullquote', 'columns', 'embed', 'button', 'buttons', 'file']);
/** The blocks ptHtml leaves out, by what they are: a plugin's type, an HTML
    block that runs its own script in a frame, a video only its provider
    plays — inside a cover or a column too. */
const ptUndrawn = (blocks, depth = 0) => (Array.isArray(blocks) ? blocks : []).filter((b) => b && typeof b === 'object').flatMap((b) => (
  b._type === 'htmlBlock' ? (b.isolated ? ['htmlBlock (isolated)'] : [])
    : b._type === 'video' ? (b.asset && b.asset.url ? [] : ['video (a provider’s)'])
    : b._type === 'cover' ? (depth < 6 ? ptUndrawn(b.content, depth + 1) : [])
    : b._type === 'columns' ? (depth < 6 ? (Array.isArray(b.columns) ? b.columns : []).flatMap((c) => ptUndrawn(c && c.content, depth + 1)) : [])
    : PT_DRAWN.has(b._type) ? [] : [String(b._type)]));`;
var PT_RESERVED = [
  "PT_ESC",
  "ptEsc",
  "ptText",
  "ptHref",
  "ptLink",
  "PT_MARKS",
  "ptSpans",
  "PT_TEXT_ALIGN",
  "ptAlign",
  "PT_STYLES",
  "ptList",
  "ptSize",
  "ptImage",
  "PT_ALIGNS",
  "PT_TAGS",
  "PT_TAG_ATTRS",
  "PT_SCHEMES",
  "PT_FRAMES",
  "PT_VOID",
  "PT_GONE",
  "PT_BLOCKS",
  "PT_ENDS",
  "ptKeep",
  "ptUrl",
  "ptAbsOf",
  "ptAttrs",
  "ptClean",
  "ptCell",
  "ptRow",
  "ptSrc",
  "ptLength",
  "PT_PRESETS",
  "ptColor",
  "ptInner",
  "ptButton",
  "PT_YOUTUBE",
  "PT_VIMEO",
  "ptEmbed",
  "ptBlock",
  "ptHtml",
  "PT_DRAWN",
  "ptUndrawn"
];

// ../src/builder-core/cms/emdash.ts
var js2 = (v2) => JSON.stringify(v2);
var EM_COMPANION_PAGE = "https://sitereal.app/docs/emdash";
function emRoot(url) {
  const clean2 = url.trim().replace(/[?#].*$/, "").replace(/\/+$/, "");
  const at = clean2.indexOf("/_emdash");
  return at >= 0 ? clean2.slice(0, at) : clean2;
}
var emLimitOf = (s) => Math.max(0, Math.floor(Number(s.cmsLimit) || 0));
function emEndpoint(s, limit = Math.min(100, emLimitOf(s) || 100)) {
  const extra = new URLSearchParams((s.cmsQuery ?? "").trim().replace(/^[?&]+/, ""));
  for (const k of ["status", "cursor", "page", "limit"]) extra.delete(k);
  const q = extra.toString();
  const type = encodeURIComponent((s.cmsType ?? "").trim() || "posts");
  return `${emRoot(s.url)}/_emdash/api/content/${type}?status=published&limit=${limit}${q ? `&${q}` : ""}`;
}
var emSchemaEndpoint = (s) => `${emRoot(s.url)}/_emdash/api/schema/collections/${encodeURIComponent((s.cmsType ?? "").trim() || "posts")}?includeFields=true`;
var SOURCE_EMDASH_JS = String.raw`/** Keys that are the entry's own: a field of the same name is kept as <key>_field. */
const EMDASH_OWN = new Set(['id', 'slug', 'url', 'link']);
const emdashIsObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
/** The hosts EmDash's own files were found on — its site, and the bucket or
    image service a storage adapter put them on (R2, S3) — so that copying
    takes them as this source's own. Filled as the entries are shaped. */
const EMDASH_HOSTS = new Set();
/** Fields a page's description is taken from when the entry has none of its own. */
const EMDASH_SUMMARY = ['excerpt', 'description', 'summary', 'teaser', 'intro'];
/** The schema's field types that hold text or a value, never markup. */
const EMDASH_TEXT = new Set(['string', 'text', 'slug', 'select', 'multiSelect', 'url', 'reference', 'number', 'integer', 'boolean', 'datetime', 'image', 'file']);
const EMDASH_ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
/** Rich text as the plain text a meta description holds: the tags gone, the
    references read, the whitespace one space, and cut at a word near 160
    characters — the length a search result shows. */
const emdashPlain = (html) => {
  const text = String(html ?? '').replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, r) => {
      if (r[0] !== '#') return EMDASH_ENT[r.toLowerCase()] ?? m;
      const n = r[1] === 'x' || r[1] === 'X' ? parseInt(r.slice(2), 16) : Number(r.slice(1));
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    })
    .replace(/\s+/g, ' ').trim();
  if (text.length <= 160) return text;
  const cut = text.slice(0, 159);
  return (cut.lastIndexOf(' ') > 100 ? cut.slice(0, cut.lastIndexOf(' ')) : cut).replace(/[\s,.;:–—-]+$/, '') + '…';
};
/** An address EmDash gives relative to its site, as one a visitor's browser
    can ask for. One with a scheme is kept only when it is http(s): a file's
    or a picture's address is bound into a link or a src, where a
    javascript: one would run. */
const emdashAbs = (u, root) => {
  const s = String(u ?? '').trim();
  if (!s) return '';
  if (s.startsWith('//')) return 'https:' + s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return /^https?:/i.test(s) ? s : '';
  return root + (s.startsWith('/') ? '' : '/') + s;
};
/** Where a media value's file is: its own address, or EmDash's file route for its storage key. */
const emdashFile = (v, root) => {
  const url = emdashAbs(v && (v.src ?? v.url ?? (v.meta && v.meta.storageKey ? '/_emdash/api/media/file/' + v.meta.storageKey : '')), root);
  /* The site's own host is not one of them: there only its file route is its media. */
  try {
    const host = url ? new URL(url).hostname.toLowerCase().replace(/^www\./, '') : '';
    if (host && host !== new URL(root).hostname.toLowerCase().replace(/^www\./, '')) EMDASH_HOSTS.add(host);
  } catch { /* not an address */ }
  return url;
};
const emdashIsMedia = (v) => emdashIsObj(v) && typeof v.provider === 'string'
  && (typeof v.src === 'string' || typeof v.url === 'string' || typeof (v.meta && v.meta.storageKey) === 'string');
const emdashIsPt = (v) => Array.isArray(v) && v.length > 0 && v.every((b) => emdashIsObj(b) && typeof b._type === 'string' && !('_version' in b));
const emdashIsBlocks = (v) => Array.isArray(v) && v.length > 0 && v.every((b) => emdashIsObj(b) && typeof b._type === 'string' && '_version' in b);
/** One field as the keys it becomes: rich text as HTML, a picture as its
    address with its alt and size beside it the way image_alt sits beside
    image, a file as its address with its name and type, and lists of
    records shaped the same way all the way down. */
function emdashField(key, value, type, ctx, depth) {
  if (type === 'portableText' || (!type && emdashIsPt(value))) {
    return { [key]: ptHtml(value, { abs: (u) => emdashAbs(u, ctx.root), asset: (a) => emdashFile(a, ctx.root) }) };
  }
  if (type === 'image' || type === 'file' || (!type && emdashIsMedia(value))) {
    /* A picture unless the schema says file, or its type says it is not one. */
    const picture = type === 'image' || (type !== 'file' && !(value && value.mimeType && !String(value.mimeType).startsWith('image/')));
    const out = { [key]: emdashIsMedia(value) ? emdashFile(value, ctx.root) : '' };
    if (picture) {
      out[key + '_alt'] = (value && value.alt) ?? '';
      out[key + '_width'] = (value && value.width) ?? '';
      out[key + '_height'] = (value && value.height) ?? '';
      if (value && emdashIsMedia(value.darkVariant)) out[key + '_dark'] = emdashFile(value.darkVariant, ctx.root);
    } else {
      out[key + '_name'] = (value && value.filename) ?? '';
      out[key + '_type'] = (value && value.mimeType) ?? '';
    }
    return out;
  }
  if (depth < 4 && (type === 'blocks' || (!type && emdashIsBlocks(value)))) {
    return { [key]: (Array.isArray(value) ? value : []).filter(emdashIsObj).map((b) => ({ type: b._type, key: b._key ?? '', ...emdashRecord(b, ctx, depth + 1) })) };
  }
  if (depth < 4 && Array.isArray(value) && value.some(emdashIsObj)) {
    return { [key]: value.map((x) => (emdashIsObj(x) ? emdashRecord(x, ctx, depth + 1) : x)) };
  }
  if (depth < 4 && type !== 'json' && emdashIsObj(value)) return { [key]: emdashRecord(value, ctx, depth + 1) };
  return { [key]: value ?? '' };
}
/** A record's fields, each by its shape; keys starting with an underscore are EmDash's bookkeeping. */
function emdashRecord(o, ctx, depth) {
  const out = {};
  for (const [k, v] of Object.entries(o ?? {})) if (!k.startsWith('_')) Object.assign(out, emdashField(k, v, '', ctx, depth));
  return out;
}
/** One entry as the fields a page places: its own fields first, by their
    type in the schema, then what EmDash keeps about it, and — when the
    collection has an address pattern — its address on the EmDash site. */
function emdashRow(item, ctx) {
  const c = { root: '', pattern: '', fields: {}, ...(emdashIsObj(ctx) ? ctx : {}) };
  const data = emdashIsObj(item && item.data) ? item.data : {};
  const rel = emdashIsObj(c.relations) ? c.relations : {};
  /* the site's own host: an embed of one of its pages is its own */
  let own = '';
  try { own = new URL(String(c.root)).host; } catch { /* no site address */ }
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    /* A field bound to a relation is read from its links (emdashRelations):
       what data still holds under its name is the value frozen in its old
       column, which EmDash itself no longer reads. */
    if (emdashIsObj(rel[k])) continue;
    const type = (c.fields && c.fields[k]) || '';
    const field = emdashField(EMDASH_OWN.has(k) ? k + '_field' : k, v, type, c, 0);
    /* A field that may hold markup — rich text (drawn held already, by
       ptHtml), JSON, a repeater, or one the schema does not name — keeps an
       iframe only from a player or the site itself, as a WordPress post's
       content does (cmsRowFrames). One the schema says is text is words,
       and stays as typed. */
    Object.assign(out, EMDASH_TEXT.has(type) ? field : cmsRowFrames(field, own));
  }
  /* The ids each relation links, in its order: emdashRefs makes them the
     entries they are, the way it does an old reference's. One that was not
     read is empty. */
  const linked = emdashIsObj(item && item._relations) ? item._relations : {};
  for (const [k, r] of Object.entries(rel)) {
    if (!emdashIsObj(r)) continue;
    const ids = (Array.isArray(linked[k]) ? linked[k] : []).filter((x) => typeof x === 'string' && x);
    out[EMDASH_OWN.has(k) ? k + '_field' : k] = r.many === false ? (ids[0] ?? '') : ids;
  }
  const by = emdashIsObj(item && item.byline) ? item.byline : null;
  const slug = String((item && item.slug) ?? '');
  Object.assign(out, {
    id: (item && item.id) ?? '',
    slug,
    publishedAt: (item && item.publishedAt) ?? '',
    updatedAt: (item && item.updatedAt) ?? '',
    createdAt: (item && item.createdAt) ?? '',
    author: (by && by.displayName) ?? '',
    author_slug: (by && by.slug) ?? '',
    author_bio: (by && by.bio) ?? '',
  });
  /* Every author credited, in order — the byline above is the first. */
  const credits = Array.isArray(item && item.bylines) ? item.bylines : [];
  out.authors = credits.map((x) => (x && x.byline && x.byline.displayName) || '').filter(Boolean);
  if (!out.authors.length && out.author) out.authors = [out.author];
  /* The terms asked for (emdashTerms), as names, with their slugs beside them. */
  for (const [t, terms] of Object.entries(emdashIsObj(item && item._terms) ? item._terms : {})) {
    const key = t in out ? t + '_terms' : t;
    out[key] = (Array.isArray(terms) ? terms : []).map((x) => x.label);
    out[key + '_slugs'] = (Array.isArray(terms) ? terms : []).map((x) => x.slug);
  }
  if (item && item.locale) out.locale = item.locale;
  /* what an entry's versions in other languages share */
  if (item && item.translationGroup) out.translationGroup = item.translationGroup;
  const seo = emdashIsObj(item && item.seo) ? item.seo : {};
  if (emdashIsObj(item && item.seo)) out.seo = emdashRecord(item.seo, c, 1);
  if (c.pattern && slug) out.link = c.root + String(c.pattern).replace(/\{slug\}/g, slug);
  /* What an entry page says about itself — its own SEO fields where the
     editor filled them in, the entry otherwise — so its design can bind
     {entry.meta_title} and have something on every entry. */
  const firstPicture = Object.entries(c.fields || {}).find(([, t]) => t === 'image');
  out.meta_title = String(seo.title || out.title || slug);
  /* A summary field that is rich text arrives as HTML (ptHtml), and a text
     field may hold markup too: a description is text, so either is read as
     text. A plain one stays as written. */
  const summary = (k) => {
    const v = typeof out[k] === 'string' ? out[k] : '';
    return (c.fields && c.fields[k]) === 'portableText' || emdashIsPt(data[k]) || /<[a-z!\/][^>]*>/i.test(v) ? emdashPlain(v) : v;
  };
  out.meta_description = String(seo.description || EMDASH_SUMMARY.map(summary).find(Boolean) || '');
  out.meta_image = (emdashIsMedia(seo.image) ? emdashFile(seo.image, c.root) : '') || (firstPicture ? String(out[firstPicture[0]] || '') : '');
  return out;
}
/** A reference to another entry of this source, as that entry — its id,
    slug, title and address here. One the rows do not hold (another
    collection's) stays { id }. Run after the addresses are stamped. */
function emdashRefs(rows, ctx) {
  const fields = Object.entries((emdashIsObj(ctx) && ctx.fields) || {}).filter(([, t]) => t === 'reference').map(([k]) => (EMDASH_OWN.has(k) ? k + '_field' : k));
  if (!fields.length || !Array.isArray(rows)) return rows;
  const byId = new Map(rows.filter((r) => r && r.id).map((r) => [String(r.id), r]));
  const one = (id) => {
    const r = byId.get(String(id));
    return r ? { id: r.id, slug: r.slug ?? '', title: r.title ?? r.slug ?? '', url: r.url ?? '' } : { id: String(id) };
  };
  return rows.map((r) => {
    if (!emdashIsObj(r)) return r;
    const out = { ...r };
    for (const k of fields) {
      if (Array.isArray(r[k])) out[k] = r[k].filter((x) => typeof x === 'string' && x).map(one);
      else if (typeof r[k] === 'string' && r[k]) out[k] = one(r[k]);
    }
    return out;
  });
}
/** Each entry's terms in the taxonomies asked for: a list does not carry
    them, so it is one request per entry per taxonomy, six at a time. ask
    answers a path under the API with its JSON. */
async function emdashTerms(items, taxonomies, ask) {
  const jobs = [];
  for (const it of Array.isArray(items) ? items : []) {
    if (emdashIsObj(it) && it.id) for (const t of taxonomies) jobs.push([it, t]);
  }
  let i = 0;
  const one = async ([it, t]) => {
    const answer = await ask('/content/' + encodeURIComponent(it.type ?? '') + '/' + encodeURIComponent(it.id) + '/terms/' + encodeURIComponent(t));
    const terms = emdashIsObj(answer) && emdashIsObj(answer.data) && Array.isArray(answer.data.terms) ? answer.data.terms : [];
    it._terms = { ...(emdashIsObj(it._terms) ? it._terms : {}),
      [t]: terms.filter(emdashIsObj).map((x) => ({ label: String(x.label ?? x.slug ?? ''), slug: String(x.slug ?? '') })) };
  };
  await Promise.all(Array.from({ length: 6 }, async () => { while (i < jobs.length) await one(jobs[i++]); }));
  return items;
}
/** Each entry's links in the relations its fields read (EmDash 1.x keeps a
    relation editor's choice apart from the entry, so a list has none of
    them): one request per entry per field, a hundred links a page, six at a
    time, as the ids they link. A request that fails leaves that field empty
    on that entry and is said once (emdashNotes); after three, the rest are
    not asked. It never throws: the entries are still the entries. */
async function emdashRelations(items, relations, ask) {
  const jobs = [];
  for (const it of Array.isArray(items) ? items : []) {
    if (!emdashIsObj(it) || !it.id) continue;
    for (const [k, r] of Object.entries(emdashIsObj(relations) ? relations : {})) {
      if (emdashIsObj(r) && typeof r.relation === 'string' && r.relation) jobs.push([it, k, r]);
    }
  }
  let i = 0;
  let failures = 0;
  const mark = (it, slot, k, v) => { it[slot] = { ...(emdashIsObj(it[slot]) ? it[slot] : {}), [k]: v }; };
  const one = async ([it, k, r]) => {
    mark(it, '_relations', k, []);
    if (failures >= 3) { mark(it, '_relationFailed', k, 'not asked after three requests failed'); return; }
    const end = r.side === 'child' ? 'parents' : 'children';
    const ids = [];
    let cursor = '';
    try {
      for (let page = 0; page < 10; page++) {
        const answer = await ask('/content/' + encodeURIComponent(it.type ?? '') + '/' + encodeURIComponent(it.id) + '/references/'
          + encodeURIComponent(r.relation) + '/' + end + '?limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
        if (!emdashIsObj(answer) || answer.success === false || !emdashIsObj(answer.data) || !Array.isArray(answer.data[end])) {
          throw new Error(emdashIsObj(answer) && emdashIsObj(answer.error) && answer.error.message ? String(answer.error.message) : 'the answer holds no list of linked entries');
        }
        for (const x of answer.data[end]) if (emdashIsObj(x) && typeof x.id === 'string' && x.id) ids.push(x.id);
        cursor = typeof answer.data.nextCursor === 'string' ? answer.data.nextCursor : '';
        if (!cursor) break;
      }
      mark(it, '_relations', k, ids);
      if (cursor) mark(it, '_relationCut', k, ids.length);
    } catch (e) {
      failures += 1;
      mark(it, '_relationFailed', k, String((e && e.message) || e));
    }
  };
  await Promise.all(Array.from({ length: 6 }, async () => { while (i < jobs.length) await one(jobs[i++]); }));
  return items;
}
/** What the preview adds to the entries before they are shaped, in the
    module's order: each relation's links, then the terms. */
async function emdashEnrich(items, arg, ask) {
  const a = emdashIsObj(arg) ? arg : {};
  if (emdashIsObj(a.relations)) await emdashRelations(items, a.relations, ask);
  if (Array.isArray(a.terms) && a.terms.length) await emdashTerms(items, a.terms, ask);
  return items;
}
/** One page of a list as EmDash answers it: the entries, the cursor to the
    next page, and the total where it says one. A refusal inside the envelope
    is said as EmDash said it. */
const emdashPage = (answer) => {
  if (!emdashIsObj(answer)) throw new Error('the answer is not EmDash’s');
  if (answer.success === false) throw new Error(String((answer.error && (answer.error.message ?? answer.error.code)) ?? 'EmDash refused the request'));
  const d = emdashIsObj(answer.data) ? answer.data : {};
  if (!Array.isArray(d.items)) throw new Error('the answer holds no list of entries');
  return { list: d.items, next: typeof d.nextCursor === 'string' ? d.nextCursor : '', total: typeof d.total === 'number' ? d.total : undefined };
};
/** What the rich text holds that is not drawn, counted by type and said once. */
const emdashNotes = (items) => {
  const seen = new Map();
  const walk = (v, depth) => {
    if (depth > 5) return;
    if (emdashIsPt(v)) { for (const t of ptUndrawn(v)) seen.set(t, (seen.get(t) ?? 0) + 1); return; }
    if (Array.isArray(v)) for (const x of v) walk(x, depth + 1);
    else if (emdashIsObj(v)) for (const x of Object.values(v)) walk(x, depth + 1);
  };
  /* Relations not read, or cut, by field: once each, with the first reason. */
  const failed = new Map();
  const cut = new Map();
  for (const it of Array.isArray(items) ? items : []) {
    walk(it && it.data, 0);
    for (const [k, why] of Object.entries(emdashIsObj(it && it._relationFailed) ? it._relationFailed : {})) {
      const f = failed.get(k) ?? { n: 0, why: String(why) };
      f.n += 1;
      failed.set(k, f);
    }
    for (const k of Object.keys(emdashIsObj(it && it._relationCut) ? it._relationCut : {})) cut.set(k, (cut.get(k) ?? 0) + 1);
  }
  return [...seen].map(([t, n]) => n + (n === 1 ? ' block' : ' blocks') + ' of the type "' + t + '" ' + (n === 1 ? 'is' : 'are')
    + ' left out of the rich text: only EmDash’s own block types are drawn here.')
    .concat([...failed].map(([k, f]) => 'The relation "' + k + '" was not read for ' + f.n + (f.n === 1 ? ' entry, which has' : ' entries, which have')
      + ' it empty (' + f.why + ').'))
    .concat([...cut].map(([k, n]) => 'The relation "' + k + '" links more than 1,000 entries on ' + n + (n === 1 ? ' entry' : ' entries')
      + ': only the first 1,000 are kept.'))
    /* and the embeds held back while the entries were shaped */
    .concat(cmsFramesSaid());
};`;
var EM_FIELD_TYPES = {
  id: "text",
  slug: "text",
  publishedAt: "date",
  updatedAt: "date",
  createdAt: "date",
  author: "text",
  author_slug: "text",
  author_bio: "text",
  authors: "list",
  locale: "text",
  link: "url",
  seo: "object",
  meta_title: "text",
  meta_description: "text",
  meta_image: "image"
};
var EM_TYPE_OF = {
  string: "text",
  text: "text",
  slug: "text",
  select: "text",
  reference: "text",
  url: "url",
  file: "url",
  number: "number",
  integer: "number",
  boolean: "boolean",
  datetime: "date",
  image: "image",
  portableText: "html",
  multiSelect: "list",
  repeater: "list",
  blocks: "list",
  json: "object"
};
var isObj = (v2) => !!v2 && typeof v2 === "object" && !Array.isArray(v2);
function emReadTypes(data) {
  const d = isObj(data) && isObj(data.data) ? data.data : null;
  if (!d || !Array.isArray(d.items)) throw new SyntaxError("not EmDash");
  return d.items.filter((c2) => isObj(c2) && !c2.hidden && typeof c2.slug === "string").map((c2) => ({ slug: String(c2.slug), name: String(c2.label ?? c2.slug), base: String(c2.slug) }));
}
function emReadSchema(data) {
  const item = isObj(data) && isObj(data.data) && isObj(data.data.item) ? data.data.item : null;
  if (!item) return null;
  const listed2 = Array.isArray(item.fields) ? item.fields.filter(isObj).filter((f2) => typeof f2.slug === "string" && typeof f2.type === "string") : [];
  const fields = Object.fromEntries(listed2.map((f2) => [String(f2.slug), String(f2.type)]));
  const relations = {};
  for (const f2 of listed2) {
    const v2 = isObj(f2.validation) ? f2.validation : {};
    if (f2.type !== "reference" || typeof v2.relation !== "string" || !v2.relation) continue;
    relations[String(f2.slug)] = { relation: v2.relation, side: v2.relationSide === "child" ? "child" : "parent", many: v2.multiple !== false };
  }
  return {
    ...typeof item.urlPattern === "string" && item.urlPattern ? { pattern: item.urlPattern } : {},
    fields,
    ...Object.keys(relations).length ? { relations } : {}
  };
}
function emReadTaxonomies(schema, data, s) {
  const list2 = isObj(data) && isObj(data.data) && Array.isArray(data.data.taxonomies) ? data.data.taxonomies : [];
  const type = (s.cmsType ?? "").trim() || "posts";
  const taxonomies = list2.filter(isObj).filter((t) => typeof t.name === "string" && (!Array.isArray(t.collections) || t.collections.includes(type))).map((t) => ({ name: String(t.name), label: String(t.label ?? t.name) }));
  return { ...schema, taxonomies };
}
var emTermsOf = (s) => {
  const known = s.cmsSchema?.taxonomies?.map((t) => t.name);
  return (s.cmsTerms ?? []).filter((t) => typeof t === "string" && t && (!known || known.includes(t)));
};
var emRelationsOf = (s) => {
  const r2 = s.cmsSchema?.relations;
  const kept = Object.entries(isObj(r2) ? r2 : {}).filter(([k, v2]) => k && isObj(v2) && typeof v2.relation === "string" && v2.relation).map(([k, v2]) => [k, { relation: v2.relation, side: v2.side === "child" ? "child" : "parent", many: v2.many !== false }]);
  return kept.length ? Object.fromEntries(kept) : null;
};
function emFailed(status2, data, secret) {
  const said3 = isObj(data) && isObj(data.error) && typeof data.error.message === "string" ? ` (EmDash: ${data.error.message})` : "";
  if (status2 === 401 && secret) return `Answered 401 \u2014 ${secret} Make one under Settings \u2192 API tokens in EmDash's admin, with content:read and schema:read, and write it to .env here.`;
  if (status2 === 401) return `Answered 401 \u2014 the token is missing, mistyped or expired. Make one under Settings \u2192 API tokens in EmDash's admin, with content:read and schema:read, and write it to .env here${said3}.`;
  if (status2 === 403) return `Answered 403 \u2014 the token may not read this. It needs the scopes content:read and schema:read${said3}.`;
  if (status2 === 404) return `Answered 404 \u2014 there is no collection by that name on this site${said3}. Find collections lists the ones there are.`;
  return said3 ? `Answered ${status2}${said3}.` : null;
}
function emSecretShape(value, name) {
  const v2 = value.trim();
  if (/^ec_(pat|oat)_/.test(v2)) return null;
  if (v2.startsWith("emdash_enc_")) return `${name} holds EmDash's encryption key (EMDASH_ENCRYPTION_KEY), not an API token \u2014 tokens start with ec_pat_.`;
  return `${name} is not an EmDash API token \u2014 those start with ec_pat_.`;
}
var emData = (data) => isObj(data) && isObj(data.data) ? data.data : isObj(data) ? data : {};
var EM_CONNECT = {
  button: "Connect with EmDash",
  grants: "content:read and schema:read",
  who: "an EmDash admin",
  asks: {
    short: "it asks for admin access, handed back at once",
    why: "EmDash\u2019s page asks for admin access: only an admin may make a token, so that is what sitereal needs for the moment it makes one \u2014 then it hands the access back."
  },
  code: (s) => ({ url: `${emRoot(s.url)}/_emdash/api/oauth/device/code`, body: { scope: "admin" } }),
  readCode: (data) => {
    const d = emData(data);
    const device2 = d.device_code, user = d.user_code, at = d.verification_uri;
    if (typeof device2 !== "string" || typeof user !== "string" || typeof at !== "string") return null;
    const every = Number(d.interval);
    return { device: device2, user, verify: `${at}?code=${encodeURIComponent(user)}`, interval: Number.isFinite(every) && every >= 0 ? every : 5, expiresIn: Number(d.expires_in) || 900 };
  },
  token: (s, device2) => ({ url: `${emRoot(s.url)}/_emdash/api/oauth/device/token`, body: { device_code: device2, grant_type: "urn:ietf:params:oauth:grant-type:device_code" } }),
  readToken: (status2, data) => {
    const e = isObj(data) ? data.error : void 0;
    if (e === "authorization_pending") return { wait: true };
    if (e === "slow_down") return { wait: true, interval: isObj(data) ? Number(data.interval) || void 0 : void 0 };
    if (e === "access_denied") return { error: "The approval was declined in EmDash." };
    if (e === "expired_token") return { error: "The code expired before it was approved \u2014 connect again." };
    const d = emData(data);
    if (status2 < 300 && typeof d.access_token === "string") return { access: d.access_token, refresh: typeof d.refresh_token === "string" ? d.refresh_token : void 0 };
    const said3 = isObj(e) && typeof e.message === "string" ? e.message : `it answered ${status2}`;
    return { error: `EmDash did not hand out a token: ${said3}.` };
  },
  lasting: (s, name) => ({ url: `${emRoot(s.url)}/_emdash/api/admin/api-tokens`, body: { name: name.slice(0, 100), scopes: ["content:read", "schema:read"] } }),
  readLasting: (data) => {
    const t = emData(data).token;
    return typeof t === "string" && /^ec_pat_[A-Za-z0-9_-]{16,512}$/.test(t) ? t : null;
  },
  revoke: (s, short) => ({ url: `${emRoot(s.url)}/_emdash/api/oauth/token/revoke`, body: { token: short.refresh ?? short.access } })
};
var emContext = (s) => ({
  root: emRoot(s.url),
  pattern: s.cmsSchema?.pattern ?? "",
  fields: s.cmsSchema?.fields ?? {},
  ...emRelationsOf(s) ? { relations: emRelationsOf(s) } : {}
});
function emBase(s) {
  try {
    return new URL(emRoot(s.url)).pathname.replace(/\/+$/, "");
  } catch {
    return "";
  }
}
var emContentCss = () => [
  '&::after { content: ""; display: block; clear: both; }',
  "& img, & video { max-inline-size: 100%; block-size: auto; }",
  "& iframe { inline-size: 100%; block-size: auto; aspect-ratio: 16 / 9; border: 0; }",
  "& figure { margin-inline: 0; }",
  "& figcaption { font-size: var(--text-s, 0.875em); text-align: center; margin-block-start: var(--space-xs, 0.5rem); }",
  "& .aligncenter { margin-inline: auto; text-align: center; }",
  "& .alignleft { float: inline-start; max-inline-size: 50%; margin-inline-end: var(--space-m, 1.5rem); }",
  "& .alignright { float: inline-end; max-inline-size: 50%; margin-inline-start: var(--space-m, 1.5rem); }",
  "& blockquote { margin-inline: 0; padding-inline-start: var(--space-m, 1.5rem); border-inline-start: 3px solid var(--border-light, currentColor); }",
  "& .gallery { display: grid; grid-template-columns: repeat(var(--columns, auto-fill), minmax(min(12rem, 100%), 1fr)); gap: var(--space-s, 1rem); }",
  "& .gallery figure { margin: 0; }",
  /* what EmDash's WordPress import writes from Gutenberg, in Gutenberg's class names (ptBlock) */
  "& .wp-block-columns { display: flex; flex-wrap: wrap; gap: var(--content-spacing, 1.5rem); }",
  "& .wp-block-column { flex: 1 1 16rem; min-inline-size: 0; }",
  "& .wp-block-buttons { display: flex; flex-wrap: wrap; gap: var(--space-s, 1rem); }",
  "& .wp-block-buttons.is-vertical { flex-direction: column; align-items: flex-start; }",
  "& .wp-block-button__link { display: inline-block; padding: var(--space-xs, 0.5rem) var(--space-m, 1.5rem); border: 1px solid currentColor; border-radius: var(--radius-m, 0.5rem); text-decoration: none; }",
  "& .wp-block-cover { position: relative; isolation: isolate; display: grid; place-items: center; min-block-size: var(--cover-min-height, 300px); padding: var(--space-m, 1.5rem); overflow: hidden; text-align: center; }",
  "& .wp-block-cover.is-position-center-left { justify-items: start; text-align: start; }",
  "& .wp-block-cover.is-position-center-right { justify-items: end; text-align: end; }",
  "& .wp-block-cover:has(.wp-block-cover__background) { color: var(--white, #fff); }",
  "& .wp-block-cover__image-background, & .wp-block-cover__video-background { position: absolute; inset: 0; z-index: -2; inline-size: 100%; block-size: 100%; max-inline-size: none; object-fit: cover; }",
  "& .wp-block-cover__background { position: absolute; inset: 0; z-index: -1; background: var(--cover-overlay, #000); opacity: var(--cover-dim, 0.5); }",
  "& .wp-block-pullquote { padding-block: var(--space-m, 1.5rem); border-block: 3px solid var(--border-light, currentColor); text-align: center; }",
  "& .wp-block-pullquote blockquote { margin: 0; padding: 0; border: 0; }",
  "& table { inline-size: 100%; border-collapse: collapse; }",
  "& th, & td { padding: var(--space-xs, 0.5rem); border: 1px solid var(--border-light, currentColor); text-align: start; }",
  "& pre { overflow-x: auto; }",
  "& hr { border: 0; border-block-start: 1px solid var(--border-light, currentColor); }"
].join("\n");
var EMDASH = {
  kind: "emdash",
  label: "EmDash site",
  short: "EmDash",
  name: "EmDash posts",
  root: (url) => emRoot(url),
  hint: "Enter the site\u2019s address and a read token, and pick a collection. Fields arrive by their own names, rich text as HTML and pictures as addresses.",
  about: "The address of the EmDash site. Its REST API is asked for one collection\u2019s published entries, with a token, and every entry arrives as the fields a page places: each of the collection\u2019s own fields by its name, rich text as HTML, pictures as addresses with their alt text and size, plus the author, the dates and the SEO fields.",
  address: { label: "Site address", placeholder: "https://cms.example.com", noun: "the site\u2019s address", missing: "No site address yet." },
  keys: { type: "cmsType", limit: "cmsLimit", query: "cmsQuery" },
  /* an entry's versions share its translationGroup */
  language: { param: "locale", group: "translationGroup" },
  types: {
    label: "Collection",
    hint: "What the site\u2019s schema lists \u2014 posts, pages and every collection made in EmDash\u2019s admin. Press Find collections to pick one by name; the token has to be written to .env first.",
    button: "Find collections",
    placeholder: "posts",
    optionHint: (t) => `/content/${t.base}`,
    url: (address) => `${emRoot(address)}/_emdash/api/schema/collections`,
    read: emReadTypes,
    unreadable: "That address did not answer as an EmDash site \u2014 its API is at /_emdash/api."
  },
  limitHint: "At most this many, in the order asked for. Empty is every published entry \u2014 a hundred per request.",
  queryHint: "Added to the request as typed \u2014 orderBy=publishedAt&order=desc, locale=de. Anything EmDash\u2019s content list takes; only published entries are ever asked for.",
  queryPlaceholder: "orderBy=publishedAt&order=desc",
  defaults: { cmsType: "posts", auth: "bearer", secretVar: "EMDASH_TOKEN" },
  endpoint: (s) => emEndpoint(s),
  previewUrl: (s, max) => `${emEndpoint(s, Math.min(max, emLimitOf(s) || max))}&page=1`,
  readPreview: (data, _headers, s, page) => {
    try {
      const p = page(data);
      const limit = emLimitOf(s);
      return { list: p.list, total: Math.min(p.total ?? p.list.length, limit || Infinity) };
    } catch (e) {
      return { error: `EmDash: ${e.message}.` };
    }
  },
  notJson: " \u2014 something in front of the site may have answered instead (Cloudflare Access, a firewall, a login page)",
  failed: emFailed,
  secretShape: emSecretShape,
  schema: {
    url: emSchemaEndpoint,
    read: emReadSchema,
    more: [{ url: (s) => `${emRoot(s.url)}/_emdash/api/taxonomies`, merge: emReadTaxonomies }]
  },
  changed: {
    /* The newest change and the count: an edit, a new entry, an unpublish
       and a deletion each move one of them. */
    url: (s) => `${emRoot(s.url)}/_emdash/api/content/${encodeURIComponent((s.cmsType ?? "").trim() || "posts")}?status=published&limit=1&page=1&orderBy=updatedAt&order=desc`,
    read: (data) => {
      const d = isObj(data) && isObj(data.data) ? data.data : null;
      if (!d || !Array.isArray(d.items)) return null;
      const first = isObj(d.items[0]) ? d.items[0] : {};
      return `${String(first.updatedAt ?? "")}|${String(d.total ?? d.items.length)}`;
    }
  },
  texts: [HTML_SCAN_JS, CMS_FRAMES_JS, CMS_ROW_FRAMES_JS, SOURCE_PT_JS, SOURCE_EMDASH_JS],
  row: "emdashRow",
  rowCall: "(row) => emdashRow(row, EMDASH)",
  rowContext: emContext,
  contextConst: "EMDASH",
  after: "emdashRefs",
  /* each entry's relations and terms, which a list carries neither of */
  enrich: {
    fn: "emdashEnrich",
    arg: (s) => emTermsOf(s).length || emRelationsOf(s) ? { ...emTermsOf(s).length ? { terms: emTermsOf(s) } : {}, ...emRelationsOf(s) ? { relations: emRelationsOf(s) } : {} } : null,
    base: (s) => `${emRoot(s.url)}/_emdash/api`
  },
  page: "emdashPage",
  notes: "emdashNotes",
  reserved: [
    ...HTML_SCAN_NAMES,
    ...CMS_FRAMES_NAMES,
    ...CMS_ROW_FRAMES_NAMES,
    ...PT_RESERVED,
    "EMDASH_OWN",
    "EMDASH_HOSTS",
    "EMDASH_SUMMARY",
    "EMDASH_TEXT",
    "EMDASH_ENT",
    "emdashPlain",
    "emdashIsObj",
    "emdashAbs",
    "emdashFile",
    "emdashIsMedia",
    "emdashIsPt",
    "emdashIsBlocks",
    "emdashField",
    "emdashRecord",
    "emdashRow",
    "emdashRefs",
    "emdashTerms",
    "emdashRelations",
    "emdashEnrich",
    "emdashPage",
    "emdashNotes",
    "emdashAsk"
  ],
  moduleLoad: (s, p) => {
    const limit = emLimitOf(s);
    const terms = emTermsOf(s);
    const asks = terms.length > 0 || !!emRelationsOf(s);
    return [
      `const ENDPOINT = ${js2(emEndpoint(s))};`,
      ...limit ? [`/** How many entries are taken at most. */`, `const LIMIT = ${limit};`] : [],
      "/** What every entry is shaped with: the site, where EmDash puts an entry, and its fields' types, as the last test found them. */",
      `const EMDASH = ${js2(emContext(s))};`,
      ...terms.length ? [
        "/** The taxonomies each entry's terms are asked in \u2014 one request per entry per taxonomy. */",
        `const TERMS = ${js2(terms)};`
      ] : [],
      ...asks ? [`const API = ${js2(`${emRoot(s.url)}/_emdash/api`)};`] : [],
      "",
      ...p.headers,
      ...asks ? [
        "/** One request under the API, with the token. */",
        "const emdashAsk = async (path) => {",
        `  const res = await fetch(API + path, ${p.init(p.hdr)});`,
        `  if (!res.ok) throw new Error(${js2(`${p.label}: `)} + API + path + ' answered ' + res.status);`,
        "  return res.json();",
        "};",
        ""
      ] : [],
      "async function load() {",
      ...p.guard,
      "  const all = [];",
      "  /* EmDash hands out a hundred at a time, and a cursor to the next hundred. */",
      `  let cursor = '';`,
      `  for (let page = 1; page <= 50; page++) {`,
      `    const res = await fetch(ENDPOINT + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''), ${p.init(p.hdr)});`,
      `  ${p.bad}`,
      "    const { list, next } = emdashPage(await res.json());",
      "    all.push(...list);",
      `    cursor = next${limit ? " && all.length < LIMIT ? next : ''" : ""};`,
      "    if (!cursor) break;",
      "  }",
      /* Said rather than swallowed: past the cap the list is cut, and a cut
         list looks exactly like a complete one. */
      `  if (cursor) console.warn(${js2(`${p.label}: more than 5,000 entries \u2014 only the first 5,000 were fetched.`)});`,
      `  const entries = all${limit ? ".slice(0, LIMIT)" : ""};`,
      ...emRelationsOf(s) ? [
        "  /* A relation's links are kept apart from the entry; one not read leaves its field empty, and is said below. */",
        "  await emdashRelations(entries, EMDASH.relations, emdashAsk);"
      ] : [],
      ...terms.length ? ["  await emdashTerms(entries, TERMS, emdashAsk);"] : [],
      `  for (const note of emdashNotes(entries)) console.warn(${js2(`${p.label}: `)} + note);`,
      `  return ${p.finish("entries")};`,
      "}"
    ];
  },
  fieldTypes: (s) => ({
    ...EM_FIELD_TYPES,
    ...Object.fromEntries(Object.entries(s.cmsSchema?.fields ?? {}).flatMap(([k, t]) => {
      const key = ["id", "slug", "url", "link"].includes(k) ? `${k}_field` : k;
      return t === "image" ? [[key, "image"], [`${key}_alt`, "text"], [`${key}_width`, "number"], [`${key}_height`, "number"]] : t === "file" ? [[key, "url"], [`${key}_name`, "text"], [`${key}_type`, "text"]] : t === "reference" ? emRelationsOf(s)?.[k] ? [[key, emRelationsOf(s)[k].many ? "list" : "object"]] : [] : [[key, EM_TYPE_OF[t] ?? "text"]];
    })),
    ...Object.fromEntries(emTermsOf(s).flatMap((t) => [[t, "list"], [`${t}_slugs`, "list"]]))
  }),
  entryLink: { label: "Same as on EmDash", hint: "the address EmDash gives each entry \u2014 /posts/my-post", base: emBase },
  localLinks: "every",
  /* The companion's headless mode names each entry's page on the built site
     as canonical, from this map. */
  linksRoute: true,
  contentCss: emContentCss,
  media: { uploads: "/_emdash/api/media/file/", server: "the EmDash server", alsoHosts: "EMDASH_HOSTS" },
  entrySeo: { title: "{entry.meta_title}", description: "{entry.meta_description}" },
  access: {
    headers: true,
    required: true,
    how: "EmDash answers no request without a token. Connect with EmDash, above, makes one for you. By hand: in EmDash\u2019s admin under Settings \u2192 API tokens, with the scopes content:read and schema:read \u2014 a Subscriber\u2019s is the safe one, since an editor\u2019s token can also read drafts \u2014 written to .env below."
  },
  companion: {
    status: (s) => `${emRoot(s.url)}/_emdash/api/plugins/sitereal/status`,
    settings: (s) => `${emRoot(s.url)}/_emdash/admin/plugins/sitereal/settings`,
    anonymous: true,
    page: EM_COMPANION_PAGE
  },
  connect: EM_CONNECT,
  checks: (s) => [
    ...!(s.cmsType ?? "").trim() ? [{ level: "stop", text: "No collection chosen." }] : [],
    ...!s.auth || !(s.secretVar ?? "").trim() ? [{ level: "stop", text: "EmDash answers no request without a token \u2014 choose Bearer token under Access and name its variable (EMDASH_TOKEN)." }] : [],
    ...(s.cmsTerms ?? []).filter((t) => s.cmsSchema?.taxonomies && !s.cmsSchema.taxonomies.some((x) => x.name === t)).map((t) => ({ level: "warn", text: `The collection has no taxonomy "${t}" any more, so its terms are not asked for.` })),
    ...s.entry?.on && s.entry.at === "link" && !s.cmsSchema?.pattern ? [{ level: "warn", text: "EmDash\u2019s address for each entry comes from the collection\u2019s schema, which no test has read yet (the token needs schema:read). Test the source, or choose another place for the pages." }] : []
  ]
};

// ../src/builder-core/cms/index.ts
var CMS_ADAPTERS = [EMDASH, WORDPRESS];
var BY_KIND = new Map(CMS_ADAPTERS.map((a) => [a.kind, a]));

// ../src/builder-core/sources.ts
var SOURCE_KINDS = [
  /* Every CMS first, as its adapter says it (cms/); the pickers show them
     behind one *CMS* choice. */
  ...CMS_ADAPTERS.map((a) => ({ id: a.kind, label: a.label, short: a.short, name: a.name, hint: a.hint })),
  {
    id: "rest",
    label: "REST API",
    short: "API",
    name: "API",
    hint: "Any URL that answers with JSON \u2014 GET or POST, with headers and a secret. Choose where in the answer the list is."
  },
  {
    id: "graphql",
    label: "GraphQL",
    short: "GraphQL",
    name: "GraphQL",
    hint: "A query sent to an endpoint \u2014 WPGraphQL, Hygraph, Contentful, Shopify. Choose where in the answer the list is."
  },
  {
    id: "rss",
    label: "RSS or Atom feed",
    short: "Feed",
    name: "Feed",
    hint: "A blog, a podcast, a YouTube channel, a Substack: every item of the feed as a row with title, link, date, text and picture."
  },
  {
    id: "csv",
    label: "Google Sheet or CSV",
    short: "Sheet",
    name: "Sheet",
    hint: "A sheet shared by link, or any CSV file by address. The first row names the columns."
  },
  {
    id: "file",
    label: "JSON file in the project",
    short: "File",
    name: "Data",
    hint: "A .json file the project already holds, picked by name in a Loop and offering its real keys."
  },
  {
    id: "data",
    label: "List typed here",
    short: "List",
    name: "List",
    hint: "A few rows typed as JSON \u2014 the steps of a process, a price table, a row of logos. They live in the project and nowhere else."
  },
  {
    id: "code",
    label: "Custom code",
    short: "Code",
    name: "Custom",
    hint: "Your own JavaScript: anything that returns a list \u2014 an SDK, several requests joined, a database."
  }
];
var sourceKind = (id) => SOURCE_KINDS.find((k) => k.id === id) ?? SOURCE_KINDS.find((k) => k.id === "rest");
var SOURCES_SCRIPT = "scripts/sources.mjs";
var SOURCES_PREBUILD = `node ${SOURCES_SCRIPT}`;
var SOURCE_MEDIA_JS = String.raw`const MEDIA_IMAGE = /\.(jpe?g|png|webp|avif|gif|svg)$/i;
/* A file a post links to or plays: a PDF, a document, a sound, a video. It is
   on the same server as the pictures and gone with it just the same. */
const MEDIA_FILE_EXT = /\.(pdf|docx?|xlsx?|pptx?|odt|ods|odp|rtf|txt|csv|epub|zip|mp3|m4a|ogg|oga|wav|mp4|m4v|webm|mov)$/i;
const MEDIA_MAX = 25 * 1024 * 1024;
/* Jetpack's image CDN serves a site's own pictures as i0–i3.wp.com/<host>/<path>
   — the same file, so the same key, fetched from the site itself. Without
   this every picture of a site with Jetpack was "somebody else's" and
   nothing was copied, without a word. */
const PHOTON = /^https?:\/\/i[0-3]\.wp\.com\/([^/]+)(\/[^?#]*)/i;
const viaCdn = (url) => {
  const m = PHOTON.exec(String(url).trim());
  return m && m[1].toLowerCase().replace(/^www\./, '') === MEDIA_HOST ? 'https://' + m[1] + m[2] : null;
};
const mediaKey = (url) => viaCdn(url) ?? String(url).trim().replace(/&amp;/g, '&').replace(/[?#].*$/, '');
/** A file this source keeps itself: on its own host, and for WordPress in its
    uploads — or anywhere on its host when its own CDN served it (a custom
    upload folder, like /news/files/, is still its own). */
const isMedia = (url) => {
  let u;
  try { u = new URL(mediaKey(url)); } catch { return false; }
  return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.toLowerCase().replace(/^www\./, '') === MEDIA_HOST
    && (!MEDIA_UPLOADS || !!viaCdn(url) || u.pathname.includes(MEDIA_UPLOADS)) && (MEDIA_IMAGE.test(u.pathname) || MEDIA_FILE_EXT.test(u.pathname));
};
/** Pictures the rows show that are not this source's own, by host — what a
    copy leaves pointing elsewhere, said rather than skipped in silence. */
const mediaElsewhere = (rows) => {
  const hosts = new Map();
  const note = (url) => {
    let u;
    try { u = new URL(String(url).trim().replace(/&amp;/g, '&')); } catch { return; }
    if (!/^https?:$/.test(u.protocol) || !MEDIA_IMAGE.test(u.pathname) || isMedia(url)) return;
    hosts.set(u.hostname, (hosts.get(u.hostname) ?? 0) + 1);
  };
  eachString(rows, (s) => {
    if (/^https?:\/\//i.test(s.trim())) note(s);
    if (s.includes('<')) for (const tag of s.match(MEDIA_TAG) ?? []) for (const m of tag.matchAll(MEDIA_ATTR)) note(m[3]);
    return s;
  });
  return hosts;
};
/** Every string in a row, through one function: an ACF image is a URL three records down. */
const eachString = (v, fn) => (typeof v === 'string' ? fn(v)
  : Array.isArray(v) ? v.map((x) => eachString(x, fn))
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, eachString(x, fn)]))
  : v);
/* Where markup names a file: a picture's src, a link's href, a video's poster,
   a source inside a video or an audio. Any tag, since what decides is the
   address — a link to a post has no file extension and is never taken. */
const MEDIA_TAG = /<[a-z][a-z0-9-]*\b[^>]*>/gi;
const MEDIA_ATTR = /(\s(?:src|href|poster)=)(["'])(.*?)\2/gi;
/** The files the rows show: a field that is one, and every one named in markup. */
const mediaIn = (rows) => {
  const found = new Set();
  eachString(rows, (s) => {
    if (isMedia(s)) found.add(mediaKey(s));
    if (s.includes('<')) {
      for (const tag of s.match(MEDIA_TAG) ?? []) {
        for (const m of tag.matchAll(MEDIA_ATTR)) if (isMedia(m[3])) found.add(mediaKey(m[3]));
      }
    }
    return s;
  });
  return [...found].sort();
};
/** Where a file lands under public/: the path the server had it at, one safe segment at a time. */
const mediaPath = (url) => {
  let p;
  try { p = decodeURIComponent(new URL(url).pathname); } catch { return null; }
  if (MEDIA_UPLOADS && p.includes(MEDIA_UPLOADS)) p = p.slice(p.indexOf(MEDIA_UPLOADS) + MEDIA_UPLOADS.length);
  const parts = p.split('/').map((x) => x.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^[.-]+/, '')).filter(Boolean);
  return parts.length ? '/' + MEDIA_PUBLIC + '/' + parts.join('/') : null;
};
/** The rows with every copied file pointed at its copy. A srcset of the
    server's sizes describes a picture the row no longer shows, so it goes:
    the build makes its own. A file not copied keeps its address. */
const withLocalMedia = (rows, media) => {
  let missing = 0;
  const at = (url) => media[mediaKey(url)]?.path;
  const swap = (s) => {
    const own = at(s);
    if (own) return own;
    if (isMedia(s)) missing++;
    if (!s.includes('<')) return s;
    return s.replace(MEDIA_TAG, (tag) => {
      let moved = false;
      const next = tag.replace(MEDIA_ATTR, (whole, head, q, url) => {
        const local = at(url);
        if (!local) { if (isMedia(url)) missing++; return whole; }
        if (/^\ssrc=/i.test(head)) moved = true;
        return head + q + local + q;
      });
      return moved ? next.replace(/\s(srcset|sizes)=(["'])[\s\S]*?\2/gi, '') : next;
    });
  };
  const out = rows.map((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
    const next = eachString(row, swap);
    for (const k of Object.keys(next)) {
      if (k.endsWith('_srcset') && next[k.slice(0, -7)] !== row[k.slice(0, -7)]) next[k] = '';
    }
    return next;
  });
  return { rows: out, missing };
};
/** Copy the files the rows show into public/, and keep the manifest in step:
    a changed file is fetched again, an unchanged one is a 304, and a copy
    nothing shows any more is removed — only ever a file the manifest lists. */
async function copyMedia(rows) {
  const had = await readFile(MEDIA_FILE, 'utf8').then(JSON.parse).catch(() => ({}));
  const want = mediaIn(rows);
  const next = {};
  const report = { copied: 0, kept: 0, removed: 0, bytes: 0, failed: [] };
  const elsewhere = mediaElsewhere(rows);
  if (elsewhere.size) {
    report.skipped = [...elsewhere.values()].reduce((a, b) => a + b, 0);
    report.skippedHosts = [...elsewhere.keys()].sort();
  }
  const used = new Set();
  let i = 0;
  const one = async (url) => {
    const rel = mediaPath(url);
    if (!rel || used.has(rel)) return;
    used.add(rel);
    const was = had[url];
    const file = resolve(process.cwd(), 'public' + rel);
    const before = await readFile(file).catch(() => null);
    const ask = before && was?.path === rel
      ? { ...(was.etag ? { 'If-None-Match': was.etag } : {}), ...(was.modified ? { 'If-Modified-Since': was.modified } : {}) } : {};
    try {
      const res = await fetch(url, { headers: ask, signal: AbortSignal.timeout(60_000) });
      if (res.status === 304) { next[url] = was; report.kept++; return; }
      if (!res.ok) throw new Error('answered ' + res.status);
      const type = (res.headers.get('content-type') || '').split(';')[0].trim();
      /* A picture has to come back as one; any other file merely must not be
         a web page — which is what a server answers a missing file with. */
      if (MEDIA_IMAGE.test(new URL(url).pathname) ? !/^image\//i.test(type) : /^text\/html$/i.test(type)) {
        throw new Error('is ' + (type || 'not the file it names'));
      }
      if (Number(res.headers.get('content-length')) > MEDIA_MAX) throw new Error('is larger than 25 MB');
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length > MEDIA_MAX) throw new Error('is larger than 25 MB');
      if (before && before.equals(bytes)) report.kept++;
      else {
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, bytes);
        report.copied++;
        report.bytes += bytes.length;
      }
      const etag = res.headers.get('etag');
      const modified = res.headers.get('last-modified');
      next[url] = { path: rel, size: bytes.length, ...(etag ? { etag } : {}), ...(modified ? { modified } : {}) };
    } catch (e) {
      /* A file that could not be fetched this time keeps the copy it has. */
      if (before && was?.path === rel) { next[url] = was; report.kept++; }
      report.failed.push(url + ' — ' + (e?.name === 'TimeoutError' ? 'no answer within 60 seconds' : e?.cause?.message || e?.cause?.code || e?.message || e));
    }
  };
  await Promise.all(Array.from({ length: 4 }, async () => { while (i < want.length) await one(want[i++]); }));
  const keep = new Set(Object.values(next).map((x) => x.path));
  for (const x of Object.values(had)) {
    if (!x?.path || keep.has(x.path) || !String(x.path).startsWith('/' + MEDIA_PUBLIC + '/') || String(x.path).includes('..')) continue;
    keep.add(x.path);
    await rm(resolve(process.cwd(), 'public' + x.path), { force: true });
    report.removed++;
  }
  const sorted = Object.fromEntries(Object.keys(next).sort().map((k) => [k, next[k]]));
  const text = JSON.stringify(sorted, null, 1) + '\n';
  if (text !== await readFile(MEDIA_FILE, 'utf8').catch(() => '')) {
    await mkdir(dirname(MEDIA_FILE), { recursive: true });
    await writeFile(MEDIA_FILE, text);
  }
  return report;
}`;
var MEDIA_OWN = String.raw`u.hostname.toLowerCase().replace(/^www\./, '') === MEDIA_HOST
    && (!MEDIA_UPLOADS || !!viaCdn(url) || u.pathname.includes(MEDIA_UPLOADS))`;
var MEDIA_OWN_ALSO = String.raw`((u.hostname.toLowerCase().replace(/^www\./, '') === MEDIA_HOST
    && (!MEDIA_UPLOADS || !!viaCdn(url) || u.pathname.includes(MEDIA_UPLOADS))) || MEDIA_ALSO.has(u.hostname.toLowerCase().replace(/^www\./, '')))`;
var SOURCE_MEDIA_ALSO_JS = SOURCE_MEDIA_JS.replace(MEDIA_OWN, MEDIA_OWN_ALSO);
var RESERVED = /* @__PURE__ */ new Set([
  "rows",
  "load",
  "ask",
  "named",
  "whyFailed",
  "certHint",
  "kept",
  "checked",
  "lastRows",
  "pick",
  "slugOf",
  "withUrl",
  "withUrls",
  "groupOf",
  "plainRows",
  /* what each CMS's own text declares (wpRow, cfRecord, …) */
  ...CMS_ADAPTERS.flatMap((a) => a.reserved),
  "withLocalLinks",
  "withLocalLinksEvery",
  "parseFeed",
  "parseCsv",
  "withDates",
  "inOrder",
  "resolve",
  "dirname",
  "mkdir",
  "readFile",
  "writeFile",
  "stat",
  "rm",
  "Buffer",
  "local",
  "media",
  "mediaOf",
  "copyMedia",
  "withLocalMedia",
  "mediaIn",
  "mediaPath",
  "mediaKey",
  "isMedia",
  "eachString",
  "fetch",
  "process",
  "console",
  "btoa",
  "parseInt",
  "isNaN",
  "entry",
  "props",
  "data",
  "taken",
  "paths",
  "row",
  "esc",
  "dayOf",
  "getStaticPaths",
  "new",
  "default",
  "delete",
  "class",
  "function",
  "import",
  "export",
  "return",
  "await",
  "async",
  "for",
  "if",
  "in",
  "of",
  "do",
  "var",
  "let",
  "const",
  "this",
  "null",
  "true",
  "false",
  "void",
  "with",
  "yield",
  "enum",
  "switch",
  "case",
  "try",
  "catch",
  "super",
  "static",
  "typeof",
  "while",
  "else",
  "break",
  "continue",
  "throw",
  "finally",
  "extends",
  "package",
  "private",
  "public",
  "interface",
  "instanceof",
  "debugger"
]);
function normalizeSource(raw) {
  const str = (v2) => typeof v2 === "string" ? v2 : "";
  const s = { ...raw, url: str(raw.url), name: str(raw.name) || str(raw.slug), kind: sourceKind(raw.kind).id };
  if (raw.headers !== void 0) {
    const headers = (Array.isArray(raw.headers) ? raw.headers : []).filter((h2) => h2 && typeof h2 === "object").map((h2) => ({ name: str(h2.name), value: str(h2.value) }));
    if (headers.length) s.headers = headers;
    else delete s.headers;
  }
  const rows = raw.data;
  if (Array.isArray(rows)) s.data = JSON.stringify(rows, null, 2);
  for (const k of ["body", "secretVar", "secretHeader", "path", "wpType", "wpQuery", "cmsType", "cmsQuery", "cmsSpace", "query", "variables", "file", "data", "code"]) {
    if (s[k] !== void 0 && typeof s[k] !== "string") delete s[k];
  }
  if (s.fields !== void 0 && !Array.isArray(s.fields)) delete s.fields;
  if (s.entry !== void 0 && (!s.entry || typeof s.entry !== "object")) delete s.entry;
  if (s.languages !== void 0 && (!s.languages || typeof s.languages !== "object" || Array.isArray(s.languages))) delete s.languages;
  if (s.media !== void 0 && s.media !== "copy") delete s.media;
  if (s.cmsSchema !== void 0 && (!s.cmsSchema || typeof s.cmsSchema !== "object" || Array.isArray(s.cmsSchema))) delete s.cmsSchema;
  if (s.cmsSchema?.styles !== void 0 && typeof s.cmsSchema.styles !== "string") delete s.cmsSchema.styles;
  if (s.cmsSchema?.blocks !== void 0 && typeof s.cmsSchema.blocks !== "string") delete s.cmsSchema.blocks;
  if (s.cmsTerms !== void 0) {
    const terms = Array.isArray(s.cmsTerms) ? s.cmsTerms.filter((t) => typeof t === "string" && !!t.trim()) : [];
    if (terms.length) s.cmsTerms = terms;
    else delete s.cmsTerms;
  }
  if (s.order !== void 0) {
    const o = s.order;
    const by = typeof o?.by === "string" ? o.by.trim() : "";
    const rows2 = Array.isArray(o?.rows) ? o.rows.filter((v2) => typeof v2 === "string" || typeof v2 === "number").map(String) : [];
    if (by && rows2.length) s.order = { by, rows: rows2 };
    else delete s.order;
  }
  return s;
}
var SOURCE_PICK_JS = String.raw`/** The value at a dotted path — "data.items" — or the answer itself. */
const pick = (data, path) => String(path || '').split('.').filter(Boolean)
  .reduce((v, k) => (v == null ? undefined : v[k]), data);`;
var SOURCE_URL_JS = String.raw`const slugOf = (v) => String(v ?? '').split('/')
  .map((s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
  .filter(Boolean).join('/');
/** Every row with the address of its page on this site. With a base, the
    field holds an address on the site the rows come from, and its path under
    that base is the address here. */
const withUrl = (rows, prefix, field, base) => rows.map((row) => {
  let value = pick(row, field);
  if (base !== undefined) {
    try { value = new URL(String(value)).pathname; } catch { value = ''; }
    if (base && value.startsWith(base)) value = value.slice(base.length);
  }
  const slug = slugOf(value);
  return slug && row && typeof row === 'object' ? { ...row, url: '/' + (prefix ? prefix + '/' : '') + slug } : row;
});`;
var SOURCE_LINKS_JS = String.raw`const withLocalLinks = (rows) => {
  const key = (href) => String(href).replace(/[?#].*$/, '').replace(/\/+$/, '');
  const local = new Map(rows.filter((r) => r?.link && r?.url).map((r) => [key(r.link), r.url]));
  if (!local.size) return rows;
  return rows.map((r) => (typeof r?.content !== 'string' ? r : {
    ...r,
    content: r.content.replace(/(<a\b[^>]*?\shref=)(["'])(.*?)\2/gi,
      (m, head, q, href) => (local.has(key(href)) ? head + q + local.get(key(href)) + q : m)),
  }));
};`;
var SOURCE_LINKS_EVERY_JS = String.raw`const withLocalLinksEvery = (rows) => {
  const key = (href) => String(href).replace(/[?#].*$/, '').replace(/\/+$/, '');
  const local = new Map(rows.filter((r) => r?.link && r?.url).map((r) => [key(r.link), r.url]));
  if (!local.size) return rows;
  const point = (html) => html.replace(/(<a\b[^>]*?\shref=)(["'])(.*?)\2/gi,
    (m, head, q, href) => (local.has(key(href)) ? head + q + local.get(key(href)) + q : m));
  return rows.map((r) => (!r || typeof r !== 'object' ? r
    : Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'string' && v.includes('<a') ? point(v) : v]))));
};`;
var SOURCE_FEED_JS = String.raw`const parseFeed = (xml) => {
  const cdata = (s) => String(s ?? '').trim().replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1');
  const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  const ent = (s) => cdata(s).replace(/&(#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (m, n) => (n[0] === '#'
    ? String.fromCodePoint(n[1].toLowerCase() === 'x' ? parseInt(n.slice(2), 16) : Number(n.slice(1)))
    : NAMED[n.toLowerCase()]));
  const tag = (block, name) => {
    const m = new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>', 'i').exec(block);
    return m ? ent(m[1]) : '';
  };
  const attr = (block, name, a) => {
    const m = new RegExp('<' + name + '\\s[^>]*?\\b' + a + '=["\']([^"\']*)["\']', 'i').exec(block);
    return m ? ent(m[1]) : '';
  };
  const text = (html) => String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const iso = (v) => { const d = new Date(v); return v && !isNaN(+d) ? d.toISOString() : ''; };
  const items = String(xml).match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  return items.map((b) => {
    const content = tag(b, 'content:encoded') || tag(b, 'content');
    const summary = tag(b, 'description') || tag(b, 'summary') || tag(b, 'media:description');
    /* Atom names several links per entry — the comments, the edit address,
       the entry itself — and the first is rarely the one: the page is the
       link that says "alternate", or says nothing. */
    const links = [...b.matchAll(/<link\b([^>]*)>/gi)].map((m) => m[1]);
    const rel = (a) => /\brel=["']([^"']*)["']/i.exec(a)?.[1] ?? 'alternate';
    const page = links.find((a) => rel(a) === 'alternate' && /\bhref=/i.test(a));
    const link = tag(b, 'link') || (page ? ent(/\bhref=["']([^"']*)["']/i.exec(page)?.[1] ?? '') : '') || attr(b, 'link', 'href');
    /* And an Atom author is a record: the name is the part that is one. */
    const by = tag(b, 'dc:creator') || tag(b, 'author');
    const author = /<name[\s>]/i.test(by) ? tag(by, 'name') : by;
    const image = attr(b, 'media:thumbnail', 'url') || attr(b, 'media:content', 'url') || attr(b, 'itunes:image', 'href')
      || (/<enclosure[^>]*type=["']image/i.test(b) ? attr(b, 'enclosure', 'url') : '')
      || (/<img[^>]+src=["']([^"']+)["']/i.exec(content || summary)?.[1] ?? '');
    return {
      id: tag(b, 'guid') || tag(b, 'id') || link,
      title: text(tag(b, 'title')),
      link,
      date: iso(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date')),
      description: text(summary || content),
      content: content || summary,
      image,
      author: text(author),
      categories: [...b.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi)].map((m) => text(ent(m[1]))).filter(Boolean),
    };
  });
};`;
var SOURCE_CSV_JS = String.raw`const parseCsv = (csv) => {
  const src = String(csv).replace(/^﻿/, '');
  const first = src.split(/\r?\n/, 1)[0] ?? '';
  const delim = (first.match(/;/g) ?? []).length > (first.match(/,/g) ?? []).length ? ';' : ',';
  const lines = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (src[i + 1] === '"') { cell += '"'; i++; }
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); lines.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); lines.push(row); }
  const key = (h, i) => {
    const k = String(h).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return !k ? 'column_' + (i + 1) : /^\d/.test(k) ? 'c_' + k : k;
  };
  const head = (lines.shift() ?? []).map(key);
  const value = (v) => {
    const t = String(v).trim();
    /* A number is a number — but not a postcode, a phone number or an article
       number: "01067" read as a number is 1067, and that is a different
       town. So nothing with a leading zero, and nothing longer than a number
       can hold exactly. */
    return /^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(t) ? Number(t) : /^(true|false)$/i.test(t) ? t.toLowerCase() === 'true' : t;
  };
  return lines.filter((r) => r.some((v) => String(v).trim() !== ''))
    .map((r) => Object.fromEntries(head.map((h, i) => [h, value(r[i] ?? '')])));
};`;
var SOURCE_DATES_JS = String.raw`const withDates = (rows, keys, locale, style) => {
  let format;
  try { format = new Intl.DateTimeFormat(locale || 'en', { dateStyle: style, timeZone: 'UTC' }); }
  catch { format = new Intl.DateTimeFormat('en', { dateStyle: style, timeZone: 'UTC' }); }
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const out = { ...row };
    for (const key of keys) {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(row[key] ?? ''));
      if (m) out[key + '_text'] = format.format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
    }
    return out;
  });
};`;
var SOURCE_ORDER_JS = String.raw`/** The rows in that order. One it does not hold yet keeps its place beside
    the row it came before: first when it came before them all, last after. */
const inOrder = (rows, by, order) => {
  const at = new Map(order.map((v, i) => [String(v), i]));
  const place = (r) => {
    const v = r && typeof r === 'object' ? r[by] : undefined;
    return v === undefined || v === null ? undefined : at.get(String(v));
  };
  const held = [];
  const lead = [];
  const before = new Map();
  let waiting = [];
  for (const r of rows) {
    if (place(r) === undefined) { waiting.push(r); continue; }
    if (held.length) before.set(r, waiting); else lead.push(...waiting);
    waiting = [];
    held.push(r);
  }
  held.sort((a, b) => place(a) - place(b));
  return [...lead, ...held.flatMap((r) => [...(before.get(r) ?? []), r]), ...waiting];
};`;

// ../src/builder-core/date-text.ts
var DATE_TEXT_JS = String.raw`(v, l, s, t) => { const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(v instanceof Date ? (isNaN(+v) ? '' : v.toISOString()) : String(v ?? '')); if (!m) return ''; const at = !!t && m[4] !== undefined; return new Intl.DateTimeFormat(l, at ? { dateStyle: s, timeStyle: 'short', timeZone: 'UTC' } : { dateStyle: s, timeZone: 'UTC' }).format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], at ? +m[4] : 0, at ? +m[5] : 0))); }`;
var isDateType = (type) => type === "date" || type === "datetime";

// ../src/builder-core/number-text.ts
var NUMBER_TEXT_JS = String.raw`(v, l, p, s) => { var n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN; if (!Number.isFinite(n)) return ''; var t = String(n), i = t.indexOf('.'), d = /e/i.test(t) ? 3 : i < 0 ? 0 : Math.min(t.length - i - 1, 20); return (p || '') + new Intl.NumberFormat(l, { maximumFractionDigits: d }).format(n) + (s || ''); }`;

// ../src/builder-core/entry-data.ts
var dataKey = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

// ../src/builder-core/loops.ts
var RICH_TEXT_PLAIN_JS = String.raw`(html = '') => String(html ?? '')
  .replace(/<(script|style|template)\b[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<\/?(p|div|h[1-6]|li|ul|ol|br|hr|blockquote|figure|figcaption|table|tr|td|th|pre|section|article|header|footer)\b[^>]*>/gi, ' ')
  .replace(/<[a-zA-Z\/!?][^>]*>/g, '')
  .replace(/&(#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos|nbsp|hellip|ndash|mdash|lsquo|rsquo|ldquo|rdquo);/gi, (all, ref) => {
    const named = new Map([['amp', '&'], ['lt', '<'], ['gt', '>'], ['quot', '"'], ['apos', "'"], ['nbsp', ' '], ['hellip', '…'], ['ndash', '–'], ['mdash', '—'],
      ['lsquo', '‘'], ['rsquo', '’'], ['ldquo', '“'], ['rdquo', '”']]).get(String(ref).toLowerCase());
    if (named) return named;
    const n = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : Number(ref.slice(1));
    return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : all;
  })
  .replace(/\s+/g, ' ').trim()`;
var PLAIN_DATE_JS = String.raw`(v) => (v instanceof Date && !isNaN(+v) ? v.toISOString().replace(/T00:00:00\.000Z$/, '').replace(/\.000Z$/, 'Z') : v)`;

// ../src/builder-core/nav.ts
var navDef = (id, tag, label, hint, partId, extra = {}) => ({
  ...extra,
  id,
  tag,
  label,
  hint,
  icon: id,
  group: "nav",
  /* The rule is written against the element attribute — see `attrStyled` in
     `elements.ts`, and `primarySelector`, which is what the Style and CSS
     panels write through, so what you edit and what arrived are one rule. */
  attrStyled: true,
  /* Last, so it cannot be spread away: `data-nav-part` is the one thing about
     a part that isn't the author's to change. Classes are renamed all the
     time and the script never notices; this is what it actually looks for. */
  attrs: { ...extra.attrs ?? {}, "data-nav-part": partId }
});
var NAV_ELEMENTS = [
  navDef("nav", "nav", "Navigation", "the whole menu", "nav", {
    container: true,
    attrs: { "aria-label": "Main" },
    /* A Nav arrives as a navigation, not as an empty box: a toggle, a panel
       and four entries, one of them a dropdown. Every node below is a real
       element you can select, restyle, reorder or delete. */
    compose: [
      { el: "nav-toggle" },
      { el: "nav-scrim" },
      /* No close button in the panel: the toggle is still there while the menu
         is open — it sits above the panel (z-index) and its burger is already
         drawn as an X by then — so a second X in the same corner was two
         controls for one act. `nav-close` is still a part you can insert, for
         a menu whose toggle scrolls away or is hidden. */
      { el: "nav-panel", children: [
        { el: "nav-list", children: [
          { el: "nav-item", children: [{ el: "nav-link", text: "Home", attrs: { href: "/" } }] },
          { el: "nav-dropdown" },
          { el: "nav-item", children: [{ el: "nav-link", text: "About", attrs: { href: "/about" } }] },
          { el: "nav-item", children: [{ el: "nav-link", text: "Contact", attrs: { href: "/contact" } }] }
        ] }
      ] }
    ]
  }),
  navDef("nav-list", "ul", "Nav list", "the row of entries", "list", {
    container: true
  }),
  navDef("nav-item", "li", "Nav item", "one entry", "item", {
    container: true,
    compose: [{ el: "nav-link" }]
  }),
  navDef("nav-link", "a", "Nav link", "the clickable label", "link", {
    text: "Link",
    attrs: { href: "#" }
    /* The current page marks itself: the script reads the URL at runtime, so
       no page has to be told about the nav and a nav in a shared header is
       right on every page it appears on. */
  }),
  navDef("nav-dropdown", "li", "Nav dropdown", "an entry that opens a submenu", "item", {
    container: true,
    /* A dropdown is the trigger and the submenu it opens, side by side under
       one `<li>` — which is exactly what the markup is. Both are elements. */
    compose: [
      { el: "nav-trigger" },
      { el: "nav-sub", children: [
        { el: "nav-item", children: [{ el: "nav-link", text: "Design", attrs: { href: "/services/design" } }] },
        { el: "nav-item", children: [{ el: "nav-link", text: "Development", attrs: { href: "/services/development" } }] },
        { el: "nav-item", children: [{ el: "nav-link", text: "Consulting", attrs: { href: "/services/consulting" } }] }
      ] }
    ]
  }),
  navDef("nav-trigger", "button", "Nav trigger", "opens a dropdown", "trigger", {
    text: "Services",
    /* aria-expanded is here because it is part of what the button *is*; the
       `id`/`aria-controls` pair that ties it to its submenu is wired at
       runtime, since only then is there a submenu with a unique id. */
    attrs: { type: "button", "aria-expanded": "false" },
    compose: [{ el: "nav-caret" }]
  }),
  navDef("nav-caret", "svg", "Nav caret", "the chevron on a trigger", "caret", {
    attrs: {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      focusable: "false"
    },
    html: '<path d="m6 9 6 6 6-6" />'
  }),
  navDef("nav-sub", "ul", "Nav dropdown menu", "the submenu itself", "sub", {
    container: true
  }),
  /* A mega menu is not a different kind of dropdown — it is a different kind
     of thing to hang off one. Where a submenu is a list that flies out, this
     is a panel the width of the whole menu, holding lists (and anything else
     you put in it: a heading, an image, a Flex Div of cards). The script pairs
     it with a trigger exactly as it pairs a submenu, because to a trigger they
     are the same thing: the element it opens. */
  navDef("nav-mega", "div", "Mega menu", "a wide panel instead of a flyout", "mega", {
    container: true,
    compose: [
      { el: "nav-sub", children: [
        { el: "nav-item", children: [{ el: "nav-link", text: "Design", attrs: { href: "/services/design" } }] },
        { el: "nav-item", children: [{ el: "nav-link", text: "Development", attrs: { href: "/services/development" } }] },
        { el: "nav-item", children: [{ el: "nav-link", text: "Consulting", attrs: { href: "/services/consulting" } }] }
      ] },
      { el: "nav-sub", children: [
        { el: "nav-item", children: [{ el: "nav-link", text: "Case studies", attrs: { href: "/work" } }] },
        { el: "nav-item", children: [{ el: "nav-link", text: "Process", attrs: { href: "/process" } }] },
        { el: "nav-item", children: [{ el: "nav-link", text: "Pricing", attrs: { href: "/pricing" } }] }
      ] }
    ]
  }),
  navDef("nav-panel", "div", "Nav panel", "what the mobile menu opens into", "panel", {
    container: true
  }),
  navDef("nav-toggle", "button", "Nav toggle", "opens the mobile menu", "toggle", {
    container: true,
    attrs: { type: "button", "aria-expanded": "false", "aria-label": "Menu" },
    compose: [{ el: "nav-burger" }]
  }),
  navDef("nav-burger", "span", "Nav burger", "the three lines", "burger", {
    attrs: { "aria-hidden": "true" }
  }),
  navDef("nav-close", "button", "Nav close", "closes the mobile menu", "close", {
    text: "\xD7",
    attrs: { type: "button", "aria-label": "Close menu" }
  }),
  navDef("nav-scrim", "div", "Nav scrim", "the dim behind an open panel", "scrim", {}),
  navDef("nav-skip", "a", "Skip link", "the way past the menu", "skip", {
    text: "Skip to content",
    attrs: { href: "#main" }
  })
];

// ../src/builder-core/css-flatten.ts
function topLevelParts(selector) {
  const out2 = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < selector.length; i += 1) {
    const ch = selector[i];
    if (ch === "(" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "]") depth -= 1;
    else if (ch === "," && depth === 0) {
      out2.push(selector.slice(start, i).trim());
      start = i + 1;
    }
  }
  out2.push(selector.slice(start).trim());
  return out2.filter(Boolean);
}
function splitNested(body) {
  const decls = [];
  const blocks = [];
  let i = 0;
  let buf = "";
  const n = body.length;
  while (i < n) {
    const ch = body[i];
    if (ch === "/" && body[i + 1] === "*") {
      const end = body.indexOf("*/", i + 2);
      i = end < 0 ? n : end + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const q = ch;
      let j = i + 1;
      while (j < n && body[j] !== q) j += body[j] === "\\" ? 2 : 1;
      buf += body.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === ";") {
      if (buf.trim()) decls.push(`${buf.trim()};`);
      buf = "";
      i += 1;
      continue;
    }
    if (ch === "{") {
      let depth = 1;
      let j = i + 1;
      while (j < n && depth > 0) {
        const c2 = body[j];
        if (c2 === "/" && body[j + 1] === "*") {
          const e = body.indexOf("*/", j + 2);
          j = e < 0 ? n : e + 2;
          continue;
        }
        if (c2 === '"' || c2 === "'") {
          let k = j + 1;
          while (k < n && body[k] !== c2) k += body[k] === "\\" ? 2 : 1;
          j = k + 1;
          continue;
        }
        if (c2 === "{") depth += 1;
        else if (c2 === "}") depth -= 1;
        j += 1;
      }
      blocks.push({ head: buf.trim(), body: body.slice(i + 1, j - 1) });
      buf = "";
      i = j;
      continue;
    }
    buf += ch;
    i += 1;
  }
  if (buf.trim()) decls.push(`${buf.trim()};`);
  return { decls: decls.join("\n"), blocks };
}
function resolveSelector(parent, child) {
  const parents = topLevelParts(parent);
  return topLevelParts(child).flatMap(
    (c2) => parents.map((p) => c2.includes("&") ? c2.replace(/&/g, p) : `${p} ${c2}`)
  ).join(", ");
}
function flatten(selector, body, wrap = []) {
  const { decls, blocks } = splitNested(body);
  const out2 = [];
  const emit = (sel, css) => {
    if (!css.trim()) return;
    const wrapped = wrap.reduceRight((inner, at) => `${at} {
${inner.replace(/^/gm, "  ")}
}`, css);
    out2.push({ selector: sel, css: wrapped });
  };
  emit(selector, decls);
  for (const b of blocks) {
    if (b.head.startsWith("@")) out2.push(...flatten(selector, b.body, [...wrap, b.head]));
    else out2.push(...flatten(resolveSelector(selector, b.head), b.body, wrap));
  }
  return out2;
}
var flatRules = (pairs) => pairs.flatMap(([sel, body]) => flatten(sel, body));

// ../src/builder-core/carousel.ts
var EL = "builder-data-element";
var CAROUSEL = "carousel";
var CAROUSEL_READY = "data-carousel-ready";
var CAROUSEL_ACTIVE = "data-carousel-active";
var PART = (id) => `[${EL}="carousel-${id}"]`;
var OVERLAY_ARROWS = `${PART("prev")}, ${PART("next")} {
  grid-area: track;
  z-index: 1;
  margin-inline: var(--space-s, 1rem);
  background: var(--card, rgb(255 255 255 / 0.9));
}
${PART("prev")} { justify-self: start; }
${PART("next")} { justify-self: end; }`;
var CAROUSEL_PRESTYLES = [
  {
    id: "slider",
    label: "Slider",
    hint: "one at a time, arrows over the slide",
    flow: "slides",
    arrows: true,
    dots: true,
    slides: 3,
    css: `--carousel-flow: slides;
--carousel-per-view: 1;
--carousel-gap: 0px;
--carousel-snap: x mandatory;

${OVERLAY_ARROWS}

${PART("slide")} { scroll-snap-align: center; }`
  },
  {
    id: "cards",
    label: "Cards",
    hint: "a few across, the next one peeking",
    flow: "slides",
    arrows: true,
    dots: false,
    slides: 5,
    /* The peek is the whole trick and it is one number: 3.2 slides across
       means the fourth is a fifth of the way in, which is what tells a
       visitor the row keeps going. */
    css: `--carousel-flow: slides;
--carousel-per-view: 3.2;
--carousel-gap: var(--space-s, 1rem);
--carousel-snap: x proximity;

@media (max-width: 900px) { --carousel-per-view: 2.2; }
@media (max-width: 600px) { --carousel-per-view: 1.15; }`
  },
  {
    id: "filmstrip",
    label: "Filmstrip",
    hint: "many small tiles, scrolled freely",
    flow: "slides",
    arrows: false,
    dots: false,
    slides: 8,
    css: `--carousel-flow: slides;
--carousel-per-view: 6;
--carousel-gap: var(--space-xs, 0.5rem);
--carousel-snap: x proximity;

@media (max-width: 900px) { --carousel-per-view: 4; }
@media (max-width: 600px) { --carousel-per-view: 2.5; }

/* Even tiles are what makes a strip read as a strip. */
${PART("slide")} {
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--radius-s, 4px);
}
${PART("slide")} > img {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}`
  },
  {
    id: "fade",
    label: "Fade",
    hint: "stacked and crossfaded \u2014 needs the script",
    flow: "fade",
    arrows: true,
    dots: true,
    slides: 3,
    css: `--carousel-flow: fade;
--carousel-per-view: 1;
--carousel-gap: 0px;
--carousel-snap: none;

/* Not a scroller: every slide sits in the same grid cell and the current one
   is the one that is visible. */
${PART("track")} {
  display: grid;
  grid-template-areas: "slide";
  overflow: hidden;
  scroll-snap-type: none;
}
${PART("slide")} {
  grid-area: slide;
  inline-size: 100%;
  opacity: 0;
  /* visibility as well as opacity: a slide nobody can see must not be
     clickable and must not be somewhere the keyboard can land. */
  visibility: hidden;
  transition:
    opacity var(--motion-duration, 500ms) var(--motion-ease, ease),
    visibility var(--motion-duration, 500ms) var(--motion-ease, ease);
}
${PART("slide")}[${CAROUSEL_ACTIVE}] {
  opacity: 1;
  visibility: visible;
}
/* Until the script arrives, the first slide is the one you see. A fade
   carousel that shipped blank because a file 404'd would be worse than one
   that simply never moves. */
&:not([${CAROUSEL_READY}]) ${PART("slide")}:first-child {
  opacity: 1;
  visibility: visible;
}

${OVERLAY_ARROWS}`
  },
  {
    id: "marquee",
    label: "Marquee",
    hint: "a continuous ticker, no steps",
    flow: "marquee",
    arrows: false,
    dots: false,
    slides: 6,
    css: `--carousel-flow: marquee;
--carousel-gap: var(--space-m, 2rem);
--carousel-snap: none;

${PART("track")} {
  /* The scrubber writes scrollLeft every frame; smooth scrolling would be
     the browser animating towards a target that has already moved. */
  scroll-behavior: auto;
  scroll-snap-type: none;
  mask-image: linear-gradient(to right, transparent, #000 4rem, #000 calc(100% - 4rem), transparent);
}
/* A ticker's items are as wide as what is in them, not a share of the row. */
${PART("slide")} {
  inline-size: auto;
  align-items: center;
}`
  }
];
var prestyleClass = (id) => `carousel--${id}`;
var carouselDef = (id, tag, label, hint, partId, extra = {}) => ({
  ...extra,
  id,
  tag,
  label,
  hint,
  icon: id,
  group: "carousel",
  attrStyled: true,
  /* Last, so it cannot be spread away: `data-carousel-part` is the one thing
     about a part that is not the author's to change. */
  attrs: { ...extra.attrs ?? {}, "data-carousel-part": partId }
});
var CAROUSEL_CSS = `position: relative;
display: grid;
/* Three columns so an arrow has somewhere to be, and auto-sized outer ones
   so the arrows you did not add cost nothing. The gap between them is the arrows' own margin
   for exactly that reason: a column gap would be spent on a column that is
   not there. */
grid-template-columns: auto minmax(0, 1fr) auto;
grid-template-areas:
  "prev track next"
  "dots dots dots";
align-items: center;
row-gap: var(--space-s, 1rem);`;
var TRACK_CSS = `grid-area: track;
display: flex;
inline-size: 100%;
gap: var(--carousel-gap, var(--space-s, 1rem));
overflow-x: auto;
overflow-y: hidden;
scroll-snap-type: var(--carousel-snap, x mandatory);
scroll-behavior: smooth;
/* A horizontal throw inside a carousel should not become the browser's back
   gesture, and should not scroll the page it is on. */
overscroll-behavior-inline: contain;
/* The scrollbar is not the control here \u2014 the arrows and the dots are. */
scrollbar-width: none;

&::-webkit-scrollbar { display: none; }

@media (prefers-reduced-motion: reduce) {
  scroll-behavior: auto;
}`;
var SLIDE_CSS = `flex: 0 0 auto;
/* One number decides the whole layout: how many slides are across. The gaps
   between them come out of the width first, which is what keeps 3 meaning
   three whole slides rather than three-and-a-bit. */
inline-size: calc(
  (100% - (var(--carousel-per-view, 1) - 1) * var(--carousel-gap, var(--space-s, 1rem)))
  / var(--carousel-per-view, 1)
);
min-inline-size: 0;
display: flex;
flex-direction: column;
scroll-snap-align: start;
scroll-snap-stop: normal;`;
var ARROW_CSS = (area) => `grid-area: ${area};
display: inline-flex;
align-items: center;
justify-content: center;
inline-size: 2.75rem;
block-size: 2.75rem;
margin-inline: var(--space-xs, 0.5rem);
padding: 0;
color: inherit;
background: var(--card, transparent);
border: 1px solid var(--border, currentColor);
border-radius: 50%;
cursor: pointer;
transition: opacity var(--transition, 200ms ease), background-color var(--transition, 200ms ease);

/* Disabled is the script's honest answer at the end of a carousel that does
   not wrap \u2014 not hidden, because a control that comes and goes is a layout
   that jumps. */
&:disabled {
  opacity: 0.35;
  cursor: default;
}

&:focus-visible {
  outline: 2px solid var(--primary, currentColor);
  outline-offset: 2px;
}

& > svg {
  inline-size: 1.25em;
  block-size: 1.25em;
}`;
var DOTS_CSS = `grid-area: dots;
display: flex;
align-items: center;
justify-content: center;
gap: var(--space-xxs, 0.4rem);

${PART("dot")} {
  inline-size: 0.6rem;
  block-size: 0.6rem;
  padding: 0;
  background: currentColor;
  border: 0;
  border-radius: 50%;
  opacity: 0.3;
  cursor: pointer;
  transition: opacity var(--transition, 200ms ease);

  &:hover { opacity: 0.6; }

  &[aria-current="true"] { opacity: 1; }

  &:focus-visible {
    outline: 2px solid var(--primary, currentColor);
    outline-offset: 2px;
  }
}`;
var CARET = (dir) => dir === "prev" ? '<path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />' : '<path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />';
var arrowDef = (dir) => carouselDef(
  `carousel-${dir}`,
  "button",
  dir === "prev" ? "Previous" : "Next",
  `steps ${dir === "prev" ? "back" : "on"}`,
  dir,
  {
    container: true,
    attrs: { type: "button", "aria-label": dir === "prev" ? "Previous slide" : "Next slide" },
    compose: [{ el: "svg", attrs: { viewBox: "0 0 24 24", "aria-hidden": "true" }, html: CARET(dir) }]
  }
);
var CAROUSEL_PARTS = [
  carouselDef("carousel-track", "div", "Track", "the scroller the slides sit in", "track", {
    container: true,
    /* Focusable because it is a scroll region: the arrow keys are the oldest
       carousel control there is and they cost one attribute. */
    attrs: { tabindex: "0" }
  }),
  carouselDef("carousel-slide", "div", "Slide", "one item in the track", "slide", {
    container: true
  }),
  arrowDef("prev"),
  arrowDef("next"),
  carouselDef("carousel-dots", "div", "Dots", "one per slide, made by the script", "dots", {
    /* each dot's label, %n its number — an attribute so a translation can
       say it in the page's language; one made before reads the English */
    attrs: { "aria-label": "Choose a slide", "data-dot-label": "Go to slide %n" },
    words: ["data-dot-label"]
  })
];
var SLIDE_SIZES = {
  cards: "(min-width: 900px) 33vw, 80vw",
  filmstrip: "(min-width: 900px) 20vw, 45vw"
};
var slideCompose = (kind, index, sizes = "100vw") => {
  if (kind === "marquee") {
    return { el: "carousel-slide", children: [{ el: "text", text: `Client ${index + 1}` }] };
  }
  return {
    el: "carousel-slide",
    children: [{ el: "image", attrs: { src: PLACEHOLDER_SRC, alt: "", sizes } }]
  };
};
var carouselCompose = (p) => [
  ...p.arrows ? [{ el: "carousel-prev" }] : [],
  { el: "carousel-track", children: Array.from({ length: p.slides }, (_, i) => slideCompose(p.flow, i, SLIDE_SIZES[p.id ?? ""])) },
  ...p.arrows ? [{ el: "carousel-next" }] : [],
  ...p.dots ? [{ el: "carousel-dots" }] : []
];
var rootDef = (extra) => ({
  tag: "div",
  group: "carousel",
  container: true,
  attrStyled: true,
  styleId: CAROUSEL,
  ...extra,
  id: extra.id ?? CAROUSEL,
  label: extra.label ?? "Carousel",
  icon: extra.icon ?? CAROUSEL,
  attrs: {
    /* A group rather than a region: a landmark per carousel is a landmark
       list nobody can use. The roledescription is what makes a screen reader
       call it a carousel instead of a group. */
    role: "group",
    "aria-roledescription": "carousel",
    "aria-label": "Carousel",
    ...extra.attrs ?? {},
    "data-carousel-part": "carousel"
  }
});
var CAROUSEL_ROOT = rootDef({
  id: CAROUSEL,
  label: "Carousel",
  hint: "a slider, a card row or a ticker",
  compose: carouselCompose({ flow: "slides", arrows: true, dots: true, slides: 3 })
});
var CAROUSEL_PRESETS = CAROUSEL_PRESTYLES.map((p) => rootDef({
  id: `carousel-${p.id}`,
  label: p.label,
  hint: p.hint,
  icon: `carousel-${p.id}`,
  classes: [prestyleClass(p.id)],
  compose: carouselCompose(p)
  /* No rule arrives with it: the class's rule is one block of the part
     defaults sheet (`carouselRequired`), so wearing the class is the whole
     of having the look — and a second Cards carousel adds nothing. */
}));
var CAROUSEL_ELEMENTS = [CAROUSEL_ROOT, ...CAROUSEL_PRESETS, ...CAROUSEL_PARTS];
var P = (id) => `[${EL}="${id}"]`;
function carouselRequired(_cfg) {
  return flatRules([
    [P("carousel-track"), TRACK_CSS],
    [P("carousel-slide"), SLIDE_CSS],
    ...CAROUSEL_PRESTYLES.map((p) => [`.${prestyleClass(p.id)}`, p.css])
  ]);
}
function carouselLook(_cfg) {
  return flatRules([
    [P(CAROUSEL), CAROUSEL_CSS],
    [P("carousel-prev"), ARROW_CSS("prev")],
    [P("carousel-next"), ARROW_CSS("next")],
    [P("carousel-dots"), DOTS_CSS]
  ]);
}
var CAROUSEL_STARTERS = [
  [P(CAROUSEL), CAROUSEL_CSS],
  [P("carousel-track"), TRACK_CSS],
  [P("carousel-slide"), SLIDE_CSS],
  [P("carousel-prev"), ARROW_CSS("prev")],
  [P("carousel-next"), ARROW_CSS("next")],
  [P("carousel-dots"), DOTS_CSS],
  ...CAROUSEL_PRESTYLES.map((p) => [`.${prestyleClass(p.id)}`, p.css])
];

// ../src/builder-core/overlay.ts
var OVERLAY_ATTR = "data-overlay";
var POPUP_BLOCK = "data-popup-block";
var POPUP_DEVICE = "data-popup-device";
var markStart = (name) => `/* sitereal:${name} */`;
var MARK_END = "/* sitereal:end */";
function withMarked(css, name, block) {
  const start = markStart(name);
  const body = block.trim() ? `${start}
${block.trim()}
${MARK_END}` : "";
  const i = css.indexOf(start);
  if (i < 0) return body ? `${css.trim() ? `${css.trim()}

` : ""}${body}` : css;
  const j = css.indexOf(MARK_END, i);
  if (j < 0) return body ? `${body}${css.slice(i + start.length)}` : css.slice(i + start.length).trimStart();
  const before = css.slice(0, i);
  const after = css.slice(j + MARK_END.length);
  const joined = `${before}${body}${after}`;
  return joined.replace(/\n{3,}/g, "\n\n").trim();
}
var PLACEMENTS = [
  {
    id: "center",
    label: "Centered",
    hint: "in the middle of the screen",
    blocks: true,
    css: `position: fixed;
inset: 0;
margin: auto;
inline-size: min(32rem, calc(100vw - 2rem));
max-block-size: min(80vh, calc(100vh - 2rem));
opacity: 0;
scale: 0.97;
transition: opacity 200ms ease, scale 200ms ease, overlay 200ms allow-discrete, display 200ms allow-discrete;

&:popover-open {
  opacity: 1;
  scale: 1;
}

@starting-style {
  &:popover-open {
    opacity: 0;
    scale: 0.97;
  }
}`
  },
  {
    id: "trigger",
    label: "Under its trigger",
    hint: "hangs off whatever opened it",
    css: `position: fixed;
margin: 0;
inline-size: max-content;
min-inline-size: 12rem;
max-inline-size: min(22rem, calc(100vw - 2rem));
opacity: 0;
translate: 0 -0.35rem;
transition: opacity 160ms ease, translate 160ms ease, overlay 160ms allow-discrete, display 160ms allow-discrete;

&:popover-open {
  opacity: 1;
  translate: 0 0;
}

@starting-style {
  &:popover-open {
    opacity: 0;
    translate: 0 -0.35rem;
  }
}`
  },
  {
    id: "corner",
    label: "A corner",
    hint: "a toast, out of the way",
    css: `position: fixed;
inset-block-start: auto;
inset-block-end: var(--space-m, 1.5rem);
inset-inline-start: auto;
inset-inline-end: var(--space-m, 1.5rem);
margin: 0;
inline-size: min(24rem, calc(100vw - 2rem));
max-block-size: calc(100vh - 3rem);
opacity: 0;
translate: 0 0.5rem;
transition: opacity 200ms ease, translate 200ms ease, overlay 200ms allow-discrete, display 200ms allow-discrete;

&:popover-open {
  opacity: 1;
  translate: 0 0;
}

@starting-style {
  &:popover-open {
    opacity: 0;
    translate: 0 0.5rem;
  }
}`
  },
  {
    id: "bar",
    label: "A bar",
    hint: "across the bottom, full width",
    /* The shape a consent notice is nearly always in, and one a popup had no
       way to be: `corner` is a 24rem toast and `center` is a dialog, while a
       bar is the whole width of the screen with the content held to the site's
       own column. It blocks nothing — a band you can read the page behind is
       the point of choosing it over the modal. */
    css: `position: fixed;
inset-block-start: auto;
inset-block-end: 0;
inset-inline: 0;
margin: 0;
inline-size: 100%;
max-inline-size: none;
max-block-size: min(80vh, 100vh - 2rem);
border-radius: 0;
border-inline: 0;
border-block-end: 0;
padding-inline: var(--site-padding, 1.5rem);
opacity: 0;
translate: 0 100%;
transition: opacity 240ms ease, translate 240ms ease, overlay 240ms allow-discrete, display 240ms allow-discrete;

&:popover-open {
  opacity: 1;
  translate: 0 0;
}

@starting-style {
  &:popover-open {
    opacity: 0;
    translate: 0 100%;
  }
}`
  },
  {
    id: "drawer",
    label: "A side drawer",
    hint: "full height, in from the edge",
    blocks: true,
    css: `position: fixed;
inset-block: 0;
inset-inline-start: auto;
inset-inline-end: 0;
margin: 0;
inline-size: min(24rem, 100vw);
/* The browser's own popover rule sets height to fit-content, so pinning both
   block edges is not enough on its own \u2014 a drawer has to say it fills. */
block-size: auto;
max-block-size: none;
border-radius: 0;
overflow: auto;
translate: 100% 0;
transition: translate 260ms ease, overlay 260ms allow-discrete, display 260ms allow-discrete;

&:popover-open {
  translate: 0 0;
}

@starting-style {
  &:popover-open {
    translate: 100% 0;
  }
}`
  }
];
var PLACEMENT_BY_ID = Object.fromEntries(PLACEMENTS.map((p) => [p.id, p]));
var PANEL_INK = "color: var(--base-500, #111);";
var PANEL_LOOK = `padding: var(--space-m, 1.5rem);
background: var(--base-100, #fff);
${PANEL_INK}
border: var(--border, 1px solid rgba(0, 0, 0, 0.12));
border-radius: var(--radius-l, 16px);
box-shadow: var(--shadow-l, 0 18px 40px rgba(0, 0, 0, 0.18));
overflow: auto;

/* Focus is moved in here when it opens; a ring around the whole panel says
   nothing a sighted reader needs, since the heading is already read out. */
&:focus-visible {
  outline: none;
}`;
var BLOCK_CSS = `&::backdrop {
  background: rgb(0 0 0 / 0.45);
  backdrop-filter: blur(2px);
  opacity: 0;
  transition: opacity 200ms ease, overlay 200ms allow-discrete, display 200ms allow-discrete;
}

&:popover-open::backdrop {
  opacity: 1;
}

@starting-style {
  &:popover-open::backdrop {
    opacity: 0;
  }
}`;
var DEVICE_BP = 768;
var deviceCss = (device2) => device2 === "desktop" ? `@media (max-width: ${DEVICE_BP - 1}px) {
  --popup-on: 0;
  display: none;
}` : device2 === "mobile" ? `@media (min-width: ${DEVICE_BP}px) {
  --popup-on: 0;
  display: none;
}` : "";
function panelCss(placement, opts = {}) {
  const def = PLACEMENT_BY_ID[placement] ?? PLACEMENTS[0];
  const blocks = opts.blocks ?? def.blocks ?? false;
  let css = withMarked("", "placement", def.css);
  css = `${css}

${PANEL_LOOK}`;
  css = withMarked(css, "blocking", blocks ? BLOCK_CSS : "");
  css = withMarked(css, "device", deviceCss(opts.device ?? "all"));
  return css;
}
var CLOSE_CSS = `position: absolute;
inset-block-start: var(--space-xs, 0.75rem);
inset-inline-end: var(--space-xs, 0.75rem);
display: inline-grid;
place-items: center;
inline-size: 2rem;
block-size: 2rem;
padding: 0;
color: inherit;
background: none;
border: 0;
border-radius: var(--radius-s, 4px);
font: inherit;
font-size: 1.25rem;
line-height: 1;
cursor: pointer;
opacity: 0.6;
transition: opacity var(--transition, 200ms ease), background-color var(--transition, 200ms ease);

&:hover {
  opacity: 1;
  background: var(--base-200, rgba(0, 0, 0, 0.06));
}

&:focus-visible {
  opacity: 1;
  outline: 2px solid var(--primary, currentColor);
  outline-offset: 2px;
}`;
var OV = (ids) => ids.map((v2) => `[${OVERLAY_ATTR}="${v2}"]`).join(", ");
function popupRequired(_cfg) {
  return flatRules([
    /* `fixed` and `relative` are what pages written before placements existed
       carry, and they mean what they always meant. */
    ...PLACEMENTS.map((p) => [
      OV(p.id === "center" ? ["center", "fixed"] : p.id === "trigger" ? ["trigger", "relative"] : [p.id]),
      p.css
    ]),
    [`[${POPUP_BLOCK}]`, BLOCK_CSS],
    /* The page holds still behind a blocking panel. popup.js sets the
       attribute while the panel is drawn — never from `:popover-open` alone,
       which stays true for a banner a content blocker hid, and a page that
       cannot scroll behind nothing is a page you cannot use. The gutter stays
       where the scrollbar was, so nothing moves sideways. */
    ["html[data-popup-locked]", "overflow: hidden;\nscrollbar-gutter: stable;"],
    [`[${POPUP_DEVICE}="desktop"]`, deviceCss("desktop")],
    [`[${POPUP_DEVICE}="mobile"]`, deviceCss("mobile")]
  ]);
}
function popupLook(_cfg, headingInk = false) {
  const own = headingInk ? PANEL_LOOK.replace(PANEL_INK, `${PANEL_INK}
--heading-color: currentColor;`) : PANEL_LOOK;
  return flatRules([
    [`[${OVERLAY_ATTR}]`, own],
    ['[builder-data-element="popup-close"]', CLOSE_CSS]
  ]);
}
var POPUP_STARTERS = [
  ...PLACEMENTS.flatMap((p) => [true, false].flatMap((blocks) => ["all", "desktop", "mobile"].flatMap((device2) => {
    const css = panelCss(p.id, { blocks, device: device2 });
    return [["#*", css], ['[builder-data-element="popup-panel"]', css]];
  }))),
  ['[builder-data-element="popup-close"]', CLOSE_CSS],
  ['#* [builder-data-element="popup-close"]', CLOSE_CSS]
];
var POPUP_ELEMENTS = [
  {
    id: "popup-panel",
    tag: "div",
    label: "Popup panel",
    icon: "popup-panel",
    group: "overlay",
    hint: "a panel on this page alone",
    container: true,
    attrs: { [OVERLAY_ATTR]: "center", popover: "auto", role: "dialog" },
    compose: [
      { el: "heading", text: "Popup title" },
      { el: "text", text: "What the popup has to say." },
      { el: "popup-close" }
    ]
  },
  {
    id: "popup-close",
    tag: "button",
    label: "Close button",
    icon: "popup-close",
    group: "overlay",
    hint: "closes the panel it is in",
    text: "\xD7",
    attrStyled: true,
    /* `popovertargetaction="hide"` is the platform's: this button closes and
       never opens, whatever else is going on. `aria-label` because the glyph
       is a multiplication sign, which is not the word "close". */
    attrs: { type: "button", popovertarget: "", popovertargetaction: "hide", "aria-label": "Close" }
  }
];

// ../src/builder-core/consent-text.ts
var CONSENT_TEXT = {
  en: {
    name: "English",
    banner: {
      title: "Cookies on this site",
      body: "We use cookies to run this site and, with your permission, to understand how it is used. You can change your mind at any time.",
      accept: "Accept all",
      reject: "Reject all",
      manage: "Settings"
    },
    prefs: {
      title: "Your cookie choices",
      body: "Decide what this site may do. Necessary cookies keep it working and cannot be switched off.",
      save: "Save choices"
    },
    policy: "How we handle your data",
    legal: { imprint: "Imprint", privacy: "Privacy policy", terms: "Terms", cookies: "Cookie policy" },
    revisit: "Cookie settings",
    placeholder: "This content is loaded from another company and is only shown once you allow it.",
    doNotSell: "Do not sell or share my personal information",
    cat: {
      necessary: { label: "Necessary", hint: "Needed for the site to work \u2014 the session, the shopping basket, this choice itself. Cannot be switched off." },
      preferences: { label: "Preferences", hint: "Remembers how you like the site: a language, a region, a layout you chose." },
      statistics: { label: "Statistics", hint: "How the site is used, in aggregate \u2014 which pages are read, where visitors stop." },
      marketing: { label: "Marketing", hint: "Tracking across sites, to measure and target advertising." },
      sale: { label: "Sale or sharing", hint: "Passing your personal information to other companies for advertising. US state laws let you opt out of this." }
    }
  },
  de: {
    name: "Deutsch",
    banner: {
      title: "Cookies auf dieser Website",
      body: "Wir verwenden Cookies, um diese Website zu betreiben und \u2013 mit Ihrer Erlaubnis \u2013 zu verstehen, wie sie genutzt wird. Sie k\xF6nnen Ihre Entscheidung jederzeit \xE4ndern.",
      accept: "Alle akzeptieren",
      reject: "Alle ablehnen",
      manage: "Einstellungen"
    },
    prefs: {
      title: "Ihre Cookie-Einstellungen",
      body: "Entscheiden Sie, was diese Website darf. Notwendige Cookies halten sie funktionsf\xE4hig und lassen sich nicht abschalten.",
      save: "Auswahl speichern"
    },
    policy: "Wie wir mit Ihren Daten umgehen",
    legal: { imprint: "Impressum", privacy: "Datenschutz", terms: "AGB", cookies: "Cookie-Richtlinie" },
    revisit: "Cookie-Einstellungen",
    placeholder: "Dieser Inhalt wird von einem anderen Unternehmen geladen und erst angezeigt, wenn Sie ihn erlauben.",
    doNotSell: "Meine personenbezogenen Daten nicht verkaufen oder weitergeben",
    cat: {
      necessary: { label: "Notwendig", hint: "F\xFCr den Betrieb der Website erforderlich \u2013 die Sitzung, der Warenkorb, diese Auswahl selbst. Nicht abschaltbar." },
      preferences: { label: "Pr\xE4ferenzen", hint: "Merkt sich, wie Sie die Website m\xF6gen: Sprache, Region, ein gew\xE4hltes Layout." },
      statistics: { label: "Statistiken", hint: "Wie die Website genutzt wird, in Summe \u2013 welche Seiten gelesen werden, wo Besucher abbrechen." },
      marketing: { label: "Marketing", hint: "Website-\xFCbergreifendes Tracking, um Werbung zu messen und auszurichten." },
      sale: { label: "Verkauf oder Weitergabe", hint: "Weitergabe Ihrer personenbezogenen Daten an andere Unternehmen zu Werbezwecken. US-Bundesstaatsgesetze erlauben Ihnen, dem zu widersprechen." }
    }
  },
  fr: {
    name: "Fran\xE7ais",
    banner: {
      title: "Cookies sur ce site",
      body: "Nous utilisons des cookies pour faire fonctionner ce site et, avec votre accord, pour comprendre comment il est utilis\xE9. Vous pouvez changer d\u2019avis \xE0 tout moment.",
      accept: "Tout accepter",
      reject: "Tout refuser",
      manage: "Param\xE8tres"
    },
    prefs: {
      title: "Vos choix de cookies",
      body: "D\xE9cidez de ce que ce site peut faire. Les cookies n\xE9cessaires le font fonctionner et ne peuvent pas \xEAtre d\xE9sactiv\xE9s.",
      save: "Enregistrer mes choix"
    },
    policy: "Comment nous traitons vos donn\xE9es",
    legal: { imprint: "Mentions l\xE9gales", privacy: "Politique de confidentialit\xE9", terms: "CGU", cookies: "Politique de cookies" },
    revisit: "Param\xE8tres des cookies",
    placeholder: "Ce contenu est charg\xE9 par une autre soci\xE9t\xE9 et ne s\u2019affiche qu\u2019une fois que vous l\u2019autorisez.",
    doNotSell: "Ne pas vendre ni partager mes informations personnelles",
    cat: {
      necessary: { label: "N\xE9cessaires", hint: "Indispensables au fonctionnement du site \u2014 la session, le panier, ce choix lui-m\xEAme. Non d\xE9sactivables." },
      preferences: { label: "Pr\xE9f\xE9rences", hint: "Retient vos r\xE9glages : une langue, une r\xE9gion, une mise en page choisie." },
      statistics: { label: "Statistiques", hint: "L\u2019usage du site, de mani\xE8re agr\xE9g\xE9e \u2014 les pages lues, les endroits o\xF9 les visiteurs s\u2019arr\xEAtent." },
      marketing: { label: "Marketing", hint: "Suivi d\u2019un site \xE0 l\u2019autre, pour mesurer et cibler la publicit\xE9." },
      sale: { label: "Vente ou partage", hint: "Transmission de vos informations personnelles \xE0 d\u2019autres soci\xE9t\xE9s \xE0 des fins publicitaires. Les lois des \xC9tats am\xE9ricains vous permettent de vous y opposer." }
    }
  },
  es: {
    name: "Espa\xF1ol",
    banner: {
      title: "Cookies en este sitio",
      body: "Usamos cookies para que este sitio funcione y, con tu permiso, para entender c\xF3mo se utiliza. Puedes cambiar de opini\xF3n en cualquier momento.",
      accept: "Aceptar todo",
      reject: "Rechazar todo",
      manage: "Configuraci\xF3n"
    },
    prefs: {
      title: "Tus opciones de cookies",
      body: "Decide qu\xE9 puede hacer este sitio. Las cookies necesarias lo mantienen en funcionamiento y no se pueden desactivar.",
      save: "Guardar opciones"
    },
    policy: "C\xF3mo tratamos tus datos",
    legal: { imprint: "Aviso legal", privacy: "Pol\xEDtica de privacidad", terms: "T\xE9rminos", cookies: "Pol\xEDtica de cookies" },
    revisit: "Configuraci\xF3n de cookies",
    placeholder: "Este contenido lo carga otra empresa y solo se muestra cuando lo permites.",
    doNotSell: "No vender ni compartir mi informaci\xF3n personal",
    cat: {
      necessary: { label: "Necesarias", hint: "Imprescindibles para que el sitio funcione: la sesi\xF3n, el carrito, esta misma elecci\xF3n. No se pueden desactivar." },
      preferences: { label: "Preferencias", hint: "Recuerda c\xF3mo te gusta el sitio: un idioma, una regi\xF3n, un dise\xF1o que elegiste." },
      statistics: { label: "Estad\xEDsticas", hint: "C\xF3mo se usa el sitio, de forma agregada: qu\xE9 p\xE1ginas se leen, d\xF3nde se detienen las visitas." },
      marketing: { label: "Marketing", hint: "Seguimiento entre sitios para medir y dirigir la publicidad." },
      sale: { label: "Venta o cesi\xF3n", hint: "Entregar tu informaci\xF3n personal a otras empresas con fines publicitarios. Las leyes estatales de EE. UU. te permiten oponerte." }
    }
  },
  it: {
    name: "Italiano",
    banner: {
      title: "Cookie su questo sito",
      body: "Usiamo i cookie per far funzionare questo sito e, con il tuo permesso, per capire come viene utilizzato. Puoi cambiare idea in qualsiasi momento.",
      accept: "Accetta tutto",
      reject: "Rifiuta tutto",
      manage: "Impostazioni"
    },
    prefs: {
      title: "Le tue scelte sui cookie",
      body: "Decidi cosa pu\xF2 fare questo sito. I cookie necessari lo tengono in funzione e non possono essere disattivati.",
      save: "Salva le scelte"
    },
    policy: "Come trattiamo i tuoi dati",
    legal: { imprint: "Note legali", privacy: "Informativa sulla privacy", terms: "Termini", cookies: "Informativa sui cookie" },
    revisit: "Impostazioni cookie",
    placeholder: "Questo contenuto \xE8 caricato da un\u2019altra azienda e viene mostrato solo dopo la tua autorizzazione.",
    doNotSell: "Non vendere n\xE9 condividere le mie informazioni personali",
    cat: {
      necessary: { label: "Necessari", hint: "Indispensabili al funzionamento del sito: la sessione, il carrello, questa stessa scelta. Non disattivabili." },
      preferences: { label: "Preferenze", hint: "Ricorda come preferisci il sito: una lingua, una regione, un layout scelto." },
      statistics: { label: "Statistiche", hint: "Come viene usato il sito, in forma aggregata: quali pagine si leggono, dove si fermano i visitatori." },
      marketing: { label: "Marketing", hint: "Tracciamento tra siti diversi, per misurare e indirizzare la pubblicit\xE0." },
      sale: { label: "Vendita o condivisione", hint: "Cessione delle tue informazioni personali ad altre aziende a fini pubblicitari. Le leggi statali USA ti permettono di opporti." }
    }
  },
  nl: {
    name: "Nederlands",
    banner: {
      title: "Cookies op deze site",
      body: "We gebruiken cookies om deze site te laten werken en, met uw toestemming, om te begrijpen hoe hij wordt gebruikt. U kunt zich altijd bedenken.",
      accept: "Alles accepteren",
      reject: "Alles weigeren",
      manage: "Instellingen"
    },
    prefs: {
      title: "Uw cookiekeuzes",
      body: "Bepaal wat deze site mag. Noodzakelijke cookies houden de site werkend en kunnen niet worden uitgezet.",
      save: "Keuzes opslaan"
    },
    policy: "Hoe wij met uw gegevens omgaan",
    legal: { imprint: "Colofon", privacy: "Privacyverklaring", terms: "Voorwaarden", cookies: "Cookiebeleid" },
    revisit: "Cookie-instellingen",
    placeholder: "Deze inhoud wordt door een ander bedrijf geladen en pas getoond wanneer u dat toestaat.",
    doNotSell: "Mijn persoonlijke gegevens niet verkopen of delen",
    cat: {
      necessary: { label: "Noodzakelijk", hint: "Nodig om de site te laten werken \u2014 de sessie, de winkelwagen, deze keuze zelf. Niet uit te zetten." },
      preferences: { label: "Voorkeuren", hint: "Onthoudt hoe u de site prettig vindt: een taal, een regio, een gekozen indeling." },
      statistics: { label: "Statistieken", hint: "Hoe de site wordt gebruikt, in totalen \u2014 welke pagina\u2019s worden gelezen, waar bezoekers afhaken." },
      marketing: { label: "Marketing", hint: "Volgen over sites heen, om advertenties te meten en te richten." },
      sale: { label: "Verkoop of delen", hint: "Uw persoonlijke gegevens aan andere bedrijven doorgeven voor advertenties. Amerikaanse staatswetten laten u hiertegen bezwaar maken." }
    }
  },
  pt: {
    name: "Portugu\xEAs",
    banner: {
      title: "Cookies neste site",
      body: "Usamos cookies para o funcionamento deste site e, com a sua permiss\xE3o, para perceber como \xE9 utilizado. Pode mudar de ideias a qualquer momento.",
      accept: "Aceitar tudo",
      reject: "Rejeitar tudo",
      manage: "Defini\xE7\xF5es"
    },
    prefs: {
      title: "As suas escolhas de cookies",
      body: "Decida o que este site pode fazer. Os cookies necess\xE1rios mant\xEAm-no a funcionar e n\xE3o podem ser desligados.",
      save: "Guardar escolhas"
    },
    policy: "Como tratamos os seus dados",
    legal: { imprint: "Ficha t\xE9cnica", privacy: "Pol\xEDtica de privacidade", terms: "Termos", cookies: "Pol\xEDtica de cookies" },
    revisit: "Defini\xE7\xF5es de cookies",
    placeholder: "Este conte\xFAdo \xE9 carregado por outra empresa e s\xF3 \xE9 mostrado depois de o permitir.",
    doNotSell: "N\xE3o vender nem partilhar as minhas informa\xE7\xF5es pessoais",
    cat: {
      necessary: { label: "Necess\xE1rios", hint: "Precisos para o site funcionar \u2014 a sess\xE3o, o carrinho, esta pr\xF3pria escolha. N\xE3o podem ser desligados." },
      preferences: { label: "Prefer\xEAncias", hint: "Recorda como gosta do site: um idioma, uma regi\xE3o, um esquema que escolheu." },
      statistics: { label: "Estat\xEDsticas", hint: "Como o site \xE9 usado, de forma agregada \u2014 que p\xE1ginas s\xE3o lidas, onde os visitantes param." },
      marketing: { label: "Marketing", hint: "Seguimento entre sites, para medir e dirigir publicidade." },
      sale: { label: "Venda ou partilha", hint: "Entregar as suas informa\xE7\xF5es pessoais a outras empresas para publicidade. As leis estaduais dos EUA permitem-lhe opor-se." }
    }
  },
  pl: {
    name: "Polski",
    banner: {
      title: "Pliki cookie na tej stronie",
      body: "U\u017Cywamy plik\xF3w cookie, aby ta strona dzia\u0142a\u0142a i \u2014 za Twoj\u0105 zgod\u0105 \u2014 aby rozumie\u0107, jak jest u\u017Cywana. W ka\u017Cdej chwili mo\u017Cesz zmieni\u0107 zdanie.",
      accept: "Zaakceptuj wszystko",
      reject: "Odrzu\u0107 wszystko",
      manage: "Ustawienia"
    },
    prefs: {
      title: "Twoje wybory dotycz\u0105ce cookie",
      body: "Zdecyduj, co ta strona mo\u017Ce robi\u0107. Niezb\u0119dne pliki cookie utrzymuj\u0105 j\u0105 w dzia\u0142aniu i nie mo\u017Cna ich wy\u0142\u0105czy\u0107.",
      save: "Zapisz wybory"
    },
    policy: "Jak post\u0119pujemy z Twoimi danymi",
    legal: { imprint: "Nota prawna", privacy: "Polityka prywatno\u015Bci", terms: "Regulamin", cookies: "Polityka cookies" },
    revisit: "Ustawienia cookie",
    placeholder: "Ta tre\u015B\u0107 jest \u0142adowana przez inn\u0105 firm\u0119 i pojawi si\u0119 dopiero, gdy wyrazisz na to zgod\u0119.",
    doNotSell: "Nie sprzedawaj ani nie udost\u0119pniaj moich danych osobowych",
    cat: {
      necessary: { label: "Niezb\u0119dne", hint: "Potrzebne, by strona dzia\u0142a\u0142a \u2014 sesja, koszyk, sam ten wyb\xF3r. Nie mo\u017Cna ich wy\u0142\u0105czy\u0107." },
      preferences: { label: "Preferencje", hint: "Zapami\u0119tuje, jak lubisz stron\u0119: j\u0119zyk, region, wybrany uk\u0142ad." },
      statistics: { label: "Statystyki", hint: "Jak strona jest u\u017Cywana, zbiorczo \u2014 kt\xF3re strony s\u0105 czytane, gdzie odwiedzaj\u0105cy si\u0119 zatrzymuj\u0105." },
      marketing: { label: "Marketing", hint: "\u015Aledzenie mi\u0119dzy witrynami, by mierzy\u0107 i kierowa\u0107 reklamy." },
      sale: { label: "Sprzeda\u017C lub udost\u0119pnianie", hint: "Przekazywanie Twoich danych osobowych innym firmom w celach reklamowych. Prawo stanowe USA pozwala Ci si\u0119 temu sprzeciwi\u0107." }
    }
  },
  hi: {
    name: "\u0939\u093F\u0928\u094D\u0926\u0940",
    banner: {
      title: "\u0907\u0938 \u0938\u093E\u0907\u091F \u092A\u0930 \u0915\u0941\u0915\u0940\u091C\u093C",
      body: "\u0939\u092E \u0907\u0938 \u0938\u093E\u0907\u091F \u0915\u094B \u091A\u0932\u093E\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0914\u0930, \u0906\u092A\u0915\u0940 \u0905\u0928\u0941\u092E\u0924\u093F \u0938\u0947, \u092F\u0939 \u0938\u092E\u091D\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0915\u0941\u0915\u0940\u091C\u093C \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0924\u0947 \u0939\u0948\u0902 \u0915\u093F \u0907\u0938\u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0948\u0938\u0947 \u0939\u094B\u0924\u093E \u0939\u0948\u0964 \u0906\u092A \u0915\u092D\u0940 \u092D\u0940 \u0905\u092A\u0928\u093E \u0928\u093F\u0930\u094D\u0923\u092F \u092C\u0926\u0932 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964",
      accept: "\u0938\u092D\u0940 \u0938\u094D\u0935\u0940\u0915\u093E\u0930 \u0915\u0930\u0947\u0902",
      reject: "\u0938\u092D\u0940 \u0905\u0938\u094D\u0935\u0940\u0915\u093E\u0930 \u0915\u0930\u0947\u0902",
      manage: "\u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938"
    },
    prefs: {
      title: "\u0906\u092A\u0915\u0940 \u0915\u0941\u0915\u0940 \u092A\u0938\u0902\u0926",
      body: "\u0924\u092F \u0915\u0930\u0947\u0902 \u0915\u093F \u092F\u0939 \u0938\u093E\u0907\u091F \u0915\u094D\u092F\u093E \u0915\u0930 \u0938\u0915\u0924\u0940 \u0939\u0948\u0964 \u0906\u0935\u0936\u094D\u092F\u0915 \u0915\u0941\u0915\u0940\u091C\u093C \u0907\u0938\u0947 \u091A\u093E\u0932\u0942 \u0930\u0916\u0924\u0940 \u0939\u0948\u0902 \u0914\u0930 \u092C\u0902\u0926 \u0928\u0939\u0940\u0902 \u0915\u0940 \u091C\u093E \u0938\u0915\u0924\u0940\u0902\u0964",
      save: "\u092A\u0938\u0902\u0926 \u0938\u0939\u0947\u091C\u0947\u0902"
    },
    policy: "\u0939\u092E \u0906\u092A\u0915\u0947 \u0921\u0947\u091F\u093E \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0948\u0938\u0947 \u0915\u0930\u0924\u0947 \u0939\u0948\u0902",
    legal: { imprint: "\u0915\u093E\u0928\u0942\u0928\u0940 \u0938\u0942\u091A\u0928\u093E", privacy: "\u0917\u094B\u092A\u0928\u0940\u092F\u0924\u093E \u0928\u0940\u0924\u093F", terms: "\u0936\u0930\u094D\u0924\u0947\u0902", cookies: "\u0915\u0941\u0915\u0940 \u0928\u0940\u0924\u093F" },
    revisit: "\u0915\u0941\u0915\u0940 \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938",
    placeholder: "\u092F\u0939 \u0938\u093E\u092E\u0917\u094D\u0930\u0940 \u0915\u093F\u0938\u0940 \u0905\u0928\u094D\u092F \u0915\u0902\u092A\u0928\u0940 \u0938\u0947 \u0932\u094B\u0921 \u0939\u094B\u0924\u0940 \u0939\u0948 \u0914\u0930 \u0906\u092A\u0915\u0940 \u0905\u0928\u0941\u092E\u0924\u093F \u0915\u0947 \u092C\u093E\u0926 \u0939\u0940 \u0926\u093F\u0916\u093E\u0908 \u091C\u093E\u0924\u0940 \u0939\u0948\u0964",
    doNotSell: "\u092E\u0947\u0930\u0940 \u0935\u094D\u092F\u0915\u094D\u0924\u093F\u0917\u0924 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0928 \u092C\u0947\u091A\u0947\u0902 \u0914\u0930 \u0928 \u0938\u093E\u091D\u093E \u0915\u0930\u0947\u0902",
    cat: {
      necessary: { label: "\u0906\u0935\u0936\u094D\u092F\u0915", hint: "\u0938\u093E\u0907\u091F \u091A\u0932\u093E\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u091C\u093C\u0930\u0942\u0930\u0940 \u2014 \u0938\u0924\u094D\u0930, \u0936\u0949\u092A\u093F\u0902\u0917 \u0915\u093E\u0930\u094D\u091F, \u0914\u0930 \u092F\u0939 \u091A\u0941\u0928\u093E\u0935 \u0938\u094D\u0935\u092F\u0902\u0964 \u0907\u0928\u094D\u0939\u0947\u0902 \u092C\u0902\u0926 \u0928\u0939\u0940\u0902 \u0915\u093F\u092F\u093E \u091C\u093E \u0938\u0915\u0924\u093E\u0964" },
      preferences: { label: "\u092A\u094D\u0930\u093E\u0925\u092E\u093F\u0915\u0924\u093E\u090F\u0901", hint: "\u092F\u093E\u0926 \u0930\u0916\u0924\u093E \u0939\u0948 \u0915\u093F \u0906\u092A\u0915\u094B \u0938\u093E\u0907\u091F \u0915\u0948\u0938\u0940 \u092A\u0938\u0902\u0926 \u0939\u0948: \u092D\u093E\u0937\u093E, \u0915\u094D\u0937\u0947\u0924\u094D\u0930, \u092F\u093E \u091A\u0941\u0928\u093E \u0917\u092F\u093E \u0932\u0947\u0906\u0909\u091F\u0964" },
      statistics: { label: "\u0906\u0901\u0915\u0921\u093C\u0947", hint: "\u0938\u093E\u0907\u091F \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0948\u0938\u0947 \u0939\u094B\u0924\u093E \u0939\u0948, \u0915\u0941\u0932 \u092E\u093F\u0932\u093E\u0915\u0930 \u2014 \u0915\u094C\u0928 \u0938\u0947 \u092A\u0943\u0937\u094D\u0920 \u092A\u0922\u093C\u0947 \u091C\u093E\u0924\u0947 \u0939\u0948\u0902, \u0906\u0917\u0902\u0924\u0941\u0915 \u0915\u0939\u093E\u0901 \u0930\u0941\u0915\u0924\u0947 \u0939\u0948\u0902\u0964" },
      marketing: { label: "\u092E\u093E\u0930\u094D\u0915\u0947\u091F\u093F\u0902\u0917", hint: "\u0935\u093F\u091C\u094D\u091E\u093E\u092A\u0928 \u092E\u093E\u092A\u0928\u0947 \u0914\u0930 \u0932\u0915\u094D\u0937\u093F\u0924 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0938\u093E\u0907\u091F\u094B\u0902 \u0915\u0947 \u092C\u0940\u091A \u091F\u094D\u0930\u0948\u0915\u093F\u0902\u0917\u0964" },
      sale: { label: "\u092C\u093F\u0915\u094D\u0930\u0940 \u092F\u093E \u0938\u093E\u091D\u093E\u0915\u0930\u0923", hint: "\u0935\u093F\u091C\u094D\u091E\u093E\u092A\u0928 \u0915\u0947 \u0932\u093F\u090F \u0906\u092A\u0915\u0940 \u0935\u094D\u092F\u0915\u094D\u0924\u093F\u0917\u0924 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0905\u0928\u094D\u092F \u0915\u0902\u092A\u0928\u093F\u092F\u094B\u0902 \u0915\u094B \u0926\u0947\u0928\u093E\u0964 \u0905\u092E\u0947\u0930\u093F\u0915\u0940 \u0930\u093E\u091C\u094D\u092F \u0915\u093E\u0928\u0942\u0928 \u0906\u092A\u0915\u094B \u0907\u0938\u0938\u0947 \u092C\u093E\u0939\u0930 \u0928\u093F\u0915\u0932\u0928\u0947 \u0926\u0947\u0924\u0947 \u0939\u0948\u0902\u0964" }
    }
  },
  ja: {
    name: "\u65E5\u672C\u8A9E",
    banner: {
      title: "\u3053\u306E\u30B5\u30A4\u30C8\u306ECookie\u306B\u3064\u3044\u3066",
      body: "\u5F53\u30B5\u30A4\u30C8\u306E\u904B\u55B6\u306E\u305F\u3081\u3001\u307E\u305F\u540C\u610F\u3092\u3044\u305F\u3060\u3044\u305F\u5834\u5408\u306B\u306F\u5229\u7528\u72B6\u6CC1\u3092\u628A\u63E1\u3059\u308B\u305F\u3081\u306BCookie\u3092\u4F7F\u7528\u3057\u307E\u3059\u3002\u8A2D\u5B9A\u306F\u3044\u3064\u3067\u3082\u5909\u66F4\u3067\u304D\u307E\u3059\u3002",
      accept: "\u3059\u3079\u3066\u8A31\u53EF",
      reject: "\u3059\u3079\u3066\u62D2\u5426",
      manage: "\u8A2D\u5B9A"
    },
    prefs: {
      title: "Cookie\u306E\u8A2D\u5B9A",
      body: "\u3053\u306E\u30B5\u30A4\u30C8\u306B\u8A31\u53EF\u3059\u308B\u7BC4\u56F2\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002\u5FC5\u8981\u306ACookie\u306F\u30B5\u30A4\u30C8\u306E\u52D5\u4F5C\u306B\u4E0D\u53EF\u6B20\u3067\u3001\u7121\u52B9\u306B\u3067\u304D\u307E\u305B\u3093\u3002",
      save: "\u8A2D\u5B9A\u3092\u4FDD\u5B58"
    },
    policy: "\u500B\u4EBA\u30C7\u30FC\u30BF\u306E\u53D6\u308A\u6271\u3044\u306B\u3064\u3044\u3066",
    legal: { imprint: "\u904B\u55B6\u8005\u60C5\u5831", privacy: "\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u30DD\u30EA\u30B7\u30FC", terms: "\u5229\u7528\u898F\u7D04", cookies: "Cookie\u30DD\u30EA\u30B7\u30FC" },
    revisit: "Cookie\u8A2D\u5B9A",
    placeholder: "\u3053\u306E\u30B3\u30F3\u30C6\u30F3\u30C4\u306F\u4ED6\u793E\u304B\u3089\u8AAD\u307F\u8FBC\u307E\u308C\u307E\u3059\u3002\u8A31\u53EF\u3059\u308B\u3068\u8868\u793A\u3055\u308C\u307E\u3059\u3002",
    doNotSell: "\u500B\u4EBA\u60C5\u5831\u306E\u8CA9\u58F2\u30FB\u5171\u6709\u3092\u884C\u308F\u306A\u3044",
    cat: {
      necessary: { label: "\u5FC5\u9808", hint: "\u30B5\u30A4\u30C8\u306E\u52D5\u4F5C\u306B\u5FC5\u8981\u3067\u3059 \u2014 \u30BB\u30C3\u30B7\u30E7\u30F3\u3001\u30AB\u30FC\u30C8\u3001\u3053\u306E\u9078\u629E\u305D\u306E\u3082\u306E\u3002\u7121\u52B9\u306B\u306F\u3067\u304D\u307E\u305B\u3093\u3002" },
      preferences: { label: "\u8A2D\u5B9A", hint: "\u8A00\u8A9E\u3084\u5730\u57DF\u3001\u9078\u3093\u3060\u30EC\u30A4\u30A2\u30A6\u30C8\u306A\u3069\u3001\u597D\u307F\u306E\u72B6\u614B\u3092\u8A18\u61B6\u3057\u307E\u3059\u3002" },
      statistics: { label: "\u7D71\u8A08", hint: "\u3069\u306E\u30DA\u30FC\u30B8\u304C\u8AAD\u307E\u308C\u3001\u3069\u3053\u3067\u96E2\u8131\u3057\u305F\u304B\u306A\u3069\u3001\u5229\u7528\u72B6\u6CC1\u3092\u96C6\u8A08\u3057\u307E\u3059\u3002" },
      marketing: { label: "\u5E83\u544A", hint: "\u5E83\u544A\u306E\u52B9\u679C\u6E2C\u5B9A\u3068\u30BF\u30FC\u30B2\u30C6\u30A3\u30F3\u30B0\u306E\u305F\u3081\u306B\u3001\u30B5\u30A4\u30C8\u3092\u307E\u305F\u3044\u3067\u884C\u52D5\u3092\u8FFD\u8DE1\u3057\u307E\u3059\u3002" },
      sale: { label: "\u8CA9\u58F2\u30FB\u5171\u6709", hint: "\u5E83\u544A\u76EE\u7684\u3067\u500B\u4EBA\u60C5\u5831\u3092\u4ED6\u793E\u306B\u63D0\u4F9B\u3059\u308B\u3053\u3068\u3002\u7C73\u56FD\u306E\u5DDE\u6CD5\u3067\u306F\u3001\u3053\u308C\u3092\u62D2\u5426\u3067\u304D\u307E\u3059\u3002" }
    }
  }
};
var CONSENT_LOCALES = Object.keys(CONSENT_TEXT).map((id) => ({ id, name: CONSENT_TEXT[id].name }));
function regimeCategories(regime) {
  const base = [
    { id: "necessary", required: true },
    { id: "preferences" },
    { id: "statistics" },
    { id: "marketing" }
  ];
  return regime === "gdpr" ? base : [...base, { id: "sale" }];
}

// ../src/builder-core/consent.ts
var CONSENT_ROLE = "data-consent-role";
var CONSENT_ACTION = "data-consent-action";
var CONSENT_PLACEHOLDER = "data-consent-placeholder";
var categoriesFor = (regime) => regimeCategories(regime).map((c2) => ({ ...c2 }));
var DEFAULT_CATEGORIES = categoriesFor("gdpr");
var A_BUTTON = { type: "button" };
var answer = (id, label, action, variant, hint) => ({
  id,
  tag: "button",
  label,
  icon: "button",
  group: "consent",
  hint,
  styleId: "button",
  text: label,
  classes: ["btn", variant],
  attrs: { ...A_BUTTON, [CONSENT_ACTION]: action }
});
var CONSENT_ELEMENTS = [
  {
    id: "consent-banner",
    tag: "div",
    label: "Consent banner",
    icon: "popup-panel",
    group: "consent",
    hint: "the first-visit notice",
    container: true,
    attrs: { [OVERLAY_ATTR]: "bar", popover: "manual", role: "dialog", "aria-live": "polite", [CONSENT_ROLE]: "banner" },
    compose: [
      { el: "heading", tag: "h2", text: "Cookies on this site" },
      { el: "text", text: "We use cookies to run this site and, with your permission, to understand how it is used. You can change your mind at any time." },
      {
        el: "consent-actions",
        children: [
          { el: "consent-reject" },
          { el: "consent-manage" },
          { el: "consent-accept" }
        ]
      }
    ]
  },
  {
    id: "consent-prefs",
    tag: "div",
    label: "Consent preferences",
    icon: "popup-panel",
    group: "consent",
    hint: "one switch per purpose",
    container: true,
    attrs: { [OVERLAY_ATTR]: "center", popover: "manual", role: "dialog", [CONSENT_ROLE]: "preferences" },
    compose: [
      { el: "heading", tag: "h2", text: "Your cookie choices" },
      { el: "text", text: "Decide what this site may do. Necessary cookies keep it working and cannot be switched off." },
      { el: "consent-list" },
      {
        el: "consent-actions",
        children: [
          { el: "consent-reject" },
          { el: "consent-save" },
          { el: "consent-accept" }
        ]
      },
      { el: "popup-close" }
    ]
  },
  {
    id: "consent-actions",
    tag: "div",
    label: "Consent buttons",
    icon: "flex",
    group: "consent",
    hint: "the row the answers sit in",
    container: true,
    attrStyled: true,
    menu: false
  },
  answer("consent-accept", "Accept all", "accept", "btn--primary", "grants every category"),
  /* The same variant Accept wears, and that is the point rather than an
     oversight: refusing has to be as easy as accepting, and a Reject drawn as
     the quiet one is the oldest way of obeying that rule while breaking it.
     Restyle them if you like — what you cannot end up with by accident is a
     banner whose only obvious answer is yes. */
  answer("consent-reject", "Reject all", "reject", "btn--primary", "grants nothing beyond the necessary"),
  answer("consent-save", "Save choices", "save", "btn--primary", "grants whatever the switches say"),
  answer("consent-manage", "Settings", "manage", "btn--none", "opens the preferences panel"),
  {
    id: "consent-link",
    tag: "button",
    label: "Cookie settings link",
    icon: "link",
    group: "consent",
    hint: "reopens the preferences \u2014 put one in the footer",
    text: "Cookie settings",
    attrStyled: true,
    attrs: { ...A_BUTTON, [CONSENT_ACTION]: "manage" }
  },
  {
    id: "consent-legal",
    tag: "div",
    label: "Legal links",
    icon: "flex",
    group: "consent",
    hint: "privacy, imprint \u2014 whichever are named",
    container: true,
    attrStyled: true,
    menu: false
  },
  {
    id: "consent-list",
    tag: "div",
    label: "Purpose list",
    icon: "list",
    group: "consent",
    hint: "one row per category \u2014 filled from the settings",
    attrStyled: true,
    menu: false
  },
  {
    id: "consent-category",
    tag: "label",
    label: "Purpose",
    icon: "form-check",
    group: "consent",
    hint: "one purpose and its switch",
    container: true,
    attrStyled: true,
    menu: false
  },
  {
    id: "consent-name",
    tag: "span",
    label: "Purpose name",
    icon: "text",
    group: "consent",
    hint: "the category label",
    attrStyled: true,
    menu: false
  },
  {
    id: "consent-hint",
    tag: "span",
    label: "Purpose explanation",
    icon: "text",
    group: "consent",
    hint: "what the visitor is deciding",
    attrStyled: true,
    menu: false
  },
  {
    id: "consent-toggle",
    tag: "input",
    label: "Purpose switch",
    icon: "form-check-input",
    group: "consent",
    hint: "the checkbox for one category",
    attrStyled: true,
    menu: false,
    attrs: { type: "checkbox" }
  },
  {
    id: "consent-placeholder",
    tag: "div",
    label: "Blocked embed notice",
    icon: "div",
    group: "consent",
    hint: "stands in for an embed until its category is granted",
    container: true,
    attrStyled: true,
    attrs: { [CONSENT_PLACEHOLDER]: "marketing" },
    compose: [
      { el: "text", text: "This content is loaded from another company and is only shown once you allow it." },
      { el: "consent-link", text: "Change your cookie settings" }
    ]
  }
];
var CONSENT_PART_CSS = {
  "consent-name": "display: block;",
  "consent-hint": "display: block;",
  "consent-actions": `display: flex;
flex-wrap: wrap;
align-items: center;
gap: var(--space-xs, 0.5rem);
margin-block-start: var(--space-s, 1rem);

/* Refusing has to be as easy as accepting, so the row does not push one of
   them to an end of its own \u2014 they sit together, in the same shape, and only
   the variant class tells them apart. */
> * { flex: 0 0 auto; }`,
  "consent-link": `padding: 0;
color: inherit;
background: none;
border: 0;
font: inherit;
text-decoration: underline;
text-underline-offset: 0.2em;
cursor: pointer;

&:hover { text-decoration-thickness: 2px; }`,
  "consent-legal": `display: flex;
flex-wrap: wrap;
align-items: center;
gap: var(--space-xxs, 0.35rem) var(--space-xs, 0.75rem);
margin-block-start: var(--space-xs, 0.5rem);
font-size: var(--text-s, 0.9rem);

/* A separator that is drawn rather than typed: a middot in the markup is a
   character screen readers announce and translators move. */
> * + *::before {
  content: "";
  display: inline-block;
  inline-size: 1px;
  block-size: 0.9em;
  margin-inline-end: var(--space-xs, 0.75rem);
  vertical-align: -0.1em;
  background: currentColor;
  opacity: 0.3;
}`,
  "consent-list": `display: flex;
flex-direction: column;
gap: var(--space-xs, 0.5rem);
margin-block: var(--space-s, 1rem);`,
  "consent-category": `display: grid;
grid-template-columns: 1fr auto;
align-items: start;
gap: var(--space-xxs, 0.35rem) var(--space-s, 1rem);
padding: var(--space-xs, 0.75rem);
border: var(--border, 1px solid rgba(0, 0, 0, 0.12));
border-radius: var(--radius-m, 8px);
cursor: pointer;

&:has(input:disabled) { cursor: default; opacity: 0.85; }

> [builder-data-element="consent-name"] { font-weight: 600; }

> [builder-data-element="consent-hint"] {
  grid-column: 1;
  font-size: var(--text-s, 0.9rem);
  opacity: 0.75;
}

> [builder-data-element="consent-toggle"] { grid-column: 2; grid-row: 1 / span 2; }`,
  "consent-toggle": `inline-size: 1.15rem;
block-size: 1.15rem;
accent-color: var(--primary, #2563eb);
cursor: inherit;`,
  "consent-placeholder": `display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
gap: var(--space-xs, 0.5rem);
padding: var(--space-m, 1.5rem);
text-align: center;
background: var(--base-200, rgba(0, 0, 0, 0.05));
border: var(--border, 1px dashed rgba(0, 0, 0, 0.2));
border-radius: var(--radius-m, 8px);`
};
function consentRequired(_cfg) {
  return flatRules([
    /* The runtime writes the granted categories on the root element, so this
       needs no class of its own and no script per placeholder. */
    ['[data-consent-granted~="marketing"] [data-consent-placeholder="marketing"]', "display: none;"]
  ]);
}
function consentLook(_cfg) {
  return flatRules(Object.entries(CONSENT_PART_CSS).map(([id, css]) => [`[builder-data-element="${id}"]`, css]));
}
var CONSENT_PLACEHOLDER_STARTER = `display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
gap: var(--space-xs, 0.5rem);
padding: var(--space-m, 1.5rem);
text-align: center;
background: var(--base-200, rgba(0, 0, 0, 0.05));
border: var(--border, 1px dashed rgba(0, 0, 0, 0.2));
border-radius: var(--radius-m, 8px);

/* Hidden the moment its category is granted \u2014 the runtime writes the flag on
   the root element, so this needs no class of its own and no script per
   placeholder. */
[data-consent-granted~="marketing"] &[data-consent-placeholder="marketing"] { display: none; }`;
var CONSENT_CATEGORY_STARTER = CONSENT_PART_CSS["consent-category"].replace("{ grid-column: 2; grid-row:", "{ grid-row:");
var CONSENT_STARTERS = [
  ...Object.entries(CONSENT_PART_CSS).flatMap(([id, css]) => {
    const body = id === "consent-placeholder" ? CONSENT_PLACEHOLDER_STARTER : id === "consent-category" ? CONSENT_CATEGORY_STARTER : css;
    return [[`[builder-data-element="${id}"]`, body], [`#* [builder-data-element="${id}"]`, body]];
  })
];

// ../src/builder-core/route-keys.ts
var ESC = { "/": "s", "[": "o", "]": "c", ".": "d", "_": "u" };
var UNESC = Object.fromEntries(Object.entries(ESC).map(([k, v2]) => [v2, k]));

// ../src/builder-core/search.ts
var EL2 = "builder-data-element";
var SEARCH = "search";
var FILTER = "filter";
var FACET = "filter-facet";
var SEARCH_PART = "data-search-part";
var FILTER_PART = "data-filter-part";
var SEARCH_DISPLAY = "data-search-display";
var SEARCH_STYLE = "data-search-style";
var FILTER_URL = "data-filter-url";
var FACET_KEY = "data-facet";
var FACET_TYPE = "data-facet-type";
var COUNT_ONE = "data-count-one";
var COUNT_NONE = "data-count-none";
var sortValue = (key, dir) => key ? `${key}:${dir}` : "";
function sortDirWords(type) {
  if (type === "number") return { asc: "low to high", desc: "high to low" };
  if (isDateType(type)) return { asc: "oldest first", desc: "newest first" };
  return { asc: "A to Z", desc: "Z to A" };
}
var sortLabel = (field2, type, dir) => `${field2}, ${sortDirWords(type)[dir]}`;
var SORT_DEFAULT_LABEL = "Default order";
var part = (attr) => (id, tag, label, hint, name, extra = {}) => ({
  ...extra,
  id,
  tag,
  label,
  hint,
  icon: extra.icon ?? id,
  group: "search",
  /* Last, so it cannot be spread away: the part name is the script's. */
  attrs: { ...extra.attrs ?? {}, [attr]: name }
});
var searchPart = part(SEARCH_PART);
var filterPart = part(FILTER_PART);
var SEARCH_PARTS = [
  searchPart("search-input", "input", "Search field", "where the words are typed", "input", {
    styleId: "form-input",
    menu: false,
    attrs: { type: "search" }
  }),
  searchPart("search-submit", "button", "Search button", "goes to the results", "submit", {
    styleId: "button",
    classes: ["btn--primary"],
    text: "Search",
    menu: false,
    attrs: { type: "button" }
  }),
  /* Hidden until somebody types; the script opens it. A results page asks for
     the list instead (`data-search-display="page"`), and the script shows it
     there from the start. */
  searchPart("search-results", "div", "Results", "where the results are listed", "results", {
    attrStyled: true,
    container: true,
    attrs: { hidden: "" }
  }),
  /* One result, as you design it — the Loop's first row, for a list nobody can
     know until somebody types. The script copies it for every hit and fills
     `{result.title}`, `{result.url}` and the rest in its text and attributes
     (`RESULT_FIELDS`). A list without one gets the same markup made by the
     script, so a search placed before this existed looks exactly as it did. */
  searchPart("search-hit", "a", "Result", "one result, as the list repeats it", "hit", {
    container: true,
    attrStyled: true,
    menu: false,
    attrs: { href: "{result.url}" },
    compose: [{ el: "search-hit-title" }, { el: "search-hit-type" }, { el: "search-hit-excerpt" }]
  }),
  searchPart("search-hit-title", "span", "Result title", "the title, the words found marked", "hit-title", {
    attrStyled: true,
    menu: false,
    text: "{result.title}"
  }),
  searchPart("search-hit-type", "span", "Result kind", "\u201CPage\u201D, or the collection\u2019s name", "hit-type", {
    attrStyled: true,
    menu: false,
    text: "{result.type}"
  }),
  searchPart("search-hit-excerpt", "span", "Result excerpt", "the text around the words found", "hit-excerpt", {
    attrStyled: true,
    menu: false,
    text: "{result.excerpt}"
  })
];
var SEARCH_ROOT = searchPart(SEARCH, "search", "Search", "the whole site, or the list around it", "search", {
  container: true,
  attrStyled: true,
  attrs: { [SEARCH_STYLE]: "icon" },
  compose: [
    { el: "search-input", attrs: { name: "q", placeholder: "Search\u2026", "aria-label": "Search", autocomplete: "off" } },
    { el: "search-results", children: [{ el: "search-hit" }] }
  ]
});
var SEARCH_PAGE = searchPart("search-page", "search", "Results page", "a search and its full list", "search", {
  container: true,
  attrStyled: true,
  styleId: SEARCH,
  attrs: { [SEARCH_STYLE]: "icon" },
  icon: "search",
  compose: [
    { el: "search-input", attrs: { name: "q", placeholder: "Search\u2026", "aria-label": "Search", autocomplete: "off" } },
    { el: "search-results", attrs: { [SEARCH_DISPLAY]: "page" }, children: [{ el: "search-hit" }] }
  ]
});
var FILTER_PARTS = [
  filterPart(FACET, "fieldset", "Facet", "options made from one field", "facet", {
    container: true,
    attrStyled: true,
    attrs: { [FACET_KEY]: "", [FACET_TYPE]: "checkbox" },
    compose: [
      { el: "text", tag: "legend", text: "Category" },
      { el: "filter-options" }
    ]
  }),
  /* Empty in the tree: the options are as many as there is data, so they are
     written from the Loop's rows as the page is built (`facetOptionsCode`).
     Controls you put here yourself are wired instead. */
  filterPart("filter-options", "div", "Options", "made from the data as the site is built", "options", {
    container: true,
    attrStyled: true,
    menu: false
  }),
  filterPart("filter-count", "p", "Result count", "how many are showing", "count", {
    attrStyled: true,
    text: "# results",
    attrs: { "aria-live": "polite", [COUNT_ONE]: "1 result", [COUNT_NONE]: "No results" },
    words: [COUNT_ONE, COUNT_NONE]
  }),
  filterPart("filter-reset", "button", "Clear filters", "back to everything", "reset", {
    styleId: "button",
    classes: ["btn--outline", "btn--s"],
    text: "Clear filters",
    attrs: { type: "button" }
  }),
  filterPart("filter-empty", "p", "No results", "shown when nothing matches", "empty", {
    attrStyled: true,
    text: "Nothing matches these filters.",
    attrs: { hidden: "" }
  }),
  /* A label around its words and the select, which is what makes the words
     the select's name without an id to keep in step. The orders are the
     select's own options — real `<option>`s in the tree, each `key:dir` —
     so which orders there are and what each is called is written once,
     and shows on the canvas as it ships. */
  filterPart("filter-sort", "label", "Sort", "the orders a visitor can pick", "sort", {
    container: true,
    attrStyled: true,
    compose: [
      { el: "span", text: "Sort by" },
      { el: "filter-sort-select" }
    ]
  }),
  /* The site's own select, as the facet's dropdown is: a second design for one
     control is what the form buckets exist to prevent. */
  filterPart("filter-sort-select", "select", "Sort select", "its options are the orders", "sort-select", {
    styleId: "form-select",
    icon: "form-select",
    container: true,
    menu: false,
    compose: [
      { el: "form-option", text: SORT_DEFAULT_LABEL, attrs: { value: "" } },
      { el: "form-option", text: sortLabel("Title", "text", "asc"), attrs: { value: sortValue("title", "asc") } }
    ]
  })
];
var FILTER_ROOT = filterPart(FILTER, "div", "Filter", "a list with search and facets", "filter", {
  container: true,
  attrStyled: true,
  attrs: { [FILTER_URL]: "" },
  compose: [
    {
      el: "flex",
      children: [
        { el: SEARCH, children: [{ el: "search-input", attrs: { name: "q", placeholder: "Search\u2026", "aria-label": "Search this list", autocomplete: "off" } }] },
        { el: FACET, attrs: { [FACET_TYPE]: "buttons" }, children: [{ el: "text", tag: "legend", text: "Category" }, { el: "filter-options" }] },
        { el: "filter-reset" }
      ]
    },
    { el: "filter-count" },
    {
      el: "div",
      children: [{
        el: "loop",
        children: [{
          el: "div",
          children: [
            { el: "heading", tag: "h3", text: "{item.title}" },
            { el: "text", text: "{item.excerpt}" }
          ]
        }]
      }]
    },
    { el: "filter-empty" }
  ]
});
var SEARCH_ELEMENTS = [SEARCH_ROOT, SEARCH_PAGE, FILTER_ROOT, ...FILTER_PARTS, ...SEARCH_PARTS];
var P2 = (id) => `[${EL2}="${id}"]`;
var SP = (name) => `[${SEARCH_PART}="${name}"]`;
var FP = (name) => `[${FILTER_PART}="${name}"]`;
var MUTED = "color-mix(in srgb, currentColor 62%, transparent)";
var MAG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-4-4'/%3E%3C/svg%3E")`;
var TINT = "color-mix(in srgb, var(--primary, #2563eb) 10%, transparent)";
function searchRequired(_cfg) {
  return flatRules([
    ["[data-filter-item][hidden]", "display: none !important;"],
    [`${FP("empty")}[hidden]`, "display: none !important;"],
    [`${FP("option")}[hidden]`, "display: none !important;"],
    [`${SP("results")}[hidden]`, "display: none !important;"],
    /* A dropdown hangs from its search, and the field, the drawn icon and the
       button share one grid row — the icon laid over the field in the same
       cell, which keeps it centered on the field even on a results page,
       where the list is the row under it. */
    [P2(SEARCH), "position: relative;\ndisplay: grid;\ngrid-template-columns: minmax(0, 1fr);\nalign-items: stretch;"],
    [`${P2(SEARCH)} > ${SP("input")}`, "grid-row: 1;\ngrid-column: 1;\nmin-inline-size: 0;"],
    [`${P2(SEARCH)} > ${SP("submit")}`, "grid-row: 1;\ngrid-column: 2;"],
    [`${P2(SEARCH)} > ${SP("results")}[${SEARCH_DISPLAY}="page"]`, "grid-column: 1 / -1;"],
    [`[${SEARCH_STYLE}]::before`, `content: "";
grid-row: 1;
grid-column: 1;
align-self: center;
justify-self: start;
z-index: 1;
inline-size: var(--search-icon-size, 1.1em);
block-size: var(--search-icon-size, 1.1em);
margin-inline-start: var(--search-icon-inset, 0.8em);
background-color: currentColor;
opacity: 0.6;
pointer-events: none;
-webkit-mask: ${MAG} center / contain no-repeat;
mask: ${MAG} center / contain no-repeat;`],
    [`[${SEARCH_STYLE}] > ${SP("input")}`, "padding-inline-start: calc(var(--search-icon-size, 1.1em) + 2 * var(--search-icon-inset, 0.8em));"],
    /* Only the magnifier until it is clicked or focused, and folded back once
       it is left empty: an input as wide as its icon, with nothing drawn but
       the icon. Closed is the state at rest, so a canvas holding the field
       selected shows it open — `data-selected` is the canvas's and never on
       a page. */
    [`[${SEARCH_STYLE}="expand"]`, "inline-size: fit-content;"],
    [`[${SEARCH_STYLE}="expand"] > ${SP("input")}`, `inline-size: var(--search-expanded, 16rem);
transition: inline-size var(--motion-duration, 220ms) var(--motion-ease, ease), background-color var(--motion-duration, 220ms), border-color var(--motion-duration, 220ms);

@media (prefers-reduced-motion: reduce) {
  transition: none;
}`],
    [`[${SEARCH_STYLE}="expand"]:not([data-selected]):not(:has([data-selected])) > ${SP("input")}:not(:focus):placeholder-shown`, `inline-size: var(--search-collapsed, 2.75em);
padding-inline-end: 0;
cursor: pointer;
color: transparent;
background-color: transparent;
border-color: transparent;
box-shadow: none;`],
    [`[${SEARCH_STYLE}="expand"]:not([data-selected]):not(:has([data-selected])) > ${SP("input")}:not(:focus):placeholder-shown::placeholder`, "color: transparent;"],
    /* A range's two thumbs are two range inputs laid over one track, each
       taking the pointer only on its thumb — which is what lets either be
       dragged where the other is. With the native look gone (`appearance:
       none` is the only way to lay two over one), what is left has to be
       drawn here, so the drawing is required, not the look. */
    [FP("range-slider"), RANGE_SLIDER_CSS]
  ]);
}
var THUMB = "var(--filter-range-thumb, 1.25rem)";
var THUMB_CSS = `-webkit-appearance: none;
appearance: none;
box-sizing: border-box;
inline-size: ${THUMB};
block-size: ${THUMB};
border-radius: 50%;
background: var(--primary, #2563eb);
border: 2px solid var(--surface, #fff);
box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
pointer-events: auto;
cursor: grab;`;
var RANGE_SLIDER_CSS = `position: relative;
block-size: ${THUMB};
min-inline-size: 10rem;

/* the track, and the stretch between the two thumbs */
&::before, &::after {
  content: '';
  position: absolute;
  inset-block-start: 50%;
  block-size: 4px;
  translate: 0 -50%;
  border-radius: 999px;
}
&::before {
  inset-inline: calc(${THUMB} / 2);
  background: color-mix(in srgb, currentColor 18%, transparent);
}
&::after {
  inset-inline-start: calc(${THUMB} / 2 + (100% - ${THUMB}) * var(--filter-range-from, 0));
  inset-inline-end: calc(${THUMB} / 2 + (100% - ${THUMB}) * (1 - var(--filter-range-to, 1)));
  background: var(--primary, #2563eb);
}

& > input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  position: absolute;
  inset: 0;
  z-index: 1;
  inline-size: 100%;
  block-size: 100%;
  margin: 0;
  padding: 0;
  background: none;
  border: 0;
  pointer-events: none;

  &::-webkit-slider-runnable-track { block-size: 100%; background: none; border: 0; }
  &::-moz-range-track { block-size: 100%; background: none; border: 0; }
  &::-webkit-slider-thumb { ${THUMB_CSS} }
  &::-moz-range-thumb { ${THUMB_CSS} }
  &:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #2563eb) 40%, transparent); }
  &:focus-visible::-moz-range-thumb { box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #2563eb) 40%, transparent); }
  &:active::-webkit-slider-thumb { cursor: grabbing; }
  &:active::-moz-range-thumb { cursor: grabbing; }
}`;
var SEARCH_CSS = `column-gap: var(--space-xs, 0.5rem);
inline-size: 100%;

/* A results page's list is the page, on a row of its own under the field \u2014
   a dropdown is out of the flow and takes no room here at all. */
${SP("results")}[${SEARCH_DISPLAY}="page"] {
  margin-block-start: var(--space-s, 1rem);
}`;
var RESULTS_CSS = `position: absolute;
inset-inline: 0;
inset-block-start: calc(100% + var(--space-xxs, 0.25rem));
z-index: 50;
display: flex;
flex-direction: column;
gap: 2px;
max-block-size: min(70vh, 32rem);
overflow: auto;
padding: var(--space-xxs, 0.25rem);
background: var(--surface, #fff);
color: var(--text-color, inherit);
border: var(--border, 1px solid rgb(0 0 0 / 0.12));
border-radius: var(--radius-m, 8px);
box-shadow: var(--shadow-l, 0 12px 32px rgb(0 0 0 / 0.14));

&[${SEARCH_DISPLAY}="page"] {
  position: static;
  max-block-size: none;
  overflow: visible;
  gap: var(--space-xs, 0.75rem);
  padding: 0;
  background: none;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

${SP("hit")} {
  display: flex;
  flex-direction: column;
  gap: 0.15em;
  padding: var(--space-xs, 0.5rem) var(--space-xs, 0.75rem);
  color: inherit;
  text-decoration: none;
  border-radius: var(--radius-s, 4px);

  &:hover, &[aria-selected="true"] { background: ${TINT}; }
  &:focus-visible { outline: var(--focus-width, 2px) var(--focus-style, solid) var(--focus-color, var(--primary, currentColor)); outline-offset: -2px; }
}

&[${SEARCH_DISPLAY}="page"] ${SP("hit")} {
  padding: var(--space-xs, 0.75rem) 0;
  border-radius: 0;
  border-block-end: var(--border, 1px solid rgb(0 0 0 / 0.12));

  &:hover { background: none; }
}

${SP("hit-title")} { font-weight: 600; }

&[${SEARCH_DISPLAY}="page"] ${SP("hit-title")} {
  font-size: var(--text-l, 1.125rem);
  color: var(--link-color, var(--primary, inherit));
}

${SP("hit-type")} {
  font-size: var(--text-xs, 0.75rem);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${MUTED};
}

${SP("hit-excerpt")} {
  font-size: var(--text-s, 0.875rem);
  color: ${MUTED};
}

mark {
  background: color-mix(in srgb, var(--primary, #2563eb) 22%, transparent);
  color: inherit;
  border-radius: 2px;
}

${SP("none")}, ${SP("summary")} {
  margin: 0;
  padding: var(--space-xs, 0.5rem) var(--space-xs, 0.75rem);
  font-size: var(--text-s, 0.875rem);
  color: ${MUTED};
}

&[${SEARCH_DISPLAY}="page"] ${SP("none")}, &[${SEARCH_DISPLAY}="page"] ${SP("summary")} { padding-inline: 0; }

${SP("all")} {
  display: block;
  padding: var(--space-xs, 0.5rem) var(--space-xs, 0.75rem);
  font-size: var(--text-s, 0.875rem);
  font-weight: 600;
  color: var(--link-color, var(--primary, inherit));
  text-decoration: none;
  border-block-start: var(--border, 1px solid rgb(0 0 0 / 0.12));

  &:hover { text-decoration: underline; }
}`;
var FILTER_CSS = `display: flex;
flex-direction: column;
gap: var(--content-spacing, var(--space-m, 1.5rem));`;
var FACET_CSS = `display: flex;
flex-direction: column;
gap: var(--space-xs, 0.5rem);
min-inline-size: 0;
margin: 0;
padding: 0;
border: 0;

& > legend {
  padding: 0;
  margin-block-end: var(--space-xxs, 0.25rem);
  font-weight: 600;
}`;
var OPTIONS_CSS = `display: flex;
flex-wrap: wrap;
align-items: center;
gap: var(--space-xs, 0.5rem);`;
var OPTION_CSS = `display: inline-flex;
align-items: center;
gap: 0.5em;
cursor: pointer;

&[data-filter-disabled] { opacity: 0.45; cursor: default; }

${FP("option-count")} {
  font-size: 0.85em;
  color: ${MUTED};
}`;
var PILL_CSS = `padding: 0.4em 0.9em;
font: inherit;
color: inherit;
background: transparent;
border: var(--border, 1px solid rgb(0 0 0 / 0.15));
border-radius: 999px;
transition: background-color var(--transition, 160ms ease), border-color var(--transition, 160ms ease);

&:hover:not(:disabled) { border-color: var(--primary, currentColor); }
&[aria-pressed="true"] {
  background: ${TINT};
  border-color: var(--primary, currentColor);
  color: var(--primary, inherit);
}
&:focus-visible { outline: var(--focus-width, 2px) var(--focus-style, solid) var(--focus-color, var(--primary, currentColor)); outline-offset: 2px; }`;
var SORT_CSS = `display: inline-flex;
flex-direction: column;
gap: var(--space-xxs, 0.25rem);

& > span { font-weight: 600; }`;
var RANGE_CSS = `display: flex;
flex-wrap: wrap;
align-items: flex-end;
gap: var(--space-xs, 0.5rem);

${FP("range-slider")} {
  flex: 1 0 100%;
  margin-block: var(--space-xxs, 0.25rem);
}

${FP("range-field")} {
  display: flex;
  flex-direction: column;
  gap: 0.2em;
}

${FP("range-label")} {
  font-size: var(--text-xs, 0.75rem);
  color: ${MUTED};
}

${FP("range-field")} > input {
  inline-size: 8em;
}

${FP("range-field")} > input[type="date"] {
  inline-size: auto;
}

${FP("range-sep")} {
  padding-block-end: 0.55em;
  color: ${MUTED};
}`;
function searchLook(_cfg) {
  return flatRules([
    [P2(SEARCH), SEARCH_CSS],
    [P2("search-results"), RESULTS_CSS],
    [P2(FILTER), FILTER_CSS],
    /* the bar the composed Filter's controls sit in */
    [`${P2(FILTER)} > ${P2("flex")}`, "flex-wrap: wrap; align-items: flex-end; gap: var(--space-s, 1rem);"],
    [`${P2(FILTER)} > ${P2("flex")} > ${P2(SEARCH)}`, "inline-size: auto; flex: 1 1 16rem;"],
    /* The list the Filter arrives with: a Div of cards, laid out as a grid
       that fits as many as the width takes. Only a Div directly in a Filter,
       so a list somebody built differently is never reached. */
    [`${P2(FILTER)} > ${P2("div")}`, `display: grid;
grid-template-columns: repeat(auto-fill, minmax(min(16rem, 100%), 1fr));
gap: var(--content-spacing, var(--space-m, 1.5rem));`],
    [`${P2(FILTER)} > ${P2("div")} > [data-filter-item], ${P2(FILTER)} > ${P2("div")} > ${P2("div")}`, `display: flex;
flex-direction: column;
gap: var(--space-xs, 0.5rem);
padding: var(--space-s, 1rem);
border: var(--border, 1px solid rgb(0 0 0 / 0.12));
border-radius: var(--radius-m, 8px);`],
    [P2(FACET), FACET_CSS],
    [P2("filter-options"), OPTIONS_CSS],
    [`${P2(FACET)}[${FACET_TYPE}="checkbox"] ${P2("filter-options")}, ${P2(FACET)}[${FACET_TYPE}="radio"] ${P2("filter-options")}`, "flex-direction: column; align-items: flex-start;"],
    [P2("filter-option"), OPTION_CSS],
    [`${P2(FACET)}[${FACET_TYPE}="buttons"] ${P2("filter-option")}`, PILL_CSS],
    [P2("filter-sort"), SORT_CSS],
    [P2("filter-range"), RANGE_CSS],
    [P2("filter-count"), `margin: 0;
font-size: var(--text-s, 0.875rem);
color: ${MUTED};`],
    [P2("filter-empty"), `margin: 0;
padding: var(--space-l, 2rem) var(--space-s, 1rem);
text-align: center;
color: ${MUTED};
border: 1px dashed color-mix(in srgb, currentColor 25%, transparent);
border-radius: var(--radius-m, 8px);`]
  ]);
}

// ../src/builder-core/flags.ts
var W = 30;
var H = 20;
var rect = (x, y, w, h2, fill) => `<rect x='${x}' y='${y}' width='${w}' height='${h2}' fill='${fill}'/>`;
var h = (...c2) => c2.map((f2, i) => rect(0, H / c2.length * i, W, H / c2.length, f2)).join("");
var v = (...c2) => c2.map((f2, i) => rect(W / c2.length * i, 0, W / c2.length, H, f2)).join("");
var hw = (bands) => {
  const sum = bands.reduce((s, [, n]) => s + n, 0);
  let y = 0;
  return bands.map(([f2, n]) => {
    const r2 = rect(0, y, W, H * n / sum, f2);
    y += H * n / sum;
    return r2;
  }).join("");
};
var nordic = (bg, cross, inner) => rect(0, 0, W, H, bg) + rect(8, 0, 5, H, cross) + rect(0, 7.5, W, 5, cross) + (inner ? rect(9.25, 0, 2.5, H, inner) + rect(0, 8.75, W, 2.5, inner) : "");
var circle = (cx, cy, r2, fill, extra = "") => `<circle cx='${cx}' cy='${cy}' r='${r2}' fill='${fill}'${extra}/>`;
var star = (cx, cy, r2, fill, turn = 0) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 5 * i - Math.PI / 2 + turn;
    const rr = i % 2 ? r2 * 0.4 : r2;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points='${pts.join(" ")}' fill='${fill}'/>`;
};
var line = (x1, y1, x2, y2, stroke, w) => `<path d='M${x1} ${y1}L${x2} ${y2}' stroke='${stroke}' stroke-width='${w}'/>`;
var union = (w, hh) => rect(0, 0, w, hh, "#012169") + line(0, 0, w, hh, "#fff", hh * 0.2) + line(w, 0, 0, hh, "#fff", hh * 0.2) + line(0, 0, w, hh, "#C8102E", hh * 0.07) + line(w, 0, 0, hh, "#C8102E", hh * 0.07) + rect(w / 2 - hh * 0.17, 0, hh * 0.34, hh, "#fff") + rect(0, hh * 0.33, w, hh * 0.34, "#fff") + rect(w / 2 - hh * 0.1, 0, hh * 0.2, hh, "#C8102E") + rect(0, hh * 0.4, w, hh * 0.2, "#C8102E");
var stripes = (n, a, b) => Array.from({ length: n }, (_, i) => rect(0, H / n * i, W, H / n + 0.01, i % 2 ? b : a)).join("");
var FLAGS = {
  GB: () => union(W, H),
  US: () => {
    const s = H / 13;
    let dots = "";
    for (let r2 = 0; r2 < 4; r2++) for (let c2 = 0; c2 < 5; c2++) dots += circle(1.3 + c2 * 2.3 + r2 % 2 * 1.15, 1.3 + r2 * 2.4, 0.45, "#fff");
    return stripes(13, "#B22234", "#fff") + rect(0, 0, 12, s * 7, "#3C3B6E") + dots;
  },
  DE: () => h("#000", "#DD0000", "#FFCE00"),
  AT: () => h("#ED2939", "#fff", "#ED2939"),
  CH: () => rect(0, 0, W, H, "#DA291C") + rect(13, 4, 4, 12, "#fff") + rect(9, 8, 12, 4, "#fff"),
  FR: () => v("#002395", "#fff", "#ED2939"),
  BE: () => v("#000", "#FAE042", "#ED2939"),
  IE: () => v("#169B62", "#fff", "#FF883E"),
  IT: () => v("#009246", "#fff", "#CE2B37"),
  ES: () => hw([["#AA151B", 1], ["#F1BF00", 2], ["#AA151B", 1]]),
  MX: () => v("#006847", "#fff", "#CE1126") + circle(15, 10, 2.2, "#8C5A2B"),
  NL: () => h("#AE1C28", "#fff", "#21468B"),
  PT: () => rect(0, 0, W, H, "#FF0000") + rect(0, 0, 12, H, "#006600") + circle(12, 10, 4, "#FFE900") + circle(12, 10, 2.4, "#FF0000"),
  BR: () => rect(0, 0, W, H, "#009C3B") + `<polygon points='15,2.5 27.5,10 15,17.5 2.5,10' fill='#FFDF00'/>` + circle(15, 10, 4.6, "#002776"),
  PL: () => h("#fff", "#DC143C"),
  DK: () => nordic("#C8102E", "#fff"),
  SE: () => nordic("#006AA7", "#FECC00"),
  NO: () => nordic("#BA0C2F", "#fff", "#00205B"),
  FI: () => nordic("#fff", "#003580"),
  CZ: () => h("#fff", "#D7141A") + `<polygon points='0,0 15,10 0,20' fill='#11457E'/>`,
  SK: () => h("#fff", "#0B4EA2", "#EE1C25") + `<path d='M7 5h7v6c0 2.5-1.8 4-3.5 4.6C8.8 15 7 13.5 7 11z' fill='#EE1C25' stroke='#fff' stroke-width='.8'/>` + rect(9.9, 6.5, 1.2, 7, "#fff") + rect(8.4, 8.5, 4.2, 1.1, "#fff"),
  HU: () => h("#CE2939", "#fff", "#477050"),
  RO: () => v("#002B7F", "#FCD116", "#CE1126"),
  BG: () => h("#fff", "#00966E", "#D62612"),
  GR: () => stripes(9, "#0D5EAF", "#fff") + rect(0, 0, 11.1, 11.1, "#0D5EAF") + rect(4.45, 0, 2.2, 11.1, "#fff") + rect(0, 4.45, 11.1, 2.2, "#fff"),
  HR: () => h("#FF0000", "#fff", "#171796") + rect(12, 5, 6, 7, "#fff") + rect(12, 5, 2, 2, "#FF0000") + rect(16, 5, 2, 2, "#FF0000") + rect(14, 7, 2, 2, "#FF0000") + rect(12, 9, 2, 2, "#FF0000") + rect(16, 9, 2, 2, "#FF0000") + rect(14, 11, 2, 1, "#FF0000"),
  SI: () => h("#fff", "#005DA4", "#ED1C24") + `<path d='M6 4h6v5c0 2-1.5 3.2-3 3.8C7.5 12.2 6 11 6 9z' fill='#005DA4' stroke='#ED1C24' stroke-width='.5'/>`,
  EE: () => h("#0072CE", "#000", "#fff"),
  LV: () => hw([["#9E3039", 2], ["#fff", 1], ["#9E3039", 2]]),
  LT: () => h("#FDB913", "#006A44", "#C1272D"),
  UA: () => h("#0057B7", "#FFD700"),
  RU: () => h("#fff", "#0039A6", "#D52B1E"),
  TR: () => rect(0, 0, W, H, "#E30A17") + circle(11, 10, 5, "#fff") + circle(12.3, 10, 4, "#E30A17") + star(18, 10, 2.6, "#fff", -Math.PI / 2),
  SA: () => rect(0, 0, W, H, "#006C35") + rect(7, 6, 16, 1.4, "#fff") + rect(9, 8.6, 12, 1.4, "#fff") + rect(8, 13.4, 14, 0.9, "#fff") + rect(21, 12.7, 1.4, 2.3, "#fff"),
  IL: () => rect(0, 0, W, H, "#fff") + rect(0, 2, W, 3, "#0038B8") + rect(0, 15, W, 3, "#0038B8") + `<path d='M15 6.6l3 5.2h-6zM15 13.4l-3-5.2h6z' fill='none' stroke='#0038B8' stroke-width='.9'/>`,
  IR: () => h("#239F40", "#fff", "#DA0000") + circle(15, 10, 2, "none", ` stroke='#DA0000' stroke-width='.9'`),
  IN: () => h("#FF9933", "#fff", "#138808") + circle(15, 10, 2.4, "none", ` stroke='#000080' stroke-width='.7'`) + circle(15, 10, 0.5, "#000080"),
  JP: () => rect(0, 0, W, H, "#fff") + circle(15, 10, 6, "#BC002D"),
  KR: () => rect(0, 0, W, H, "#fff") + `<path d='M10 10a5 5 0 0 1 10 0z' fill='#CD2E3A'/><path d='M10 10a5 5 0 0 0 10 0z' fill='#0047A0'/>` + line(4, 4, 7, 6.5, "#000", 1.6) + line(23, 13.5, 26, 16, "#000", 1.6) + line(23, 6.5, 26, 4, "#000", 1.6) + line(4, 16, 7, 13.5, "#000", 1.6),
  CN: () => rect(0, 0, W, H, "#EE1C25") + star(5, 5, 3, "#FFFF00") + star(10, 2, 1, "#FFFF00") + star(12, 4, 1, "#FFFF00") + star(12, 7, 1, "#FFFF00") + star(10, 9, 1, "#FFFF00"),
  TW: () => rect(0, 0, W, H, "#FE0000") + rect(0, 0, 15, 10, "#000095") + circle(7.5, 5, 2.6, "#fff"),
  TH: () => hw([["#A51931", 1], ["#F4F5F8", 1], ["#2D2A4A", 2], ["#F4F5F8", 1], ["#A51931", 1]]),
  VN: () => rect(0, 0, W, H, "#DA251D") + star(15, 10, 6, "#FFFF00"),
  ID: () => h("#FF0000", "#fff"),
  MY: () => stripes(14, "#CC0001", "#fff") + rect(0, 0, 15, 11.43, "#010066") + circle(6, 5.7, 3.4, "#FFCC00") + circle(7.1, 5.7, 2.8, "#010066") + star(11, 5.7, 2.2, "#FFCC00"),
  CA: () => v("#FF0000", "#fff", "#fff", "#FF0000") + `<path d='M15 4l1.2 2.4 1.6-.6-.6 3.4 2-1.8.6 1.4 2-.2-1 2.2.8.6-3 2.2.4 1.2-3-.4V17h-.6v-2.4l-3 .4.4-1.2-3-2.2.8-.6-1-2.2 2 .2.6-1.4 2 1.8-.6-3.4 1.6.6z' fill='#FF0000'/>`,
  AU: () => rect(0, 0, W, H, "#00008B") + union(15, 10) + star(7.5, 15, 2.2, "#fff") + star(22.5, 4, 1, "#fff") + star(26, 8.5, 1, "#fff") + star(19.5, 9.5, 1, "#fff") + star(22.5, 16, 1.1, "#fff")
};
var FLAG_COUNTRIES = Object.keys(FLAGS);

// ../src/builder-core/lang-switch.ts
var LANG_PART = "data-lang-part";
var LANG_SWITCH = "lang-switch";
var langDef = (id, tag, label, hint, part4, extra = {}) => ({
  ...extra,
  id,
  tag,
  label,
  hint,
  icon: id,
  group: "nav",
  attrStyled: true,
  attrs: { ...extra.attrs ?? {}, [LANG_PART]: part4 }
});
var LANG_LOOK = "data-lang-look";
var LANG_SHOW = "data-lang-show";
var switchDef = (extra) => langDef(extra.id ?? LANG_SWITCH, "nav", extra.label ?? "Language switcher", extra.hint ?? "a link to this page in each language", "switch", {
  container: true,
  ...extra,
  styleId: LANG_SWITCH,
  attrs: { "aria-label": "Language", ...extra.attrs ?? {} },
  compose: [{ el: "lang-list", children: [{ el: "lang-item", children: [{ el: "lang-link" }] }] }]
});
var LANG_SWITCH_PRESETS = [
  switchDef({ id: "lang-codes", label: "Language codes", hint: "EN \xB7 DE", attrs: { [LANG_SHOW]: "code" } }),
  switchDef({ id: "lang-flags", label: "Language flags", hint: "a flag per language", attrs: { [LANG_SHOW]: "flag" } }),
  switchDef({ id: "lang-select", label: "Flag select", hint: "a dropdown with flags", attrs: { [LANG_LOOK]: "dropdown", [LANG_SHOW]: "flag-name" } })
];
var LANG_SWITCH_ELEMENTS = [
  switchDef({}),
  ...LANG_SWITCH_PRESETS,
  langDef("lang-list", "ul", "Language list", "the row of languages", "list", { container: true, menu: false }),
  langDef("lang-item", "li", "Language item", "one language", "item", { container: true, menu: false, compose: [{ el: "lang-link" }] }),
  langDef("lang-link", "a", "Language link", "a language, in its own name", "link", { text: "English", attrs: { href: "/", hreflang: "en", lang: "en" }, menu: false })
];

// ../src/builder-core/forms.ts
var FORM_PART = "data-form-part";
var FIELD_MASK = "data-form-mask";
var FIELD_SYNC = "data-form-sync";
var FIELD_CALC = "data-form-calc";
var FIELD_CALC_FORMAT = "data-form-calc-format";
var FIELD_WHEN = "data-form-when";
var STEP_NAV = "data-form-step-nav";
var REPEAT_MAX = "data-form-repeat-max";
var FIELD_FOR = "data-form-for";
var MAILERS = [
  {
    id: "smtp",
    label: "Your own SMTP server",
    hint: "no third party at all",
    env: "SMTP_URL",
    envHint: "smtps://user:pass@mail.example.com:465"
  },
  { id: "resend", label: "Resend", hint: "api.resend.com", env: "RESEND_API_KEY", envHint: "re_\u2026" },
  { id: "postmark", label: "Postmark", hint: "api.postmarkapp.com", env: "POSTMARK_TOKEN", envHint: "the server token" },
  { id: "sendgrid", label: "SendGrid", hint: "api.sendgrid.com", env: "SENDGRID_API_KEY", envHint: "SG.\u2026" },
  {
    id: "mailgun",
    label: "Mailgun",
    hint: "api.mailgun.net",
    env: "MAILGUN_API_KEY",
    envHint: "key-\u2026",
    env2: "MAILGUN_DOMAIN",
    env2Hint: "mg.example.com"
  },
  { id: "brevo", label: "Brevo", hint: "api.brevo.com", env: "BREVO_API_KEY", envHint: "xkeysib-\u2026" },
  /* Not CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID: wrangler reads those
     two out of the same .env, and a send-only token there would be the one
     `wrangler deploy` tries to deploy with. */
  {
    id: "cloudflare",
    label: "Cloudflare Email",
    hint: "api.cloudflare.com",
    env: "CLOUDFLARE_EMAIL_TOKEN",
    envHint: "API token (Email Sending: Edit)",
    env2: "CLOUDFLARE_EMAIL_ACCOUNT_ID",
    env2Hint: "the account ID from the dashboard",
    env2Label: "Account ID",
    note: "Cloudflare sends from a domain whose DNS is on Cloudflare and that is set up for Email Sending. Mail to the addresses your account has verified is free; to anyone else it needs the Workers Paid plan."
  }
];
var MAILER_BY_ID = Object.fromEntries(MAILERS.map((m) => [m.id, m]));
var emptyForms = () => ({ enabled: true, forms: [] });
var MASKS = [
  { id: "phone", label: "Phone", pattern: "+99 999 9999999", hint: "+49 151 1234567" },
  { id: "phone-us", label: "Phone (US)", pattern: "(999) 999-9999", hint: "(555) 123-4567" },
  { id: "zip", label: "Postcode", pattern: "99999", hint: "10115" },
  { id: "date", label: "Date", pattern: "99.99.9999", hint: "24.12.2026" },
  { id: "time", label: "Time", pattern: "99:99", hint: "18:30" },
  { id: "card", label: "Card number", pattern: "9999 9999 9999 9999", hint: "4242 4242 4242 4242" },
  { id: "iban", label: "IBAN", pattern: "aa99 9999 9999 9999 9999 99", hint: "DE89 3704 0044 0532 0130 00" },
  { id: "vat", label: "VAT id", pattern: "aa999999999", hint: "DE123456789" }
];
var MASK_BY_ID = Object.fromEntries(MASKS.map((m) => [m.id, m]));
var part2 = (name) => ({ [FORM_PART]: name });
var field = (label, el2, name, attrs = {}) => ({
  el: "form-field",
  children: [
    { el: "form-label", text: label },
    { el: el2, attrs: { name, ...attrs } },
    { el: "form-error" }
  ]
});
var TRAP = { el: "form-trap" };
var NOTE = { el: "form-note" };
var CONTACT = [
  field("Your name", "form-input", "name", { required: "" }),
  field("Email", "form-email", "email", { required: "" }),
  field("Message", "form-textarea", "message", { required: "" }),
  TRAP,
  NOTE,
  { el: "form-submit" }
];
var SELECT_WRAP_CSS = `position: relative;
display: grid;
align-items: center;

/* The caret. Drawn here rather than left to the browser because a select
   styled at all loses its own arrow, and one you cannot see is one nobody
   knows is a menu. It never takes the click \u2014 the select is underneath it. */
&::after {
  content: "";
  position: absolute;
  inset-inline-end: 0.85rem;
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-inline-end: 2px solid currentColor;
  border-block-end: 2px solid currentColor;
  rotate: 45deg;
  translate: 0 -0.15rem;
  opacity: 0.55;
  pointer-events: none;
}`;
var ERROR_CSS = `display: block;
color: var(--danger, #b42318);
font-size: var(--text-s, 0.875rem);
line-height: 1.4;

/* Nothing to say, no room taken. Without this the gap under every field is
   paid for on a form that has never been submitted. */
&:empty {
  display: none;
}`;
var NOTE_CSS = `display: none;
padding: var(--space-xs, 0.75rem) var(--space-s, 1rem);
border-radius: var(--radius-s, 6px);
border: var(--border, 1px solid currentColor);
font-size: var(--text-s, 0.9375rem);

/* The runtime says which of the two it is; until it does, this is a region
   with nothing in it and it is not on the page. */
&[data-form-state] {
  display: block;
}

&[data-form-state="sent"] {
  color: var(--success, #067647);
}

&[data-form-state="failed"] {
  color: var(--danger, #b42318);
}`;
var TRAP_CSS = `position: absolute;
inline-size: 1px;
block-size: 1px;
margin: -1px;
padding: 0;
overflow: hidden;
clip-path: inset(50%);
white-space: nowrap;
border: 0;`;
var STEPS_CSS = `display: grid;
gap: var(--space-s, 1rem);

/* Steps are steps only once the runtime says so. Until then \u2014 and forever,
   on a page where the script never arrives \u2014 every step is visible and the
   form is one long form that submits in one go. */
&[data-form-stepped] > [data-form-part="step"] {
  display: none;
}

&[data-form-stepped] > [data-form-part="step"][data-form-current] {
  display: grid;
  gap: var(--content-gap, 1rem);
}`;
var STEP_CSS = `display: grid;
gap: var(--content-gap, 1rem);`;
var INDICATOR_CSS = `display: flex;
gap: var(--space-xs, 0.5rem);
align-items: center;
margin: 0;
padding: 0;
list-style: none;
counter-reset: step;

& > li {
  display: grid;
  place-items: center;
  inline-size: 2rem;
  block-size: 2rem;
  border-radius: 50%;
  border: var(--border, 1px solid currentColor);
  font-size: var(--text-s, 0.875rem);
  counter-increment: step;
  opacity: 0.5;
}

& > li::before {
  content: counter(step);
}

& > li[aria-current] {
  background: var(--primary, currentColor);
  color: var(--primary-100, #fff);
  border-color: transparent;
  opacity: 1;
}

& > li[data-done] {
  opacity: 1;
}`;
var WHEN_CSS = `/* A wrapper that decides *whether*, never *where*: display:contents keeps
   its children in the form's own grid, so wrapping two fields in a condition
   does not quietly re-lay them out. */
display: contents;

&[hidden] {
  display: none;
}`;
var REPEAT_CSS = `display: grid;
gap: var(--space-s, 1rem);`;
var REPEAT_ITEM_CSS = `display: grid;
gap: var(--content-gap, 1rem);
padding: var(--space-s, 1rem);
border: var(--border, 1px solid currentColor);
border-radius: var(--radius-s, 6px);`;
var SIGNATURE_CSS = `display: grid;
gap: var(--space-xs, 0.5rem);
justify-items: start;`;
var SIGN_PAD_CSS = `inline-size: 100%;
max-inline-size: 24rem;
block-size: 10rem;
border: var(--border, 1px solid currentColor);
border-radius: var(--radius-s, 6px);
background: var(--base-100, #fff);
touch-action: none;
cursor: crosshair;`;
var RICH_CSS = `display: grid;
gap: 0;
border: var(--border, 1px solid currentColor);
border-radius: var(--radius-s, 6px);
overflow: hidden;`;
var RICH_TOOLS_CSS = `display: flex;
gap: 0.25rem;
padding: 0.35rem;
border-block-end: var(--border, 1px solid currentColor);`;
var RICH_BTN_CSS = `display: grid;
place-items: center;
inline-size: 1.85rem;
block-size: 1.85rem;
padding: 0;
color: inherit;
background: none;
border: 0;
border-radius: var(--radius-s, 4px);
font: inherit;
cursor: pointer;

&:hover {
  background: var(--base-200, rgba(0, 0, 0, 0.06));
}

&[aria-pressed="true"] {
  background: var(--base-200, rgba(0, 0, 0, 0.1));
}`;
var RICH_AREA_CSS = `min-block-size: 8rem;
padding: var(--space-xs, 0.75rem);
overflow-wrap: anywhere;

&:focus-visible {
  outline: 2px solid var(--primary, currentColor);
  outline-offset: -2px;
}

/* A contenteditable with nothing in it has no height and no hint. */
&:empty::before {
  content: attr(data-placeholder);
  opacity: 0.55;
}`;
var CALC_CSS = `font-variant-numeric: tabular-nums;
font-weight: 600;`;
var FORM_ELEMENTS = [
  {
    id: "form",
    tag: "form",
    label: "Form",
    icon: "form",
    group: "form",
    hint: "a working contact form",
    container: true,
    attrs: { method: "post" },
    compose: CONTACT
  },
  {
    id: "form-field",
    tag: "div",
    label: "Field",
    icon: "form-field",
    group: "form",
    hint: "label, control, message",
    container: true,
    attrs: part2("field"),
    compose: [{ el: "form-label", text: "Label" }, { el: "form-input", attrs: { name: "field" } }, { el: "form-error" }]
  },
  { id: "form-label", tag: "label", label: "Label", icon: "form-label", group: "form", text: "Label" },
  {
    id: "form-input",
    tag: "input",
    label: "Text",
    icon: "form-input",
    group: "form",
    attrs: { type: "text", name: "field" }
  },
  {
    id: "form-email",
    tag: "input",
    label: "Email",
    icon: "form-email",
    group: "form",
    styleId: "form-input",
    attrs: { type: "email", name: "email", autocomplete: "email" }
  },
  {
    id: "form-textarea",
    tag: "textarea",
    label: "Text area",
    icon: "form-textarea",
    group: "form",
    attrs: { name: "message", rows: "5" }
  },
  {
    id: "form-number",
    tag: "input",
    label: "Number",
    icon: "form-number",
    group: "form",
    styleId: "form-input",
    attrs: { type: "number", name: "amount" }
  },
  {
    id: "form-tel",
    tag: "input",
    label: "Phone",
    icon: "form-tel",
    group: "form",
    styleId: "form-input",
    hint: "masked",
    attrs: { type: "tel", name: "phone", autocomplete: "tel", [FIELD_MASK]: "phone" }
  },
  {
    id: "form-date",
    tag: "input",
    label: "Date",
    icon: "form-date",
    group: "form",
    styleId: "form-input",
    attrs: { type: "date", name: "date" }
  },
  {
    id: "form-url",
    tag: "input",
    label: "URL",
    icon: "form-url",
    group: "form",
    styleId: "form-input",
    attrs: { type: "url", name: "website", placeholder: "https://" }
  },
  {
    id: "form-password",
    tag: "input",
    label: "Password",
    icon: "form-password",
    group: "form",
    styleId: "form-input",
    attrs: { type: "password", name: "password", autocomplete: "new-password" }
  },
  {
    id: "form-file",
    tag: "input",
    label: "File",
    icon: "form-file",
    group: "form",
    styleId: "form-input",
    attrs: { type: "file", name: "file" }
  },
  /* Hidden, and still an element in the tree: something the page knows and
     the visitor doesn't — which campaign, which product, which page it was
     sent from — is a value you set, so it is a thing you can select. */
  {
    id: "form-hidden",
    tag: "input",
    label: "Hidden",
    icon: "form-hidden",
    group: "form",
    styleId: "form-input",
    hint: "a value you set",
    attrs: { type: "hidden", name: "source", value: "" }
  },
  {
    id: "form-select-wrapper",
    tag: "div",
    label: "Select",
    icon: "form-select-wrapper",
    group: "form",
    hint: "menu with its caret",
    container: true,
    attrStyled: true,
    compose: [{ el: "form-select" }]
  },
  {
    id: "form-select",
    tag: "select",
    label: "Select only",
    icon: "form-select",
    group: "form",
    menu: false,
    attrs: { name: "choice" },
    container: true,
    compose: [
      { el: "form-option", text: "Choose\u2026", attrs: { value: "" } },
      { el: "form-option", text: "One", attrs: { value: "one" } },
      { el: "form-option", text: "Two", attrs: { value: "two" } }
    ]
  },
  {
    id: "form-option",
    tag: "option",
    label: "Option",
    icon: "form-option",
    group: "form",
    menu: false,
    text: "Option",
    attrs: { value: "option" }
  },
  {
    id: "form-check",
    tag: "label",
    label: "Checkmark",
    icon: "form-check",
    group: "form",
    hint: "checkbox and its words",
    container: true,
    compose: [
      { el: "form-check-input", attrs: { name: "consent", value: "yes" } },
      { el: "span", text: "Yes, please get in touch." }
    ]
  },
  {
    id: "form-check-input",
    tag: "input",
    label: "Checkbox",
    icon: "form-check-input",
    group: "form",
    menu: false,
    attrs: { type: "checkbox", name: "consent", value: "yes" }
  },
  {
    id: "form-radio",
    tag: "input",
    label: "Radio",
    icon: "form-radio",
    group: "form",
    styleId: "form-check-input",
    hint: "one of a group",
    attrs: { type: "radio", name: "choice", value: "one" }
  },
  {
    id: "form-slider",
    tag: "input",
    label: "Slider",
    icon: "form-slider",
    group: "form",
    hint: "moves a field, and follows it",
    attrs: { type: "range", name: "amount", min: "0", max: "100", step: "1", value: "50" }
  },
  {
    id: "form-calc",
    tag: "output",
    label: "Calculator",
    icon: "form-calc",
    group: "form",
    hint: "an expression over the fields",
    text: "0",
    attrStyled: true,
    attrs: { [FIELD_CALC]: "amount * 10", [FIELD_CALC_FORMAT]: "0.00" }
  },
  {
    id: "form-when",
    tag: "div",
    label: "Condition",
    icon: "form-when",
    group: "form",
    hint: "shown when a field says so",
    container: true,
    attrStyled: true,
    attrs: { ...part2("when"), [FIELD_WHEN]: "choice is one" },
    compose: [field("Tell us more", "form-textarea", "details")]
  },
  {
    id: "form-steps",
    tag: "div",
    label: "Steps",
    icon: "form-steps",
    group: "form",
    hint: "one form, a page at a time",
    container: true,
    attrStyled: true,
    attrs: part2("steps"),
    compose: [
      { el: "form-step-indicator" },
      { el: "form-step", children: [field("Your name", "form-input", "name", { required: "" })] },
      { el: "form-step", children: [field("Email", "form-email", "email", { required: "" })] },
      {
        el: "flex",
        children: [
          { el: "form-prev", text: "Back" },
          { el: "form-next", text: "Next" }
        ]
      }
    ]
  },
  {
    id: "form-step",
    tag: "div",
    label: "Step",
    icon: "form-step",
    group: "form",
    menu: false,
    container: true,
    attrStyled: true,
    attrs: part2("step")
  },
  {
    id: "form-step-indicator",
    tag: "ol",
    label: "Step indicator",
    icon: "form-step-indicator",
    group: "form",
    menu: false,
    attrStyled: true,
    attrs: part2("indicator")
  },
  {
    id: "form-repeat",
    tag: "div",
    label: "Repeater",
    icon: "form-repeat",
    group: "form",
    hint: "as many rows as they need",
    container: true,
    attrStyled: true,
    attrs: { ...part2("repeat"), [FIELD_FOR]: "items", [REPEAT_MAX]: "5" },
    compose: [
      {
        el: "form-repeat-item",
        children: [
          field("Item", "form-input", "title"),
          { el: "form-repeat-remove", text: "Remove" }
        ]
      },
      { el: "form-repeat-add", text: "Add another" }
    ]
  },
  {
    id: "form-repeat-item",
    tag: "div",
    label: "Repeater row",
    icon: "form-repeat-item",
    group: "form",
    menu: false,
    container: true,
    attrStyled: true,
    attrs: part2("repeat-item")
  },
  {
    id: "form-signature",
    tag: "div",
    label: "Signature",
    icon: "form-signature",
    group: "form",
    hint: "drawn, and posted as an image",
    container: true,
    attrStyled: true,
    attrs: { ...part2("signature"), [FIELD_FOR]: "signature" },
    compose: [
      { el: "form-sign-pad" },
      { el: "form-sign-clear", text: "Clear" }
    ]
  },
  {
    id: "form-sign-pad",
    tag: "canvas",
    label: "Signature pad",
    icon: "form-sign-pad",
    group: "form",
    menu: false,
    attrStyled: true,
    attrs: { width: "600", height: "200" }
  },
  {
    id: "form-rich",
    tag: "div",
    label: "Rich text",
    icon: "form-rich",
    group: "form",
    hint: "bold, italic, a link",
    container: true,
    attrStyled: true,
    attrs: { ...part2("rich"), [FIELD_FOR]: "message" },
    compose: [{ el: "form-rich-tools" }, { el: "form-rich-area" }]
  },
  {
    id: "form-rich-tools",
    tag: "div",
    label: "Rich text tools",
    icon: "form-rich-tools",
    group: "form",
    menu: false,
    container: true,
    attrStyled: true,
    compose: [
      { el: "form-rich-btn", text: "B", attrs: { "data-form-rich-cmd": "bold", "aria-label": "Bold" } },
      { el: "form-rich-btn", text: "I", attrs: { "data-form-rich-cmd": "italic", "aria-label": "Italic" } },
      { el: "form-rich-btn", text: "\u21B5", attrs: { "data-form-rich-cmd": "insertUnorderedList", "aria-label": "List" } }
    ]
  },
  {
    id: "form-rich-btn",
    tag: "button",
    label: "Rich text button",
    icon: "form-rich-btn",
    group: "form",
    menu: false,
    text: "B",
    attrStyled: true,
    attrs: { type: "button", "data-form-rich-cmd": "bold" }
  },
  {
    id: "form-rich-area",
    tag: "div",
    label: "Rich text area",
    icon: "form-rich-area",
    group: "form",
    menu: false,
    attrStyled: true,
    attrs: { contenteditable: "true", role: "textbox", "aria-multiline": "true", "data-placeholder": "Write here\u2026" }
  },
  {
    id: "form-note",
    tag: "div",
    label: "Message",
    icon: "form-note",
    group: "form",
    hint: "what it says once sent",
    attrStyled: true,
    attrs: { ...part2("note"), role: "status", "aria-live": "polite" }
  },
  {
    id: "form-error",
    tag: "span",
    label: "Field message",
    icon: "form-error",
    group: "form",
    menu: false,
    attrStyled: true,
    attrs: part2("error")
  },
  {
    id: "form-trap",
    tag: "div",
    label: "Spam trap",
    icon: "form-trap",
    group: "form",
    hint: "a question only a bot answers",
    container: true,
    attrStyled: true,
    attrs: { ...part2("trap"), "aria-hidden": "true" },
    compose: [
      { el: "form-label", text: "Company" },
      { el: "form-input", attrs: { name: "company", type: "text", tabindex: "-1", autocomplete: "off" } }
    ]
  },
  /* The buttons. All of them are buttons — same style bucket, same variant
     classes, same panel — and what makes each one what it is is one
     attribute the runtime reads. A form's submit is not a new kind of thing. */
  {
    id: "form-submit",
    tag: "button",
    label: "Submit",
    icon: "form-submit",
    group: "form",
    styleId: "button",
    text: "Send",
    classes: ["btn--primary"],
    attrs: { type: "submit" }
  },
  {
    id: "form-next",
    tag: "button",
    label: "Next step",
    icon: "form-next",
    group: "form",
    menu: false,
    styleId: "button",
    text: "Next",
    classes: ["btn--primary"],
    attrs: { type: "button", [STEP_NAV]: "next" }
  },
  {
    id: "form-prev",
    tag: "button",
    label: "Previous step",
    icon: "form-prev",
    group: "form",
    menu: false,
    styleId: "button",
    text: "Back",
    classes: ["btn--outline"],
    attrs: { type: "button", [STEP_NAV]: "prev" }
  },
  {
    id: "form-repeat-add",
    tag: "button",
    label: "Add row",
    icon: "form-repeat-add",
    group: "form",
    menu: false,
    styleId: "button",
    text: "Add another",
    classes: ["btn--outline"],
    attrs: { type: "button", "data-form-repeat-add": "" }
  },
  {
    id: "form-repeat-remove",
    tag: "button",
    label: "Remove row",
    icon: "form-repeat-remove",
    group: "form",
    menu: false,
    styleId: "button",
    text: "Remove",
    classes: ["btn--outline", "btn--s"],
    attrs: { type: "button", "data-form-repeat-remove": "" }
  },
  {
    id: "form-sign-clear",
    tag: "button",
    label: "Clear signature",
    icon: "form-sign-clear",
    group: "form",
    menu: false,
    styleId: "button",
    text: "Clear",
    classes: ["btn--outline", "btn--s"],
    attrs: { type: "button", "data-form-sign-clear": "" }
  }
];
var F = (id) => `[builder-data-element="${id}"]`;
function formRequired(_cfg) {
  return flatRules([
    [F("form-trap"), TRAP_CSS],
    [F("form-when"), WHEN_CSS],
    [F("form-steps"), `&[data-form-stepped] > [data-form-part="step"] {
  display: none;
}

&[data-form-stepped] > [data-form-part="step"][data-form-current] {
  display: grid;
}`],
    [F("form-error"), "&:empty { display: none; }"],
    [F("form-note"), "display: none;\n\n&[data-form-state] { display: block; }"],
    [F("form-sign-pad"), "touch-action: none;"]
  ]);
}
function formLook(_cfg) {
  return flatRules([
    [F("form-select-wrapper"), SELECT_WRAP_CSS],
    [F("form-error"), `display: block;
color: var(--danger, #b42318);
font-size: var(--text-s, 0.875rem);
line-height: 1.4;`],
    [F("form-note"), `padding: var(--space-xs, 0.75rem) var(--space-s, 1rem);
border-radius: var(--radius-s, 6px);
border: var(--border, 1px solid currentColor);
font-size: var(--text-s, 0.9375rem);

&[data-form-state="sent"] { color: var(--success, #067647); }
&[data-form-state="failed"] { color: var(--danger, #b42318); }`],
    [F("form-steps"), 'display: grid;\ngap: var(--space-s, 1rem);\n\n& > [data-form-part="step"][data-form-current] { gap: var(--content-gap, 1rem); }'],
    [F("form-step"), STEP_CSS],
    [F("form-step-indicator"), INDICATOR_CSS],
    [F("form-repeat"), REPEAT_CSS],
    [F("form-repeat-item"), REPEAT_ITEM_CSS],
    [F("form-signature"), SIGNATURE_CSS],
    [F("form-sign-pad"), SIGN_PAD_CSS],
    [F("form-rich"), RICH_CSS],
    [F("form-rich-tools"), RICH_TOOLS_CSS],
    [F("form-rich-btn"), RICH_BTN_CSS],
    [F("form-rich-area"), RICH_AREA_CSS],
    [F("form-calc"), CALC_CSS]
  ]);
}
var FORM_STARTERS = [
  ["form-select-wrapper", SELECT_WRAP_CSS],
  ["form-error", ERROR_CSS],
  ["form-note", NOTE_CSS],
  ["form-trap", TRAP_CSS],
  ["form-steps", STEPS_CSS],
  ["form-step", STEP_CSS],
  ["form-step-indicator", INDICATOR_CSS],
  ["form-when", WHEN_CSS],
  ["form-repeat", REPEAT_CSS],
  ["form-repeat-item", REPEAT_ITEM_CSS],
  ["form-signature", SIGNATURE_CSS],
  ["form-sign-pad", SIGN_PAD_CSS],
  ["form-rich", RICH_CSS],
  ["form-rich-tools", RICH_TOOLS_CSS],
  ["form-rich-btn", RICH_BTN_CSS],
  ["form-rich-area", RICH_AREA_CSS],
  ["form-calc", CALC_CSS]
].map(([id, css]) => [F(id), css]);
var FORM_PRESETS = [
  {
    id: "form-preset-newsletter",
    tag: "form",
    label: "Newsletter",
    icon: "form-newsletter",
    group: "form",
    hint: "one field and a button",
    styleId: "form",
    container: true,
    attrs: { method: "post" },
    compose: [
      field("Email", "form-email", "email", { required: "", placeholder: "you@example.com" }),
      {
        el: "form-check",
        children: [
          { el: "form-check-input", attrs: { name: "consent", value: "yes", required: "" } },
          { el: "span", text: "I agree to receive the newsletter." }
        ]
      },
      TRAP,
      NOTE,
      { el: "form-submit", text: "Subscribe" }
    ]
  },
  {
    id: "form-preset-booking",
    tag: "form",
    label: "Appointment",
    icon: "form-date",
    group: "form",
    hint: "a date, a time and who",
    styleId: "form",
    container: true,
    attrs: { method: "post" },
    compose: [
      field("Your name", "form-input", "name", { required: "" }),
      field("Email", "form-email", "email", { required: "" }),
      field("Phone", "form-tel", "phone"),
      field("Preferred date", "form-date", "date", { required: "" }),
      {
        el: "form-field",
        children: [
          { el: "form-label", text: "Time of day" },
          {
            el: "form-select-wrapper",
            children: [{
              el: "form-select",
              attrs: { name: "slot", required: "" },
              children: [
                { el: "form-option", text: "Choose\u2026", attrs: { value: "" } },
                { el: "form-option", text: "Morning", attrs: { value: "morning" } },
                { el: "form-option", text: "Afternoon", attrs: { value: "afternoon" } },
                { el: "form-option", text: "Evening", attrs: { value: "evening" } }
              ]
            }]
          },
          { el: "form-error" }
        ]
      },
      field("Anything we should know?", "form-textarea", "message"),
      TRAP,
      NOTE,
      { el: "form-submit", text: "Request an appointment" }
    ]
  },
  {
    id: "form-preset-feedback",
    tag: "form",
    label: "Feedback",
    icon: "form-slider",
    group: "form",
    hint: "a score and why",
    styleId: "form",
    container: true,
    attrs: { method: "post" },
    compose: [
      {
        el: "form-field",
        children: [
          { el: "form-label", text: "How did we do?" },
          { el: "form-slider", attrs: { name: "score", min: "1", max: "10", step: "1", value: "8", [FIELD_SYNC]: "score-shown" } },
          { el: "form-calc", text: "8", attrs: { [FIELD_CALC]: "score", [FIELD_CALC_FORMAT]: "0" } }
        ]
      },
      field("Why?", "form-textarea", "message", { required: "" }),
      field("Email (optional)", "form-email", "email"),
      TRAP,
      NOTE,
      { el: "form-submit", text: "Send feedback" }
    ]
  },
  {
    id: "form-preset-quote",
    tag: "form",
    label: "Quote",
    icon: "form-steps",
    group: "form",
    hint: "steps, and a total that adds up",
    styleId: "form",
    container: true,
    attrs: { method: "post" },
    compose: [
      {
        el: "form-steps",
        children: [
          { el: "form-step-indicator" },
          {
            el: "form-step",
            children: [
              {
                el: "form-field",
                children: [
                  { el: "form-label", text: "What do you need?" },
                  {
                    el: "form-select-wrapper",
                    children: [{
                      el: "form-select",
                      attrs: { name: "plan" },
                      children: [
                        { el: "form-option", text: "A website (1200)", attrs: { value: "1200" } },
                        { el: "form-option", text: "A shop (2800)", attrs: { value: "2800" } },
                        { el: "form-option", text: "Something else (0)", attrs: { value: "0" } }
                      ]
                    }]
                  }
                ]
              },
              {
                el: "form-field",
                children: [
                  { el: "form-label", text: "How many pages?" },
                  { el: "form-slider", attrs: { name: "pages", min: "1", max: "20", step: "1", value: "5" } },
                  { el: "form-calc", text: "1200", attrs: { [FIELD_CALC]: "plan + pages * 120", [FIELD_CALC_FORMAT]: "0.00" } }
                ]
              },
              {
                el: "form-when",
                attrs: { ...part2("when"), [FIELD_WHEN]: "plan is 0" },
                children: [field("Tell us what you have in mind", "form-textarea", "details")]
              }
            ]
          },
          {
            el: "form-step",
            children: [
              field("Your name", "form-input", "name", { required: "" }),
              field("Email", "form-email", "email", { required: "" })
            ]
          },
          {
            el: "flex",
            children: [
              { el: "form-prev", text: "Back" },
              { el: "form-next", text: "Next" },
              { el: "form-submit", text: "Send the request" }
            ]
          }
        ]
      },
      TRAP,
      NOTE
    ]
  },
  {
    id: "form-preset-apply",
    tag: "form",
    label: "Application",
    icon: "form-file",
    group: "form",
    hint: "a file and a signature",
    styleId: "form",
    container: true,
    attrs: { method: "post" },
    compose: [
      field("Your name", "form-input", "name", { required: "" }),
      field("Email", "form-email", "email", { required: "" }),
      field("CV (PDF)", "form-file", "cv", { accept: ".pdf,.doc,.docx", required: "" }),
      field("Why you?", "form-textarea", "message"),
      {
        el: "form-field",
        children: [
          { el: "form-label", text: "Signature" },
          {
            el: "form-signature",
            attrs: { ...part2("signature"), [FIELD_FOR]: "signature" },
            children: [{ el: "form-sign-pad" }, { el: "form-sign-clear", text: "Clear" }]
          }
        ]
      },
      TRAP,
      NOTE,
      { el: "form-submit", text: "Apply" }
    ]
  }
];
var FORM_ELEMENT_DEFS = [...FORM_ELEMENTS, ...FORM_PRESETS];
var CHECK_SRC = `function check(values: Record<string, string[]>): string | null {
  for (const f of FIELDS) {
    const list = values[f.name] ?? [];
    const value = (list[0] ?? '').trim();
    if (f.required && !value) return f.label + ' is required.';
    if (!value) continue;
    if (f.minLength && value.length < f.minLength) return f.label + ' is too short.';
    if (f.maxLength && value.length > f.maxLength) return f.label + ' is too long.';
    if (f.pattern && !new RegExp('^(?:' + f.pattern + ')$').test(value)) return f.label + ' is not in the right format.';
    if (f.type === 'email' && !/^[^@\\s]+@[^@\\s.]+\\.[^@\\s]+$/.test(value)) return f.label + ' is not an email address.';
    if (f.type === 'url' && !/^https?:\\/\\/\\S+$/i.test(value)) return f.label + ' is not a web address.';
    if (f.type === 'number' || f.type === 'range') {
      const n = Number(value);
      if (Number.isNaN(n)) return f.label + ' has to be a number.';
      if (f.min !== undefined && n < Number(f.min)) return f.label + ' is below the minimum.';
      if (f.max !== undefined && n > Number(f.max)) return f.label + ' is above the maximum.';
    }
  }
  return null;
}`;
var CHECK_SAYS = {
  " is required.": "required",
  " is too short.": "short",
  " is too long.": "long",
  " is not in the right format.": "format",
  " is not an email address.": "email",
  " is not a web address.": "url",
  " has to be a number.": "number",
  " is below the minimum.": "below",
  " is above the maximum.": "above"
};
var CHECK_LANG_SRC = CHECK_SRC.replace(
  "function check(values: Record<string, string[]>): string | null {",
  "function check(values: Record<string, string[]>, w: Words): string | null {\n  const say = (t: string, f: Field): string => t.replace('%s', w.labels[f.name] ?? f.label);"
).replace(/return f\.label \+ '([^']+)';/g, (_, tail) => `return say(w.${CHECK_SAYS[tail]}, f);`);

// ../src/builder-core/images.ts
var IMAGE_WIDTHS = "data-image-widths";

// ../src/builder-core/elements.ts
var EL_ATTR = "builder-data-element";
var LAYOUT_ELEMENTS = [
  { id: "section", tag: "section", label: "Section", icon: "section", group: "layout", container: true },
  // No Header/Footer element: a Section does the same job, and having three
  // ways to make the same box only made the insert menu harder to scan. Nodes
  // already using the header bucket keep rendering and keep their styles.
  { id: "container", tag: "div", label: "Container", icon: "container", group: "layout", container: true },
  { id: "flex", tag: "div", label: "Flex Div", icon: "flex", group: "layout", container: true },
  { id: "div", tag: "div", label: "Div", icon: "div", group: "layout", container: true },
  { id: "figure", tag: "figure", label: "Figure", icon: "figure", group: "layout", container: true },
  /* A Loop repeats what you put inside it, once per entry of whatever data you
     point it at — and that is all it is. It emits Astro's `map()` and no
     wrapper element, so the page contains exactly the children you gave it,
     once per entry. Nothing to style: put a Div inside the loop (or around it)
     when you want a box. */
  { id: "loop", tag: "loop", label: "Loop", icon: "loop", group: "layout", container: true, loop: true, logic: true },
  /* A Condition decides *when* what's inside it is shown — on the site, in the
     builder only, or when an expression of yours is true. Logic like the Loop:
     it emits a guard (or nothing at all) and no wrapper element. */
  { id: "condition", tag: "condition", label: "Condition", icon: "condition", group: "layout", container: true, cond: true, logic: true },
  /* Templates only, and never inserted: the `<main>` a template arrives with
       and the slot inside it. Both are fixed (see `isFixed`), so `+` would be
       offering an element you already have and cannot have twice — which is why
       neither carries `menu` and both are filtered out of the palette.
  
       `site-content` keeps its id and its style bucket though it is now an
       ordinary container: it *is* the `<main>`, exactly as before, so every rule
       ever written against `[builder-data-element="site-content"]` still matches
       and no emitted page changed. What moved out of it is the splice point. */
  { id: "site-content", tag: "main", label: "Main", icon: "site-content", group: "layout", container: true, menu: false },
  /* Where the page's own tree is spliced in. Logic like the Loop: it emits no
     tag at all, so what a page renders inside is your `<main>` and whatever
     you put around the slot in it — a breadcrumb above, an aside beside. */
  { id: "page-content", tag: "page-content", label: "Page content", icon: "site-content", group: "layout", logic: true, menu: false },
  /* Components only: the page slot's counterpart one level down. Where the
     elements an instance is given go — a card's body, a section's content,
     a button's label — written as Astro's own `<slot />`. What sits inside
     the Slot is its fallback, shown wherever an instance is given nothing.
     Logic like the page slot: no tag of its own, nothing to style. Offered
     by `+` only while a component without one is open. */
  { id: "slot", tag: "slot", label: "Slot", icon: "slot", group: "layout", container: true, logic: true, menu: false },
  /* Code sitereal does not know — your own component, an expression, a query
     written by hand — read from a file and written back exactly as it was
     (docs/FILES-FIRST.md, Phase 2). Two shapes: `html` is the whole of it, or
     `data-open`/`data-close` are a component's own tags around children that
     stay editable (`<Layout title="Home">` … `</Layout>`). Logic like the
     Loop: no tag of its own. Never in `+`: it arrives with a file. */
  { id: "code", tag: "astro-code", label: "Code", icon: "code", group: "layout", container: true, logic: true, menu: false }
];
var SITE_CONTENT = "site-content";
var PAGE_CONTENT = "page-content";
var CONTENT_ELEMENTS = [
  { id: "heading", tag: "h2", label: "Heading", icon: "heading", group: "element", text: "Heading" },
  { id: "text", tag: "p", label: "Text", icon: "text", group: "element", text: "Text goes here." },
  /* Formatted text — paragraphs, headings, lists, pictures — as one element.
     What it holds is markup, so it lives in `html` and not in `text`; bound
     to a Long text field (`{item.content}`) it ships as `set:html`. How the
     headings and paragraphs inside it look is the Typography module's (the
     flow rules in framework.ts), since none of them is a builder element. */
  {
    id: "rich-text",
    tag: "div",
    label: "Rich text",
    icon: "text",
    group: "element",
    hint: "Formatted text, or a Long text field",
    html: "<h2>A heading</h2>\n<p>A paragraph of formatted text. Bind this element to a Long text field to show an entry\u2019s content.</p>"
  },
  { id: "span", tag: "span", label: "Span", icon: "span", group: "element", text: "Span" },
  { id: "link", tag: "a", label: "Link", icon: "link", group: "element", text: "Link", attrs: { href: "#" } },
  /* A new button arrives wearing the primary variant. Color follows the
     variant class now (see buttons.ts), so without one it would land as a
     shaped button in the browser's own gray — and the class is right there in
     the panel to swap or take off. */
  {
    id: "button",
    tag: "button",
    label: "Button",
    icon: "button",
    group: "element",
    text: "Button",
    classes: ["btn--primary"]
  },
  /* Images arrive wrapped in a <figure>, the caption-ready markup you'd write
     by hand — and **responsive**, which is the same choice the Button makes by
     arriving in the primary variant and the Video makes by arriving muted:
     the good answer is the one that ships, and switching it off is a click.
     What it costs is nothing until the `src` is a file in this project, since
     the placeholder is an SVG and there is nothing there to
     resize; the moment you pick a picture from the Media library the page
     starts sending the resolution the screen asked for. `sizes` is written
     here rather than invented by the emitter, so what the attribute list says
     is what ships — `100vw` is the answer that is never too small, and the
     panel has the two that are narrower. See images.ts. */
  {
    id: "image",
    tag: "img",
    label: "Image",
    icon: "image",
    group: "element",
    wrapWith: "figure",
    attrs: { src: PLACEHOLDER_SRC, alt: "", [IMAGE_WIDTHS]: "auto", sizes: "100vw" }
  },
  /* A video is the browser's own player and nothing else: a real `<video>`
       with real attributes, so it plays with every script on the page deleted
       and the controls are the ones the visitor already knows.
  
       It arrives with no `src`, unlike the Image, because there is no
       placeholder video worth depending on — a 16:9 box is what its element
       bucket draws until you pick a file, which is also what an empty one has
       to look like to be selectable at all. `preload="metadata"` rather than
       the browser's default of `auto`: a page holding three videos should not
       be three video downloads before anybody presses anything. `muted` is
       there because it is the one attribute autoplay cannot do without, and
       `playsinline` because iOS otherwise takes the video full-screen the
       moment it starts.
  
       **No `<figure>` around it**, unlike the Image. A figure means one thing —
       self-contained content referred to from the main flow, the kind of thing
       a caption is attached to — and that is what a picture in an article
       usually is and what a video usually is not: the videos people put on a
       site are hero loops, backgrounds and product clips, none of which is a
       figure and all of which then have to have the wrapper deleted, along with
       the margin a `<figure>` brings with it. Wrapping is one click (right-click
       → Wrap in → Figure) and unwrapping was not. */
  /* Muted, autoplaying and inline, which is the one combination a browser will
     start on its own and what a video on a site nearly always is — a hero
     loop. `controls` is off with it, since a loop with a scrub bar under it is
     a player nobody is going to use, and every one of the five is a switch in
     the Video panel. See `VIDEO_DEFAULTS` in video.ts, which is where the same
     answer is given to the panel. */
  {
    id: "video",
    tag: "video",
    label: "Video",
    icon: "video",
    group: "element",
    hint: "a file, or somebody else's player",
    container: true,
    attrs: { autoplay: "", loop: "", muted: "", playsinline: "", preload: "metadata" }
  },
  /* An icon *is* an SVG — same tag, same inline markup, no runtime. What
     makes it its own element is that it arrives from a set you installed and
     can be swapped for another one: it carries `data-icon` naming which icon
     it currently is, and it has a style bucket of its own, because "as big as
     the text, in the color of the text" is what you want of an icon and
     never what you want of a logo. Take the attribute off and it is an SVG
     again, which is the honest end of that story. */
  {
    id: "icon",
    tag: "svg",
    label: "Icon",
    icon: "icon",
    group: "element",
    hint: "from an installed set",
    attrs: { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true" },
    html: '<path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3 6.5 3.6L12 11.5 5.5 7.9 12 4.3ZM5 9.6l6 3.3v6.8l-6-3.3V9.6Zm8 10.1v-6.8l6-3.3v6.8l-6 3.3Z" />'
  },
  {
    id: "svg",
    tag: "svg",
    label: "SVG",
    icon: "svg",
    group: "element",
    attrs: { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.5" },
    html: '<path d="M12 3v18M3 12h18" stroke-linecap="round" />'
  },
  { id: "list", tag: "ul", label: "List", icon: "list", group: "element", container: true }
];
var ELEMENTS = [...LAYOUT_ELEMENTS, ...CONTENT_ELEMENTS, ...NAV_ELEMENTS, ...LANG_SWITCH_ELEMENTS, ...POPUP_ELEMENTS, ...FORM_ELEMENT_DEFS, ...CAROUSEL_ELEMENTS, ...CONSENT_ELEMENTS, ...SEARCH_ELEMENTS];
var elementDef = (id) => ELEMENTS.find((e) => e.id === id);
var CONTAINER = elementDef("container");
var counter = 0;
function newId(tag) {
  counter += 1;
  return `${tag}-${Date.now().toString(36)}-${counter}`;
}
var elSelector = (styleId) => `[${EL_ATTR}="${styleId}"]`;
function inferElementType(node) {
  const cls = node.classes ?? [];
  switch (node.tag) {
    case "section":
      return "section";
    case "header":
      return "header";
    case "figure":
      return "figure";
    case "main":
      return "site-content";
    case "svg":
      return "svg";
    case "video":
      return "video";
    /* A footer is a band across the page; an article or an aside is nearly
       always a box inside one — a card in a grid, a sidebar — and typed as a
       section it took the band's padding and the site padding with it. */
    case "footer":
      return "section";
    case "article":
    case "aside":
      return "div";
    case "li":
      return "text";
    case "div":
      if (cls.includes("container")) return "container";
      if (cls.includes("flex")) return "flex";
      return "div";
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return "heading";
    case "p":
      return "text";
    case "span":
      return "span";
    case "nav":
      return "nav";
    case "a":
      return "link";
    case "button":
      return "button";
    case "img":
      return "image";
    case "ul":
    case "ol":
      return "list";
    /* Form controls, so a form pasted in as HTML — or written by hand before
       any of this existed — is styled by the design system like one you
       inserted. Which control it is comes from `type`, because that is the
       whole of what tells a checkbox from a text field. */
    case "form":
      return "form";
    case "label":
      return "form-label";
    case "textarea":
      return "form-textarea";
    case "select":
      return "form-select";
    case "input": {
      const type = String(node.attrs?.type ?? "text");
      if (type === "checkbox" || type === "radio") return "form-check-input";
      if (type === "range") return "form-slider";
      if (type === "submit" || type === "button" || type === "reset") return "button";
      return "form-input";
    }
    default:
      return void 0;
  }
}
var ROLE_DEFS = ELEMENTS.flatMap((d) => {
  if (!d.styleId || d.styleId === d.id || !d.attrs) return [];
  const base = ELEMENTS.find((b) => b.id === d.styleId)?.attrs ?? {};
  const own = Object.entries(d.attrs).filter(([k, v2]) => base[k] !== v2 && !(k === "type" && v2 === "button"));
  return own.length ? [{ def: d, attrs: Object.entries(d.attrs) }] : [];
});
function withElementAttrs(root) {
  return root.map((node) => {
    if (node.component) return node.children ? { ...node, children: withElementAttrs(node.children) } : { ...node };
    const type = node.attrs?.[EL_ATTR] ?? inferElementType(node);
    const next = type ? { ...node, attrs: { [EL_ATTR]: type, ...node.attrs ?? {} } } : { ...node };
    const def = type ? elementDef(type) : void 0;
    if (def?.logic && next.tag !== def.tag) next.tag = def.tag;
    if (node.children) next.children = withElementAttrs(node.children);
    return next;
  });
}

// ../src/builder-core/styles.ts
var GLOBAL_SHEET = "glob-";
var isGlobalSheet = (s) => s.id.startsWith(GLOBAL_SHEET);

// ../src/builder-core/templates.ts
var isTemplateSheet = (s) => s.id.startsWith("tpl-");
var templateCounter = 0;
function newTemplateId() {
  templateCounter += 1;
  return `tpl-${Date.now().toString(36)}-${templateCounter}`;
}
var pageContentNode = () => ({ id: newId("page-content"), tag: "page-content", attrs: { [EL_ATTR]: PAGE_CONTENT } });
var MAIN_ID = "main";
var siteContentNode = () => ({ id: newId("main"), tag: "main", attrs: { [EL_ATTR]: SITE_CONTENT, id: MAIN_ID }, children: [pageContentNode()] });
function newTemplate(name, applyTo = {}) {
  return { id: newTemplateId(), name, root: [siteContentNode()], stylesheets: [], applyTo };
}
var newNotFoundTemplate = (route = "404") => newTemplate(route, { routes: [route] });
var newSiteTemplate = (name = "Main") => newTemplate(name, { all: true });
var hasSiteTemplate = (templates) => templates.some((t) => t.applyTo.all === true);
var hasTemplateForRoute = (templates, route) => templates.some((t) => t.applyTo.routes?.includes(route));

// ../src/builder-core/motion.ts
var MOTION_STATE_KEYS = [
  "opacity",
  "x",
  "y",
  "scale",
  "rotate",
  "rotateX",
  "rotateY",
  "skewX",
  "skewY",
  "blur"
];
var MOTION_STATE_ATTR = {
  opacity: "opacity",
  x: "x",
  y: "y",
  scale: "scale",
  rotate: "rotate",
  rotateX: "rotate-x",
  rotateY: "rotate-y",
  skewX: "skew-x",
  skewY: "skew-y",
  blur: "blur"
};
var D = "var(--motion-distance, 32px)";
var ND = "calc(-1 * var(--motion-distance, 32px))";
var MOTION_PRESETS = [
  { id: "fade", label: "Fade in", hint: "opacity only \u2014 the quiet one", from: { opacity: "0" } },
  { id: "rise", label: "Rise", hint: "fades in from below", from: { opacity: "0", y: D } },
  { id: "sink", label: "Sink", hint: "fades in from above", from: { opacity: "0", y: ND } },
  { id: "slide-right", label: "Slide right", hint: "enters from the left", from: { opacity: "0", x: ND } },
  { id: "slide-left", label: "Slide left", hint: "enters from the right", from: { opacity: "0", x: D } },
  { id: "zoom", label: "Zoom", hint: "grows into place", from: { opacity: "0", scale: "0.94" } },
  { id: "pop", label: "Pop", hint: "small, then overshoots", from: { opacity: "0", scale: "0.8" }, ease: "bouncy" },
  { id: "blur", label: "Blur in", hint: "focus pulls in", from: { opacity: "0", blur: "10px" } },
  { id: "tilt", label: "Tilt", hint: "rights itself as it arrives", from: { opacity: "0", y: D, rotate: "-4deg" } },
  { id: "flip-x", label: "Flip horizontal", hint: "turns in about the vertical axis", from: { opacity: "0", rotateY: "-70deg" } },
  { id: "flip-y", label: "Flip vertical", hint: "turns in about the horizontal axis", from: { opacity: "0", rotateX: "70deg" } },
  { id: "skew", label: "Skew", hint: "leans in and straightens", from: { opacity: "0", x: D, skewX: "-8deg" } },
  { id: "custom", label: "Custom", hint: "nothing preset \u2014 say it yourself", from: {} }
];
var MOTION_PRESET_BY_ID = Object.fromEntries(MOTION_PRESETS.map((p) => [p.id, p]));
var MOTION_EASES = [
  { id: "smooth", label: "Smooth", curve: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "in", label: "Ease in", curve: "cubic-bezier(0.42, 0, 1, 1)" },
  { id: "out", label: "Ease out", curve: "cubic-bezier(0.22, 0.61, 0.36, 1)" },
  { id: "in-out", label: "Ease in-out", curve: "cubic-bezier(0.65, 0, 0.35, 1)" },
  /* The three "back" curves overshoot — one end, the other, or both. `bouncy`
     is back-out and keeps its name: it is in every project already saved, and
     renaming a stored value to match a word nobody sees is a migration for
     nothing. */
  { id: "bouncy", label: "Back out", curve: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  { id: "back-in", label: "Back in", curve: "cubic-bezier(0.36, 0, 0.66, -0.56)" },
  { id: "back-in-out", label: "Back in-out", curve: "cubic-bezier(0.68, -0.6, 0.32, 1.6)" },
  { id: "linear", label: "Linear", curve: "linear" }
];
var EASE_BY_ID = Object.fromEntries(MOTION_EASES.map((e) => [e.id, e.curve]));
var easeCurve = (ease) => EASE_BY_ID[ease] ?? ease;
function springCurve(stiffness, damping, mass) {
  var k = Math.max(1, stiffness), c2 = Math.max(0, damping), m = Math.max(0.1, mass);
  var w0 = Math.sqrt(k / m);
  var zeta = c2 / (2 * Math.sqrt(k * m));
  var decay = zeta < 1 ? zeta * w0 : w0 * (zeta - Math.sqrt(zeta * zeta - 1));
  var duration = Math.min(10, Math.max(0.1, 6.9 / Math.max(0.05, decay)));
  var at = function(t) {
    if (zeta < 1) {
      var wd = w0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + zeta * w0 / wd * Math.sin(wd * t));
    }
    if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    var r2 = w0 * Math.sqrt(zeta * zeta - 1);
    var a = -zeta * w0 + r2, b = -zeta * w0 - r2;
    return 1 - (b * Math.exp(a * t) - a * Math.exp(b * t)) / (b - a);
  };
  var n = 48, points = [];
  for (var i = 0; i <= n; i++) points.push(Math.round(at(i / n * duration) * 1e4) / 1e4);
  points[0] = 0;
  points[n] = 1;
  return { duration: Math.round(duration * 1e3), points, ease: "linear(" + points.join(", ") + ")" };
}
var SPRING_SRC = `var springCurve = ${springCurve.toString()};`;
var MOTION_DEFAULTS = {
  duration: 700,
  ease: "smooth",
  distance: "32px",
  stagger: 90,
  perspective: "900px"
};
var motionOf = (cfg) => ({
  duration: cfg.motionDuration ?? MOTION_DEFAULTS.duration,
  ease: cfg.motionEase ?? MOTION_DEFAULTS.ease,
  distance: cfg.motionDistance ?? MOTION_DEFAULTS.distance,
  stagger: cfg.motionStagger ?? MOTION_DEFAULTS.stagger,
  perspective: cfg.motionPerspective ?? MOTION_DEFAULTS.perspective
});
var stateKey = (key) => MOTION_STATE_ATTR[key];
var exitKey = (key) => `exit-${MOTION_STATE_ATTR[key]}`;
var ALL_KEYS = [
  ...MOTION_STATE_KEYS.map(stateKey),
  ...MOTION_STATE_KEYS.map(exitKey),
  "trigger",
  "duration",
  "delay",
  "ease",
  "spring",
  "start",
  "direction",
  "once",
  "stagger",
  "catchup"
];

// ../src/builder-core/popups.ts
var isPopupSheet = (s) => s.id.startsWith("pop-");

// ../src/builder-core/components.ts
var COMPONENT_SHEET = "cmpcss-";
var isComponentSheet = (s) => s.id.startsWith(COMPONENT_SHEET);
var JS_WORDS = new Set("break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with yield let static implements interface package private protected public await async of undefined NaN Infinity Astro props".split(" "));

// ../src/builder-core/richtext-render.ts
var RICH_TEXT_SCRUB_JS = String.raw`/** Taken out with what is in them: what runs, styles, or is text a browser does not read as markup. */
const SCRUB_DROP = new Set(['script', 'style', 'object', 'noscript', 'template', 'textarea', 'title', 'xmp', 'noembed', 'noframes']);
/** Taken out as a tag, what is in them kept. */
const SCRUB_TAG = new Set(['meta', 'link', 'base', 'form', 'embed', 'plaintext']);
const SCRUB_URL = new Set(['href', 'src', 'poster', 'action', 'xlink:href', 'background']);
/** What an SVG animation sets an attribute to, an href among them. */
const SCRUB_ANIMATE = new Set(['values', 'to', 'from', 'by']);
const scrubEsc = (v = '') => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
/** An address that runs, or is a page of its own: javascript:, vbscript:, and a data: one other than a picture. */
const scrubBad = (v = '') => {
  const scheme = scanScheme(v);
  return scheme === 'javascript' || scheme === 'vbscript'
    || (scheme === 'data' && !/^data:image\/(png|jpe?g|gif|webp|avif)[;,]/i.test(v.replace(/[\u0000-\u0020\u007f]+/g, '')));
};
/** A style that runs or loads something it should not: an IE expression or
    behavior, an import, a script address, a url() that is not http(s), a path
    or a picture's data: — or a CSS escape, which could spell any of them. */
const scrubStyleBad = (v = '') => {
  const css = v.replace(/\/\*[\s\S]*?(\*\/|$)/g, '').replace(/[\s\u0000-\u001f\u007f]+/g, '');
  if (/\\|expression\(|behavior:|-moz-binding|@import|javascript:|vbscript:/i.test(css)) return true;
  for (const m of css.matchAll(/url\((?:"([^"]*)"|'([^']*)'|([^)]*))/gi)) {
    const u = m[1] ?? m[2] ?? m[3] ?? '';
    const scheme = scanScheme(u);
    if (scrubBad(u) || (scheme !== '' && scheme !== 'http' && scheme !== 'https' && scheme !== 'data')) return true;
  }
  return false;
};
function scrub(s = '') {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    if (lt < 0) { out += s.slice(i); break; }
    out += s.slice(i, lt);
    const t = scanTag(s, lt);
    if (!t) {
      const e = scanSkip(s, lt);
      if (e < 0) { out += '&lt;'; i = lt + 1; } else i = e;
      continue;
    }
    if (t.cut) break;
    i = t.end;
    if (SCRUB_TAG.has(t.name)) continue;
    if (SCRUB_DROP.has(t.name)) {
      const e = t.close ? -1 : scanRawEnd(s, i, t.name);
      if (e >= 0) i = e;
      continue;
    }
    if (t.close) { out += '</' + t.written + '>'; continue; }
    let tag = '<' + t.written;
    let changed = false;
    for (const a of t.attrs) {
      let put = a.whole;
      if (/^on/.test(a.key) || a.key === 'srcdoc' || a.key === 'formaction') put = '';
      else if (a.key === 'style' && !a.bare && scrubStyleBad(scanDecode(a.value))) put = '';
      /* an embed is somebody else's page, so only an https one, as the editor
         lets it be written: "#" would load this page inside itself */
      else if (t.name === 'iframe' && a.key === 'src' && !a.bare && scanScheme(scanDecode(a.value)) !== 'https') put = '';
      else if (!a.bare && (SCRUB_URL.has(a.key) || SCRUB_ANIMATE.has(a.key))) {
        const v = scanDecode(a.value);
        const bad = SCRUB_URL.has(a.key) ? scrubBad(v) : /(javascript|vbscript|data):/i.test(v.replace(/[\u0000-\u0020\u007f]+/g, ''));
        if (bad) put = SCRUB_URL.has(a.key) ? a.name + '="#"' : '';
        else if (a.value.includes('&') && !(a.quote === '"' && scrubEsc(v) === a.value)) put = a.name + '="' + scrubEsc(v) + '"';
      }
      if (put !== a.whole) changed = true;
      tag += a.gap + put;
    }
    out += changed ? tag + t.tail + '>' : s.slice(lt, t.end);
    if (t.name === 'iframe') {
      const e = scanRawEnd(s, i, 'iframe');
      if (e >= 0) i = e;
    }
  }
  return out;
}`;

// ../src/builder-core/render.ts
var CODE_SLOTTED = "sitereal-slotted:";
var SLOTTED_AT = new RegExp(`<!--${CODE_SLOTTED}([^>]*?)-->`, "g");
var IMG_PLACEHOLDER = placeholderImage(400, 300);
var PLACEHOLDER_DATA = placeholderImage();

// ../src/builder-core/entry-files.ts
var ENTRY_FILES_JS = String.raw`/* ---- the entry files of a content type, read (sitereal) ---- */
function entryFront(text, where) {
  var src = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  var m = /^---[ \t]*\n(?:([\s\S]*?)\n)?---[ \t]*(?:\n|$)/.exec(src);
  if (!m) return { data: {}, body: src };
  return { data: entryYaml(m[1] ? m[1].split('\n') : [], where), body: src.slice(m[0].length) };
}

/* YAML, as far as an entry needs it — and as far as a data file of an Astro
   collection needs it, which is the same language with one more answer at
   the top: a whole file may be a list ("list"), where frontmatter is always
   "key: value" lines. */
function entryYaml(lines, where, list) {
  var i = 0, here = 0;
  function fail(msg) { throw new Error(where + ': ' + msg + ' (frontmatter line ' + (here + 2) + ')'); }
  function ind(l) { return l.length - l.replace(/^ +/, '').length; }
  function skip() { while (i < lines.length && (!lines[i].trim() || /^\s*#/.test(lines[i]))) i++; }
  function isItem(l) { return /^ *-( |$)/.test(l); }
  var KEY = /^(["']?)([A-Za-z0-9_$][^:"']*?)\1[ \t]*:(?:[ \t]+(.*)|[ \t]*)$/;
  function map(n) {
    var out = {};
    for (;;) {
      skip();
      if (i >= lines.length) return out;
      var l = lines[i], k = ind(l);
      if (k < n) return out;
      if (k > n) fail('the indentation does not line up');
      if (isItem(l)) return out;
      here = i;
      var m = KEY.exec(l.slice(k));
      if (!m) fail('expected "key: value"');
      i++;
      out[m[2].trim()] = after(m[3] || '', n);
    }
  }
  function after(rest, n) {
    var r = rest.trim(), head = r.replace(/\s+#.*$/, '');
    /* a block's header may carry how much its text is indented, and a comment */
    if (/^[|>]([+-]?[1-9]?|[1-9][+-])$/.test(head)) return block(head, n);
    if (!r || r.charAt(0) === '#') {
      skip();
      if (i >= lines.length) return null;
      var k = ind(lines[i]);
      if (isItem(lines[i]) && k >= n) return seq(k);
      if (k > n) return map(k);
      return null;
    }
    return scalar(more(r, n));
  }
  /* A value that runs on over the lines under it, more indented than where
     it started: a text wrapped by hand, a list or a quoted string split
     across lines. YAML joins such lines with a space, and a blank line among
     them is a line break. A comment line ends it. */
  function more(r, n) {
    for (;;) {
      var j = i;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j >= lines.length || ind(lines[j]) <= n || /^\s*#/.test(lines[j])) return r;
      r += (j > i ? new Array(j - i + 1).join('\n') : ' ') + lines[j].trim();
      i = j + 1;
    }
  }
  function seq(n) {
    var out = [];
    for (;;) {
      skip();
      if (i >= lines.length) return out;
      var l = lines[i], k = ind(l);
      if (k !== n || !isItem(l)) { if (k > n) fail('the indentation does not line up'); return out; }
      here = i;
      var rest = l.slice(k + 1), body = rest.trim();
      if (!body || body.charAt(0) === '#') {
        i++;
        skip();
        if (i < lines.length && ind(lines[i]) > n) { var kk = ind(lines[i]); out.push(isItem(lines[i]) ? seq(kk) : map(kk)); }
        else out.push(null);
        continue;
      }
      if (KEY.test(body) && !/^[\[{]/.test(body)) {
        var at = k + 1 + (rest.length - rest.replace(/^ +/, '').length);
        lines[i] = new Array(at + 1).join(' ') + body;
        out.push(map(at));
        continue;
      }
      i++;
      out.push(scalar(more(body, n)));
    }
  }
  function block(h, n) {
    var keep = h.indexOf('+') > 0, strip = h.indexOf('-') > 0, fold = h.charAt(0) === '>';
    var got = [], base = /[1-9]/.test(h) ? n + Number(/[1-9]/.exec(h)[0]) : -1;
    while (i < lines.length) {
      var l = lines[i];
      if (l.trim()) {
        var k = ind(l);
        if (k <= n || (base >= 0 && k < base)) break;
        if (base < 0) base = k;
        got.push(l.slice(base));
      } else got.push('');
      i++;
    }
    var tail = 0;
    while (got.length && got[got.length - 1] === '') { got.pop(); tail++; }
    var text;
    if (fold) {
      text = '';
      for (var j = 0; j < got.length; j++) {
        if (!got[j]) text += '\n';
        else text += (j > 0 && got[j - 1] && !/\n$/.test(text) ? ' ' : '') + got[j];
      }
    } else text = got.join('\n');
    if (!got.length) return '';
    return text + (strip ? '' : keep ? new Array(tail + 2).join('\n') : '\n');
  }
  function scalar(r) {
    var p = { s: r, i: 0 };
    var v = flow(p, false);
    var left = r.slice(p.i).trim();
    if (left && left.charAt(0) !== '#') fail('unexpected "' + left + '"');
    return v;
  }
  function ws(p) { while (p.i < p.s.length && /\s/.test(p.s.charAt(p.i))) p.i++; }
  function flow(p, inFlow) {
    ws(p);
    var c = p.s.charAt(p.i);
    if (c === '"') return dq(p);
    if (c === "'") return sq(p);
    if (c === '[') {
      p.i++;
      var a = [];
      ws(p);
      if (p.s.charAt(p.i) === ']') { p.i++; return a; }
      for (;;) {
        a.push(flow(p, true));
        ws(p);
        var e = p.s.charAt(p.i);
        if (e === ',') { p.i++; ws(p); if (p.s.charAt(p.i) === ']') { p.i++; return a; } continue; }
        if (e === ']') { p.i++; return a; }
        fail('a list that does not close');
      }
    }
    if (c === '{') {
      p.i++;
      var o = {};
      ws(p);
      if (p.s.charAt(p.i) === '}') { p.i++; return o; }
      for (;;) {
        ws(p);
        var q = p.s.charAt(p.i);
        var key = q === '"' ? dq(p) : q === "'" ? sq(p) : until(p, /[:,}]/).trim();
        ws(p);
        if (p.s.charAt(p.i) !== ':') fail('expected ":" in a map');
        p.i++;
        o[String(key)] = flow(p, true);
        ws(p);
        var f = p.s.charAt(p.i);
        if (f === ',') { p.i++; continue; }
        if (f === '}') { p.i++; return o; }
        fail('a map that does not close');
      }
    }
    var raw = inFlow ? until(p, /[,\]}]/) : until(p, null);
    return typed(raw);
  }
  function until(p, stop) {
    var start = p.i;
    while (p.i < p.s.length) {
      var c = p.s.charAt(p.i);
      if (stop && stop.test(c)) break;
      if (c === '#' && p.i > start && /\s/.test(p.s.charAt(p.i - 1))) break;
      p.i++;
    }
    return p.s.slice(start, p.i);
  }
  function dq(p) {
    var out = '';
    p.i++;
    var ESC = { '0': '\0', a: '\x07', b: '\b', t: '\t', '\t': '\t', n: '\n', v: '\v', f: '\f', r: '\r', e: '\x1b', ' ': ' ', '"': '"', '/': '/', '\\': '\\', N: '\x85', _: '\xa0', L: '\u2028', P: '\u2029' };
    while (p.i < p.s.length) {
      var c = p.s.charAt(p.i);
      if (c === '"') { p.i++; return out; }
      if (c === '\\') {
        var d = p.s.charAt(p.i + 1);
        var hex = d === 'x' ? 2 : d === 'u' ? 4 : d === 'U' ? 8 : 0;
        if (hex) {
          var h = p.s.slice(p.i + 2, p.i + 2 + hex);
          if (!/^[0-9a-fA-F]+$/.test(h) || h.length !== hex) fail('a broken escape in a quoted string');
          out += String.fromCodePoint(parseInt(h, 16));
          p.i += 2 + hex;
          continue;
        }
        if (!(d in ESC)) fail('an unknown escape \\' + d);
        out += ESC[d];
        p.i += 2;
        continue;
      }
      out += c;
      p.i++;
    }
    fail('a quoted string that does not close on its line');
  }
  function sq(p) {
    var out = '';
    p.i++;
    while (p.i < p.s.length) {
      var c = p.s.charAt(p.i);
      if (c === "'") {
        if (p.s.charAt(p.i + 1) === "'") { out += "'"; p.i += 2; continue; }
        p.i++;
        return out;
      }
      out += c;
      p.i++;
    }
    fail('a quoted string that does not close on its line');
  }
  function typed(raw) {
    var s = raw.trim();
    if (s === '' || s === '~' || /^(null|Null|NULL)$/.test(s)) return null;
    if (/^(true|True|TRUE)$/.test(s)) return true;
    if (/^(false|False|FALSE)$/.test(s)) return false;
    /* a number — but never one with a leading zero, which is a code (a
       postcode, an id) far more often than it is an octal */
    if (/^[-+]?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][-+]?[0-9]+)?$/.test(s)) return Number(s);
    return s;
  }
  skip();
  return list && i < lines.length && isItem(lines[i]) ? seq(ind(lines[i])) : map(0);
}

/* ---- Markdown ------------------------------------------------------------
   CommonMark's common ground — headings, paragraphs, emphasis, links,
   pictures, lists, quotes, code, rules, tables — written out the way a
   Long text's HTML is serialized, so a block converted from it converts back
   to exactly what it was. A line that starts with a block-level tag is HTML
   and runs to the next blank line. */
var ENTRY_BLOCK_TAGS = /^<\/?(address|article|aside|blockquote|details|dialog|div|dl|dt|dd|figure|figcaption|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|thead|tbody|tfoot|tr|td|th|ul|video|audio|iframe|picture|source|sitereal-component|script|style|svg|template|summary)(?=[\s>\/])|^<!--/i;
var ENTRY_TAG = /^(?:<\/?[a-zA-Z][\w-]*(?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>\x60]+))?)*\s*\/?>|<!--[\s\S]*?-->)/;

function entryEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\u00a0/g, '&nbsp;');
}
function entryAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/\u00a0/g, '&nbsp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function entryMarkdown(md) {
  var lines = String(md).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  return entryBlocks(lines).join('\n');
}

function entryIndent(l) { return l.length - l.replace(/^ +/, '').length; }
var ENTRY_ITEM = /^( *)([-*+]|([0-9]{1,9})[.)])( +|$)/;
function entryStarts(l) {
  return /^ {0,3}(#{1,6})( |$)/.test(l) || /^ {0,3}(\x60{3,}|~{3,})/.test(l) || /^ {0,3}([-*_])( *\1){2,} *$/.test(l)
    || /^ {0,3}>/.test(l) || ENTRY_ITEM.test(l) || ENTRY_BLOCK_TAGS.test(l.replace(/^ {0,3}/, ''));
}

function entryBlocks(lines) {
  var out = [], i = 0, m;
  while (i < lines.length) {
    var l = lines[i];
    if (!l.trim()) { i++; continue; }
    var t = l.replace(/^ {0,3}/, '');
    if (ENTRY_BLOCK_TAGS.test(t)) {
      var raw = [];
      while (i < lines.length && lines[i].trim()) raw.push(lines[i++]);
      out.push(raw.join('\n'));
      continue;
    }
    if ((m = /^ {0,3}(\x60{3,}|~{3,})[ \t]*([^\s\x60]*)[^\x60]*$/.exec(l))) {
      var fence = m[1], lang = m[2], code = [];
      i++;
      while (i < lines.length && !new RegExp('^ {0,3}' + fence.charAt(0) + '{' + fence.length + ',} *$').test(lines[i])) code.push(lines[i++]);
      i++;
      out.push('<pre><code' + (lang ? ' class="language-' + entryAttr(lang) + '"' : '') + '>' + entryEsc(code.join('\n')) + '</code></pre>');
      continue;
    }
    if ((m = /^ {0,3}(#{1,6})(?: +(.*?))?(?: +#+)? *$/.exec(l))) {
      out.push('<h' + m[1].length + '>' + entryInline(m[2] || '') + '</h' + m[1].length + '>');
      i++;
      continue;
    }
    if (/^ {0,3}([-*_])( *\1){2,} *$/.test(l)) { out.push('<hr>'); i++; continue; }
    if (/^ {0,3}>/.test(l)) {
      var q = [];
      while (i < lines.length && /^ {0,3}>/.test(lines[i])) q.push(lines[i++].replace(/^ {0,3}> ?/, ''));
      var plain = q.every(function (x) { return x.trim() && !entryStarts(x); });
      out.push('<blockquote>' + (plain ? entryInline(q.join('\n')) : entryBlocks(q).join('\n')) + '</blockquote>');
      continue;
    }
    if (ENTRY_ITEM.test(l)) { var lst = entryList(lines, i); out.push(lst.html); i = lst.end; continue; }
    if (/^ {0,3}\|/.test(l) && i + 1 < lines.length && /^ {0,3}\|? *:?-+:? *(\| *:?-+:? *)*\|? *$/.test(lines[i + 1]) && lines[i + 1].indexOf('-') >= 0) {
      var tb = entryTable(lines, i);
      out.push(tb.html);
      i = tb.end;
      continue;
    }
    var para = [l.replace(/^ +/, '')];
    i++;
    while (i < lines.length && lines[i].trim() && !entryStarts(lines[i])) para.push(lines[i++].replace(/^ +/, ''));
    out.push('<p>' + entryInline(para.join('\n').replace(/ +$/, '')) + '</p>');
  }
  return out;
}

function entryList(lines, i) {
  var first = ENTRY_ITEM.exec(lines[i]);
  var base = first[1].length, ordered = !!first[3], start = ordered ? Number(first[3]) : 1;
  var items = [];
  while (i < lines.length) {
    var m = ENTRY_ITEM.exec(lines[i]);
    if (!m || m[1].length !== base || !!m[3] !== ordered) break;
    var body = [lines[i].slice(m[0].length)], loose = false;
    i++;
    while (i < lines.length) {
      var l = lines[i];
      if (!l.trim()) {
        var k = i;
        while (k < lines.length && !lines[k].trim()) k++;
        if (k < lines.length && entryIndent(lines[k]) > base) { loose = true; while (i < k) { body.push(''); i++; } continue; }
        break;
      }
      if (entryIndent(l) <= base) break;
      body.push(l.slice(Math.min(entryIndent(l), m[0].length)));
      i++;
    }
    items.push(entryItem(body, loose));
  }
  var tag = ordered ? 'ol' : 'ul';
  return { html: '<' + tag + (ordered && start !== 1 ? ' start="' + start + '"' : '') + '>' + items.join('') + '</' + tag + '>', end: i };
}

function entryItem(body, loose) {
  if (loose) return '<li>' + entryBlocks(body).join('\n') + '</li>';
  var k = 0;
  while (k < body.length && body[k].trim() && !(k > 0 && entryStarts(body[k]))) k++;
  var text = body.slice(0, k).join('\n').replace(/ +$/, '');
  var rest = entryBlocks(body.slice(k));
  return '<li>' + entryInline(text) + rest.join('') + '</li>';
}

function entryTable(lines, i) {
  var cells = function (l) {
    var s = l.trim().replace(/^\|/, '').replace(/\|$/, '');
    var out = [], cur = '', code = false;
    for (var j = 0; j < s.length; j++) {
      var c = s.charAt(j);
      if (c === '\\' && s.charAt(j + 1) === '|') { cur += '|'; j++; continue; }
      if (c === '\x60') code = !code;
      if (c === '|' && !code) { out.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    out.push(cur.trim());
    return out;
  };
  var head = cells(lines[i]);
  i += 2;
  var rows = [];
  while (i < lines.length && lines[i].trim() && /\|/.test(lines[i])) rows.push(cells(lines[i++]));
  var tr = function (cs, tag) { return '<tr>' + cs.map(function (c) { return '<' + tag + '>' + entryInline(c) + '</' + tag + '>'; }).join('') + '</tr>'; };
  return {
    html: '<table><thead>' + tr(head, 'th') + '</thead>' + (rows.length ? '<tbody>' + rows.map(function (r) { return tr(r, 'td'); }).join('') + '</tbody>' : '') + '</table>',
    end: i,
  };
}

function entryInline(s) {
  var out = '', i = 0, n = s.length, m;
  while (i < n) {
    var c = s.charAt(i), rest = s.slice(i);
    if (c === '\\' && i + 1 < n) {
      var d = s.charAt(i + 1);
      if (d === '\n') { out += '<br>'; i += 2; continue; }
      if (/[!-\/:-@\[-\x60{-~]/.test(d)) { out += entryEsc(d); i += 2; continue; }
    }
    if (c === '\x60') {
      var run = /^\x60+/.exec(rest)[0];
      var end = entryCodeEnd(s, i + run.length, run);
      if (end >= 0) {
        var code = s.slice(i + run.length, end).replace(/\n/g, ' ');
        if (/^ .*[^ ].* $/.test(code)) code = code.slice(1, -1);
        out += '<code>' + entryEsc(code) + '</code>';
        i = end + run.length;
        continue;
      }
      out += run;
      i += run.length;
      continue;
    }
    if (c === '<') {
      if ((m = ENTRY_TAG.exec(rest))) { out += m[0]; i += m[0].length; continue; }
      if ((m = /^<((?:https?|mailto):[^\s<>]*)>/.exec(rest))) { out += '<a href="' + entryAttr(m[1]) + '">' + entryEsc(m[1]) + '</a>'; i += m[0].length; continue; }
      out += '&lt;';
      i++;
      continue;
    }
    if (c === '&') {
      if ((m = /^&(?:#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,31});/.exec(rest))) { out += m[0]; i += m[0].length; continue; }
      out += '&amp;';
      i++;
      continue;
    }
    if (c === '>') { out += '&gt;'; i++; continue; }
    if (c === '\u00a0') { out += '&nbsp;'; i++; continue; }
    if (c === '!' && s.charAt(i + 1) === '[') {
      var im = entryLink(s, i + 1);
      if (im) {
        out += '<img src="' + entryAttr(im.href) + '" alt="' + entryAttr(entryPlain(im.text)) + '"' + (im.title !== null ? ' title="' + entryAttr(im.title) + '"' : '') + '>';
        i = im.end;
        continue;
      }
    }
    if (c === '[') {
      var ln = entryLink(s, i);
      if (ln) {
        out += '<a href="' + entryAttr(ln.href) + '"' + (ln.title !== null ? ' title="' + entryAttr(ln.title) + '"' : '') + '>' + entryInline(ln.text) + '</a>';
        i = ln.end;
        continue;
      }
    }
    if (c === '*' || c === '_' || c === '~') {
      var em = entryEmph(s, i);
      if (em) { out += em.html; i = em.end; continue; }
      var same = /^([*_~])\1*/.exec(rest)[0];
      out += same;
      i += same.length;
      continue;
    }
    if (c === ' ' && (m = /^ {2,}\n/.exec(rest))) { out += '<br>'; i += m[0].length; continue; }
    out += c;
    i++;
  }
  return out;
}

function entryCodeEnd(s, from, run) {
  var j = from;
  while ((j = s.indexOf(run, j)) >= 0) {
    if (s.charAt(j + run.length) !== '\x60' && s.charAt(j - 1) !== '\x60') return j;
    j += run.length;
  }
  return -1;
}

function entryPlain(s) { return String(s).replace(/[*_~\x60]/g, '').replace(/\\(.)/g, '$1'); }

function entryLink(s, i) {
  var depth = 0, j = i;
  for (; j < s.length; j++) {
    var c = s.charAt(j);
    if (c === '\\') { j++; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (!depth) break; }
  }
  if (depth || s.charAt(j + 1) !== '(') return null;
  var text = s.slice(i + 1, j), k = j + 2, href = '', title = null;
  while (s.charAt(k) === ' ') k++;
  if (s.charAt(k) === '<') {
    var close = s.indexOf('>', k);
    if (close < 0) return null;
    href = s.slice(k + 1, close);
    k = close + 1;
  } else {
    var par = 0, st = k;
    for (; k < s.length; k++) {
      var d = s.charAt(k);
      if (d === '\\') { k++; continue; }
      if (/\s/.test(d)) break;
      if (d === '(') par++;
      else if (d === ')') { if (!par) break; par--; }
    }
    href = s.slice(st, k);
  }
  while (s.charAt(k) === ' ') k++;
  var q = s.charAt(k);
  if (q === '"' || q === "'") {
    var e = k + 1;
    while (e < s.length && s.charAt(e) !== q) { if (s.charAt(e) === '\\') e++; e++; }
    title = s.slice(k + 1, e).replace(/\\(.)/g, '$1');
    k = e + 1;
    while (s.charAt(k) === ' ') k++;
  }
  if (s.charAt(k) !== ')') return null;
  return { text: text, href: href.replace(/\\([!-\/:-@\[-\x60{-~])/g, '$1'), title: title, end: k + 1 };
}

function entryEmph(s, i) {
  var m = /^(\*\*|__|~~|\*|_)/.exec(s.slice(i));
  if (!m) return null;
  var d = m[1], c = d.charAt(0);
  var next = s.charAt(i + d.length);
  if (!next || /\s/.test(next)) return null;
  if (c === '_' && i > 0 && /[A-Za-z0-9]/.test(s.charAt(i - 1))) return null;
  var j = i + d.length;
  while (j < s.length) {
    var ch = s.charAt(j);
    if (ch === '\\') { j += 2; continue; }
    if (ch === '\x60') {
      var run = /^\x60+/.exec(s.slice(j))[0];
      var e = entryCodeEnd(s, j + run.length, run);
      j = e < 0 ? j + run.length : e + run.length;
      continue;
    }
    if (ch === '<') { var t = ENTRY_TAG.exec(s.slice(j)); if (t) { j += t[0].length; continue; } }
    if (ch === '[') { var ln = entryLink(s, j); if (ln) { j = ln.end; continue; } }
    if (ch === c) {
      var r = new RegExp('^\\' + c + '+').exec(s.slice(j))[0];
      var prev = s.charAt(j - 1), after = s.charAt(j + r.length);
      var closes = prev && !/\s/.test(prev) && !(c === '_' && after && /[A-Za-z0-9]/.test(after));
      if (closes && r.length >= d.length && j > i + d.length) {
        if (r.length === d.length || (d.length === 1 && r.length === 3) || (d.length === 2 && r.length === 3)) {
          var at = d.length === 2 && r.length === 3 ? j + 1 : j;
          var tag = d === '**' || d === '__' ? 'strong' : d === '~~' ? 's' : 'em';
          return { html: '<' + tag + '>' + entryInline(s.slice(i + d.length, at)) + '</' + tag + '>', end: at + d.length };
        }
      }
      j += r.length;
      continue;
    }
    j++;
  }
  return null;
}

/* ---- a Long text, a picture and a gallery, as the data file says them ---- */
function entryRich(v) {
  var s = typeof v === 'string' ? v : v == null ? '' : String(v);
  if (!s.trim()) return '';
  if (/<\/?(p|h[1-6]|ul|ol|li|blockquote|strong|em|b|i|a|br|img|hr|figure|figcaption|code|pre)\b[^>]*>/i.test(s)) return s;
  return s.split(/\n{2,}/).map(function (x) { return x.trim(); }).filter(Boolean)
    .map(function (x) { return '<p>' + x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</p>'; }).join('\n');
}
function entryFocus(f) {
  var m = String(f == null ? '' : f).match(/^\s*(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%\s*$/);
  if (!m) return '';
  return m[1] === '50' && m[2] === '50' ? '' : m[1] + '% ' + m[2] + '%';
}
function entryResolution(v) {
  if (v === 'original') return 'original';
  var n = Math.round(Number(v));
  return isFinite(n) && n > 0 ? n : 'auto';
}
function entryValue(f, raw) {
  if (f.type === 'group') {
    var r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    var o = {};
    (f.fields || []).forEach(function (sf) { o[sf.key] = entryValue(sf, r[sf.key] == null ? null : r[sf.key]); });
    return o;
  }
  if (f.type === 'repeater') {
    return (Array.isArray(raw) ? raw : []).map(function (row) {
      var rr = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
      var o = {};
      (f.fields || []).forEach(function (sf) { o[sf.key] = entryValue(sf, rr[sf.key] == null ? null : rr[sf.key]); });
      return o;
    });
  }
  if (f.type === 'richtext') return raw == null ? null : entryRich(raw);
  if (f.type === 'gallery') {
    return (Array.isArray(raw) ? raw : []).map(function (g) {
      if (typeof g === 'string') return g ? { src: g } : null;
      return g && typeof g === 'object' && typeof g.src === 'string' && g.src ? g : null;
    }).filter(Boolean).map(function (g) {
      return { src: g.src, alt: g.alt == null ? '' : g.alt, focus: entryFocus(g.focus) || null, resolution: entryResolution(g.resolution) };
    });
  }
  if (f.type === 'relation') {
    var ids = [].concat(raw == null ? [] : raw).filter(function (x) { return typeof x === 'string' && x; });
    return f.many ? ids : (ids[0] || null);
  }
  return raw == null ? null : raw;
}

/* ---- the rows ---------------------------------------------------------------
   One per entry file, in the order the files say (its order, then when it
   was made, then the file's name), drafts left out — the rows a data file would
   hold for the same entries. */
function entryParse(name, text, schema) {
  var where = schema.label + ': ' + name;
  if (/\.json$/i.test(name)) {
    var d;
    try { d = JSON.parse(text); } catch (e) { throw new Error(where + ' is not JSON — ' + e.message); }
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error(where + ' does not hold one entry');
    return { data: d, body: null };
  }
  var f = entryFront(text, where);
  if (!f.data || typeof f.data !== 'object' || Array.isArray(f.data)) throw new Error(where + ': the frontmatter does not hold one entry');
  return f;
}
function entryStem(name) { return String(name).split('/').pop().replace(/\.(md|markdown|json)$/i, ''); }
function entryIdOf(data, name) { return typeof data.id === 'string' && data.id ? data.id : 'file-' + entryStem(name); }
function entrySorted(list) {
  return list.sort(function (a, b) {
    var x = typeof a.data.order === 'number' ? a.data.order : Infinity;
    var y = typeof b.data.order === 'number' ? b.data.order : Infinity;
    if (x !== y) return x < y ? -1 : 1;
    var cx = String(a.data.created || ''), cy = String(b.data.created || '');
    if (cx !== cy) return cx < cy ? -1 : 1;
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
}
/* A field named like one of the file's own keys is written as <key>_field —
   the file's id, created, order and draft would otherwise say it for it. */
function entryFileKey(k) {
  return k === 'id' || k === 'created' || k === 'order' || k === 'draft' ? k + '_field' : k;
}
function entryRow(e, schema) {
  var data = e.data, id = entryIdOf(data, e.name);
  var row = { id: id, created: typeof data.created === 'string' ? data.created : null };
  schema.fields.forEach(function (f) {
    var raw = f.key === schema.body && e.body !== null && e.body.trim() ? entryMarkdown(e.body) : data[entryFileKey(f.key)];
    row[f.key] = entryValue(f, raw === undefined ? null : raw);
    if (f.type === 'image') {
      row[f.key + '_alt'] = String(data[f.key + '_alt'] == null ? '' : data[f.key + '_alt']);
      row[f.key + '_focus'] = entryFocus(data[f.key + '_focus']) || null;
      row[f.key + '_resolution'] = entryResolution(data[f.key + '_resolution']);
    }
  });
  row.slug = entrySlugOf({ slug: schema.slug ? row[schema.slug] : undefined, title: schema.title ? row[schema.title] : undefined }, id);
  if (schema.prefix !== null) row.url = (/^https?:/.test(schema.prefix) ? '' : '/') + schema.prefix + row.slug;
  schema.taxonomies.forEach(function (t) {
    var tk = entryFileKey(t.key);
    var slugs = Array.isArray(data[tk]) ? data[tk].filter(function (x) { return typeof x === 'string'; }) : [];
    row[t.key] = slugs;
    row[t.key + '_terms'] = slugs.map(function (s) {
      var hit = t.terms.filter(function (x) { return x.slug === s; })[0];
      return { name: hit ? hit.name : s, slug: s };
    });
  });
  /* beside each date, the words for it, as the data file has them */
  if (schema.dates) schema.dates.keys.forEach(function (k) {
    var words = entryDateText(row[k], schema.dates.locale, schema.dates.style, !!schema.dates.times && schema.dates.times.indexOf(k) >= 0);
    if (words && !((k + '_text') in row)) row[k + '_text'] = words;
  });
  /* and beside a number with a unit, the number as the language writes it */
  if (schema.numbers) schema.numbers.keys.forEach(function (n) {
    var words = entryNumberText(row[n.key], schema.numbers.locale, n.prefix, n.suffix);
    if (words && !((n.key + '_text') in row)) row[n.key + '_text'] = words;
  });
  return row;
}
function entryRows(files, schema) {
  var all = Object.keys(files).map(function (path) {
    var name = path.split('/').pop();
    return { name: name, path: path, lang: entryLangOf(name, schema) };
  });
  var list = entrySorted(all.filter(function (f) { return !f.lang; }).map(function (f) {
    var got = entryParse(f.name, files[f.path], schema);
    return { name: f.name, data: got.data, body: got.body };
  })).filter(function (e) { return e.data.draft !== true; });
  if (!schema.languages) return list.map(function (e) { return entryRow(e, schema); });
  /* A site with languages: a file named post.de.md is the German of post.md,
     a complete entry. The primary's reader lists the primary's files; a
     language's lists each entry in its file there — or in the primary's
     words, where the type says so — and every row carries its addresses. */
  var tr = {};
  all.forEach(function (f) {
    if (!f.lang) return;
    var stem = entryStem(f.name);
    stem = stem.slice(0, stem.length - f.lang.length - 1);
    (tr[stem] = tr[stem] || {})[f.lang] = f;
  });
  var parsed = function (f) { return entryParse(f.name, files[f.path], schema); };
  var rows = [];
  list.forEach(function (e) {
    var stem = entryStem(e.name);
    var row = null;
    if (!schema.code) row = entryRow(e, schema);
    else {
      var f = schema.translated && tr[stem] ? tr[stem][schema.code] : null;
      var got = f ? parsed(f) : null;
      /* a language's file saying draft: the entry is left out of that language */
      if (got && got.data.draft === true) row = null;
      else if (got) row = entryRow({ name: e.name, data: got.data, body: got.body }, schema);
      else if (!schema.translated || schema.missing === 'primary') {
        row = entryRow(e, Object.assign({}, schema, { prefix: schema.primaryPrefix == null ? null : schema.primaryPrefix }));
        if (schema.translated) row.lang = schema.primary;
      }
    }
    if (!row) return;
    if (schema.urls) row.urls = entryUrlsOf(e, tr[stem] || {}, parsed, schema);
    if (schema.optionLabels) Object.keys(schema.optionLabels).forEach(function (k) {
      var v = row[k], words = schema.optionLabels[k];
      if (!((k + '_label') in row)) row[k + '_label'] = typeof v === 'string' ? (words[v] == null ? v : words[v]) : v == null ? null : v;
    });
    rows.push(row);
  });
  return rows;
}
/* Which language a file is the translation in, by its name, or null. */
function entryLangOf(name, schema) {
  if (!schema.languages) return null;
  var m = /\.([A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)\.(md|markdown|json)$/.exec(String(name));
  return m && schema.languages.indexOf(m[1]) >= 0 ? m[1] : null;
}
/* An entry's address in each language it has a file in, the primary's first. */
function entryUrlsOf(e, mine, parsed, schema) {
  var id = entryIdOf(e.data, e.name);
  var slugOf = function (data) {
    return entrySlugOf({ slug: schema.slug ? data[entryFileKey(schema.slug)] : undefined, title: schema.title ? data[entryFileKey(schema.title)] : undefined }, id);
  };
  var out = {};
  out[schema.primary] = (/^https?:/.test(schema.urls[schema.primary]) ? '' : '/') + schema.urls[schema.primary] + slugOf(e.data);
  Object.keys(schema.urls).forEach(function (code) {
    if (code === schema.primary || !mine[code]) return;
    var data = parsed(mine[code]).data;
    if (data.draft === true) return;
    out[code] = (/^https?:/.test(schema.urls[code]) ? '' : '/') + schema.urls[code] + slugOf(data);
  });
  return out;
}
var entryDateText = ` + DATE_TEXT_JS + ";\nvar entryNumberText = " + NUMBER_TEXT_JS + ";\n";

// ../src/builder-core/snippet-read.ts
function snippetPlacement(placement, lang) {
  if (placement === "head" || placement === "body-end") return placement;
  if (placement === "body") return "body-end";
  if (placement === void 0 || placement === null) return lang === "css" ? "head" : "body-end";
  return void 0;
}
function normalizeSnippet(s) {
  const scope = s.applyTo;
  return {
    ...s,
    placement: snippetPlacement(s.placement, s.lang) ?? "body-end",
    enabled: !!s.enabled,
    applyTo: scope && typeof scope === "object" && !Array.isArray(scope) ? s.applyTo : {}
  };
}

// ../src/builder-core/buttons.ts
var BUTTON_TOKENS = [
  // shape
  { key: "display", label: "Display", value: "inline-flex", group: "shape" },
  { key: "justify-content", label: "Justify", value: "center", group: "shape" },
  { key: "align-items", label: "Align items", value: "center", group: "shape" },
  { key: "text-align", label: "Text align", value: "center", group: "shape" },
  { key: "padding-block", label: "Padding block", value: "0.8em", group: "shape" },
  { key: "padding-inline", label: "Padding inline", value: "1.3em", group: "shape" },
  { key: "gap", label: "Gap (icon \u2194 label)", value: "0.5em", group: "shape" },
  /* `fit-content`, not `auto`. A button is `inline-flex`, so on its own the
     two are the same thing — but as a *flex or grid item* `auto` resolves to
     the container's `stretch`, and a Container is a column: dropping a button
     into one made it as wide as the page, which is not what anybody has ever
     meant by adding a button. `fit-content` is the same shrink-to-fit at
     every one of those, and `.btn--block` still says full width out loud. */
  { key: "width", label: "Inline size", value: "fit-content", group: "shape" },
  { key: "min-width", label: "Min inline size", value: "0px", group: "shape" },
  { key: "border-radius", label: "Radius", value: "var(--radius-m)", group: "shape" },
  { key: "border-width", label: "Border width", value: "var(--border-width)", group: "shape" },
  { key: "border-style", label: "Border style", value: "solid", group: "shape" },
  // type
  { key: "font-family", label: "Font", value: "var(--font-primary)", group: "type" },
  { key: "font-size", label: "Font size", value: "1em", group: "type" },
  { key: "font-weight", label: "Weight", value: "600", group: "type" },
  { key: "font-style", label: "Style", value: "normal", group: "type" },
  { key: "line-height", label: "Line height", value: "1.2", group: "type" },
  { key: "letter-spacing", label: "Letter spacing", value: "0", group: "type" },
  { key: "text-transform", label: "Text transform", value: "none", group: "type" },
  { key: "text-decoration", label: "Decoration", value: "none", group: "type" },
  // color — the tone, and the wiring every variant can re-point
  { key: "tone", label: "Tone", value: "var(--primary)", group: "color", color: true },
  {
    key: "tone-hover",
    label: "Tone \xB7 hover",
    value: "var(--primary-600)",
    group: "color",
    color: true,
    auto: (c2) => c2.shadeVars ? "var(--primary-600)" : "var(--primary)"
  },
  {
    key: "tone-contrast",
    label: "Contrast (text on the tone)",
    value: "#ffffff",
    group: "color",
    color: true,
    auto: (c2) => readableOn(c2.colors.primary?.hex ?? "#000000")
  },
  {
    key: "tone-soft",
    label: "Soft (tinted fill)",
    value: "var(--primary-10)",
    group: "color",
    color: true,
    auto: (c2) => c2.transparencyVars ? "var(--primary-10)" : c2.shadeVars ? "var(--primary-100)" : "transparent"
  },
  { key: "background", label: "Background", value: "var(--btn-tone)", group: "color", wire: true, color: true },
  { key: "text-color", label: "Text color", value: "var(--btn-tone-contrast)", group: "color", wire: true, color: true },
  { key: "border-color", label: "Border color", value: "var(--btn-background)", group: "color", wire: true, color: true },
  { key: "background-hover", label: "Background \xB7 hover", value: "var(--btn-tone-hover)", group: "color", wire: true, color: true },
  { key: "text-color-hover", label: "Text color \xB7 hover", value: "var(--btn-text-color)", group: "color", wire: true, color: true },
  { key: "border-color-hover", label: "Border color \xB7 hover", value: "var(--btn-background-hover)", group: "color", wire: true, color: true },
  { key: "focus-color", label: "Focus ring", value: "var(--btn-tone)", group: "color", wire: true, color: true },
  // motion
  /* Named, never all: what a hover changes is the paint, the shadow and the
     lift, and a transition on everything also animates whatever the motion
     runtime or a layout change writes. */
  { key: "transition", label: "Transition", value: "background-color var(--transition), color var(--transition), border-color var(--transition), box-shadow var(--transition), translate var(--transition)", group: "motion" },
  { key: "hover-lift", label: "Hover lift", value: "0px", group: "motion" },
  { key: "active-shift", label: "Active shift", value: "1px", group: "motion" },
  { key: "shadow", label: "Shadow", value: "none", group: "motion" },
  { key: "shadow-hover", label: "Shadow \xB7 hover", value: "var(--btn-shadow)", group: "motion", wire: true }
];
var RENAMED = {
  accent: "tone",
  "accent-hover": "tone-hover",
  "accent-contrast": "tone-contrast",
  "accent-soft": "tone-soft",
  bg: "background",
  color: "text-color",
  "bg-hover": "background-hover",
  "color-hover": "text-color-hover",
  radius: "border-radius"
};
var renameRefs = (value) => value.replace(/--btn-([a-z-]+)/g, (whole, key) => RENAMED[key] ? `--btn-${RENAMED[key]}` : whole);
var renameTokens = (tokens) => {
  if (!tokens) return tokens;
  const out2 = {};
  for (const [key, value] of Object.entries(tokens)) out2[RENAMED[key] ?? key] = renameRefs(value);
  return out2;
};
var withNewBuiltins = (variants) => {
  const have = new Set(variants.map((v2) => v2.id));
  const shipped = DEFAULT_BUTTONS.variants.map((v2) => v2.id);
  const out2 = [...variants];
  for (const v2 of DEFAULT_BUTTONS.variants) {
    if (have.has(v2.id)) continue;
    const before = shipped.slice(0, shipped.indexOf(v2.id));
    let at = -1;
    out2.forEach((x, i) => {
      if (before.includes(x.id)) at = i;
    });
    out2.splice(at + 1, 0, { ...v2 });
  }
  return out2;
};
function migrateButtons(cfg) {
  return {
    ...cfg,
    tokens: renameTokens(cfg.tokens) ?? {},
    variants: withNewBuiltins(cfg.variants).map((v2) => ({
      ...v2,
      ...v2.tokens ? { tokens: renameTokens(v2.tokens) } : {},
      ...v2.css ? { css: renameRefs(v2.css) } : {}
    }))
  };
}
var BUTTON_TOKEN_BY_KEY = Object.fromEntries(BUTTON_TOKENS.map((t) => [t.key, t]));
var BUTTON_TOKEN_KEYS = BUTTON_TOKENS.map((t) => t.key);
var SHADELESS = /* @__PURE__ */ new Set(["white", "black"]);
var towardContrast = (role, amount) => `color-mix(in oklab, var(--${role}) ${100 - amount}%, var(--btn-tone-contrast))`;
var color = (id, label, on = true) => ({ id, label, kind: "color", color: id, on, builtin: true });
var style = (id, label, tokens, css) => ({ id, label, kind: "style", on: true, builtin: true, tokens, ...css ? { css } : {} });
var size = (id, label, text, block, inline) => ({
  id,
  label,
  kind: "size",
  on: true,
  builtin: true,
  tokens: { "font-size": text, "padding-block": block, "padding-inline": inline }
});
var DEFAULT_BUTTONS = {
  baseClass: "btn",
  tokens: {},
  variants: [
    // colors — each just moves the accent; the palette decides the rest
    color("primary", "Primary"),
    color("secondary", "Secondary"),
    color("tertiary", "Tertiary"),
    color("accent", "Accent"),
    color("base", "Base"),
    color("neutral", "Neutral"),
    color("success", "Success"),
    color("warning", "Warning"),
    color("info", "Info"),
    color("danger", "Danger"),
    color("white", "White"),
    color("black", "Black"),
    /* Not a palette role but a deference: the primary button, with every one
       of its tokens wrapped in the theme's own. Inside `.theme--dark` it is
       whatever that theme says a button is; outside every theme it is exactly
       `.btn--primary`, because that is what the fallbacks are. It is the way
       in for a button that should follow the room — a color variant is a
       button that has been *told* which color it is, and being told outranks
       standing somewhere. */
    { id: "theme", label: "Theme", kind: "color", color: "primary", themed: true, on: true, builtin: true },
    // styles — how the tone is applied. Combine with any color variant.
    style("outline", "Outline", {
      background: "transparent",
      "text-color": "var(--btn-tone)",
      "border-color": "var(--btn-tone)",
      "background-hover": "var(--btn-tone)",
      "text-color-hover": "var(--btn-tone-contrast)",
      "border-color-hover": "var(--btn-tone)",
      shadow: "none"
    }),
    style("soft", "Soft", {
      background: "var(--btn-tone-soft)",
      "text-color": "var(--btn-tone)",
      "border-color": "transparent",
      "background-hover": "var(--btn-tone)",
      "text-color-hover": "var(--btn-tone-contrast)",
      shadow: "none"
    }),
    style("text", "Text", {
      background: "transparent",
      "text-color": "var(--btn-tone)",
      "border-color": "transparent",
      "background-hover": "var(--btn-tone-soft)",
      "text-color-hover": "var(--btn-tone-hover)",
      "border-color-hover": "transparent",
      shadow: "none",
      "padding-inline": "0.4em"
    }),
    style("pill", "Pill", { "border-radius": "999px" }),
    style("block", "Full width", { width: "100%" }),
    // sizes — `m` is the button itself, so it needs no class
    size("xs", "Extra small", "var(--text-xs)", "0.5em", "0.9em"),
    size("s", "Small", "var(--text-s)", "0.65em", "1.1em"),
    size("l", "Large", "var(--text-l)", "0.9em", "1.6em"),
    size("xl", "Extra large", "var(--text-xl)", "1em", "2em")
  ]
};
function rgb(hex) {
  const h2 = hex.replace("#", "");
  const v2 = h2.length === 3 ? h2.split("").map((x) => x + x).join("") : h2;
  const n = [v2.slice(0, 2), v2.slice(2, 4), v2.slice(4, 6)].map((p) => parseInt(p, 16));
  return [n[0] || 0, n[1] || 0, n[2] || 0];
}
function contrastRatio(a, b) {
  const lum = (hex) => {
    const [r2, g, b2] = rgb(hex).map((c2) => {
      const s = c2 / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r2 + 0.7152 * g + 0.0722 * b2;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
function readableOn(hex) {
  if (!/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex.trim())) return "#ffffff";
  const [r2, g, b] = rgb(hex).map((c2) => {
    const s = c2 / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r2 + 0.7152 * g + 0.0722 * b > 0.4 ? "#101014" : "#ffffff";
}
var buttonsOf = (cfg) => migrateButtons(cfg.buttons ?? DEFAULT_BUTTONS);
var buttonClass = (cfg) => buttonsOf(cfg).baseClass || "btn";
var paintSelector = (cfg) => {
  const cls = buttonClass(cfg);
  return `[class*="${cls}--"]:where(:not(.${cls}--none))`;
};
var shapeSelectors = (cfg) => [`.${buttonClass(cfg)}`, paintSelector(cfg)];
function variantClass(cfg, v2) {
  return `${buttonsOf(cfg).baseClass || "btn"}--${v2.id}`;
}
function buttonToken(cfg, key) {
  const override = buttonsOf(cfg).tokens?.[key];
  if (override !== void 0) return override;
  const field2 = BUTTON_TOKEN_BY_KEY[key];
  if (!field2) return "";
  return field2.auto ? field2.auto(cfg) : field2.value;
}
function variantActive(cfg, v2) {
  if (!v2.on) return false;
  if (v2.kind === "color" && v2.color) return cfg.colors[v2.color]?.on === true;
  return true;
}
var activeVariants = (cfg) => buttonsOf(cfg).variants.filter((v2) => variantActive(cfg, v2));
var THEME_WIRE = {
  tone: "--theme-btn",
  "tone-hover": "--theme-btn-hover",
  "tone-contrast": "--theme-btn-contrast",
  "tone-soft": "--theme-btn-soft",
  "focus-color": "--theme-btn-ring"
};
function variantTokens(cfg, v2) {
  const derived = {};
  if (v2.kind === "color" && v2.color) {
    const role = v2.color;
    const flat = SHADELESS.has(role);
    const shades = cfg.shadeVars && !flat;
    derived.tone = `var(--${role})`;
    derived["tone-hover"] = shades ? `var(--${role}-600)` : flat ? towardContrast(role, 12) : `var(--${role})`;
    derived["tone-contrast"] = readableOn(cfg.colors[role]?.hex ?? "#000000");
    derived["tone-soft"] = cfg.transparencyVars ? `var(--${role}-10)` : shades ? `var(--${role}-100)` : "transparent";
    derived["focus-color"] = shades ? `var(--${role}-200)` : flat ? towardContrast(role, 50) : `var(--${role})`;
    if (v2.themed) for (const [key, prop] of Object.entries(THEME_WIRE)) {
      if (derived[key]) derived[key] = `var(${prop}, ${derived[key]})`;
    }
  }
  return { ...derived, ...v2.tokens ?? {} };
}
var SHIPPED = Object.fromEntries(DEFAULT_BUTTONS.variants.map((v2) => [v2.id, v2]));
var buttonRootVars = (cfg) => BUTTON_TOKENS.filter((t) => !t.wire).map((t) => `--btn-${t.key}: ${buttonToken(cfg, t.key)};`);
var buttonWireVars = (cfg) => BUTTON_TOKENS.filter((t) => t.wire).map((t) => `--btn-${t.key}: ${buttonToken(cfg, t.key)};`);
function buttonPaintRules(cfg) {
  const sel = paintSelector(cfg);
  return [
    {
      selector: sel,
      css: [
        ...buttonWireVars(cfg),
        "background: var(--btn-background);",
        "color: var(--btn-text-color);",
        "border-color: var(--btn-border-color);",
        "box-shadow: var(--btn-shadow);"
      ].join("\n")
    },
    {
      /* Two selectors rather than `:is(:hover, :focus-visible)`: the generator
         drops each rule to zero specificity by splitting the selector on its
         commas and wrapping the parts, and a comma inside `:is()` is not a
         part boundary — it produced a selector that matched the whole page. */
      selector: `${sel}:hover, ${sel}:focus-visible`,
      css: [
        "background: var(--btn-background-hover);",
        "color: var(--btn-text-color-hover);",
        "border-color: var(--btn-border-color-hover);",
        "box-shadow: var(--btn-shadow-hover);"
      ].join("\n")
    },
    /* The ring's shape is the site's and its color is the button's: width,
       style and offset come from the Accessibility module's `--focus-*`, but
       the color has to contrast with the fill this button is painted in, so
       it stays `--btn-focus-color` and moves with the variant. Both are read
       with a fallback, so the rule says what it always said. */
    {
      selector: `${sel}:focus-visible`,
      css: "outline: var(--focus-width, 2px) var(--focus-style, solid) var(--btn-focus-color);\noutline-offset: var(--focus-offset, 2px);"
    }
  ];
}
function buttonVariantRules(cfg) {
  return activeVariants(cfg).map((v2) => {
    const decls = Object.entries(variantTokens(cfg, v2)).map(([k, val]) => `--btn-${k}: ${val};`);
    if (v2.css?.trim()) decls.push(v2.css.trim());
    return { selector: `.${variantClass(cfg, v2)}`, css: decls.join("\n") };
  }).filter((r2) => r2.css.trim());
}

// ../src/builder-core/textures.ts
var TEXTURE_PREFIX = "--texture-";
var texturePrefix = (slug) => `${TEXTURE_PREFIX}${slug}-`;
var textureVarName = (slug, name) => `${texturePrefix(slug)}${name}`;
var textureClass = (slug) => `texture--${slug}`;
var TEXTURE_VARS = [
  {
    name: "z-index",
    label: "Stacking",
    value: "0",
    input: "text",
    hint: "0 paints over the content, -1 behind it and still over the background."
  },
  { name: "opacity", label: "Opacity", value: "0.18", input: "number", min: 0, max: 1, step: 0.01 },
  {
    name: "blend",
    label: "Blend mode",
    value: "normal",
    input: "select",
    options: ["normal", "multiply", "screen", "overlay", "soft-light", "hard-light", "color-burn", "color-dodge", "darken", "lighten", "luminosity"]
  },
  {
    name: "size",
    label: "Tile size",
    value: "220px",
    input: "text",
    hint: "How big one repeat of the texture is."
  },
  { name: "position", label: "Position", value: "0 0", input: "text" },
  {
    name: "repeat",
    label: "Repeat",
    value: "repeat",
    input: "select",
    options: ["repeat", "repeat-x", "repeat-y", "no-repeat", "space", "round"]
  },
  {
    name: "inset",
    label: "Inset",
    value: "0",
    input: "text",
    hint: "How far the layer sits from the element\u2019s edges."
  },
  {
    name: "radius",
    label: "Radius",
    value: "inherit",
    input: "text",
    hint: "inherit follows the element\u2019s own corners."
  }
];
var svgUri = (svg) => `url("data:image/svg+xml,${svg.replace(/\n\s*/g, " ").replace(/"/g, "'").replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E")}")`;
var TEXTURE_KINDS = [
  {
    id: "noise",
    label: "Noise",
    hint: "fractal grain, generated by the browser",
    /* Baked, not live: feTurbulence takes its numbers from the SVG document,
       and no custom property reaches inside a data URI. Changing the grain is
       changing the picture. */
    params: [
      {
        name: "frequency",
        label: "Grain",
        value: "0.85",
        input: "number",
        min: 0.05,
        max: 3,
        step: 0.05,
        hint: "Higher is finer."
      },
      { name: "octaves", label: "Detail", value: "4", input: "number", min: 1, max: 8, step: 1 }
    ],
    image: (p) => svgUri(
      `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><filter id="t"><feTurbulence type="fractalNoise" baseFrequency="${p.frequency}" numOctaves="${p.octaves}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="180" height="180" filter="url(#t)"/></svg>`
    ),
    backgroundSize: (v2) => v2("size")
  },
  {
    id: "lines",
    label: "Lines",
    hint: "repeating stripes at an angle",
    vars: [
      { name: "color", label: "Line color", value: "currentColor", input: "color" },
      { name: "line", label: "Line width", value: "1px", input: "text" },
      { name: "angle", label: "Angle", value: "45deg", input: "text" }
    ],
    varDefaults: { size: "10px", opacity: "0.12" },
    image: (_, v2) => `repeating-linear-gradient(${v2("angle")}, ${v2("color")} 0 ${v2("line")}, transparent ${v2("line")} ${v2("size")})`,
    backgroundSize: () => "auto"
  },
  {
    id: "grid",
    label: "Grid",
    hint: "graph paper \u2014 two sets of lines",
    vars: [
      { name: "color", label: "Line color", value: "currentColor", input: "color" },
      { name: "line", label: "Line width", value: "1px", input: "text" }
    ],
    image: (_, v2) => [
      `repeating-linear-gradient(90deg, ${v2("color")} 0 ${v2("line")}, transparent ${v2("line")} ${v2("size")})`,
      `repeating-linear-gradient(0deg, ${v2("color")} 0 ${v2("line")}, transparent ${v2("line")} ${v2("size")})`
    ].join(", "),
    varDefaults: { size: "32px", opacity: "0.12" },
    backgroundSize: () => "auto"
  },
  {
    id: "dots",
    label: "Dots",
    hint: "a dot per tile",
    vars: [
      { name: "color", label: "Dot color", value: "currentColor", input: "color" },
      { name: "dot", label: "Dot size", value: "1.5px", input: "text" }
    ],
    varDefaults: { size: "16px", opacity: "0.16" },
    image: (_, v2) => `radial-gradient(circle at center, ${v2("color")} ${v2("dot")}, transparent ${v2("dot")})`,
    backgroundSize: (v2) => `${v2("size")} ${v2("size")}`
  },
  {
    id: "checks",
    label: "Checks",
    hint: "checkerboard",
    vars: [{ name: "color", label: "Color", value: "currentColor", input: "color" }],
    varDefaults: { size: "24px", opacity: "0.1" },
    image: (_, v2) => `conic-gradient(${v2("color")} 0 25%, transparent 0 50%, ${v2("color")} 0 75%, transparent 0)`,
    backgroundSize: (v2) => `${v2("size")} ${v2("size")}`
  },
  {
    id: "image",
    label: "Image",
    hint: "a file from the media library",
    params: [{ name: "url", label: "File", value: "", hint: "A path under public/, e.g. /textures/paper.png" }],
    image: (p) => p.url ? `url("${p.url}")` : "none",
    backgroundSize: (v2) => v2("size")
  },
  {
    id: "custom",
    label: "Custom",
    hint: "any background-image value you write",
    params: [{ name: "image", label: "Image value", value: "linear-gradient(0deg, transparent, transparent)" }],
    image: (p) => p.image || "none",
    backgroundSize: (v2) => v2("size")
  }
];
var TEXTURE_KIND_BY_ID = Object.fromEntries(TEXTURE_KINDS.map((k) => [k.id, k]));
function textureVars(slot) {
  const def = TEXTURE_KIND_BY_ID[slot.kind];
  const overrides = def?.varDefaults ?? {};
  return [
    ...TEXTURE_VARS.map((v2) => overrides[v2.name] !== void 0 ? { ...v2, value: overrides[v2.name] } : v2),
    ...def?.vars ?? []
  ];
}
var textureParams = (slot) => TEXTURE_KIND_BY_ID[slot.kind]?.params ?? [];
var textureVarValue = (slot, name) => slot.vars?.[name] ?? textureVars(slot).find((v2) => v2.name === name)?.value ?? "";
var textureParamValue = (slot, name) => slot.params?.[name] ?? textureParams(slot).find((p) => p.name === name)?.value ?? "";
var reader = (slot) => (name) => `var(${textureVarName(slot.slug, name)})`;
function textureImage(slot) {
  const def = TEXTURE_KIND_BY_ID[slot.kind];
  if (!def) return "none";
  const params = Object.fromEntries(textureParams(slot).map((p) => [p.name, textureParamValue(slot, p.name)]));
  return def.image(params, reader(slot));
}
function textureRules(slot) {
  const def = TEXTURE_KIND_BY_ID[slot.kind];
  if (!def) return [];
  const sel = `.${textureClass(slot.slug)}`;
  const layer = slot.layer === "before" ? "::before" : "::after";
  const v2 = reader(slot);
  const decls = [
    `${textureVarName(slot.slug, "image")}: ${textureImage(slot)};`,
    ...textureVars(slot).map((x) => `${textureVarName(slot.slug, x.name)}: ${textureVarValue(slot, x.name)};`),
    /* The layer is absolutely placed, so the element has to be a containing
       block — and `isolation` keeps a blend mode inside the element instead of
       letting it reach the page behind it, which is also what lets a negative
       stacking order sit behind the content and still over the background. */
    "position: relative;",
    "isolation: isolate;"
  ].join("\n");
  const paint = [
    "content: '';",
    "position: absolute;",
    `inset: ${v2("inset")};`,
    `z-index: ${v2("z-index")};`,
    `background-image: ${v2("image")};`,
    `background-size: ${def.backgroundSize ? def.backgroundSize(v2) : v2("size")};`,
    `background-position: ${v2("position")};`,
    `background-repeat: ${v2("repeat")};`,
    `opacity: ${v2("opacity")};`,
    `mix-blend-mode: ${v2("blend")};`,
    `border-radius: ${v2("radius")};`,
    /* A texture is a look, never a target: without this it would swallow every
       click that landed on the element it decorates. */
    "pointer-events: none;"
  ].join("\n");
  return [{ selector: sel, css: decls }, { selector: `${sel}${layer}`, css: paint }];
}
var activeTextures = (slots = []) => slots.filter((s) => s.on !== false && s.slug);

// ../src/builder-core/themes.ts
var THEME_PREFIX = "--theme-";
var themeClass = (slug) => `theme--${slug}`;
var THEME_VARS = [
  {
    name: "bg",
    label: "Background",
    value: "var(--white, #ffffff)",
    group: "anchor",
    hint: "What the region sits on. Everything else is mixed out of this and the text color."
  },
  {
    name: "fg",
    label: "Text",
    value: "var(--base-500, #101014)",
    group: "anchor",
    hint: "The ink. Inherited, so every paragraph, list and icon in here follows it."
  },
  { name: "heading", label: "Headings", value: `var(${THEME_PREFIX}fg)`, group: "text" },
  {
    name: "link",
    label: "Links",
    value: `var(${THEME_PREFIX}fg)`,
    group: "text",
    hint: "A link keeps its underline, so it stays a link at the text color."
  },
  {
    name: "link-hover",
    label: "Links \xB7 hover",
    group: "text",
    value: `color-mix(in oklab, var(${THEME_PREFIX}fg) 70%, var(${THEME_PREFIX}bg))`
  },
  {
    name: "surface",
    label: "Surface",
    group: "surface",
    value: `color-mix(in oklab, var(${THEME_PREFIX}fg) 6%, var(${THEME_PREFIX}bg))`,
    hint: "What sits slightly off the background \u2014 a form control, a card of your own."
  },
  {
    name: "border",
    label: "Borders",
    group: "surface",
    value: `color-mix(in oklab, var(${THEME_PREFIX}fg) 15%, transparent)`
  },
  {
    name: "border-strong",
    label: "Borders \xB7 strong",
    group: "surface",
    value: `color-mix(in oklab, var(${THEME_PREFIX}fg) 35%, transparent)`
  },
  /* The inverted button, and it is inverted by construction: the fill is the
     ink of the room and the label is its background, which is the one pair
     that is guaranteed to read whichever end the theme is at. */
  {
    name: "btn",
    label: "Button",
    value: `var(${THEME_PREFIX}fg)`,
    group: "button",
    hint: "The tone a button in here speaks in."
  },
  { name: "btn-contrast", label: "Button \xB7 label", value: `var(${THEME_PREFIX}bg)`, group: "button" },
  {
    name: "btn-hover",
    label: "Button \xB7 hover",
    group: "button",
    value: `color-mix(in oklab, var(${THEME_PREFIX}btn) 88%, var(${THEME_PREFIX}btn-contrast))`
  },
  {
    name: "btn-soft",
    label: "Button \xB7 soft fill",
    group: "button",
    value: `color-mix(in oklab, var(${THEME_PREFIX}btn) 14%, transparent)`,
    hint: "What .btn--soft and .btn--text fill with."
  },
  /* Not the button's own color: a ring the same color as the fill it sits
     against is no ring at all. Halfway to the background reads against both. */
  {
    name: "btn-ring",
    label: "Button \xB7 focus ring",
    group: "button",
    value: `color-mix(in oklab, var(${THEME_PREFIX}btn) 55%, var(${THEME_PREFIX}bg))`
  }
];
var THEME_VAR_BY_NAME = Object.fromEntries(THEME_VARS.map((v2) => [v2.name, v2]));
var THEME_HANDOFF = [
  { token: "--text-color", from: "fg", note: "running text, and anything of yours reading it" },
  { token: "--heading-color", from: "heading", note: "h1 \u2013 h6" },
  { token: "--link-color", from: "link", note: "inline links" },
  { token: "--link-color-hover", from: "link-hover", note: "their hover" },
  { token: "--surface", from: "surface", note: "inputs, text areas, selects" },
  { token: "--border-light", from: "border", note: "the light border color" },
  { token: "--border-dark", from: "border-strong", note: "the strong one" },
  { token: "--btn-tone", from: "btn", note: "a .btn--theme, and any button with a style but no color" },
  { token: "--btn-tone-contrast", from: "btn-contrast", note: "its label" },
  { token: "--btn-tone-hover", from: "btn-hover", note: "its hover" },
  { token: "--btn-tone-soft", from: "btn-soft", note: "its tinted fill" },
  { token: "--btn-focus-color", from: "btn-ring", note: "its focus ring" }
];
var THEME_PRESETS = [
  { id: "light", label: "Light", hint: "white page, dark ink \u2014 the site\u2019s own way round" },
  {
    id: "dark",
    label: "Dark",
    hint: "dark page, light ink",
    scheme: "dark",
    vars: { bg: "var(--base-500, #101014)", fg: "var(--white, #ffffff)" }
  },
  {
    id: "soft",
    label: "Soft",
    hint: "a band that is a shade off the page",
    vars: { bg: "var(--base-100, #f4f5f7)", fg: "var(--base-500, #101014)" }
  },
  /* The brand band is the one preset that has to look at the palette: white
     ink on a yellow primary is not a theme, it is a mistake with a name. */
  {
    id: "brand",
    label: "Brand",
    hint: "the primary color, with whichever ink reads on it",
    anchors: (cfg) => {
      const hex = cfg.colors?.primary?.hex ?? "#000000";
      const ink = readableOn(hex);
      return { bg: "var(--primary)", fg: ink };
    }
  }
];
var THEME_PRESET_BY_ID = Object.fromEntries(THEME_PRESETS.map((p) => [p.id, p]));
var themeVarValue = (slot, name) => slot.vars?.[name] ?? THEME_VAR_BY_NAME[name]?.value ?? "";
var activeThemes = (slots = []) => slots.filter((s) => s.on !== false && s.slug);
function themeDecls(slot) {
  const out2 = THEME_VARS.map((v2) => `${THEME_PREFIX}${v2.name}: ${themeVarValue(slot, v2.name)};`);
  out2.push(`background-color: var(${THEME_PREFIX}bg);`, `color: var(${THEME_PREFIX}fg);`);
  if (slot.scheme && slot.scheme !== "normal") out2.push(`color-scheme: ${slot.scheme};`);
  out2.push(...THEME_HANDOFF.map((h2) => `${h2.token}: var(${THEME_PREFIX}${h2.from});`));
  out2.push(
    `--border: var(--border-width) solid var(${THEME_PREFIX}border);`,
    `--border-strong: var(--border-width) solid var(${THEME_PREFIX}border-strong);`
  );
  return out2;
}
var themeRules = (slot) => [{ selector: `.${themeClass(slot.slug)}`, css: themeDecls(slot).join("\n") }];

// ../src/builder-core/a11y.ts
var A11Y_DEFAULTS = {
  focusColor: "var(--primary)",
  focusWidth: "2px",
  focusStyle: "solid",
  focusOffset: "2px",
  focusRing: true,
  tapTarget: "44px",
  reducedMotion: false
};
var a11yOf = (cfg) => {
  const a = cfg.a11y ?? {};
  const str = (v2, d) => v2 && v2.trim() ? v2 : d;
  return {
    focusColor: str(a.focusColor, A11Y_DEFAULTS.focusColor),
    focusWidth: str(a.focusWidth, A11Y_DEFAULTS.focusWidth),
    focusStyle: str(a.focusStyle, A11Y_DEFAULTS.focusStyle),
    focusOffset: str(a.focusOffset, A11Y_DEFAULTS.focusOffset),
    focusRing: a.focusRing ?? A11Y_DEFAULTS.focusRing,
    tapTarget: str(a.tapTarget, A11Y_DEFAULTS.tapTarget),
    reducedMotion: a.reducedMotion ?? A11Y_DEFAULTS.reducedMotion
  };
};
function a11yRootVars(cfg) {
  const a = a11yOf(cfg);
  return [
    `--focus-color: ${a.focusColor};`,
    `--focus-width: ${a.focusWidth};`,
    `--focus-style: ${a.focusStyle};`,
    `--focus-offset: ${a.focusOffset};`,
    `--tap-target: ${a.tapTarget};`
  ];
}
var focusOutline = (color2 = "var(--primary)") => `var(--focus-width, 2px) var(--focus-style, solid) var(--focus-color, ${color2})`;
var focusOffset = (px = "2px") => `var(--focus-offset, ${px})`;
var FOCUS_OUTLINE = focusOutline();
var FOCUS_OFFSET = focusOffset();
var focusRingRule = () => ({
  selector: ":focus-visible",
  css: `outline: ${FOCUS_OUTLINE};
outline-offset: ${FOCUS_OFFSET};`
});
var A11Y_UTILITIES = [
  {
    id: "clickable-parent",
    cls: "clickable-parent",
    label: "Clickable parent",
    hint: "the whole card is the link",
    description: "The card, the row, the media object \u2014 the whole surface goes to the link inside it, by stretching that link\u2019s ::after over the parent. One link, one target: a card wrapped in an <a> swallows every heading and button in it, and a second, invisible link for the same destination is a second stop for anyone tabbing through.",
    helpers: [
      { cls: "clickable-link", label: "The link", hint: "which of the links in here is the one the whole card follows" },
      { cls: "clickable-above", label: "Above it", hint: "a control that has to stay clickable on top of the overlay" }
    ],
    rules: () => [{
      selector: ".clickable-parent",
      css: `position: relative;

/* The link that covers it: the one you named, or \u2014 when nothing in here says
   which \u2014 every link, which is the same link when there is only one. */
& .clickable-link::after,
&:not(:has(.clickable-link)) a[href]::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
}

/* Anything that has to stay clickable on top of that overlay. */
& .clickable-above {
  position: relative;
  z-index: 2;
}`
    }]
  },
  {
    id: "focus-parent",
    cls: "focus-parent",
    label: "Focus parent",
    hint: "the wrapper wears the ring",
    description: "The ring is drawn around the wrapper rather than around the control inside it \u2014 a search field and its button, an input with an icon, a card holding one link. The control\u2019s own ring is dropped only in the exact case the parent is wearing it, so nothing is lost where :has() is not understood.",
    rules: () => [{
      selector: ".focus-parent:has(:focus-visible)",
      css: `outline: ${FOCUS_OUTLINE};
outline-offset: ${FOCUS_OFFSET};

/* Not in two places at once. */
& :focus-visible { outline: none; }`
    }]
  },
  {
    id: "accessibly-hidden",
    cls: "accessibly-hidden",
    label: "Accessibly hidden",
    hint: "read aloud, never seen",
    description: "Off the screen but in the accessible tree \u2014 the words a screen reader needs and the design does not: \u201CSearch\u201D, \u201Copens in a new tab\u201D, the heading a section is required to have. Not display: none, which hides it from everything.",
    rules: () => [{ selector: ".accessibly-hidden", css: HIDDEN_CSS }]
  },
  {
    id: "hidden-until-focus",
    cls: "hidden-until-focus",
    label: "Hidden until focus",
    hint: "appears when tabbed to",
    description: "The same hiding, given up the moment anything inside is focused \u2014 a skip link, a keyboard shortcut hint. :focus-within rather than :focus, so a wrapper works as well as the link itself.",
    rules: () => [{ selector: ".hidden-until-focus:not(:focus-within)", css: HIDDEN_CSS }]
  },
  {
    id: "tap-target",
    cls: "tap-target",
    label: "Tap target",
    hint: "a hit area big enough to hit",
    description: "Grows what a finger can hit to at least --tap-target, without moving anything: the area is a centered ::after, so a 16px close icon keeps its size and stops being a 16px target. WCAG asks for 24px; 44px is the size a thumb actually is.",
    rules: () => [{
      selector: ".tap-target",
      css: `position: relative;

&::after {
  content: "";
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  translate: -50% -50%;
  inline-size: max(100%, var(--tap-target, 44px));
  block-size: max(100%, var(--tap-target, 44px));
}`
    }]
  }
];
var HIDDEN_CSS = `position: absolute !important;
inline-size: 1px !important;
block-size: 1px !important;
padding: 0 !important;
margin: -1px !important;
overflow: hidden !important;
clip-path: inset(50%) !important;
white-space: nowrap !important;
border-width: 0 !important;`;
var A11Y_UTILITY_BY_ID = Object.fromEntries(A11Y_UTILITIES.map((u) => [u.id, u]));
var utilityOn = (cfg, id) => cfg.a11y?.utilities?.[id] !== false;
var activeUtilities = (cfg) => A11Y_UTILITIES.filter((u) => utilityOn(cfg, u.id));
function a11yRules(cfg) {
  const a = a11yOf(cfg);
  const out2 = activeUtilities(cfg).flatMap((u) => u.rules(a));
  if (a.reducedMotion) {
    out2.push({
      selector: "*, *::before, *::after",
      css: `@media (prefers-reduced-motion: reduce) {
  animation-duration: 1ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 1ms !important;
  scroll-behavior: auto !important;
}`
    });
  }
  return out2;
}

// ../src/builder-core/framework.ts
var FRAMEWORK_MODULES = [
  /* `variables` is not here, for the reason `fonts` is not: it was a screen of
     this rail and is now the Styles view's, where the names you write sit
     beside the sheets that spend them. It emitted nothing either way — your
     variables are written to their own sheet — so there was never anything for
     a switch here to switch off, and a project saved while it existed still
     carries `modules.variables`, which nothing reads and which costs nothing. */
  {
    id: "colors",
    label: "Colors",
    emits: "--{role} for every active color, plus its shades and transparencies, the page's own background and the ink on it (--text-color, --heading-color)."
  },
  {
    id: "typography",
    label: "Typography",
    needs: ["colors"],
    emits: "--text-*, --h1 \u2026 --h6, --font-*, the running-text and heading tokens (size, weight, line height, letter spacing, wrap, measure), the root font size and the h1 \u2026 h6 rules."
  },
  {
    id: "spacing",
    label: "Spacing",
    emits: "--space-*, --section-space-* and the gap tokens (--grid-gap and the floors under --content-spacing and --container-spacing)."
  },
  {
    id: "buttons",
    label: "Buttons",
    needs: ["colors"],
    emits: "the --btn-* tokens, the button shape rule, the paint rule and every variant class."
  },
  {
    id: "elements",
    label: "Elements",
    needs: ["colors", "typography", "spacing", "borders", "layout"],
    emits: "one rule per element kind \u2014 what a section, a heading or a link looks like before anyone styles one of them."
  },
  {
    id: "layout",
    label: "Layout",
    needs: ["spacing"],
    emits: "--site-padding, --container-spacing, --content-spacing, --content-width and --content-width-inset (plus the old --container-gap and --content-gap, which now read through them)."
  },
  {
    id: "borders",
    label: "Borders",
    needs: ["colors"],
    emits: "--border-width, --border-light, --border-dark, --border, --border-strong, --radius-s/m/l and --image-radius."
  },
  {
    id: "shadows",
    label: "Shadows",
    emits: "--shadow-s, --shadow-m and --shadow-l, in black or the color chosen for them."
  },
  /* Motion is the one module nothing depends on and that nothing depends on
     it: the runtime reads them through `var(--motion-…, fallback)`, so
     switching it off doesn't stop a page animating — it stops the site having
     an opinion about how, and every animation falls back to the runtime's. */
  {
    id: "motion",
    label: "Motion",
    emits: "--motion-duration, --motion-ease, --motion-distance, --motion-stagger and --motion-perspective."
  },
  /* A texture slot is a class and the pseudo-element it paints — nothing is
     emitted for a project that has no slots, which is what makes this module
     free to leave on. */
  {
    id: "textures",
    label: "Textures",
    emits: "one .texture--* class per slot, with its --texture-<slug>-* defaults and the layer that paints them."
  },
  /* A theme is one rule, and the rule is nothing but custom properties plus
     the two declarations that make the region look like what it says. Nothing
     is emitted for a project with no themes, which is what makes this module
     free to leave on — and everything it moves is a token another module
     declared, which is why it reads from four of them and is read by none. */
  {
    id: "themes",
    label: "Themes",
    needs: ["colors"],
    emits: "one .theme--* class per theme, with its --theme-* values and the tokens they are handed to."
  },
  /* Icon sets are like fonts: what an icon set gives you is a thing to pick
     from, and what a picked icon leaves behind is the SVG itself, in the
     page. Nothing is generated, so switching this off only puts the screen
     away — every icon already on a page stays exactly where it is. */
  {
    id: "icons",
    label: "Icons",
    screenOnly: true,
    emits: "nothing here \u2014 an icon you picked is inline SVG in the page and stays there."
  },
  /* Every input on a site is meant to be the same input, which is exactly
     what a design-system module is for — so a form control has no starter
     rule of its own and is styled by what it is, like a heading or a link.
     Off, the controls fall back to the browser's own, which is a working
     form and never a broken one. The form's own parts are the part defaults
     sheet's (parts-css.ts): their look goes with this switch, and what they
     need to work at all (a step that is not the current step, the spam trap)
     stays. */
  {
    id: "forms",
    label: "Forms",
    needs: ["colors", "typography", "spacing", "borders"],
    emits: "the input, textarea, select, label, checkbox and slider rules, their focus and error states, and the look of the form parts \u2014 the select caret, the step indicator, the repeater rows, the rich-text box. The spam trap and the hidden steps are emitted whatever this says."
  },
  /* A menu is assembled from ordinary elements, and what those parts look like
     before anybody styles them is a design-system question like an input's.
     All of it is zero-specificity — states, open states and the mobile block —
     so a class you put on a part is the whole of restyling it. Off, the parts
     are unstyled markup: the links are all there and the script still opens
     and closes things, but nothing hides a closed submenu. */
  {
    id: "navigation",
    label: "Navigation",
    needs: ["colors", "typography", "spacing", "borders", "shadows"],
    emits: "the look of the nav parts \u2014 the links, the dropdown and mega panel surfaces, the toggle and the skip link. What makes a menu work (a closed flyout is hidden, the mobile panel is off-canvas) is emitted whatever this says."
  },
  /* The three below are the Navigation module's model applied to the other
     assembled parts: each one's *look* is a block of zero-specificity rules
     that this switch takes away, while the handful of rules the part needs to
     work at all are emitted whatever it says — see parts-css.ts. */
  {
    id: "carousel",
    label: "Carousel",
    needs: ["colors", "spacing", "borders"],
    emits: "the look of the carousel parts \u2014 the grid the arrows and dots sit in, the arrow buttons and the dots. The scroller, the slide widths and the prestyle classes are emitted whatever this says."
  },
  {
    id: "search",
    label: "Search",
    needs: ["colors", "spacing", "borders", "shadows"],
    emits: "the look of a search and a filter \u2014 the box, the results dropdown and the results page list, the facet options and their pills, the count and the empty message. That a filtered-out card stays hidden is emitted whatever this says."
  },
  {
    id: "popups",
    label: "Popups",
    needs: ["colors", "spacing", "borders", "shadows"],
    emits: "the look of a popup panel and its close button. The placements, the scrim and the device rules are emitted whatever this says."
  },
  {
    id: "consent",
    label: "Consent",
    needs: ["colors", "spacing", "borders", "typography"],
    emits: "the look of the consent parts \u2014 the button row, the purpose rows and switches, the legal links and the blocked-embed notice."
  },
  /* The focus ring is a token layer like any other, and every rule that draws
     one — the global one here, a link's, an input's, a button's — reads it as
     `var(--focus-…, fallback)`. So this module is off exactly the way Motion
     is off: nothing stops having a focus ring, the site stops having an
     opinion about what one looks like. The utilities are the other half and
     are pure addition — a class nobody wears costs a rule and changes no
     page. */
  {
    id: "a11y",
    label: "Accessibility",
    needs: ["colors"],
    emits: "the --focus-* tokens and --tap-target, the global :focus-visible ring, and the utility classes that are on."
  }
];
var MODULE_BY_ID = Object.fromEntries(FRAMEWORK_MODULES.map((m) => [m.id, m]));
var moduleOn = (cfg, id) => cfg.modules?.[id] !== false;
var f = (prop, label, value = "", color2 = false) => color2 ? { prop, label, value, color: color2 } : { prop, label, value };
var transitionOf = (...props) => props.map((p) => `${p} var(--transition)`).join(", ");
var ELEMENT_STYLES = [
  {
    id: "section",
    label: "Section",
    group: "layout",
    hint: "full-width page band",
    /* The site padding lives here, not on the Container. A section is the band
           that touches both edges of the viewport, so it is the only element that
           knows where the edge is — and once it holds the padding, everything inside
           it is clear of the edge whether or not it sits in a Container. Putting it
           on the Container instead meant a bare heading in a section ran into the
           screen, and two nested Containers paid the padding twice.
    
           Its gap is `--container-spacing`, the same token the Container reads.
           That is the whole of the split: a Section and a Container are the two
           *containers* — the bands the page is laid out in — and they keep one
           rhythm between them, while `--content-spacing` is the rhythm of the
           boxes inside them (a Flex Div, a grid, a form). It used to be the other
           way round, with the Section on `--content-spacing`, which put the two
           layout elements on two different answers to the same question and left
           every content box reading a raw `--space-m`. */
    fields: [
      f("display", "Display", "flex"),
      f("flex-direction", "Direction", "column"),
      f("padding-block", "Padding block", "var(--section-space-m)"),
      f("padding-inline", "Padding inline", "var(--site-padding)"),
      f("margin-block", "Margin block", "0px"),
      f("row-gap", "Row gap", "var(--container-spacing)"),
      f("column-gap", "Column gap", "var(--container-spacing)"),
      f("background", "Background", "", true),
      f("color", "Text color", "", true)
    ]
  },
  {
    id: "header",
    label: "Header",
    group: "layout",
    hint: "site header band",
    fields: [
      f("display", "Display", "flex"),
      f("align-items", "Align items", "center"),
      f("justify-content", "Justify", "space-between"),
      f("gap", "Gap", "var(--space-m)"),
      f("position", "Position", "relative"),
      f("inset-block-start", "Top"),
      f("z-index", "z-index", "10"),
      f("padding-block", "Padding block", "var(--space-s)"),
      f("padding-inline", "Padding inline", "var(--site-padding)"),
      f("background", "Background", "", true),
      f("color", "Text color", "", true),
      f("border-block-end", "Border bottom")
    ]
  },
  {
    id: "container",
    label: "Container",
    group: "layout",
    hint: "centered content column",
    /* A Container is a width and a rhythm: how wide the content column is
       allowed to get, centered in whatever holds it, and how much air it leaves
       between the blocks stacked in it (`--container-spacing`, which the
       Section reads too — see the note there). The distance to the screen edge
       is the Section's job. */
    fields: [
      f("display", "Display", "flex"),
      f("flex-direction", "Direction", "column"),
      f("inline-size", "Inline size", "100%"),
      f("max-inline-size", "Max inline size", "var(--content-width)"),
      f("margin-inline", "Margin inline", "auto"),
      f("margin-block", "Margin block", "0px"),
      f("gap", "Gap", "var(--container-spacing)")
    ]
  },
  {
    id: "flex",
    label: "Flex Div",
    group: "layout",
    hint: "row of children",
    fields: [
      f("display", "Display", "flex"),
      f("flex-direction", "Direction", "row"),
      /* `--content-spacing`, not a raw step of the scale: a Flex Div is the
         content box the two layout elements hold, and what it leaves between
         its children is a decision the site makes once. */
      f("flex-wrap", "Wrap", "wrap"),
      f("gap", "Gap", "var(--content-spacing)"),
      f("align-items", "Align items", "stretch"),
      f("justify-content", "Justify", "flex-start")
    ]
  },
  {
    id: "div",
    label: "Div",
    group: "layout",
    hint: "plain block",
    fields: [
      /* A Div arrives a block, where `gap` does nothing at all — which is
         exactly why it can carry one. The moment you switch its Display to
         Flex or Grid in the Style panel it is a box holding children, and the
         rhythm between them is the site's answer (`--content-spacing`, the
         same one the Flex Div and the Grid read) rather than zero. Declaring
         it up front is what makes that switch one click instead of two, and it
         costs nothing until the day it applies. */
      f("display", "Display", "block"),
      f("gap", "Gap", "var(--content-spacing)"),
      f("padding", "Padding"),
      f("margin-block", "Margin block"),
      f("background", "Background", "", true),
      f("border-radius", "Radius"),
      f("border", "Border")
    ]
  },
  {
    id: "figure",
    label: "Figure",
    group: "layout",
    hint: "image + caption wrapper",
    fields: [
      f("display", "Display", "flex"),
      f("flex-direction", "Direction", "column"),
      f("gap", "Gap", "var(--space-xs, 0.5rem)"),
      f("margin", "Margin", "0"),
      f("max-inline-size", "Max inline size"),
      f("border-radius", "Radius")
    ]
  },
  {
    id: "heading",
    label: "Heading",
    group: "element",
    hint: "h1 \u2013 h6",
    fields: [
      f("font-family", "Font", "var(--font-heading)"),
      f("font-weight", "Weight", "var(--heading-weight)"),
      f("line-height", "Line height", "var(--heading-line-height)"),
      f("letter-spacing", "Letter spacing", "var(--heading-letter-spacing)"),
      f("color", "Color", "var(--heading-color)", true),
      f("margin-block", "Margin block", "0px"),
      f("max-inline-size", "Max inline size", "var(--heading-measure)"),
      f("text-wrap", "Text wrap", "var(--heading-text-wrap)"),
      f("text-transform", "Case", "var(--heading-transform)")
    ]
  },
  {
    id: "text",
    label: "Text",
    group: "element",
    hint: "paragraph",
    fields: [
      f("font-family", "Font", "var(--font-primary)"),
      f("font-size", "Size", "var(--text-size)"),
      /* The weight was the one field here with no default at all, because
         there was no token to point it at — a paragraph's weight was whatever
         the browser said. It reads the site's now, like every other field in
         this bucket. */
      f("font-weight", "Weight", "var(--text-weight)"),
      f("line-height", "Line height", "var(--text-line-height)"),
      f("letter-spacing", "Letter spacing", "var(--text-letter-spacing)"),
      f("text-wrap", "Text wrap", "var(--text-wrap)"),
      f("text-transform", "Case", "var(--text-transform)"),
      f("color", "Color", "", true),
      f("margin-block", "Margin block", "0px"),
      f("max-inline-size", "Max inline size", "var(--text-measure)")
    ]
  },
  {
    id: "link",
    label: "Link",
    group: "element",
    hint: "inline anchor",
    /* `--link-color` rather than `--primary`: the same color, under the name
       of the job it is doing, so a theme can answer it differently for one
       band of the page. See the colors block in generateFrameworkSheet. */
    fields: [
      f("color", "Color", "var(--link-color)", true),
      f("text-decoration", "Decoration", "underline"),
      f("text-underline-offset", "Underline offset", "0.15em"),
      f("font-weight", "Weight"),
      f("transition", "Transition", transitionOf("color", "text-decoration-color"))
    ],
    states: [
      { suffix: ":hover", label: "Hover", fields: [f("color", "Color", "var(--link-color-hover)", true), f("text-decoration", "Decoration")] },
      /* The ring reads the Accessibility module's tokens, and falls back to
         exactly what this rule said before they existed — so the site has one
         answer for what focus looks like, and a project with that module off
         still has this one. */
      { suffix: ":focus-visible", label: "Focus", fields: [f("outline", "Outline", focusOutline("var(--link-color)")), f("outline-offset", "Offset", focusOffset())] },
      { suffix: ":visited", label: "Besucht", fields: [f("color", "Color", "", true)] }
    ]
  },
  /* The shape of a button, and nothing about its color.
  
       Color follows the variant class — see buttonPaintRules — so a plain
       `<button>` is a well-shaped button in the browser's own colors until you
       say which one it is. It used to be painted here, which meant every button
       on the site was already the primary button.
  
       Everything here reads a `--btn-*` token: edit those under Design →
       Buttons, and these fields are the escape hatch for the box itself. `.btn`
       and any variant class are matched too, so a link can be a button by
       wearing one. */
  {
    id: "button",
    label: "Button",
    group: "element",
    hint: "button element \xB7 .btn \xB7 .btn--*",
    module: "buttons",
    alsoMatch: (cfg) => shapeSelectors(cfg),
    fields: [
      f("display", "Display", "var(--btn-display)"),
      f("align-items", "Align items", "var(--btn-align-items)"),
      f("justify-content", "Justify", "var(--btn-justify-content)"),
      f("text-align", "Text align", "var(--btn-text-align)"),
      f("gap", "Gap", "var(--btn-gap)"),
      f("inline-size", "Inline size", "var(--btn-width)"),
      f("min-inline-size", "Min inline size", "var(--btn-min-width)"),
      f("padding-block", "Padding block", "var(--btn-padding-block)"),
      f("padding-inline", "Padding inline", "var(--btn-padding-inline)"),
      f("border-width", "Border width", "var(--btn-border-width)"),
      f("border-style", "Border style", "var(--btn-border-style)"),
      f("border-color", "Border color", "transparent", true),
      f("border-radius", "Radius", "var(--btn-border-radius)"),
      f("font-family", "Font", "var(--btn-font-family)"),
      f("font-size", "Size", "var(--btn-font-size)"),
      f("font-weight", "Weight", "var(--btn-font-weight)"),
      f("font-style", "Style", "var(--btn-font-style)"),
      f("line-height", "Line height", "var(--btn-line-height)"),
      f("letter-spacing", "Letter spacing", "var(--btn-letter-spacing)"),
      f("text-transform", "Text transform", "var(--btn-text-transform)"),
      f("text-decoration", "Decoration", "var(--btn-text-decoration)"),
      f("cursor", "Cursor", "pointer"),
      f("transition", "Transition", "var(--btn-transition)")
    ],
    /* The lift is `translate`, never `transform`: the motion runtime writes
       `transform` for a scroll link or a 3D turn, and a hover written in the
       shorthand would fight it for the one slot. Individual properties
       compose. A reveal clears its own inline `translate` once it arrives. */
    states: [
      { suffix: ":hover", label: "Hover", fields: [
        f("translate", "Translate", "0 calc(-1 * var(--btn-hover-lift))")
      ] },
      { suffix: ":active", label: "Aktiv", fields: [f("translate", "Translate", "0 var(--btn-active-shift)")] },
      { suffix: ":disabled", label: "Deaktiviert", fields: [f("opacity", "Deckkraft", "0.5"), f("cursor", "Cursor", "not-allowed")] }
    ]
  },
  {
    id: "image",
    label: "Image",
    group: "element",
    hint: "img",
    fields: [
      f("display", "Display", "block"),
      f("max-inline-size", "Max inline size", "100%"),
      f("block-size", "Block size", "auto"),
      /* The corner is the site's, not this bucket's: `--image-radius` is one
         answer under Borders and every picture follows it, which is what makes
         "round the images" a setting rather than a rule you write once per
         image and then forget on the ninth. Read with its own fallback, so an
         img still has a shape with the Borders module switched off. */
      f("object-fit", "Object fit", "cover"),
      f("border-radius", "Radius", "var(--image-radius, 0px)")
    ]
  },
  /* A video is an image with a shape of its own: the picture arrives with the
     file and tells the box how tall to be, while a `<video>` with no source
     yet is a box of no size at all — unselectable on the canvas and invisible
     on the page. So it declares an aspect ratio and a ground to sit on, which
     is what an empty player looks like until you pick a file and what a
     loading one looks like after. */
  {
    id: "video",
    label: "Video",
    group: "element",
    hint: "video",
    fields: [
      f("display", "Display", "block"),
      f("inline-size", "Inline size", "100%"),
      f("max-inline-size", "Max inline size", "100%"),
      f("block-size", "Block size", "auto"),
      f("aspect-ratio", "Aspect ratio", "16 / 9"),
      f("object-fit", "Object fit", "cover"),
      f("background-color", "Background", "var(--base-200, #e5e7eb)", true),
      f("border-radius", "Radius", "var(--image-radius, 0px)")
    ]
  },
  /* An icon is sized in `em` and painted in `currentColor`, which is what
     makes one dropped into a line of text or into a button come out the size
     of that text, in its color, with nothing said about it — and what makes
     changing the button's font-size move its icon too. */
  {
    id: "icon",
    label: "Icon",
    group: "element",
    hint: "inline icon from a set",
    fields: [
      f("display", "Display", "inline-block"),
      f("inline-size", "Inline size", "1em"),
      f("block-size", "Block size", "1em"),
      f("vertical-align", "Vertical align", "-0.125em"),
      f("fill", "Fill", "currentColor"),
      f("color", "Color (currentColor)", "", true),
      f("flex-shrink", "Flex shrink", "0")
    ]
  },
  {
    id: "svg",
    label: "SVG",
    group: "element",
    hint: "inline vector",
    fields: [
      f("display", "Display", "block"),
      f("inline-size", "Inline size", "1.5rem"),
      f("block-size", "Block size", "auto"),
      f("color", "Color (currentColor)", "", true),
      f("fill", "Fill"),
      f("stroke", "Stroke"),
      f("flex-shrink", "Flex shrink", "0")
    ]
  },
  {
    id: "list",
    label: "List",
    group: "element",
    hint: "ul / ol",
    fields: [
      f("display", "Display", "flex"),
      f("flex-direction", "Direction", "column"),
      f("gap", "Gap", "var(--space-xs, 0.5rem)"),
      f("padding-inline-start", "Indent", "1.2em"),
      f("list-style", "Marker", "disc"),
      f("color", "Color", "", true)
    ]
  },
  /* ---- forms ------------------------------------------------------------
     The controls, and only the controls. What a form *does* — where it posts,
     what happens next — is the form's own settings (see forms.ts); what one
     looks like is the site's, and lives here. */
  {
    id: "form",
    label: "Form",
    group: "layout",
    hint: "the form itself",
    module: "forms",
    fields: [
      f("display", "Display", "grid"),
      f("gap", "Gap", "var(--content-spacing)"),
      f("inline-size", "Inline size", "100%"),
      f("max-inline-size", "Max inline size")
    ]
  },
  {
    id: "form-field",
    label: "Field",
    group: "layout",
    hint: "label, control, message",
    module: "forms",
    fields: [
      f("display", "Display", "grid"),
      f("gap", "Gap", "var(--space-xxs, 0.35rem)")
    ]
  },
  {
    id: "form-label",
    label: "Field label",
    group: "element",
    hint: "the words above a control",
    module: "forms",
    fields: [
      f("display", "Display", "block"),
      f("font-size", "Size", "var(--text-s)"),
      f("font-weight", "Weight", "500"),
      f("color", "Color", "", true)
    ]
  },
  {
    id: "form-input",
    label: "Input",
    group: "element",
    hint: "text, email, number, date, file\u2026",
    module: "forms",
    fields: [
      f("inline-size", "Inline size", "100%"),
      f("padding-block", "Padding block", "var(--space-xs, 0.6rem)"),
      f("padding-inline", "Padding inline", "var(--space-xs, 0.85rem)"),
      f("color", "Text color", "inherit", true),
      f("background", "Background", "var(--surface)", true),
      f("border-width", "Border width", "var(--border-width)"),
      f("border-style", "Border style", "solid"),
      f("border-color", "Border color", "var(--border-light)", true),
      f("border-radius", "Radius", "var(--radius-s)"),
      f("font-family", "Font", "inherit"),
      f("font-size", "Size", "var(--text-m)"),
      f("line-height", "Line height", "1.4"),
      f("transition", "Transition", transitionOf("border-color", "background-color", "box-shadow"))
    ],
    states: [
      { suffix: ":focus-visible", label: "Focus", fields: [
        f("outline", "Outline", focusOutline()),
        f("outline-offset", "Offset", focusOffset("1px")),
        f("border-color", "Border color", "transparent", true)
      ] },
      { suffix: "::placeholder", label: "Placeholder", fields: [f("color", "Color", "", true), f("opacity", "Opacity", "0.55")] },
      /* The error state hangs off `aria-invalid`, not off `:invalid`. A
         required field is invalid from the moment the page loads, and a form
         that is red before anyone has typed anything is a form that has
         already told you off. `aria-invalid` is written by the runtime, once
         the field has actually been checked — so the look and the
         announcement are the same fact. */
      { suffix: '[aria-invalid="true"]', label: "Invalid", fields: [
        f("border-color", "Border color", "var(--danger)", true),
        f("background", "Background", "", true)
      ] },
      { suffix: ":disabled", label: "Disabled", fields: [f("opacity", "Opacity", "0.55"), f("cursor", "Cursor", "not-allowed")] }
    ]
  },
  {
    id: "form-textarea",
    label: "Text area",
    group: "element",
    hint: "multi-line input",
    module: "forms",
    fields: [
      f("inline-size", "Inline size", "100%"),
      f("min-block-size", "Min block size", "7rem"),
      f("padding-block", "Padding block", "var(--space-xs, 0.6rem)"),
      f("padding-inline", "Padding inline", "var(--space-xs, 0.85rem)"),
      f("color", "Text color", "inherit", true),
      f("background", "Background", "var(--surface)", true),
      f("border-width", "Border width", "var(--border-width)"),
      f("border-style", "Border style", "solid"),
      f("border-color", "Border color", "var(--border-light)", true),
      f("border-radius", "Radius", "var(--radius-s)"),
      f("font-family", "Font", "inherit"),
      f("font-size", "Size", "var(--text-m)"),
      f("line-height", "Line height", "var(--text-line-height)"),
      f("resize", "Resize", "vertical"),
      f("transition", "Transition", transitionOf("border-color", "background-color", "box-shadow"))
    ],
    states: [
      { suffix: ":focus-visible", label: "Focus", fields: [
        f("outline", "Outline", focusOutline()),
        f("outline-offset", "Offset", focusOffset("1px")),
        f("border-color", "Border color", "transparent", true)
      ] },
      { suffix: '[aria-invalid="true"]', label: "Invalid", fields: [f("border-color", "Border color", "var(--danger)", true)] }
    ]
  },
  {
    id: "form-select",
    label: "Select",
    group: "element",
    hint: "a menu of choices",
    module: "forms",
    fields: [
      f("inline-size", "Inline size", "100%"),
      f("appearance", "Appearance", "none"),
      f("padding-block", "Padding block", "var(--space-xs, 0.6rem)"),
      f("padding-inline", "Padding inline", "var(--space-xs, 0.85rem)"),
      f("padding-inline-end", "Space for the caret", "var(--space-m, 2.25rem)"),
      f("color", "Text color", "inherit", true),
      f("background", "Background", "var(--surface)", true),
      f("border-width", "Border width", "var(--border-width)"),
      f("border-style", "Border style", "solid"),
      f("border-color", "Border color", "var(--border-light)", true),
      f("border-radius", "Radius", "var(--radius-s)"),
      f("font-family", "Font", "inherit"),
      f("font-size", "Size", "var(--text-m)"),
      f("line-height", "Line height", "1.4"),
      f("cursor", "Cursor", "pointer")
    ],
    states: [
      { suffix: ":focus-visible", label: "Focus", fields: [
        f("outline", "Outline", focusOutline()),
        f("outline-offset", "Offset", focusOffset("1px"))
      ] }
    ]
  },
  {
    id: "form-check",
    label: "Checkmark",
    group: "layout",
    hint: "a checkbox and its words",
    module: "forms",
    fields: [
      f("display", "Display", "flex"),
      f("align-items", "Align items", "center"),
      f("gap", "Gap", "var(--space-xxs, 0.5rem)"),
      f("cursor", "Cursor", "pointer"),
      f("font-size", "Size", "var(--text-s)")
    ]
  },
  {
    id: "form-check-input",
    label: "Checkbox / radio",
    group: "element",
    hint: "the box itself",
    module: "forms",
    fields: [
      f("inline-size", "Inline size", "1.1em"),
      f("block-size", "Block size", "1.1em"),
      f("accent-color", "Accent", "var(--primary)", true),
      f("flex-shrink", "Flex shrink", "0"),
      f("cursor", "Cursor", "pointer")
    ]
  },
  {
    id: "form-slider",
    label: "Slider",
    group: "element",
    hint: "input type=range",
    module: "forms",
    fields: [
      f("inline-size", "Inline size", "100%"),
      f("accent-color", "Accent", "var(--primary)", true),
      f("cursor", "Cursor", "pointer")
    ]
  }
];
var el = elSelector;
function bucketSelector(def, cfg, suffix = "") {
  return [el(def.id), ...def.alsoMatch?.(cfg) ?? []].map((s) => `${s}${suffix}`).join(", ");
}
var RT = '[builder-data-element="rich-text"]';
var RICH_TEXT_FLOW = [
  { selector: `:where(${RT}) > :where(* + *)`, css: "margin-block-start: var(--content-spacing, 1em);" },
  { selector: `:where(${RT}) > :where(h2, h3, h4, h5, h6)`, css: "margin-block-start: calc(var(--content-spacing, 1em) * 2);\nmargin-block-end: 0;" },
  { selector: `:where(${RT}) > :where(:first-child)`, css: "margin-block-start: 0;" },
  { selector: `:where(${RT}) :where(p, li, blockquote)`, css: "max-inline-size: var(--text-measure, 65ch);" },
  { selector: `:where(${RT}) :where(ul, ol)`, css: "padding-inline-start: 1.2em;" },
  { selector: `:where(${RT}) :where(blockquote)`, css: "margin-inline: 0;\npadding-inline-start: 1em;\nborder-inline-start: 3px solid var(--border, currentColor);" },
  { selector: `:where(${RT}) :where(img)`, css: "display: block;\nmax-inline-size: 100%;\nblock-size: auto;\nborder-radius: var(--image-radius, 0px);" },
  { selector: `:where(${RT}) :where(a)`, css: "color: var(--link-color, currentColor);" },
  { selector: `:where(${RT}) :where(figure)`, css: "margin: 0;" },
  { selector: `:where(${RT}) :where(video, iframe)`, css: "display: block;\nmax-inline-size: 100%;\nborder: 0;\nborder-radius: var(--image-radius, 0px);" },
  { selector: `:where(${RT}) :where(video)`, css: "block-size: auto;" },
  { selector: `:where(${RT}) :where(iframe)`, css: "block-size: auto;\naspect-ratio: 16 / 9;" },
  { selector: `:where(${RT}) :where(table)`, css: "border-collapse: collapse;\ninline-size: 100%;" },
  { selector: `:where(${RT}) :where(th, td)`, css: "border: 1px solid var(--border, currentColor);\npadding: 0.5em 0.75em;\ntext-align: start;" },
  { selector: `:where(${RT}) :where(pre)`, css: "overflow: auto;\npadding: 1em;\nbackground: var(--surface, transparent);\nborder-radius: var(--radius-s, 4px);" }
];
var ELEMENT_STYLE_BY_ID = Object.fromEntries(ELEMENT_STYLES.map((e) => [e.id, e]));
var elementBuckets = (cfg) => ELEMENT_STYLES.filter((d) => moduleOn(cfg, d.module ?? "elements"));
function bucketFields(id) {
  const base = ELEMENT_STYLE_BY_ID[id];
  if (base) return base.fields;
  const [, elId, suffix] = id.match(/^([a-z0-9-]+)(.*)$/) ?? [];
  return (elId ? ELEMENT_STYLE_BY_ID[elId]?.states?.find((st) => st.suffix === suffix)?.fields : void 0) ?? [];
}
var WAS_CALLED = {
  "inline-size": "width",
  "block-size": "height",
  "min-inline-size": "min-width",
  "max-inline-size": "max-width",
  "min-block-size": "min-height",
  "max-block-size": "max-height",
  "inset-block-start": "top",
  "inset-block-end": "bottom",
  "inset-inline-start": "left",
  "inset-inline-end": "right",
  "border-block-end": "border-bottom",
  "border-block-start": "border-top"
};
function elementValue(cfg, id, prop) {
  const stored = cfg.elementStyles?.[id];
  const override = stored?.[prop] ?? (WAS_CALLED[prop] ? stored?.[WAS_CALLED[prop]] : void 0);
  if (override !== void 0) return override;
  return bucketFields(id).find((x) => x.prop === prop)?.value ?? "";
}
var KEPT_PROPS = { "button:hover": ["transform"], "button:active": ["transform"] };
function bucketCss(cfg, id) {
  const kept = (KEPT_PROPS[id] ?? []).filter((p) => cfg.elementStyles?.[id]?.[p]?.trim());
  return [...bucketFields(id).map((field2) => field2.prop), ...kept].map((prop) => [prop, elementValue(cfg, id, prop)]).filter(([, v2]) => v2.trim()).map(([prop, v2]) => `${prop}: ${v2};`).join("\n");
}
var MAIN_COLORS = ["primary", "secondary", "tertiary", "accent", "base", "neutral"];
var SEMANTIC_COLORS = ["success", "warning", "info", "danger"];
var BASE_COLORS = ["white", "black"];
var NO_SHADE_COLORS = new Set(BASE_COLORS);
var SIZES = ["xs", "s", "m", "l", "xl", "xxl"];
var SPACE_SIZES = ["xxs", ...SIZES];
var c = (hex, on = true) => ({ hex, on });
var DEFAULT_FRAMEWORK = {
  modules: {},
  colors: {
    primary: c("#5b8cff"),
    secondary: c("#22c55e", false),
    tertiary: c("#a855f7", false),
    accent: c("#ff6a3d"),
    base: c("#0e1220"),
    neutral: c("#0b0b0d"),
    success: c("#22c55e", false),
    warning: c("#f59e0b", false),
    info: c("#3b82f6", false),
    danger: c("#ef4444", false),
    white: c("#ffffff"),
    black: c("#000000")
  },
  unifiedLightness: null,
  transparencyVars: true,
  shadeVars: true,
  shadeStops: { ultraLight: 95, light: 85, medium: 50, dark: 25, ultraDark: 10, hover: -8 },
  minVw: 375,
  maxVw: 1440,
  rootFontSize: 100,
  typeMinSize: 16,
  typeMinRatio: 1.2,
  typeMaxSize: 18,
  typeMaxRatio: 1.25,
  headingMinSize: 18,
  headingMinRatio: 1.25,
  headingMaxSize: 20,
  headingMaxRatio: 1.333,
  sizeOverrides: {},
  colorOverrides: {},
  headingFont: "system-ui, sans-serif",
  textFont: "system-ui, sans-serif",
  textSize: "var(--text-m)",
  textColor: "var(--base-400)",
  textWeight: 400,
  textLineHeight: "1.6",
  headingWeight: 700,
  headingLineHeight: "1.1",
  headingColor: "var(--base-400)",
  spaceMinSize: 16,
  spaceMinRatio: 1.5,
  spaceMaxSize: 24,
  spaceMaxRatio: 1.5,
  sectionMinSize: 48,
  sectionMinRatio: 1.5,
  sectionMaxSize: 80,
  sectionMaxRatio: 1.5,
  contentWidth: "80rem",
  containerSpacing: "var(--space-l)",
  contentSpacing: "var(--space-m)",
  layoutFluid: false,
  contentWidthMin: 640,
  contentWidthMax: 1280,
  borderWidth: "1px",
  borderLight: "var(--neutral-200)",
  borderDark: "var(--neutral-400)",
  elementStyles: {},
  buttons: DEFAULT_BUTTONS,
  bodyBg: "var(--white)",
  radius: "8px",
  imageRadius: "0px",
  shadowStrength: 0.18,
  motionDuration: 700,
  motionEase: "smooth",
  motionDistance: "32px",
  motionStagger: 90,
  motionPerspective: "900px",
  textures: [],
  themes: []
};
function imageRadiusOf(cfg) {
  return cfg.imageRadius?.trim() || "0px";
}
var SITE_PADDING = { value: "clamp(1rem, 4vw, 2.5rem)", min: 16, max: 40 };
var layoutOf = (cfg) => ({
  contentWidth: cfg.contentWidth ?? DEFAULT_FRAMEWORK.contentWidth,
  sitePadding: cfg.sitePadding ?? cfg.siteMargin ?? cfg.gutter ?? SITE_PADDING.value,
  containerSpacing: cfg.containerSpacing ?? DEFAULT_FRAMEWORK.containerSpacing,
  contentSpacing: cfg.contentSpacing ?? DEFAULT_FRAMEWORK.contentSpacing,
  contentWidthMin: cfg.contentWidthMin ?? DEFAULT_FRAMEWORK.contentWidthMin,
  contentWidthMax: cfg.contentWidthMax ?? DEFAULT_FRAMEWORK.contentWidthMax,
  sitePaddingMin: cfg.sitePaddingMin ?? cfg.siteMarginMin ?? cfg.gutterMin ?? SITE_PADDING.min,
  sitePaddingMax: cfg.sitePaddingMax ?? cfg.siteMarginMax ?? cfg.gutterMax ?? SITE_PADDING.max,
  fluid: !!cfg.layoutFluid
});
function hexToRgb(hex) {
  const h2 = hex.replace("#", "");
  const v2 = h2.length === 3 ? h2.split("").map((x) => x + x).join("") : h2;
  return [parseInt(v2.slice(0, 2), 16), parseInt(v2.slice(2, 4), 16), parseInt(v2.slice(4, 6), 16)];
}
function rgbToHsl(r2, g, b) {
  r2 /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r2, g, b), min = Math.min(r2, g, b);
  let h2 = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r2) h2 = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h2 = (b - r2) / d + 2;
    else h2 = (r2 - g) / d + 4;
    h2 /= 6;
  }
  return [Math.round(h2 * 360), Math.round(s * 100), Math.round(l * 100)];
}
function hslToHex(h2, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h2 / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f2 = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${to(f2(0))}${to(f2(8))}${to(f2(4))}`;
}
var clampL = (x) => Math.max(0, Math.min(100, x));
var typographyOf = (cfg) => ({
  textWeight: cfg.textWeight ?? 400,
  textLineHeight: cfg.textLineHeight?.trim() || "1.6",
  textLetterSpacing: cfg.textLetterSpacing?.trim() || "normal",
  /* `wrap` and not `pretty`, deliberately: `pretty` is the better default for
     a paragraph and it is also a change to how every line on every existing
     site breaks. It is one click away in the field. */
  textWrap: cfg.textWrap?.trim() || "wrap",
  /* `none`, so the declaration is emitted and does nothing until somebody
     answers it. A measure is the single most useful thing on this screen and
     also the one nobody wants applied without asking. */
  textMeasure: cfg.textMeasure?.trim() || "none",
  headingLetterSpacing: cfg.headingLetterSpacing?.trim() || "-0.02em",
  headingWrap: cfg.headingWrap?.trim() || "balance",
  headingMeasure: cfg.headingMeasure?.trim() || "none",
  /* `none` on both, so the declaration exists and does nothing until somebody
     answers it — which is what makes a per-level override able to win, and
     what stops a site somebody already built growing small caps overnight. */
  textTransform: cfg.textTransform?.trim() || "none",
  headingTransform: cfg.headingTransform?.trim() || "none"
});
function headingStepCss(cfg, key) {
  const ov = cfg.headingSteps?.[key] ?? {};
  const line3 = (prop, v2) => v2?.trim() ? [`${prop}: ${v2.trim()};`] : [];
  return [
    `font-size: var(--${key});`,
    ...line3("font-family", ov.font),
    ...line3("font-weight", ov.weight),
    ...line3("color", ov.color),
    ...line3("line-height", ov.lineHeight),
    ...line3("letter-spacing", ov.letterSpacing),
    ...line3("text-transform", ov.transform),
    ...line3("text-wrap", ov.wrap)
  ].join("\n");
}
var LEGACY_SHADE = { "100": "100", "200": "300", "300": "500", "400": "700", "500": "900", "600": "hover" };
function shadeOverride(cfg, role, shade) {
  const own = cfg.colorOverrides ?? {};
  if (!legacyOverrides(own)) return own[`${role}-${shade}`];
  const old = LEGACY_SHADE[shade];
  return own[`${role}-${old ?? shade}`];
}
function legacyOverrides(own) {
  return Object.keys(own).some((k) => /-(700|900|hover)$/.test(k));
}
function shadeValue(cfg, role, shade, computed) {
  return shadeOverride(cfg, role, shade) ?? computed;
}
function colorVars(role, hex, cfg) {
  const [r2, g, b] = hexToRgb(hex);
  const [h2, s, l] = rgbToHsl(r2, g, b);
  const out2 = [`--${role}: ${hex};`, `--${role}-h: ${h2};`, `--${role}-s: ${s}%;`, `--${role}-l: ${l}%;`];
  if (cfg.shadeVars && !NO_SHADE_COLORS.has(role)) {
    const st = cfg.shadeStops;
    const v2 = (shade, computed) => `--${role}-${shade}: ${shadeValue(cfg, role, shade, computed)};`;
    out2.push(
      v2("100", hslToHex(h2, s, st.ultraLight)),
      v2("200", hslToHex(h2, s, st.light)),
      v2("300", hslToHex(h2, s, st.medium)),
      v2("400", hslToHex(h2, s, st.dark)),
      v2("500", hslToHex(h2, s, st.ultraDark)),
      v2("600", hslToHex(h2, s, clampL(l + st.hover)))
    );
  }
  if (cfg.transparencyVars) {
    for (let a = 10; a <= 90; a += 10) out2.push(`--${role}-${a}: rgba(${r2}, ${g}, ${b}, ${a / 100});`);
  }
  return out2;
}
var r3 = (n) => Math.round(n * 1e3) / 1e3;
function shadowInk(color2, alpha) {
  const c2 = (color2 ?? "").trim();
  if (!c2) return `rgba(0,0,0,${alpha})`;
  return `color-mix(in srgb, ${c2} ${Math.round(alpha * 1e3) / 10}%, transparent)`;
}
var remBase = (rootFontSize) => 16 * (rootFontSize / 100);
function fluidClamp(minPx, maxPx, minVw, maxVw, root = 16) {
  const slope = (maxPx - minPx) / (maxVw - minVw);
  const yIntercept = minPx - slope * minVw;
  return `clamp(${r3(minPx / root)}rem, ${r3(yIntercept / root)}rem + ${r3(slope * 100)}vw, ${r3(maxPx / root)}rem)`;
}
function fluidSteps(scale, minVw, maxVw, keys = SIZES, baseIndex = 2, opts = {}) {
  const { prefix = "", overrides = {}, root = 16 } = opts;
  return keys.map((key, i) => {
    const o = i - baseIndex;
    const token = `${prefix}${key}`;
    const ov = overrides[token] ?? {};
    const minPx = ov.min ?? scale.minSize * scale.minRatio ** o;
    const maxPx = ov.max ?? scale.maxSize * scale.maxRatio ** o;
    const lo = ov.minVw ?? minVw;
    const hi = ov.maxVw ?? maxVw;
    const badRange = (ov.minVw !== void 0 || ov.maxVw !== void 0) && !(hi > lo);
    const [vwLo, vwHi] = badRange ? [minVw, maxVw] : [lo, hi];
    return {
      key,
      token,
      minPx,
      maxPx,
      clamp: fluidClamp(minPx, maxPx, vwLo, vwHi, root),
      minOverridden: ov.min !== void 0,
      maxOverridden: ov.max !== void 0,
      minVw: vwLo,
      maxVw: vwHi,
      minVwOverridden: ov.minVw !== void 0,
      maxVwOverridden: ov.maxVw !== void 0,
      ownMinVw: ov.minVw,
      ownMaxVw: ov.maxVw,
      badRange
    };
  });
}
var HEADING_KEYS = ["h6", "h5", "h4", "h3", "h2", "h1"];
var textScale = (c2) => ({ minSize: c2.typeMinSize, minRatio: c2.typeMinRatio, maxSize: c2.typeMaxSize, maxRatio: c2.typeMaxRatio });
var headingScale = (c2) => ({ minSize: c2.headingMinSize, minRatio: c2.headingMinRatio, maxSize: c2.headingMaxSize, maxRatio: c2.headingMaxRatio });
var spaceScale = (c2) => ({ minSize: c2.spaceMinSize, minRatio: c2.spaceMinRatio, maxSize: c2.spaceMaxSize, maxRatio: c2.spaceMaxRatio });
var sectionScale = (c2) => ({ minSize: c2.sectionMinSize, minRatio: c2.sectionMinRatio, maxSize: c2.sectionMaxSize, maxRatio: c2.sectionMaxRatio });
var SPACE_BASE = SPACE_SIZES.indexOf("m");
var TOKEN_ALIASES = {
  "--link-color": "var(--primary)",
  "--link-color-hover": "var(--primary-600)",
  "--surface": "var(--base-100)"
};
function generateFrameworkSheet(cfg, opts = {}) {
  if (frameworkSourceOf(cfg) === "custom") return customFrameworkSheet(cfg);
  const on = (id) => moduleOn(cfg, id);
  const root = [];
  const declared = new Set(opts.declared ?? []);
  if (on("colors")) {
    for (const role of [...MAIN_COLORS, ...SEMANTIC_COLORS, ...BASE_COLORS]) {
      const t = cfg.colors[role];
      if (t?.on) root.push(...colorVars(role, t.hex, cfg));
    }
    for (const [token, value] of Object.entries(TOKEN_ALIASES)) {
      if (!declared.has(token)) root.push(`${token}: ${value};`);
    }
    root.push(`--text-color: ${cfg.textColor};`, `--heading-color: ${cfg.headingColor};`);
  }
  const { minVw, maxVw } = cfg;
  const ov = cfg.sizeOverrides ?? {};
  const root_ = remBase(cfg.rootFontSize);
  const stepOpts = { overrides: ov, root: root_ };
  if (on("spacing")) {
    for (const s of fluidSteps(spaceScale(cfg), minVw, maxVw, SPACE_SIZES, SPACE_BASE, { ...stepOpts, prefix: "space-" })) root.push(`--${s.token}: ${s.clamp};`);
    for (const s of fluidSteps(sectionScale(cfg), minVw, maxVw, SIZES, 2, { ...stepOpts, prefix: "section-space-" })) root.push(`--${s.token}: ${s.clamp};`);
    root.push(
      "--container-spacing: var(--space-l);",
      "--container-gap: var(--container-spacing);",
      "--content-spacing: var(--space-m);",
      "--content-gap: var(--content-spacing);",
      "--grid-gap: var(--space-m);"
    );
  }
  if (on("layout")) {
    const L = layoutOf(cfg);
    const sitePadding = L.fluid ? fluidClamp(L.sitePaddingMin, L.sitePaddingMax, minVw, maxVw, root_) : L.sitePadding;
    const contentWidth = L.fluid ? fluidClamp(L.contentWidthMin, L.contentWidthMax, minVw, maxVw, root_) : L.contentWidth;
    root.push(`--site-padding: ${sitePadding};`);
    root.push(`--container-spacing: ${L.containerSpacing};`);
    root.push(`--content-spacing: ${L.contentSpacing};`);
    root.push("--content-gap: var(--content-spacing);");
    root.push(`--content-width: ${contentWidth};`, "--content-width-inset: min(var(--content-width), calc(100% - 2 * var(--site-padding)));");
  }
  if (on("typography")) {
    for (const s of fluidSteps(textScale(cfg), minVw, maxVw, SIZES, 2, { ...stepOpts, prefix: "text-" })) root.push(`--${s.token}: ${s.clamp};`);
    for (const s of fluidSteps(headingScale(cfg), minVw, maxVw, HEADING_KEYS, 0, stepOpts)) root.push(`--${s.token}: ${s.clamp};`);
    const t = typographyOf(cfg);
    root.push(`--text-line-height: ${t.textLineHeight};`, `--heading-line-height: ${cfg.headingLineHeight};`);
    root.push(`--text-letter-spacing: ${t.textLetterSpacing};`, `--heading-letter-spacing: ${t.headingLetterSpacing};`);
    root.push(`--text-wrap: ${t.textWrap};`, `--heading-text-wrap: ${t.headingWrap};`);
    root.push(`--text-transform: ${t.textTransform};`, `--heading-transform: ${t.headingTransform};`);
    root.push(`--text-measure: ${t.textMeasure};`, `--heading-measure: ${t.headingMeasure};`);
    root.push(`--text-size: ${cfg.textSize};`, `--text-weight: ${t.textWeight};`);
    root.push(`--heading-weight: ${cfg.headingWeight};`);
    root.push(`--font-primary: ${cfg.textFont};`, `--font-heading: ${cfg.headingFont};`);
  }
  if (on("borders")) {
    root.push(
      `--border-width: ${cfg.borderWidth};`,
      `--border-light: ${cfg.borderLight};`,
      `--border-dark: ${cfg.borderDark};`,
      "--border: var(--border-width) solid var(--border-light);",
      "--border-strong: var(--border-width) solid var(--border-dark);"
    );
    root.push(`--radius-s: calc(${cfg.radius} / 2);`, `--radius-m: ${cfg.radius};`, `--radius-l: calc(${cfg.radius} * 2);`);
    root.push(`--image-radius: ${imageRadiusOf(cfg)};`);
  }
  if (on("shadows")) {
    const sh = cfg.shadowStrength;
    const ink = (a) => shadowInk(cfg.shadowColor, a);
    root.push(`--shadow-s: 0 1px 2px ${ink(sh)};`, `--shadow-m: 0 6px 16px ${ink(sh)};`, `--shadow-l: 0 18px 40px ${ink(sh + 0.06)};`);
  }
  if (on("motion")) {
    const m = motionOf(cfg);
    root.push(
      `--motion-duration: ${m.duration}ms;`,
      `--motion-ease: ${easeCurve(m.ease)};`,
      `--motion-distance: ${m.distance};`,
      `--motion-stagger: ${m.stagger}ms;`,
      `--motion-perspective: ${m.perspective};`
    );
  }
  if (on("a11y")) root.push(...a11yRootVars(cfg));
  root.push("--transition: 200ms ease;");
  if (on("buttons")) root.push(...buttonRootVars(cfg));
  const body = [
    ...on("typography") ? [
      "font-family: var(--font-primary);",
      "font-size: var(--text-size);",
      "font-weight: var(--text-weight);",
      "line-height: var(--text-line-height);",
      /* Inherited, so a list item and a table cell are set the way a paragraph
         is. `text-wrap` and the measure are deliberately *not* here: the first
         would reach a nav link and a button, and the second would put a
         max-width on the page itself. */
      "letter-spacing: var(--text-letter-spacing);"
    ] : [],
    ...on("colors") ? [`background: ${cfg.bodyBg};`, "color: var(--text-color);"] : []
  ].join("\n");
  const base = [
    ...on("typography") ? [
      { selector: "html", css: `font-size: ${cfg.rootFontSize}%;` }
    ] : [],
    { selector: "body", css: body },
    /* The ring for everything with no focus state of its own — a summary, a
       div with a tabindex, a part of a component. Before the element buckets,
       so an element that does say what its focus looks like still wins: both
       are at zero specificity, and at zero specificity the later rule is the
       one that stands. */
    ...on("a11y") && a11yOf(cfg).focusRing ? [focusRingRule()] : [],
    // element buckets — addressed by the builder attribute, never by a class,
    // each followed by its interaction states. Only the buckets whose module
    // is in play: the button's shape is the Buttons module's.
    ...elementBuckets(cfg).flatMap((def) => [
      { selector: bucketSelector(def, cfg), css: bucketCss(cfg, def.id) },
      ...(def.states ?? []).map((st) => ({ selector: bucketSelector(def, cfg, st.suffix), css: bucketCss(cfg, `${def.id}${st.suffix}`) }))
    ]),
    /* What each heading level says for itself: its size always, and whatever
           else that one level has been fine-tuned to.
    
           *After* the buckets, and that is the whole reason this rule moved. The
           heading bucket declares the weight, the line height and the tracking the
           site is set in, and everything the system emits is `:where()`-wrapped —
           so at zero specificity the later rule is the one that stands, and an
           override written before the bucket would have been silently thrown away
           for every heading the builder made (they wear the element attribute; a
           raw `<h1>` in hand-written markup does not, which is exactly the kind of
           difference nobody would ever find by reading the CSS). Nothing else
           changed by the move: the bucket has never declared a font size, so the
           one thing this rule used to say could not conflict with it either way.
    
           Your own stylesheets load after this one, so a class of yours still
           wins over both. */
    ...on("typography") ? [1, 2, 3, 4, 5, 6].map((n) => ({ selector: `h${n}`, css: headingStepCss(cfg, `h${n}`) })) : [],
    /* The inside of a Rich text element. What is in there is markup from a
       Long text field — plain `<h2>`, `<p>`, `<img>` with no element attribute
       — so no bucket reaches it, and without these it would sit on the page
       with every margin at zero. A flow: space between blocks, more above a
       heading than below it, pictures that fit. Zero specificity, so a class
       of yours on the element or on anything inside it still wins. */
    ...on("typography") ? RICH_TEXT_FLOW : [],
    /* A closed popover is closed, and this is what puts it back.
    
           The browser hides one with a rule of its own, and a UA rule loses to an
           author rule whatever its specificity — so the bucket right above, which
           says a div is `display: block`, was quietly opening every overlay on
           the site. What that looked like depended on the overlay's own CSS: a
           drawer that slides in from the left merely sat off-screen, still in the
           tab order; a modal sat in the middle of the page. Restated here, after
           the buckets and at their specificity, it is a rule you can see, and one
           your own class still outranks. */
    ...elementBuckets(cfg).length ? [{ selector: "[popover]:not(:popover-open)", css: "display: none;" }] : [],
    /* Color, only on a button wearing a variant — right after the shape it
       paints, and before the variants that re-point what it reads. */
    ...on("buttons") ? buttonPaintRules(cfg) : []
  ].filter((r2) => r2.css.trim());
  const textures = on("textures") ? activeTextures(cfg.textures).flatMap(textureRules).map((r2) => ({
    ...r2,
    selector: r2.selector.replace(/^\.[A-Za-z0-9_-]+/, (cls) => `:where(${cls})`)
  })) : [];
  const themes = on("themes") ? activeThemes(cfg.themes).flatMap(themeRules).map((r2) => ({ ...r2, selector: lowSpec(r2.selector) })) : [];
  const utilities = on("a11y") ? a11yRules(cfg) : [];
  const rules = [
    { selector: ":root", css: root.join("\n") },
    ...base.map((r2) => ({ ...r2, selector: lowSpec(r2.selector) })),
    /* The navigation's look is not here any more: it is one block of the part
       defaults sheet (parts-css.ts), written after this one — which keeps it
       after the element buckets, where a nav trigger (a <button>) needs it. */
    ...textures,
    ...themes,
    ...utilities,
    /* Variants last: they are custom properties only, so they never fight the
       rules above — they feed them. Order still matters against the wiring the
       paint rule declares, which is why they come after it. */
    ...on("buttons") ? buttonVariantRules(cfg).map((r2) => ({ ...r2, selector: lowSpec(r2.selector) })) : []
  ];
  return { id: "framework", name: "Framework", generated: true, rules };
}
function lowSpec(sel) {
  return topLevelParts(sel).map((one) => {
    const at = one.indexOf("::");
    return at < 0 ? `:where(${one})` : `:where(${one.slice(0, at)})${one.slice(at)}`;
  }).join(", ");
}
function rootCss(sheet, which = "all") {
  const out2 = [];
  const walk = (rules, layered) => {
    for (const r2 of rules) {
      if (/^@layer\b/i.test(r2.selector)) {
        if (r2.css.trim()) walk(parseCssRules(r2.css).rules, true);
        continue;
      }
      if (r2.selector.startsWith("@") || !r2.selector.split(",").some((p) => p.trim() === ":root")) continue;
      if (which === "all" || which === "layered" === layered) out2.push(r2.css);
    }
  };
  walk(sheet.rules, false);
  return out2.join(";\n");
}

// ../src/builder-core/field-keys.ts
function keysDiverge(collections) {
  const any = (fs) => (fs ?? []).some((f2) => !!f2.key && f2.key !== dataKey(f2.name ?? "") || any(f2.fields));
  return collections.some((c2) => any(c2.fields));
}

// ../src/builder-core/project.ts
var PROJECT_FILE = "site.sitereal";
var RUNTIME_DIR = ".sitereal";
var PROJECT_VERSION = 7;
var FORMAT3_KINDS = /* @__PURE__ */ new Set(["rest", "wordpress", "graphql", "rss", "csv", "file", "data", "code"]);
var FORMAT4_MAILERS = /* @__PURE__ */ new Set(["smtp", "resend", "postmark", "sendgrid", "mailgun", "brevo"]);
var newMailer = (forms) => {
  const known = (t) => t === void 0 || FORMAT4_MAILERS.has(String(t));
  return !known(forms?.mail?.transport) || (forms?.forms ?? []).some((f2) => (f2?.actions ?? []).some((a) => a?.kind === "email" && !known(a.transport)));
};
var ownLinks = (doc) => !!String(doc.site?.url ?? "").trim() && (doc.site?.languages ?? []).some((l) => l?.live) && Object.values(doc.pages ?? {}).some((p) => p?.file === "own" && Object.keys(p.translations ?? {}).length > 0);
var formatFor = (doc) => (doc.components ?? []).some((c2) => c2?.file === "own") || ownLinks(doc) ? 7 : (doc.site?.languages ?? []).length ? 6 : newMailer(doc.forms) ? 5 : (doc.sources ?? []).some((s) => !FORMAT3_KINDS.has(String(s?.kind))) ? 4 : keysDiverge(doc.collections?.collections ?? []) ? 3 : 2;
function emptyProject(site = {}) {
  return {
    format: "sitereal",
    version: PROJECT_VERSION,
    site,
    addons: {},
    framework: { enabled: false, config: DEFAULT_FRAMEWORK },
    variables: [],
    styles: [],
    fonts: [],
    icons: [],
    components: [],
    templates: [],
    popups: [],
    forms: emptyForms(),
    snippets: [],
    collections: { collections: [], taxonomies: [] },
    sources: [],
    media: { collections: [], assets: {} },
    pages: {}
  };
}
var list = (v2) => Array.isArray(v2) ? v2 : [];
var withTrees = (v2) => {
  const out2 = list(v2);
  for (const x of out2) stringItem(x);
  return out2;
};
var obj = (v2) => v2 && typeof v2 === "object" && !Array.isArray(v2) ? v2 : {};
var ownSheets = (items, mine, prefix) => items.map((x) => {
  const sheets = x?.stylesheets;
  if (!Array.isArray(sheets) || sheets.every((sh) => !sh || typeof sh.id !== "string" || mine(sh))) return x;
  return { ...x, stylesheets: sheets.map((sh) => sh && typeof sh.id === "string" && !mine(sh) ? { ...sh, id: `${prefix}${sh.id}` } : sh) };
});
function deriveFramework(pages) {
  let best = null;
  for (const page of pages) {
    const cfg = page?.framework;
    if (!cfg) continue;
    const keys = Object.values(cfg).filter((v2) => v2 !== void 0 && v2 !== null).length;
    if (!best || keys > best.keys) best = { config: cfg, keys };
  }
  return best ? { enabled: true, config: best.config } : null;
}
function normalizeProject(raw) {
  const d = obj(raw);
  const base = emptyProject(obj(d.site));
  const pages = {};
  for (const [route, value] of Object.entries(obj(d.pages))) {
    const page = obj(value);
    if (!Array.isArray(page?.root)) continue;
    stringItem(page);
    pages[route] = { ...page, route: page.route || route };
  }
  for (const [route, value] of Object.entries(obj(d.ownPages))) {
    const page = obj(value);
    if (!Array.isArray(page?.root) || pages[route]) continue;
    stringItem(page);
    pages[route] = { ...page, route: page.route || route, file: "own" };
  }
  const fw = obj(d.framework);
  const framework = fw.config ? { enabled: fw.enabled !== false, config: fw.config } : deriveFramework(Object.values(pages)) ?? base.framework;
  const media = obj(d.media);
  const collections = obj(d.collections);
  return {
    ...base,
    /* Absent in every project written before addons existed — and an empty
       object is exactly right there, because `addonOn` reads absence through
       the registry rather than through this. */
    addons: obj(d.addons),
    framework,
    pages,
    variables: list(d.variables),
    styles: list(d.styles),
    fonts: list(d.fonts),
    /* Absent in every project written before icon sets existed, which is
       exactly what an empty list means. */
    icons: list(d.icons),
    components: ownSheets(withTrees(d.components), isComponentSheet, COMPONENT_SHEET),
    templates: ownSheets(withTrees(d.templates), isTemplateSheet, "tpl-"),
    /* Absent in every project written before popups existed, which is exactly
       what an empty list means. */
    popups: ownSheets(withTrees(d.popups), isPopupSheet, "pop-"),
    /* Same for forms. `enabled` defaults to on: a project that has no forms
       emits nothing either way, and one that does was built expecting them
       to work. */
    forms: {
      enabled: obj(d.forms).enabled !== false,
      forms: list(obj(d.forms).forms),
      /* The site's mail setup and its hosting are part of the same answer.
         Left out here, both were forgotten at every read from disk — that is,
         at every start of the app — and the next write stored the loss: the
         PHP endpoints were removed and every email went back to the defaults. */
      ...Object.keys(obj(obj(d.forms).mail)).length ? { mail: obj(d.forms).mail } : {},
      ...obj(d.forms).host === "php" || obj(d.forms).host === "static" ? { host: obj(d.forms).host } : {}
    },
    /* A snippet written before saves were checked can hold a value the check
       now refuses — `placement: "body"` above all — and the Snippets view
       saves the whole list it read, so one such snippet refused every save.
       Read as what it shipped as instead (normalizeSnippet); an entry that is
       not an object at all is left for the check to name. */
    snippets: list(d.snippets).map((s) => s && typeof s === "object" ? normalizeSnippet(s) : s),
    collections: {
      collections: list(collections.collections),
      taxonomies: list(collections.taxonomies)
    },
    /* Absent in every project written before sources existed, which is
       exactly what an empty list means. */
    sources: list(d.sources).filter((x) => !!x && typeof x === "object" && typeof x.id === "string" && typeof x.slug === "string").map(normalizeSource),
    media: {
      collections: list(media.collections),
      assets: obj(media.assets)
    },
    emitted: Object.fromEntries(Object.entries(obj(d.emitted)).filter(([, v2]) => typeof v2 === "string"))
  };
}
function serializeProject(doc) {
  const sorted = Object.entries(doc.pages).sort(([a], [b]) => a.localeCompare(b));
  const own = sorted.filter(([, pg]) => pg?.file === "own");
  const ordered = {
    format: "sitereal",
    version: formatFor(doc),
    site: doc.site,
    addons: doc.addons,
    framework: doc.framework,
    variables: doc.variables,
    styles: doc.styles,
    fonts: doc.fonts,
    icons: doc.icons,
    components: doc.components,
    templates: doc.templates,
    popups: doc.popups,
    forms: doc.forms,
    snippets: doc.snippets,
    collections: doc.collections,
    sources: doc.sources,
    media: doc.media,
    pages: Object.fromEntries(sorted.filter(([, pg]) => pg?.file !== "own")),
    ...own.length ? { ownPages: Object.fromEntries(own) } : {},
    /* Last and sorted: it moves on most saves, and a reader of the file has
       no reason to scroll past it to reach the pages. */
    ...doc.emitted && Object.keys(doc.emitted).length ? { emitted: Object.fromEntries(Object.entries(doc.emitted).sort(([a], [b]) => a.localeCompare(b))) } : {}
  };
  return JSON.stringify(ordered, null, 2) + "\n";
}

// ../src/builder-core/translate.ts
var WORD_ATTRS = /* @__PURE__ */ new Set([
  "alt",
  "title",
  "aria-label",
  "aria-description",
  "placeholder",
  "label",
  COUNT_ONE,
  COUNT_NONE
]);
var CODE_WORD_ATTRS = /* @__PURE__ */ new Set([...WORD_ATTRS, "description"]);

// ../src/builder-core/strings.ts
var ATTR_ROLE = {
  alt: "image description",
  title: "tooltip",
  "aria-label": "label for screen readers",
  "aria-description": "description for screen readers",
  placeholder: "placeholder",
  label: "label",
  [COUNT_ONE]: "result count, one",
  [COUNT_NONE]: "result count, none",
  content: "meta content",
  value: "button"
};

// ../src/builder-core/languages.ts
var LANGUAGE_LINKS_OPEN = "<!-- sitereal: language links -->";
var LANGUAGE_LINKS_CLOSE = "<!-- /sitereal -->";
var escRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
var BLOCK2 = `${escRe(LANGUAGE_LINKS_OPEN)}[\\s\\S]*?${escRe(LANGUAGE_LINKS_CLOSE)}`;
var FRAGMENT_OPEN = '<Fragment slot="head">';
var LINES_RE = new RegExp(`(?<=^|\\n)[ \\t]*(?:${escRe(FRAGMENT_OPEN)}[ \\t]*\\r?\\n[ \\t]*${BLOCK2}[ \\t]*\\r?\\n[ \\t]*</Fragment>|${BLOCK2})[ \\t]*\\r?\\n`, "g");
var INLINE_RE = new RegExp(`${escRe(FRAGMENT_OPEN)}${BLOCK2}</Fragment>|${BLOCK2}`, "g");

// ../src/builder-core/starter.ts
var LAYOUT_RESET = `*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; }
img { max-width: 100%; display: block; }
/* color-scheme: light plus a zero-specificity fallback color/background
   (:where(), same convention the generated stylesheet uses) keep a page
   legible when the design system is off and nothing else on the page
   sets either \u2014 without it, the UA's dark-mode default text color can
   render white with no contrasting background under it. Any real rule,
   generated or hand-written, still wins over this. */
:root { color-scheme: light; }
:where(body) { color: #111827; background: #fff; }`;
var indented = (text, n) => text.split("\n").map((l) => l.trim() ? " ".repeat(n) + l : l).join("\n");
var PLAIN_BASE = String.raw`---
/* Minimal, framework-free wrapper for builder-emitted pages.
   Document shell + a tiny reset + SEO/social head tags; all visual
   styling comes from the page's own <style> (the CSS window). */
interface Props {
  title?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
  siteName?: string;
  canonical?: string;
  lang?: string;
  /** 'rtl' for a language written right to left; absent writes no attribute */
  dir?: 'ltr' | 'rtl';
  favicon?: string;
}
const {
  title = 'Strata',
  description,
  image,
  noindex = false,
  siteName,
  canonical,
  lang = 'en',
  dir,
  favicon,
} = Astro.props;
---
<!doctype html>
<html lang={lang} dir={dir}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content="Strata" />
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
    {noindex && <meta name="robots" content="noindex, nofollow" />}
    {favicon && <link rel="icon" href={favicon} />}
    {canonical && <link rel="canonical" href={canonical} />}

    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    {description && <meta property="og:description" content={description} />}
    {siteName && <meta property="og:site_name" content={siteName} />}
    {canonical && <meta property="og:url" content={canonical} />}
    {image && <meta property="og:image" content={image} />}

    <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
    <meta name="twitter:title" content={title} />
    {description && <meta name="twitter:description" content={description} />}
    {image && <meta name="twitter:image" content={image} />}

    <style is:global>
${indented(LAYOUT_RESET, 6)}
    </style>

    <!-- head snippets (scripts/styles/markup scoped to this page) -->
    <slot name="head" />
  </head>
  <body>
    <slot />
  </body>
</html>
`;

// ../src/builder-core/site-dirs.ts
var DEFAULT_SITE_DIRS = { src: "src", public: "public" };
var clean = (p) => p.replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/+$/, "").replace(/\/{2,}/g, "/");
var settle = (p) => {
  const out2 = [];
  for (const part4 of p.split("/")) {
    if (!part4 || part4 === ".") continue;
    if (part4 === ".." && out2.length && out2[out2.length - 1] !== "..") out2.pop();
    else out2.push(part4);
  }
  return out2.join("/") || ".";
};
function folderOf(body, key) {
  const at = new RegExp(`\\b${key}\\s*:\\s*`).exec(body);
  if (!at) return {};
  const rest = body.slice(at.index + at[0].length);
  const m = /^(?:['"`]([^'"`]+)['"`]|(?:fileURLToPath\(\s*)?new\s+URL\(\s*['"`]([^'"`]+)['"`]\s*,\s*import\.meta\.url\s*\)\)?)/.exec(rest);
  const raw = m?.[1] ?? m?.[2];
  if (!raw) return { problem: `astro.config sets ${key} with something other than a plain path, so sitereal uses the default` };
  const dir = settle(clean(raw));
  if (/^(\/|[A-Za-z]:)/.test(raw.replace(/\\/g, "/")) || dir === ".." || dir.startsWith("../") || /^[A-Za-z]:/.test(dir)) {
    return { problem: `astro.config's ${key} (${raw}) is outside the project, so sitereal uses the default` };
  }
  if (!dir || dir === ".") return { problem: `astro.config's ${key} is the project folder itself, which sitereal does not support \u2014 it uses the default` };
  return { dir };
}
function readSiteDirs(config) {
  if (!config) return { dirs: { ...DEFAULT_SITE_DIRS }, problems: [] };
  const body = config.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const problems = [];
  const src = folderOf(body, "srcDir");
  const pub = folderOf(body, "publicDir");
  if (src.problem) problems.push(src.problem);
  if (pub.problem) problems.push(pub.problem);
  return { dirs: { src: src.dir ?? DEFAULT_SITE_DIRS.src, public: pub.dir ?? DEFAULT_SITE_DIRS.public }, problems };
}

// ../src/builder-core/nav-css.ts
var NAV_BP = 900;
var collapseQuery = (mode, bp = NAV_BP) => mode === "always" ? "(min-width: 0px)" : mode === "never" ? "(max-width: 0px)" : `(max-width: ${Math.max(1, Math.round(bp))}px)`;
function navOf(cfg) {
  const n = cfg.nav ?? {};
  return {
    collapse: n.collapse ?? "breakpoint",
    breakpoint: n.breakpoint && n.breakpoint > 0 ? n.breakpoint : NAV_BP
  };
}
var navQuery = (cfg) => {
  const n = navOf(cfg);
  return collapseQuery(n.collapse, n.breakpoint);
};
var part3 = (id) => `[builder-data-element="${id}"]`;
var RING = `outline: ${focusOutline()};
outline-offset: ${focusOffset()};`;
var FLYOUT_SURFACE = `background: var(--surface, var(--base-100, #fff));
border: var(--border-width, 1px) solid var(--border-light, rgba(0, 0, 0, 0.1));
border-radius: var(--radius-m, 8px);
box-shadow: var(--shadow-l, 0 18px 40px rgba(0, 0, 0, 0.18));`;
var FLYOUT_HIDDEN = `opacity: 0;
visibility: hidden;
translate: 0 0.35rem;
transition: opacity var(--transition, 200ms ease), translate var(--transition, 200ms ease), visibility var(--transition, 200ms ease);`;
var SHOWN = "opacity: 1;\nvisibility: inherit;\ntranslate: 0 0;";
var FOLDED = `position: static;
flex: 0 0 100%;
display: none;
min-inline-size: 0;
padding: 0 0 0 0.9rem;
background: none;
border: 0;
box-shadow: none;
opacity: 1;
visibility: inherit;
translate: none;`;
var nparts = () => ({
  nav: part3("nav"),
  list: part3("nav-list"),
  item: part3("nav-item"),
  link: part3("nav-link"),
  drop: part3("nav-dropdown"),
  trigger: part3("nav-trigger"),
  caret: part3("nav-caret"),
  sub: part3("nav-sub"),
  mega: part3("nav-mega"),
  panel: part3("nav-panel"),
  toggle: part3("nav-toggle"),
  burger: part3("nav-burger"),
  close: part3("nav-close"),
  scrim: part3("nav-scrim"),
  skip: part3("nav-skip"),
  open: "[data-nav-open]",
  navOpen: '[data-nav-part="nav"][data-nav-open]'
});
var r = (selector, css) => ({ selector, css });
var DROP = (style2) => `[data-nav-drop="${style2}"]`;
var MOBILE = (style2) => `[data-nav-mobile="${style2}"] > ${part3("nav-panel")}`;
var MOBILE_OPEN = (style2) => `[data-nav-mobile="${style2}"][data-nav-open] > ${part3("nav-panel")}`;
var inQuery = (cfg) => {
  const q = navQuery(cfg);
  return (css) => `@media ${q} {
${css.replace(/^/gm, "  ")}
}`;
};
function navRequired(cfg) {
  const mq = inQuery(cfg);
  const { nav, item, drop, sub, mega, panel: panel2, toggle, burger, close, scrim, skip: skip2, open, navOpen } = nparts();
  return [
    r(nav, "position: relative;"),
    r(`${item}, ${drop}`, "position: relative;"),
    r(sub, `position: absolute;
inset-block-start: calc(100% + 0.35rem);
inset-inline-start: 0;
z-index: 60;
${FLYOUT_HIDDEN}`),
    r(`${open} > ${sub}`, SHOWN),
    /* `transform` for the centering and `translate` for the animation: two
       properties the browser composes, so they never fight over one. */
    r(`[data-nav-align="center"] > ${sub}`, "inset-inline-start: 50%;\ntransform: translateX(-50%);"),
    r(`[data-nav-align="end"] > ${sub}, [data-nav-flip] > ${sub}`, "inset-inline-start: auto;\ninset-inline-end: 0;"),
    /* A mega panel: as wide as the menu. The two things it makes true of its
       neighbors are written here, against the panel, so they hold for every
       menu whether it had one yesterday or not. */
    r(mega, `position: absolute;
inset-block-start: calc(100% + 0.35rem);
inset-inline: 0;
z-index: 60;
${FLYOUT_HIDDEN}`),
    r(`${open} > ${mega}`, SHOWN),
    r(`[data-nav-part="item"]:has(> ${mega})`, "position: static;"),
    /* Any list inside it, not only a direct child: a column with a heading
       over its links is a wrapper around the list, and that list is still a
       column rather than a flyout. It follows the panel's visibility rather
       than being shown (see SHOWN): a closed panel's columns were otherwise
       hit-testable under the header and opened the menu on hover. */
    r(`${mega} [data-nav-part="sub"]`, `position: static;
display: flex;
min-inline-size: 0;
padding: 0;
background: none;
border: 0;
border-radius: 0;
box-shadow: none;
opacity: 1;
visibility: inherit;
transform: none;
translate: none;`),
    /* The styles a dropdown can open in besides the flyout (`data-nav-drop`
           on the dropdown, per dropdown). Above the breakpoint only: the fold
           below is written after these and puts every one of them back into the
           list, which is what a phone wants whatever the desktop menu does.
    
           A side flyout hangs beside its trigger instead of under it — the far
           edge, or the near one when the script measured no room — and comes in
           sideways. Its open rule is last so it wins over both closed ones. */
    r(`${DROP("side")} > ${sub}`, `inset-block-start: 0;
inset-inline-start: calc(100% + 0.35rem);
translate: 0.35rem 0;`),
    r(`${DROP("side")}[data-nav-flip] > ${sub}`, `inset-inline-start: auto;
inset-inline-end: calc(100% + 0.35rem);
translate: -0.35rem 0;`),
    r(`${DROP("side")}${open} > ${sub}`, "translate: 0 0;"),
    /* Inline is the phone's fold at every width: an accordion in the flow of
       the list, which is what a sidebar or a footer menu is. */
    r(DROP("inline"), "flex-wrap: wrap;"),
    r(`${DROP("inline")} > ${sub}`, FOLDED),
    r(`${DROP("inline")}${open} > ${sub}`, "display: flex;"),
    /* A full-width mega panel spans the screen rather than the menu. Where the
       screen is, relative to the menu, is measured by the script into these
       two properties; without it the panel is the menu's width, which is the
       ordinary mega panel and never a broken one. */
    r(`${DROP("full")} > ${mega}`, `inset-inline-start: var(--nav-full-start, 0px);
inset-inline-end: auto;
box-sizing: border-box;
inline-size: var(--nav-full-size, 100%);`),
    /* Below the breakpoint a flyout is in the way, so it becomes part of the
       list: in flow, full width, folded away behind its trigger. Written after
       the alignments so the reset lands. */
    r(`${sub}, ${mega}`, mq(FOLDED)),
    r(`[data-nav-align] > ${sub}`, mq("inset-inline: auto;\ntransform: none;")),
    r(`${open} > ${sub}`, mq("display: flex;")),
    r(`${open} > ${mega}`, mq("display: block;")),
    r(`${mega} [data-nav-part="sub"]`, mq("display: flex;\npadding: 0;")),
    r(`${DROP("full")} > ${mega}`, mq("inline-size: auto;")),
    /* Above the breakpoint the panel is only what the list sits in; everything
       that makes it an off-canvas sheet is inside the query. The ground is
       here rather than in the look, because a sheet you can read the page
       through is not a menu. */
    r(panel2, mq(`position: fixed;
inset-block: 0;
inset-inline-end: 0;
z-index: 100;
display: flex;
flex-direction: column;
align-items: stretch;
inline-size: min(20rem, 100%);
/* The toggle stays on top of the open panel as its close button, so the
   first entry starts below it rather than under the X. */
padding-block-start: calc(var(--space-m, 1.5rem) + 2.75rem);
background: var(--surface, var(--base-100, #fff));
overflow-y: auto;
overscroll-behavior: contain;
visibility: hidden;
translate: 100% 0;
transition: translate 280ms ease, visibility 280ms ease;`)),
    r(`${navOpen} > ${panel2}`, mq("visibility: visible;\ntranslate: 0 0;")),
    /* How the mobile menu comes in, per menu (`data-nav-mobile` on the nav).
       Absent is the drawer from the end edge above; each of these moves the
       sheet and the edge it slides from, and the open rules come last so they
       win over every closed one. The toggle stays on top of all of them as
       the close button, which is why the top sheet keeps its room for it. */
    r(MOBILE("start"), mq(`inset-inline-end: auto;
inset-inline-start: 0;
translate: -100% 0;`)),
    r(MOBILE("top"), mq(`inset-block: 0 auto;
inset-inline: 0;
box-sizing: border-box;
inline-size: 100%;
max-block-size: 100dvh;
translate: 0 -100%;`)),
    r(MOBILE("bottom"), mq(`inset-block: auto 0;
inset-inline: 0;
box-sizing: border-box;
inline-size: 100%;
max-block-size: 85dvh;
padding-block-start: var(--space-m, 1.5rem);
translate: 0 100%;`)),
    r(MOBILE("full"), mq(`inset: 0;
box-sizing: border-box;
inline-size: 100%;
translate: none;
opacity: 0;
transition: opacity 220ms ease, visibility 220ms ease;`)),
    r(`${MOBILE_OPEN("start")}, ${MOBILE_OPEN("top")}, ${MOBILE_OPEN("bottom")}`, mq("translate: 0 0;")),
    r(MOBILE_OPEN("full"), mq("opacity: 1;")),
    /* The toggle is the breakpoint, as far as the script is concerned: the menu
       is mobile exactly when this is visible. */
    r(`${toggle}, ${close}`, "display: none;"),
    r(toggle, mq("display: inline-flex;\nposition: relative;\nz-index: 110;")),
    r(close, mq("display: inline-flex;")),
    /* The three lines are what the toggle *is* — a toggle with its look taken
       away still has to be a button somebody can see. */
    r(burger, `position: relative;
display: block;
inline-size: 1.4rem;
block-size: 2px;
background: currentColor;
border-radius: 2px;
transition: background-color 120ms ease;`),
    r(`${burger}::before, ${burger}::after`, `content: "";
position: absolute;
inset-inline-start: 0;
display: block;
inline-size: 1.4rem;
block-size: 2px;
background: currentColor;
border-radius: 2px;
transition: translate 200ms ease, rotate 200ms ease;`),
    r(`${burger}::before`, "translate: 0 -0.42rem;"),
    r(`${burger}::after`, "translate: 0 0.42rem;"),
    r(`[aria-expanded="true"] > ${burger}`, "background: transparent;"),
    r(`[aria-expanded="true"] > ${burger}::before`, "translate: 0 0;\nrotate: 45deg;"),
    r(`[aria-expanded="true"] > ${burger}::after`, "translate: 0 0;\nrotate: -45deg;"),
    r(scrim, "display: none;"),
    r(scrim, mq(`position: fixed;
inset: 0;
z-index: 90;
display: block;
background: rgba(0, 0, 0, 0.45);
opacity: 0;
visibility: hidden;
transition: opacity var(--transition, 200ms ease), visibility var(--transition, 200ms ease);`)),
    r(`${navOpen} > ${scrim}`, mq("opacity: 1;\nvisibility: visible;")),
    /* Fixed, because "off-screen" has to mean the screen. :focus as well as
       :focus-visible — a skip link that only appears for one of them vanishes
       on somebody's browser. */
    r(skip2, `position: fixed;
inset-block-start: 0.5rem;
inset-inline-start: 0.5rem;
z-index: 200;
translate: 0 calc(-100% - 1rem);
opacity: 0;
transition: translate 150ms ease, opacity 150ms ease;`),
    r(`${skip2}:focus, ${skip2}:focus-visible`, "translate: 0 0;\nopacity: 1;")
  ];
}
function navLook(cfg) {
  const mq = inQuery(cfg);
  const { nav, list: list2, item, drop, trigger, caret, sub, mega, panel: panel2, toggle, close, skip: skip2 } = nparts();
  const link = `${nparts().link}:not(.btn, [class*="btn--"])`;
  return [
    r(nav, "display: flex;\nalign-items: center;"),
    r(list2, "display: flex;\nalign-items: center;\ngap: var(--space-xs, 0.5rem);\nmargin: 0;\npadding: 0;\nlist-style: none;"),
    r(list2, mq("flex-direction: column;\nalign-items: stretch;")),
    r(`${item}, ${drop}`, "display: flex;\nalign-items: center;"),
    r(drop, mq("flex-wrap: wrap;")),
    /* A link and a trigger are one kind of label — the trigger is a link that
       opens something — so they share everything but the button reset. */
    r(`${link}, ${trigger}`, `display: inline-flex;
align-items: center;
gap: 0.35em;
padding: 0.5em 0.75em;
color: inherit;
border-radius: var(--radius-s, 4px);
font-size: var(--text-s, 0.95rem);
font-weight: 500;
text-decoration: none;
white-space: nowrap;
transition: color var(--transition, 200ms ease), background-color var(--transition, 200ms ease);`),
    r(trigger, "background: none;\nborder: 0;\nfont-family: inherit;\nline-height: inherit;\ncursor: pointer;"),
    r(`${link}:hover, ${link}[aria-current], ${trigger}:hover`, "color: var(--primary, currentColor);"),
    r(`${link}:focus-visible, ${trigger}:focus-visible, ${toggle}:focus-visible, ${close}:focus-visible`, RING),
    r(trigger, mq("flex: 1 1 auto;\njustify-content: space-between;")),
    r(caret, "inline-size: 0.7em;\nblock-size: 0.7em;\ntransition: rotate var(--transition, 200ms ease);"),
    r(`[data-nav-part="trigger"][aria-expanded="true"] ${caret}`, "rotate: 180deg;"),
    /* A side flyout opens sideways, so its chevron points that way, open or
       shut — except below the breakpoint, where it is an accordion again. */
    r(`${DROP("side")} > ${trigger} ${caret}`, "rotate: -90deg;"),
    r(`${DROP("side")}[data-nav-flip] > ${trigger} ${caret}`, "rotate: 90deg;"),
    r(`${DROP("side")} > ${trigger} ${caret}`, mq("rotate: 0deg;")),
    r(`${DROP("side")} > [aria-expanded="true"] ${caret}`, mq("rotate: 180deg;")),
    r(sub, `display: flex;
flex-direction: column;
min-inline-size: 13rem;
margin: 0;
padding: 0.4rem;
list-style: none;
${FLYOUT_SURFACE}`),
    r(mega, `display: grid;
grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
gap: var(--space-s, 1rem);
padding: var(--space-s, 1rem);
${FLYOUT_SURFACE}`),
    /* Edge to edge, a card's corners and side borders are at the screen's
       edge, where they read as a mistake; and columns stretched across a wide
       screen are unreadable, so the content keeps to the content width. */
    r(`${DROP("full")} > ${mega}`, `border-radius: 0;
border-inline: 0;
padding-inline: max(var(--site-padding, 1.5rem), calc((var(--nav-full-size, 100%) - var(--content-width, 75rem)) / 2));`),
    r(panel2, "display: flex;\nalign-items: center;"),
    r(panel2, mq(`padding-inline: var(--space-m, 1.5rem);
padding-block-end: var(--space-m, 1.5rem);
box-shadow: var(--shadow-l, 0 18px 40px rgba(0, 0, 0, 0.18));`)),
    r(MOBILE("bottom"), mq(`border-start-start-radius: var(--radius-l, 16px);
border-start-end-radius: var(--radius-l, 16px);`)),
    r(MOBILE("full"), mq("box-shadow: none;")),
    r(`${toggle}, ${close}`, `align-items: center;
justify-content: center;
padding: 0;
color: inherit;
background: none;
border: 0;
border-radius: var(--radius-s, 4px);
cursor: pointer;`),
    r(toggle, "inline-size: 2.75rem;\nblock-size: 2.75rem;"),
    r(close, "inline-size: 2.5rem;\nblock-size: 2.5rem;\nfont-size: 1.5rem;\nline-height: 1;"),
    r(close, mq("align-self: flex-end;\nmargin-block-end: var(--space-xs, 0.5rem);")),
    r(skip2, `padding: 0.6em 1em;
color: var(--primary-ink, #fff);
background: var(--primary, #2563eb);
border-radius: var(--radius-s, 4px);
font-size: var(--text-s, 0.95rem);
text-decoration: none;`)
  ];
}

// ../src/builder-core/parts-css.ts
var PART_KITS = [
  { id: "navigation", label: "Navigation", required: navRequired, look: navLook },
  { id: "carousel", label: "Carousel", required: carouselRequired, look: carouselLook },
  { id: "forms", label: "Forms", required: formRequired, look: formLook },
  /* After the forms: a facet's dropdown and checkboxes are the form controls,
     and the search's own rules are the more specific answer about them. */
  { id: "search", label: "Search", required: searchRequired, look: searchLook },
  { id: "popups", label: "Popups", required: popupRequired, look: (cfg) => popupLook(cfg, headingUnread(cfg)) },
  { id: "consent", label: "Consent", required: consentRequired, look: consentLook }
];
function headingUnread(cfg) {
  const vals = /* @__PURE__ */ new Map();
  for (const m of rootCss(generateFrameworkSheet(cfg)).matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) vals.set(m[1], m[2].trim());
  const resolve6 = (v2) => {
    for (let i = 0; i < 8; i += 1) {
      if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v2)) return v2;
      const ref = /^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)$/.exec(v2);
      if (!ref) return null;
      v2 = vals.get(ref[1]) ?? ref[2]?.trim() ?? "";
    }
    return null;
  };
  const surface = resolve6("var(--base-100, #fff)");
  const heading = resolve6("var(--heading-color)");
  return !!surface && !!heading && contrastRatio(heading, surface) < 3;
}
var PART_KIT_BY_ID = Object.fromEntries(PART_KITS.map((k) => [k.id, k]));

// ../src/builder-core/carry.ts
var MEDIA_EXT = "svg|png|jpe?g|gif|webp|avif|mp4|webm|mov";
var MEDIA_PATH = new RegExp(`(?<![\\w.:/-])/(?!/)[^\\s"'()<>,;?#\\\\{}]+?\\.(?:${MEDIA_EXT})(?![\\w.-])`, "gi");

// ../src/builder-core/consent-scan.ts
var CONSENT_VENDORS = [
  {
    id: "gtm",
    name: "Google Tag Manager",
    category: "marketing",
    cookies: ["_ga", "_gid", "whatever the container loads"],
    match: [/googletagmanager\.com/i, /\bGTM-[A-Z0-9]{4,}\b/],
    note: "A container, not a tag: what it drops is whatever somebody put in it, so it belongs in the strictest category anything inside it needs."
  },
  {
    id: "ga4",
    name: "Google Analytics",
    category: "statistics",
    cookies: ["_ga", "_ga_<id>", "_gid"],
    match: [/google-analytics\.com/i, /\bG-[A-Z0-9]{8,}\b/, /\bUA-\d{4,}-\d+\b/, /\bgtag\s*\(/]
  },
  {
    id: "google-ads",
    name: "Google Ads / DoubleClick",
    category: "marketing",
    cookies: ["IDE", "test_cookie", "_gcl_au"],
    match: [/doubleclick\.net/i, /googleadservices\.com/i, /\bAW-\d{6,}\b/]
  },
  {
    id: "meta",
    name: "Meta Pixel",
    category: "marketing",
    cookies: ["_fbp", "fr"],
    match: [/connect\.facebook\.net/i, /\bfbq\s*\(/]
  },
  {
    id: "linkedin",
    name: "LinkedIn Insight",
    category: "marketing",
    cookies: ["li_sugr", "UserMatchHistory", "bcookie"],
    match: [/snap\.licdn\.com/i, /_linkedin_partner_id/i]
  },
  {
    id: "tiktok",
    name: "TikTok Pixel",
    category: "marketing",
    cookies: ["_ttp"],
    match: [/analytics\.tiktok\.com/i, /\bttq\.(load|track)\b/]
  },
  {
    id: "hotjar",
    name: "Hotjar",
    category: "statistics",
    cookies: ["_hj*"],
    match: [/static\.hotjar\.com/i, /\bhjid\b/]
  },
  {
    id: "clarity",
    name: "Microsoft Clarity",
    category: "statistics",
    cookies: ["_clck", "_clsk"],
    match: [/clarity\.ms/i]
  },
  {
    id: "matomo",
    name: "Matomo",
    category: "statistics",
    cookies: ["_pk_id", "_pk_ses"],
    match: [/matomo\.(js|php)/i, /piwik\.(js|php)/i, /_paq\.push/],
    note: "Self-hostable and configurable to need no consent at all \u2014 anonymized IPs, no cookies. Worth checking how yours is set up before deciding which row it belongs in."
  },
  {
    id: "plausible",
    name: "Plausible",
    category: "statistics",
    cookies: [],
    match: [/plausible\.io/i],
    note: "Sets no cookies and stores no personal data, so it usually needs no consent. Listed so the scan does not stay silent about a third-party request."
  },
  {
    id: "fathom",
    name: "Fathom",
    category: "statistics",
    cookies: [],
    match: [/cdn\.usefathom\.com/i],
    note: "Cookieless by design, like Plausible."
  },
  {
    id: "youtube",
    name: "YouTube embed",
    category: "marketing",
    cookies: ["VISITOR_INFO1_LIVE", "YSC"],
    match: [/youtube\.com\/embed/i, /youtube-nocookie\.com\/embed/i, /youtu\.be\//i],
    note: "youtube-nocookie.com still contacts Google and still needs a decision; what it saves is the advertising cookie, not the request."
  },
  {
    id: "vimeo",
    name: "Vimeo embed",
    category: "statistics",
    cookies: ["vuid"],
    match: [/player\.vimeo\.com/i]
  },
  {
    id: "google-maps",
    name: "Google Maps",
    category: "marketing",
    cookies: ["NID"],
    match: [/maps\.google(apis)?\.com/i, /google\.com\/maps\/embed/i]
  },
  {
    id: "google-fonts",
    name: "Google Fonts",
    category: "necessary",
    cookies: [],
    match: [/fonts\.googleapis\.com/i, /fonts\.gstatic\.com/i],
    note: "No cookie, but the visitor\u2019s IP reaches Google \u2014 which a German court has already called a violation. Self-host it instead: Design \u2192 Fonts installs into the project."
  },
  {
    id: "recaptcha",
    name: "reCAPTCHA",
    category: "necessary",
    cookies: ["_GRECAPTCHA"],
    match: [/recaptcha\/api\.js/i, /\bgrecaptcha\b/],
    note: "Usually defensible as necessary on a form it actually protects \u2014 not on every page of the site."
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "necessary",
    cookies: ["__stripe_mid", "__stripe_sid"],
    match: [/js\.stripe\.com/i],
    note: "Necessary at a checkout, and only there. On a page with nothing to buy it is a third party for no reason."
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "marketing",
    cookies: ["__hstc", "hubspotutk"],
    match: [/js\.hs-scripts\.com/i, /js\.hsforms\.net/i]
  },
  {
    id: "intercom",
    name: "Intercom",
    category: "marketing",
    cookies: ["intercom-id-*"],
    match: [/widget\.intercom\.io/i, /\bIntercom\s*\(/]
  },
  {
    id: "crisp",
    name: "Crisp chat",
    category: "marketing",
    cookies: ["crisp-client/*"],
    match: [/client\.crisp\.chat/i]
  },
  {
    id: "calendly",
    name: "Calendly",
    category: "marketing",
    cookies: ["__cf_bm"],
    match: [/assets\.calendly\.com/i, /calendly\.com\/[\w-]+/i]
  },
  {
    id: "typeform",
    name: "Typeform",
    category: "marketing",
    cookies: ["tf_respondent_*"],
    match: [/embed\.typeform\.com/i]
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    category: "marketing",
    cookies: ["_mcid"],
    match: [/list-manage\.com/i, /chimpstatic\.com/i]
  },
  {
    id: "sentry",
    name: "Sentry",
    category: "statistics",
    cookies: [],
    match: [/browser\.sentry-cdn\.com/i, /\bSentry\.init\b/],
    note: "Error reporting. No cookie, but a request carrying a URL and a user agent \u2014 usually argued as necessary, and worth saying so in the policy rather than leaving it out."
  }
];
var VENDOR_BY_ID = Object.fromEntries(CONSENT_VENDORS.map((v2) => [v2.id, v2]));

// ../src/builder-core/lorem.ts
var WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum at vero eos accusamus iusto odio dignissimos ducimus blanditiis praesentium voluptatum deleniti atque corrupti quos dolores quas molestias".split(" ");

// ../src/builder-core/addons.ts
var ADDONS = [
  {
    id: "forms",
    name: "Forms",
    category: "content",
    core: true,
    kind: "essential",
    summary: "Real HTML forms, and somewhere for a submission to go.",
    about: "The fields are ordinary elements with real name, type and required attributes, so the form posts with every script deleted. What this adds is the half that must not be in the markup \u2014 where a submission is delivered \u2014 plus the field presets, the endpoint that receives it and the runtime that sends without a reload.",
    elements: ["form"],
    screen: true,
    emits: "src/pages/api/forms/<id>.ts for every form on a page, and public/scripts/form.js."
  },
  {
    id: "popups",
    name: "Pop-ups",
    category: "interaction",
    core: true,
    kind: "essential",
    summary: "Panels the project owns \u2014 dialogs, drawers, banners, toasts.",
    about: "A popup is a thing the project owns rather than something you build into one page: its own tree, its own stylesheet, a rule for which pages it is on and a rule for how it opens. The overlay itself is the browser\u2019s \u2014 popover, the top layer, light dismiss, Escape and focus all come from the platform, so a panel still opens with the script deleted.",
    elements: ["overlay"],
    screen: true,
    emits: "public/scripts/popup.js, and each popup\u2019s own stylesheet on the pages it is scoped to."
  },
  {
    id: "consent",
    name: "Consent",
    category: "compliance",
    core: true,
    kind: "essential",
    needs: ["popups"],
    summary: "A cookie banner that actually holds nothing back until it is answered.",
    about: "The banner and the preferences panel are popups with a role, so they are styled and edited like anything else you build. What the addon adds is the rule about what may run before the answer: a tracker ships as text/plain and becomes a script only once its category is granted. Opt-in, opt-out and both regimes, a GPC signal that is honored, and a scan that reports what the project actually loads.",
    elements: ["consent"],
    screen: true,
    emits: "public/scripts/consent.js, the consent stylesheet and the revisit badge."
  },
  {
    id: "carousel",
    name: "Slider",
    category: "interaction",
    core: true,
    kind: "essential",
    summary: "A scroller the browser already knows how to drive.",
    about: "Real overflow, real snap points, real children \u2014 so it swipes, scrolls and answers the arrow keys with every script deleted. The looks are variant classes that re-point tokens (slider, cards, filmstrip, fade, marquee), which is why swapping one is a class swap and taking it off leaves a working scroller behind. There is nothing to configure here: installing it is what puts the elements in the menu.",
    elements: ["carousel"],
    screen: false,
    emits: "public/scripts/carousel.js on pages that hold one."
  },
  /* Every site with more than a handful of pages is asked "where is …", and a
     list of forty cards is asked "only the ones about …" — neither is an
     optional extra. Its screen is Settings → Search; the Filter needs nothing
     set up and works without it. */
  {
    id: "search",
    name: "Search",
    category: "interaction",
    core: true,
    kind: "essential",
    summary: "A search over the whole site, and filters and facets over a list.",
    about: "One Search element answers whichever question it stands in: inside a Filter it narrows that list as you type, anywhere else it searches every page and entry. The site search reads an index the build writes beside the pages \u2014 nothing is sent anywhere, and how it matches is set once under Settings \u2192 Search. A Filter\u2019s facets are made from the data its Loop already shows.",
    elements: ["search"],
    screen: true,
    emits: "public/scripts/search.js on pages that hold a search or a filter, and src/pages/search-index.json.js while one searches the site."
  },
  {
    id: "social",
    name: "Social media",
    category: "marketing",
    summary: "Your latest posts, fetched at build time into a real file.",
    about: "Instagram, Facebook, TikTok, Mastodon or any RSS feed, read while the site is built into src/data/ and committed like anything else. What renders them is a Loop over elements you laid out yourself \u2014 so no embed, no third-party script in the visitor\u2019s browser, nothing loaded before the consent banner was answered, and a page that still works when the network is down.",
    screen: true,
    emits: "scripts/social.mjs and one src/data/social-<id>.json per feed."
  },
  {
    id: "database",
    name: "Database",
    category: "data",
    kind: "setting",
    summary: "A content type backed by rows instead of files \u2014 and somewhere for a form to write.",
    about: "Git-backed content is the default and stays the default. This is the adapter for the three things files cannot do: changing content without a commit (a rebuild still publishes it), data a visitor writes, and a collection large or relational enough to need a query. libSQL through Drizzle, in your own database \u2014 the schema is generated as a real file from the field list you already wrote, and every change is a migration you read before it runs.",
    screen: true,
    emits: "src/db/schema.ts, src/db/index.ts and the migrations under src/db/migrations/."
  }
];
var ADDON_BY_ID = Object.fromEntries(ADDONS.map((a) => [a.id, a]));
var CATALOG = ADDONS.filter((a) => !a.kind);

// ../src/builder-core/social.ts
var SOCIAL_NETWORKS = [
  {
    id: "mastodon",
    label: "Mastodon",
    token: false,
    accountLabel: "Account",
    accountHint: "user@instance.social \u2014 the handle as you would write it to somebody.",
    tokenHint: "None. A public Mastodon account is a public JSON endpoint.",
    effort: "Nothing to set up: a public Mastodon account is a public JSON endpoint. The one to try first."
  },
  {
    id: "rss",
    label: "RSS or Atom feed",
    token: false,
    accountLabel: "Feed URL",
    accountHint: "https://\u2026/feed.xml \u2014 a blog, a podcast, or a YouTube channel (youtube.com/feeds/videos.xml?channel_id=\u2026).",
    tokenHint: "None. A feed is public by definition.",
    effort: "Nothing to set up, and it reaches more than people expect \u2014 most publishing platforms still emit a feed."
  },
  {
    id: "instagram",
    label: "Instagram",
    token: true,
    accountLabel: "User id",
    accountHint: "Leave empty to use whichever account the token belongs to.",
    tokenHint: "A long-lived Instagram access token.",
    tokenDocs: "https://developers.facebook.com/apps",
    tokenSteps: [
      "Switch your Instagram account to Business or Creator \u2014 Settings \u2192 Account type. A personal account cannot be read at all.",
      "Create an app at developers.facebook.com/apps and add the Instagram product to it.",
      "In the app: Instagram \u2192 API setup with Instagram login \u2192 add your account, then Generate token.",
      "Put that token in your .env under the name you type here. It lasts 60 days \u2014 refresh it before it runs out, or the next build keeps the posts it already has."
    ],
    effort: "A Meta developer app, a Business or Creator account, and a token you refresh every 60 days. The Basic Display API this used to be simple with was shut down at the end of 2024."
  },
  {
    id: "facebook",
    label: "Facebook Page",
    token: true,
    accountLabel: "Page id",
    accountHint: "The numeric id of the Page, not its name.",
    tokenHint: "A long-lived Page access token.",
    tokenDocs: "https://developers.facebook.com/tools/explorer",
    tokenSteps: [
      "Create an app at developers.facebook.com/apps.",
      "Open the Graph API Explorer, pick that app, then pick your Page under User or Page.",
      "Add the pages_read_engagement permission and press Generate access token.",
      "Exchange it for a long-lived one (Access Token Debugger \u2192 Extend), otherwise it expires in about an hour.",
      "The Page id is on your Page under About, or in the Explorer at /me/accounts."
    ],
    effort: "A Meta developer app and a Page token. Only a Page, never a personal profile \u2014 Facebook has no API for one."
  },
  {
    id: "tiktok",
    label: "TikTok",
    token: true,
    accountLabel: "Open id",
    accountHint: "Leave empty to use whichever account the token belongs to.",
    tokenHint: "An access token with the video.list scope.",
    tokenDocs: "https://developers.tiktok.com",
    tokenSteps: [
      "Register at developers.tiktok.com and create an app.",
      "Add Login Kit and request the video.list scope \u2014 the app has to pass TikTok\u2019s review before it returns anything at all.",
      "Run the login flow once for your own account and keep the access token it gives back.",
      "Tokens are short-lived and come with a refresh token; whatever renews yours has to write the new value where the build reads it."
    ],
    effort: "A TikTok developer app that has been through their review before it may read anything. The longest way round of the five."
  }
];
var NETWORK_BY_ID = Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n.id, n]));

// ../src/builder-core/preset.ts
var PRESET_FORMAT = "sitereal-preset";
var PRESET_PARTS = [
  "settings",
  "identity",
  "framework",
  "variables",
  "styles",
  "fonts",
  "icons",
  "components",
  "templates",
  "snippets"
];
var DEFAULT_PARTS = PRESET_PARTS.filter((p) => p !== "identity");
var IDENTITY_KEYS = ["name", "description", "url", "homepage", "notFound", "legal", "favicon", "logo", "ogImage", "social", "publisher", "redirects"];
var only = (parts, p) => parts.includes(p);
function presetSite(site, parts) {
  const wantSettings = only(parts, "settings");
  const wantIdentity = only(parts, "identity");
  if (!wantSettings && !wantIdentity) return void 0;
  const out2 = {};
  if (wantSettings) {
    const { verification, homeTitle, twitter, ...seo } = site.seo ?? {};
    if (site.lang) out2.lang = site.lang;
    if (site.locale) out2.locale = site.locale;
    if (site.themeColor) out2.themeColor = site.themeColor;
    if (site.cookieBanner) out2.cookieBanner = site.cookieBanner;
    if (site.consent) {
      const { scan, ...rest } = site.consent;
      out2.consent = rest;
    }
    if (Object.keys(seo).length) out2.seo = seo;
    if (wantIdentity && (verification || homeTitle || twitter)) {
      out2.seo = { ...out2.seo, ...homeTitle ? { homeTitle } : {}, ...twitter ? { twitter } : {}, ...verification ? { verification } : {} };
    }
  }
  if (wantIdentity) {
    for (const k of IDENTITY_KEYS) {
      const v2 = site[k];
      if (v2 !== void 0 && v2 !== "") out2[k] = v2;
    }
  }
  return out2;
}
function isPreset(raw) {
  const d = raw;
  return !!d && typeof d === "object" && d.format === PRESET_FORMAT && Array.isArray(d.parts);
}
function presetParts(bundle, wanted) {
  return PRESET_PARTS.filter((p) => bundle.parts.includes(p) && (!wanted || wanted.includes(p)));
}
function mergeBy(current2, incoming, key) {
  const out2 = [...current2];
  for (const item of incoming) {
    const k = key(item);
    if (!k) continue;
    const at = out2.findIndex((x) => key(x) === k);
    if (at >= 0) out2[at] = item;
    else out2.push(item);
  }
  return out2;
}
var byName = (x) => String(x?.name ?? "").trim().toLowerCase();
function applyPreset(doc, bundle, wanted) {
  const parts = presetParts(bundle, wanted);
  const applied = [];
  if (bundle.site && (parts.includes("settings") || parts.includes("identity"))) {
    const incoming = presetSite(bundle.site, parts);
    if (incoming) {
      const { seo, ...rest } = incoming;
      doc.site = {
        ...doc.site,
        ...rest,
        /* Three settings name routes in *this* project, so none of them
           travels: a preset naming a homepage that doesn't exist here would
           serve a 404 at `/`, and one naming somebody else's imprint would
           point this site's footer at another company's address. */
        homepage: doc.site.homepage,
        notFound: doc.site.notFound,
        legal: doc.site.legal,
        ...seo ? { seo: { ...doc.site.seo, ...seo } } : {}
      };
      if (parts.includes("settings")) applied.push("settings");
      if (parts.includes("identity")) applied.push("identity");
    }
  }
  if (parts.includes("framework") && bundle.framework?.config) {
    doc.framework = { enabled: bundle.framework.enabled !== false, config: bundle.framework.config };
    applied.push("framework");
  }
  if (parts.includes("variables") && bundle.variables) {
    doc.variables = mergeBy(doc.variables, bundle.variables, (v2) => String(v2?.slug ?? ""));
    applied.push("variables");
  }
  if (parts.includes("styles") && bundle.styles) {
    doc.styles = mergeBy(doc.styles, bundle.styles, (s) => isGlobalSheet(s) ? "global" : byName(s));
    applied.push("styles");
  }
  if (parts.includes("fonts") && bundle.fonts) {
    doc.fonts = mergeBy(doc.fonts, bundle.fonts, (f2) => String(f2?.slug ?? ""));
    applied.push("fonts");
  }
  if (parts.includes("icons") && bundle.icons) {
    doc.icons = mergeBy(doc.icons ?? [], bundle.icons, (i) => String(i?.prefix ?? ""));
    applied.push("icons");
  }
  if (parts.includes("components") && bundle.components) {
    doc.components = mergeBy(doc.components, bundle.components, byName);
    applied.push("components");
  }
  if (parts.includes("templates") && bundle.templates) {
    doc.templates = mergeBy(doc.templates, bundle.templates, byName);
    applied.push("templates");
  }
  if (parts.includes("snippets") && bundle.snippets) {
    doc.snippets = mergeBy(doc.snippets, bundle.snippets, byName);
    applied.push("snippets");
  }
  return applied;
}

// ../src/builder-core/patterns.ts
var PATTERN_CATEGORIES = [
  { id: "header", label: "Headers", hint: "the bar at the top of every page" },
  { id: "hero", label: "Hero sections", hint: "the first thing on the page" },
  { id: "content", label: "Content sections", hint: "text, media, the body of a page" },
  { id: "grid", label: "Grid sections", hint: "cards, features, logos \u2014 things in rows" },
  { id: "tabs", label: "Tabs", hint: "one panel at a time" },
  { id: "slider", label: "Sliders", hint: "carousels, tickers, filmstrips" },
  { id: "cta", label: "Calls to action", hint: "the ask, and the form it takes" },
  { id: "footer", label: "Footers", hint: "the bar at the bottom of every page" },
  { id: "notfound", label: "404", hint: "the page for an address that is not there" },
  { id: "other", label: "Other", hint: "everything that is none of the above" }
];
var PATTERN_CATEGORY_IDS = PATTERN_CATEGORIES.map((c2) => c2.id);

// ../src/builder-core/patterns-pack.ts
var SPACE = {
  xs: "var(--space-xs, .5rem)",
  s: "var(--space-s, .75rem)",
  m: "var(--space-m, 1.5rem)",
  l: "var(--space-l, 2.5rem)",
  xl: "var(--space-xl, 4rem)"
};
var BAND = "var(--section-space-m, 5rem)";
var INK = "var(--text-color, #1f2933)";
var HEAD = "var(--heading-color, inherit)";
var DIM = "color-mix(in srgb, currentColor 65%, transparent)";
var LINE = "var(--border-light, color-mix(in srgb, currentColor 12%, transparent))";
var SURFACE = "var(--surface, color-mix(in srgb, currentColor 4%, transparent))";
var BRAND = "var(--primary, #3858e9)";
var RADIUS = "var(--radius-m, .75rem)";
var SHADOW = "var(--shadow-s, 0 1px 2px rgb(0 0 0 / .06), 0 4px 12px rgb(0 0 0 / .05))";
var band = (extra = "") => `padding-block: ${BAND};
${extra}`.trim();
var stack = (gap) => `display: grid;
gap: ${gap};`;
var NAV_MQ = `@media (max-width: ${NAV_BP}px)`;
var navItem = (b, text, href) => ({
  el: "nav-item",
  classes: [`${b}__item`],
  children: [{ el: "nav-link", classes: [`${b}__link`], text, attrs: { href } }]
});
var navTrigger = (b, text) => ({
  el: "nav-trigger",
  classes: [`${b}__trigger`],
  text,
  children: [{ el: "nav-caret", classes: [`${b}__caret`] }]
});
var navDropdown = (b, text, links) => ({
  el: "nav-dropdown",
  classes: [`${b}__dropdown`],
  children: [
    navTrigger(b, text),
    { el: "nav-sub", classes: [`${b}__sub`], children: links.map(([t, h2]) => navItem(b, t, h2)) }
  ]
});
var navMega = (b, text, columns) => ({
  el: "nav-dropdown",
  classes: [`${b}__dropdown`],
  children: [
    navTrigger(b, text),
    {
      el: "nav-mega",
      classes: [`${b}__mega`],
      children: columns.map((c2) => ({
        el: "div",
        classes: [`${b}__column`],
        children: [
          { el: "text", tag: "p", classes: [`${b}__column-title`], text: c2.title },
          { el: "nav-sub", classes: [`${b}__sub`], children: c2.links.map(([t, h2]) => navItem(b, t, h2)) }
        ]
      }))
    }
  ]
});
var menu = (b, entries, label = "Main") => ({
  el: "nav",
  classes: [`${b}__nav`],
  attrs: { "aria-label": label },
  children: [
    { el: "nav-toggle", classes: [`${b}__toggle`], children: [{ el: "nav-burger", classes: [`${b}__burger`] }] },
    { el: "nav-scrim", classes: [`${b}__scrim`] },
    { el: "nav-panel", classes: [`${b}__panel`], children: [{ el: "nav-list", classes: [`${b}__list`], children: entries }] }
  ]
});
var skipLink = (b) => ({ el: "nav-skip", classes: [`${b}__skip`], text: "Skip to content", attrs: { href: "#main" } });
var logo = (b) => ({ el: "link", tag: "a", classes: [`${b}__logo`], text: "Sitename", attrs: { href: "/" } });
var standardEntries = (b) => [
  navDropdown(b, "Services", [["Design", "/services/design"], ["Development", "/services/development"], ["Consulting", "/services/consulting"]]),
  navItem(b, "Work", "/work"),
  navItem(b, "About", "/about"),
  navItem(b, "Contact", "/contact")
];
var logoCss = `font-size: var(--text-l, 1.25rem);
font-weight: 700;
color: ${HEAD};
text-decoration: none;`;
var HEADERS = [
  {
    id: "header-bar",
    name: "Header bar",
    category: "header",
    description: "Logo, menu and one action, on a hairline.",
    base: "site-header",
    compose: [{
      el: "section",
      tag: "header",
      classes: ["site-header"],
      children: [
        skipLink("site-header"),
        {
          el: "container",
          classes: ["site-header__inner"],
          children: [
            logo("site-header"),
            menu("site-header", standardEntries("site-header")),
            { el: "button", tag: "a", classes: ["site-header__action"], text: "Get in touch", attrs: { href: "/contact" } }
          ]
        }
      ]
    }],
    rules: [
      { selector: ".site-header", css: `padding-block: ${SPACE.s};
border-block-end: 1px solid ${LINE};` },
      { selector: ".site-header__inner", css: `display: flex;
flex-direction: row;
align-items: center;
gap: ${SPACE.m};` },
      { selector: ".site-header__logo", css: `margin-inline-end: auto;
${logoCss}` },
      /* The toggle lives inside the nav, so on a phone the nav goes last and
         the burger sits at the far end, after the action. */
      { selector: ".site-header__nav", css: `${NAV_MQ} {
  order: 3;
}` },
      { selector: ".site-header__action", css: "flex: none;" }
    ]
  },
  {
    id: "header-split",
    name: "Header, menu centered",
    category: "header",
    description: "Logo left, the menu in the middle, sign-in and an action right.",
    base: "split-header",
    compose: [{
      el: "section",
      tag: "header",
      classes: ["split-header"],
      children: [
        skipLink("split-header"),
        {
          el: "container",
          classes: ["split-header__inner"],
          children: [
            logo("split-header"),
            menu("split-header", standardEntries("split-header")),
            {
              el: "div",
              classes: ["split-header__actions"],
              children: [
                { el: "link", tag: "a", classes: ["split-header__signin"], text: "Sign in", attrs: { href: "/login" } },
                { el: "button", tag: "a", classes: ["split-header__action"], text: "Start now", attrs: { href: "/signup" } }
              ]
            }
          ]
        }
      ]
    }],
    rules: [
      { selector: ".split-header", css: `padding-block: ${SPACE.s};
border-block-end: 1px solid ${LINE};` },
      /* Two equal outer columns are what keep the menu on the true center, however
         long the logo or the actions are. */
      { selector: ".split-header__inner", css: `display: grid;
grid-template-columns: 1fr auto 1fr;
align-items: center;
gap: ${SPACE.m};

${NAV_MQ} {
  grid-template-columns: 1fr auto auto;
}` },
      { selector: ".split-header__logo", css: `justify-self: start;
${logoCss}` },
      { selector: ".split-header__nav", css: `${NAV_MQ} {
  order: 3;
}` },
      { selector: ".split-header__actions", css: `justify-self: end;
display: flex;
align-items: center;
gap: ${SPACE.s};` },
      { selector: ".split-header__signin", css: `color: inherit;
text-decoration: none;
font-size: var(--text-s, .95rem);
font-weight: 500;

&:hover {
  color: ${BRAND};
}

${NAV_MQ} {
  display: none;
}` }
    ]
  },
  {
    id: "header-stacked",
    name: "Header, logo above",
    category: "header",
    description: "A centered name over a centered menu \u2014 for a publication or a studio.",
    base: "stacked-header",
    compose: [{
      el: "section",
      tag: "header",
      classes: ["stacked-header"],
      children: [
        skipLink("stacked-header"),
        {
          el: "container",
          classes: ["stacked-header__inner"],
          children: [
            logo("stacked-header"),
            menu("stacked-header", standardEntries("stacked-header"))
          ]
        }
      ]
    }],
    rules: [
      { selector: ".stacked-header", css: `padding-block: ${SPACE.m} 0;
border-block-end: 1px solid ${LINE};

${NAV_MQ} {
  padding-block: ${SPACE.s};
}` },
      { selector: ".stacked-header__inner", css: `display: grid;
justify-items: center;
gap: ${SPACE.s};

${NAV_MQ} {
  grid-template-columns: 1fr auto;
  align-items: center;
  justify-items: stretch;
}` },
      { selector: ".stacked-header__logo", css: `${logoCss}
font-size: var(--h3, 1.75rem);
letter-spacing: -0.02em;` },
      { selector: ".stacked-header__nav", css: `justify-content: center;
inline-size: 100%;
padding-block: ${SPACE.xs};
border-block-start: 1px solid ${LINE};

${NAV_MQ} {
  inline-size: auto;
  padding-block: 0;
  border: 0;
}` }
    ]
  },
  {
    id: "header-mega",
    name: "Header with mega menu",
    category: "header",
    description: "One entry opens a panel as wide as the header, in titled columns.",
    base: "mega-header",
    compose: [{
      el: "section",
      tag: "header",
      classes: ["mega-header"],
      children: [
        skipLink("mega-header"),
        {
          el: "container",
          classes: ["mega-header__inner"],
          children: [
            logo("mega-header"),
            menu("mega-header", [
              navMega("mega-header", "Product", [
                { title: "Build", links: [["Editor", "/product/editor"], ["Components", "/product/components"], ["Templates", "/product/templates"]] },
                { title: "Publish", links: [["Hosting", "/product/hosting"], ["Forms", "/product/forms"], ["SEO", "/product/seo"]] },
                { title: "Learn", links: [["Docs", "/docs"], ["Guides", "/guides"], ["Changelog", "/changelog"]] }
              ]),
              navItem("mega-header", "Pricing", "/pricing"),
              navItem("mega-header", "Customers", "/customers"),
              navItem("mega-header", "Contact", "/contact")
            ]),
            { el: "button", tag: "a", classes: ["mega-header__action"], text: "Get started", attrs: { href: "/signup" } }
          ]
        }
      ]
    }],
    rules: [
      { selector: ".mega-header", css: `padding-block: ${SPACE.s};
border-block-end: 1px solid ${LINE};` },
      /* The panel hangs from the nearest positioned box. Making that the
         container rather than the nav is what makes it as wide as the header. */
      { selector: ".mega-header__inner", css: `position: relative;
display: flex;
flex-direction: row;
align-items: center;
gap: ${SPACE.m};` },
      { selector: ".mega-header__logo", css: `margin-inline-end: auto;
${logoCss}` },
      { selector: ".mega-header__nav", css: `position: static;

${NAV_MQ} {
  order: 3;
}` },
      { selector: ".mega-header__mega", css: `inset-block-start: calc(100% + ${SPACE.s});
grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
gap: ${SPACE.m};
padding: ${SPACE.m};` },
      { selector: ".mega-header__column", css: `display: grid;
align-content: start;
gap: ${SPACE.xs};` },
      { selector: ".mega-header__column-title", css: `margin: 0;
padding-inline: 0.75em;
font-size: var(--text-xs, .75rem);
font-weight: 600;
letter-spacing: .06em;
text-transform: uppercase;
color: ${DIM};

${NAV_MQ} {
  padding-inline: 0;
  padding-block-start: ${SPACE.xs};
}` },
      { selector: ".mega-header__action", css: "flex: none;" }
    ]
  },
  {
    id: "header-drawer",
    name: "Header with drawer",
    category: "header",
    description: "A name and a menu button at every width; the menu slides in from the side.",
    base: "drawer-header",
    compose: [{
      el: "section",
      tag: "header",
      classes: ["drawer-header"],
      children: [
        skipLink("drawer-header"),
        {
          el: "container",
          classes: ["drawer-header__inner"],
          children: [
            logo("drawer-header"),
            menu("drawer-header", standardEntries("drawer-header"))
          ]
        }
      ]
    }],
    /* This menu is collapsed at every width, which is a menu saying so for
       itself: the script calls it mobile exactly when its toggle is visible,
       so showing the toggle here and restating the sheet without a media query
       is the whole of "always a drawer". The site's breakpoint is untouched. */
    rules: [
      { selector: ".drawer-header", css: `padding-block: ${SPACE.s};
border-block-end: 1px solid ${LINE};` },
      { selector: ".drawer-header__inner", css: `display: flex;
flex-direction: row;
align-items: center;
justify-content: space-between;
gap: ${SPACE.m};` },
      { selector: ".drawer-header__logo", css: logoCss },
      { selector: ".drawer-header__toggle", css: "display: inline-flex;\nposition: relative;\nz-index: 110;" },
      { selector: ".drawer-header__scrim", css: `position: fixed;
inset: 0;
z-index: 90;
display: block;
background: rgb(0 0 0 / .45);
opacity: 0;
visibility: hidden;
transition: opacity var(--transition, 200ms ease), visibility var(--transition, 200ms ease);

.drawer-header__nav[data-nav-open] > & {
  opacity: 1;
  visibility: visible;
}` },
      { selector: ".drawer-header__panel", css: `position: fixed;
inset-block: 0;
inset-inline-end: 0;
z-index: 100;
flex-direction: column;
align-items: stretch;
inline-size: min(22rem, 100%);
padding: 5rem ${SPACE.m} ${SPACE.m};
background: var(--surface, var(--base-100, #fff));
box-shadow: var(--shadow-l, 0 18px 40px rgb(0 0 0 / .18));
overflow-y: auto;
overscroll-behavior: contain;
visibility: hidden;
translate: 100% 0;
transition: translate 280ms ease, visibility 280ms ease;

.drawer-header__nav[data-nav-open] > & {
  visibility: visible;
  translate: 0 0;
}

@media (prefers-reduced-motion: reduce) {
  transition: none;
}` },
      { selector: ".drawer-header__list", css: "flex-direction: column;\nalign-items: stretch;" },
      { selector: ".drawer-header__link", css: "font-size: var(--text-m, 1rem);" },
      { selector: ".drawer-header__dropdown", css: "flex-wrap: wrap;" },
      { selector: ".drawer-header__trigger", css: "flex: 1 1 auto;\njustify-content: space-between;\nfont-size: var(--text-m, 1rem);" },
      { selector: ".drawer-header__sub", css: "position: static;\nflex: 0 0 100%;\ndisplay: none;\nmin-inline-size: 0;\npadding: 0 0 0 0.9rem;\nbackground: none;\nborder: 0;\nbox-shadow: none;\nopacity: 1;\nvisibility: inherit;\ntranslate: none;\n\n[data-nav-open] > & {\n  display: flex;\n}" }
    ]
  },
  {
    id: "header-overlay",
    name: "Header over the hero",
    category: "header",
    description: "Transparent, in white, laid over whatever the first section is.",
    base: "overlay-header",
    compose: [{
      el: "section",
      tag: "header",
      classes: ["overlay-header"],
      children: [
        skipLink("overlay-header"),
        {
          el: "container",
          classes: ["overlay-header__inner"],
          children: [
            logo("overlay-header"),
            menu("overlay-header", standardEntries("overlay-header")),
            { el: "button", tag: "a", classes: ["overlay-header__action"], text: "Get in touch", attrs: { href: "/contact" } }
          ]
        }
      ]
    }],
    rules: [
      /* Out of the flow, so the first section starts at the top of the page and
         runs underneath. The gradient is what keeps white text readable over a
         light photograph. */
      { selector: ".overlay-header", css: `position: absolute;
inset-block-start: 0;
inset-inline: 0;
z-index: 50;
padding-block: ${SPACE.s};
color: #fff;
background: linear-gradient(rgb(0 0 0 / .45), transparent);` },
      { selector: ".overlay-header__inner", css: `display: flex;
flex-direction: row;
align-items: center;
gap: ${SPACE.m};` },
      { selector: ".overlay-header__logo", css: "margin-inline-end: auto;\nfont-size: var(--text-l, 1.25rem);\nfont-weight: 700;\ncolor: inherit;\ntext-decoration: none;" },
      { selector: ".overlay-header__nav", css: `${NAV_MQ} {
  order: 3;
}` },
      { selector: ".overlay-header__link", css: "&:hover,\n&[aria-current] {\n  color: inherit;\n  text-decoration: underline;\n  text-underline-offset: 0.3em;\n}" },
      { selector: ".overlay-header__trigger", css: "&:hover {\n  color: inherit;\n}" },
      /* The flyout and the phone panel are light surfaces, so the ink inside
         them goes back to the page's own. */
      { selector: ".overlay-header__sub", css: `color: ${INK};

${NAV_MQ} {
  color: inherit;
}` },
      { selector: ".overlay-header__panel", css: `${NAV_MQ} {
  color: ${INK};
}` },
      { selector: ".overlay-header__toggle", css: `.overlay-header__nav[data-nav-open] > & {
  color: ${INK};
}` },
      { selector: ".overlay-header__action", css: "flex: none;" }
    ]
  },
  {
    id: "header-utility",
    name: "Header with utility bar",
    category: "header",
    description: "A thin contact strip above the main bar.",
    base: "topbar-header",
    compose: [{
      el: "section",
      tag: "header",
      classes: ["topbar-header"],
      children: [
        skipLink("topbar-header"),
        {
          el: "div",
          classes: ["topbar-header__utility"],
          children: [{
            el: "container",
            classes: ["topbar-header__utility-inner"],
            children: [
              { el: "link", tag: "a", classes: ["topbar-header__utility-link"], text: "+49 30 000000", attrs: { href: "tel:+4930000000" } },
              { el: "link", tag: "a", classes: ["topbar-header__utility-link"], text: "hello@example.com", attrs: { href: "mailto:hello@example.com" } }
            ]
          }]
        },
        {
          el: "container",
          classes: ["topbar-header__inner"],
          children: [
            logo("topbar-header"),
            menu("topbar-header", standardEntries("topbar-header"))
          ]
        }
      ]
    }],
    rules: [
      { selector: ".topbar-header", css: `padding-block: 0;
border-block-end: 1px solid ${LINE};` },
      { selector: ".topbar-header__utility", css: `padding-block: ${SPACE.xs};
border-block-end: 1px solid ${LINE};
font-size: var(--text-s, .875rem);
color: ${DIM};` },
      { selector: ".topbar-header__utility-inner", css: `display: flex;
flex-direction: row;
justify-content: flex-end;
gap: ${SPACE.m};` },
      { selector: ".topbar-header__utility-link", css: "color: inherit;\ntext-decoration: none;\n\n&:hover {\n  text-decoration: underline;\n}" },
      { selector: ".topbar-header__inner", css: `display: flex;
flex-direction: row;
align-items: center;
gap: ${SPACE.m};
padding-block: ${SPACE.s};` },
      { selector: ".topbar-header__logo", css: `margin-inline-end: auto;
${logoCss}` }
    ]
  }
];
var HEROES = [
  {
    id: "hero-centered",
    name: "Centered hero",
    category: "hero",
    description: "Eyebrow, headline, one paragraph, two buttons.",
    base: "hero",
    compose: [{
      el: "section",
      classes: ["hero"],
      children: [{
        el: "container",
        classes: ["hero__inner"],
        children: [
          { el: "span", classes: ["hero__eyebrow"], text: "New" },
          { el: "heading", tag: "h1", classes: ["hero__title"], text: "A headline that says the one thing" },
          { el: "text", classes: ["hero__lead"], text: "One sentence under it, saying who this is for and what changes for them. Short enough to read standing up." },
          {
            el: "div",
            classes: ["hero__actions"],
            children: [
              { el: "button", classes: ["hero__cta"], text: "Get started" },
              { el: "button", classes: ["hero__cta", "btn--outline"], text: "Talk to us" }
            ]
          }
        ]
      }]
    }],
    rules: [
      { selector: ".hero", css: band("text-align: center;") },
      { selector: ".hero__inner", css: `${stack(SPACE.m)}
justify-items: center;
max-inline-size: 46rem;` },
      { selector: ".hero__eyebrow", css: `display: inline-block;
padding: .25em .75em;
border-radius: 999px;
background: ${SURFACE};
font-size: var(--text-s, .875rem);
letter-spacing: .04em;
text-transform: uppercase;
color: ${DIM};` },
      { selector: ".hero__title", css: `margin: 0;
font-size: var(--h1, clamp(2.5rem, 6vw, 4rem));
text-wrap: balance;` },
      { selector: ".hero__lead", css: `margin: 0;
max-inline-size: 38rem;
font-size: var(--text-l, 1.125rem);
color: ${DIM};
text-wrap: pretty;` },
      { selector: ".hero__actions", css: `display: flex;
flex-wrap: wrap;
justify-content: center;
gap: ${SPACE.s};` }
    ]
  },
  {
    id: "hero-split",
    name: "Split hero",
    category: "hero",
    description: "Copy on one side, a picture on the other.",
    base: "hero-split",
    compose: [{
      el: "section",
      classes: ["hero-split"],
      children: [{
        el: "container",
        classes: ["hero-split__inner"],
        children: [
          {
            el: "div",
            classes: ["hero-split__copy"],
            children: [
              { el: "heading", tag: "h1", classes: ["hero-split__title"], text: "Built the way you would have built it" },
              { el: "text", classes: ["hero-split__lead"], text: "Two or three lines of what this is. Enough to decide whether to keep reading, and no more." },
              {
                el: "div",
                classes: ["hero-split__actions"],
                children: [
                  { el: "button", classes: ["hero-split__cta"], text: "Get started" },
                  { el: "link", tag: "a", classes: ["hero-split__link"], text: "See how it works", attrs: { href: "#" } }
                ]
              }
            ]
          },
          {
            el: "figure",
            classes: ["hero-split__media"],
            children: [{ el: "image", classes: ["hero-split__image"], attrs: { src: PLACEHOLDER_SRC, alt: "" } }]
          }
        ]
      }]
    }],
    rules: [
      { selector: ".hero-split", css: band() },
      { selector: ".hero-split__inner", css: `display: grid;
gap: ${SPACE.xl};
align-items: center;

@media (min-width: 48rem) {
  grid-template-columns: 1fr 1fr;
}` },
      { selector: ".hero-split__copy", css: stack(SPACE.m) },
      { selector: ".hero-split__title", css: `margin: 0;
font-size: var(--h1, clamp(2.25rem, 5vw, 3.5rem));
text-wrap: balance;` },
      { selector: ".hero-split__lead", css: `margin: 0;
font-size: var(--text-l, 1.125rem);
color: ${DIM};` },
      { selector: ".hero-split__actions", css: `display: flex;
flex-wrap: wrap;
align-items: center;
gap: ${SPACE.m};` },
      { selector: ".hero-split__link", css: `color: ${BRAND};
font-weight: 600;` },
      { selector: ".hero-split__media", css: `margin: 0;
border-radius: ${RADIUS};
overflow: hidden;
box-shadow: ${SHADOW};` },
      { selector: ".hero-split__image", css: "inline-size: 100%;\nblock-size: 100%;\naspect-ratio: 4 / 3;\nobject-fit: cover;" }
    ]
  },
  {
    id: "hero-cover",
    name: "Cover hero",
    category: "hero",
    description: "A full-bleed picture with the headline over it.",
    base: "hero-cover",
    compose: [{
      el: "section",
      classes: ["hero-cover"],
      children: [
        { el: "image", classes: ["hero-cover__image"], attrs: { src: PLACEHOLDER_SRC, alt: "" } },
        {
          el: "container",
          classes: ["hero-cover__inner"],
          children: [
            { el: "heading", tag: "h1", classes: ["hero-cover__title"], text: "Somewhere worth being" },
            { el: "text", classes: ["hero-cover__lead"], text: "One line over the picture. It has to read at a glance, so it is short." },
            { el: "button", classes: ["hero-cover__cta"], text: "Find out more" }
          ]
        }
      ]
    }],
    rules: [
      { selector: ".hero-cover", css: `position: relative;
isolation: isolate;
display: grid;
align-items: end;
min-block-size: min(38rem, 80vh);
padding-block: ${SPACE.xl};
color: #fff;

&::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(to top, rgb(0 0 0 / .72), rgb(0 0 0 / .15));
}` },
      { selector: ".hero-cover__image", css: "position: absolute;\ninset: 0;\nz-index: -2;\ninline-size: 100%;\nblock-size: 100%;\nobject-fit: cover;" },
      { selector: ".hero-cover__inner", css: `${stack(SPACE.s)}
justify-items: start;
max-inline-size: 40rem;` },
      { selector: ".hero-cover__title", css: "margin: 0;\ncolor: inherit;\nfont-size: var(--h1, clamp(2.5rem, 6vw, 4rem));\ntext-wrap: balance;" },
      { selector: ".hero-cover__lead", css: "margin: 0;\nfont-size: var(--text-l, 1.125rem);\ncolor: rgb(255 255 255 / .85);" },
      { selector: ".hero-cover__cta", css: `margin-block-start: ${SPACE.xs};` }
    ]
  }
];
var CONTENT = [
  {
    id: "content-prose",
    name: "Prose section",
    category: "content",
    description: "A heading and running text, at a readable measure.",
    base: "prose",
    compose: [{
      el: "section",
      classes: ["prose"],
      children: [{
        el: "container",
        classes: ["prose__inner"],
        children: [
          { el: "heading", classes: ["prose__title"], text: "What this section is about" },
          { el: "text", classes: ["prose__text"], text: "The first paragraph carries the idea. Keep the line length near sixty-five characters and the reader keeps going without noticing that they are reading." },
          { el: "text", classes: ["prose__text"], text: "The second one adds the detail the first one earned. Anything that needs a third paragraph probably needs a heading of its own." }
        ]
      }]
    }],
    rules: [
      { selector: ".prose", css: band() },
      { selector: ".prose__inner", css: `${stack(SPACE.m)}
max-inline-size: 42rem;` },
      { selector: ".prose__title", css: "margin: 0;\nfont-size: var(--h2, 2rem);\ntext-wrap: balance;" },
      { selector: ".prose__text", css: `margin: 0;
color: ${INK};
text-wrap: pretty;` }
    ]
  },
  {
    id: "content-media-text",
    name: "Media and text",
    category: "content",
    description: "A picture beside a block of copy. Add --reverse to flip it.",
    base: "media-text",
    compose: [{
      el: "section",
      classes: ["media-text"],
      children: [{
        el: "container",
        classes: ["media-text__inner"],
        children: [
          {
            el: "figure",
            classes: ["media-text__media"],
            children: [{ el: "image", classes: ["media-text__image"], attrs: { src: PLACEHOLDER_SRC, alt: "" } }]
          },
          {
            el: "div",
            classes: ["media-text__copy"],
            children: [
              { el: "heading", classes: ["media-text__title"], text: "One idea, one picture" },
              { el: "text", classes: ["media-text__text"], text: "Say the thing the picture is of, and why it matters. Two sentences is usually right." },
              { el: "link", tag: "a", classes: ["media-text__link"], text: "Read more", attrs: { href: "#" } }
            ]
          }
        ]
      }]
    }],
    rules: [
      { selector: ".media-text", css: band() },
      { selector: ".media-text__inner", css: `display: grid;
gap: ${SPACE.l};
align-items: center;

@media (min-width: 48rem) {
  grid-template-columns: 1fr 1fr;
}` },
      { selector: ".media-text--reverse .media-text__media", css: "@media (min-width: 48rem) {\n  order: 2;\n}" },
      { selector: ".media-text__media", css: `margin: 0;
border-radius: ${RADIUS};
overflow: hidden;` },
      { selector: ".media-text__image", css: "inline-size: 100%;\naspect-ratio: 4 / 3;\nobject-fit: cover;" },
      { selector: ".media-text__copy", css: stack(SPACE.s) },
      { selector: ".media-text__title", css: "margin: 0;\nfont-size: var(--h3, 1.75rem);" },
      { selector: ".media-text__text", css: `margin: 0;
color: ${DIM};` },
      { selector: ".media-text__link", css: `color: ${BRAND};
font-weight: 600;
justify-self: start;` }
    ]
  },
  {
    id: "content-quote",
    name: "Pull quote",
    category: "content",
    description: "One sentence somebody said, and who said it.",
    base: "pullquote",
    compose: [{
      el: "section",
      classes: ["pullquote"],
      children: [{
        el: "container",
        classes: ["pullquote__inner"],
        children: [
          { el: "text", tag: "blockquote", classes: ["pullquote__quote"], text: "It did the thing we hired it to do, on the first afternoon, and then it kept doing it." },
          { el: "text", tag: "figcaption", classes: ["pullquote__source"], text: "Name Surname \u2014 Role, Company" }
        ]
      }]
    }],
    rules: [
      { selector: ".pullquote", css: band() },
      { selector: ".pullquote__inner", css: `${stack(SPACE.s)}
max-inline-size: 44rem;
text-align: center;
justify-items: center;` },
      { selector: ".pullquote__quote", css: `margin: 0;
font-size: var(--h3, 1.75rem);
line-height: 1.35;
color: ${HEAD};
text-wrap: balance;

&::before {
  content: open-quote;
}

&::after {
  content: close-quote;
}` },
      { selector: ".pullquote__source", css: `margin: 0;
font-size: var(--text-s, .875rem);
color: ${DIM};` }
    ]
  }
];
var feature = (title, text) => ({
  el: "div",
  classes: ["features__card"],
  children: [
    { el: "icon", classes: ["features__icon"] },
    { el: "heading", tag: "h3", classes: ["features__title"], text: title },
    { el: "text", classes: ["features__text"], text }
  ]
});
var stat = (value, label) => ({
  el: "div",
  classes: ["stats__item"],
  children: [
    { el: "span", classes: ["stats__value"], text: value },
    { el: "span", classes: ["stats__label"], text: label }
  ]
});
var GRIDS = [
  {
    id: "grid-features",
    name: "Feature grid",
    category: "grid",
    description: "Three cards, each an icon, a title and a line.",
    base: "features",
    compose: [{
      el: "section",
      classes: ["features"],
      children: [{
        el: "container",
        classes: ["features__inner"],
        children: [
          { el: "heading", classes: ["features__heading"], text: "What you get" },
          {
            el: "div",
            classes: ["features__grid"],
            children: [
              feature("Fast by default", "Nothing ships that the page does not need, so the first paint is the whole page."),
              feature("Yours to edit", "Every file is real. Open the repository and it reads like something a person wrote."),
              feature("Host anywhere", "A folder of pages. Put it on the hosting you already pay for.")
            ]
          }
        ]
      }]
    }],
    rules: [
      { selector: ".features", css: band() },
      { selector: ".features__inner", css: stack(SPACE.l) },
      { selector: ".features__heading", css: "margin: 0;\nfont-size: var(--h2, 2rem);\ntext-align: center;" },
      { selector: ".features__grid", css: `display: grid;
gap: var(--grid-gap, ${SPACE.m});
grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));` },
      { selector: ".features__card", css: `display: grid;
gap: ${SPACE.xs};
align-content: start;
padding: ${SPACE.m};
border: 1px solid ${LINE};
border-radius: ${RADIUS};
background: ${SURFACE};` },
      { selector: ".features__icon", css: `inline-size: 1.75rem;
block-size: 1.75rem;
color: ${BRAND};` },
      { selector: ".features__title", css: "margin: 0;\nfont-size: var(--text-l, 1.125rem);" },
      { selector: ".features__text", css: `margin: 0;
font-size: var(--text-s, .9375rem);
color: ${DIM};` }
    ]
  },
  {
    id: "grid-stats",
    name: "Stat row",
    category: "grid",
    description: "Four numbers, each with a word under it.",
    base: "stats",
    compose: [{
      el: "section",
      classes: ["stats"],
      children: [{
        el: "container",
        classes: ["stats__inner"],
        children: [
          stat("12k", "Pages built"),
          stat("99.9%", "Uptime"),
          stat("40ms", "Median response"),
          stat("7", "People behind it")
        ]
      }]
    }],
    rules: [
      { selector: ".stats", css: band() },
      { selector: ".stats__inner", css: `display: grid;
gap: ${SPACE.m};
grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
text-align: center;` },
      { selector: ".stats__item", css: `display: grid;
gap: ${SPACE.xs};` },
      { selector: ".stats__value", css: `font-size: var(--h2, 2.5rem);
font-weight: 700;
line-height: 1;
color: ${HEAD};` },
      { selector: ".stats__label", css: `font-size: var(--text-s, .875rem);
letter-spacing: .04em;
text-transform: uppercase;
color: ${DIM};` }
    ]
  },
  {
    id: "grid-logos",
    name: "Logo wall",
    category: "grid",
    description: "A quiet row of the names that already trust you.",
    base: "logos",
    compose: [{
      el: "section",
      classes: ["logos"],
      children: [{
        el: "container",
        classes: ["logos__inner"],
        children: [
          { el: "text", classes: ["logos__label"], text: "Trusted by" },
          {
            el: "div",
            classes: ["logos__grid"],
            children: Array.from({ length: 6 }, () => ({
              el: "image",
              classes: ["logos__logo"],
              attrs: { src: PLACEHOLDER_SRC, alt: "" }
            }))
          }
        ]
      }]
    }],
    rules: [
      { selector: ".logos", css: band() },
      { selector: ".logos__inner", css: `${stack(SPACE.m)}
justify-items: center;` },
      { selector: ".logos__label", css: `margin: 0;
font-size: var(--text-s, .875rem);
letter-spacing: .08em;
text-transform: uppercase;
color: ${DIM};` },
      { selector: ".logos__grid", css: `display: grid;
gap: ${SPACE.l};
inline-size: 100%;
align-items: center;
grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));` },
      { selector: ".logos__logo", css: "inline-size: 100%;\nmax-inline-size: 8rem;\nmargin-inline: auto;\nblock-size: auto;\nopacity: .6;\nfilter: grayscale(1);\n\n&:hover {\n  opacity: 1;\n  filter: none;\n}" }
    ]
  }
];
var tab = (label, first) => ({
  el: "form-check",
  tag: "label",
  classes: ["tabs__tab"],
  children: [
    {
      el: "form-radio",
      classes: ["tabs__radio"],
      attrs: { name: "tabs", value: label.toLowerCase(), ...first ? { checked: "" } : {} }
    },
    { el: "span", classes: ["tabs__tab-label"], text: label }
  ]
});
var panel = (title, text) => ({
  el: "div",
  classes: ["tabs__panel"],
  children: [
    { el: "heading", tag: "h3", classes: ["tabs__panel-title"], text: title },
    { el: "text", classes: ["tabs__panel-text"], text }
  ]
});
var TABS = [
  {
    id: "tabs-panels",
    name: "Tabs",
    category: "tabs",
    description: "Three panels, one at a time. No JavaScript at all.",
    base: "tabs",
    compose: [{
      el: "section",
      classes: ["tabs"],
      children: [{
        el: "container",
        classes: ["tabs__inner"],
        children: [
          {
            el: "div",
            classes: ["tabs__list"],
            children: [tab("Overview", true), tab("Details", false), tab("Pricing", false)]
          },
          {
            el: "div",
            classes: ["tabs__panels"],
            children: [
              panel("Overview", "What this is, in the fewest words that are still true."),
              panel("Details", "The part somebody who is already interested came here to read."),
              panel("Pricing", "What it costs, and what changes at each step.")
            ]
          }
        ]
      }]
    }],
    rules: [
      { selector: ".tabs", css: band() },
      { selector: ".tabs__inner", css: stack(SPACE.m) },
      { selector: ".tabs__list", css: `display: flex;
flex-wrap: wrap;
gap: ${SPACE.xs};
border-block-end: 1px solid ${LINE};` },
      {
        selector: ".tabs__tab",
        css: `position: relative;
display: inline-flex;
align-items: center;
gap: 0;
padding: ${SPACE.s} ${SPACE.m};
margin-block-end: -1px;
border-block-end: 2px solid transparent;
cursor: pointer;
color: ${DIM};
font-weight: 600;

&:hover {
  color: ${INK};
}

/* The ring belongs to the tab, because the control that takes the focus is
   the radio inside it and the radio is off the screen. */
&:has(.tabs__radio:focus-visible) {
  outline: var(--focus-width, 2px) var(--focus-style, solid) var(--focus-color, currentColor);
  outline-offset: var(--focus-offset, 2px);
}

&:has(.tabs__radio:checked) {
  color: ${HEAD};
  border-block-end-color: ${BRAND};
}`
      },
      {
        selector: ".tabs__radio",
        css: "/* Off the screen, not display:none \u2014 a control that cannot be focused\n   cannot be reached by the keyboard, and the arrow keys walking a radio\n   group are how a tab strip is meant to work. */\nposition: absolute;\ninline-size: 1px;\nblock-size: 1px;\nopacity: 0;\npointer-events: none;\nmargin: 0;"
      },
      { selector: ".tabs__panels", css: `padding-block-start: ${SPACE.s};` },
      /* `display` is said once. `stack()` would have set it to grid on the
         very next line and the `:has()` rules below would have had nothing
         left to switch. */
      { selector: ".tabs__panel", css: `display: none;
gap: ${SPACE.xs};` },
      { selector: ".tabs__panel-title", css: "margin: 0;\nfont-size: var(--h3, 1.5rem);" },
      { selector: ".tabs__panel-text", css: `margin: 0;
color: ${DIM};` },
      /* One rule per position. Three is a number you can read; a loop that
         generated them would be a rule nobody can find in the CSS panel. */
      { selector: ".tabs__inner:has(.tabs__tab:nth-of-type(1) .tabs__radio:checked) .tabs__panel:nth-of-type(1)", css: "display: grid;" },
      { selector: ".tabs__inner:has(.tabs__tab:nth-of-type(2) .tabs__radio:checked) .tabs__panel:nth-of-type(2)", css: "display: grid;" },
      { selector: ".tabs__inner:has(.tabs__tab:nth-of-type(3) .tabs__radio:checked) .tabs__panel:nth-of-type(3)", css: "display: grid;" }
    ]
  }
];
var carouselRules = (_id) => [];
var SLIDERS = [
  {
    id: "slider-cards",
    name: "Card slider",
    category: "slider",
    description: "A row of cards that scrolls, with the next one peeking.",
    base: "card-slider",
    compose: [{
      el: "section",
      classes: ["card-slider"],
      children: [{
        el: "container",
        classes: ["card-slider__inner"],
        children: [
          { el: "heading", classes: ["card-slider__heading"], text: "Recent work" },
          { el: "carousel-cards", classes: ["card-slider__carousel"] }
        ]
      }]
    }],
    rules: [
      ...carouselRules("cards"),
      { selector: ".card-slider", css: band() },
      { selector: ".card-slider__inner", css: stack(SPACE.m) },
      { selector: ".card-slider__heading", css: "margin: 0;\nfont-size: var(--h2, 2rem);" },
      { selector: ".card-slider__carousel", css: "--carousel-per-view: 3.2;" }
    ]
  },
  {
    id: "slider-cover",
    name: "Slideshow",
    category: "slider",
    description: "One picture at a time, fading. Full width.",
    base: "slideshow",
    compose: [{
      el: "section",
      classes: ["slideshow"],
      children: [{ el: "carousel-fade", classes: ["slideshow__carousel"] }]
    }],
    rules: [
      ...carouselRules("fade"),
      { selector: ".slideshow", css: "padding-block: 0;\npadding-inline: 0;" },
      { selector: ".slideshow__carousel", css: '--carousel-per-view: 1;\nblock-size: min(34rem, 70vh);\n\n[builder-data-element="carousel-slide"] img {\n  inline-size: 100%;\n  block-size: 100%;\n  object-fit: cover;\n}' }
    ]
  },
  {
    id: "slider-ticker",
    name: "Logo ticker",
    category: "slider",
    description: "Names traveling past at a steady speed.",
    base: "ticker",
    compose: [{
      el: "section",
      classes: ["ticker"],
      children: [{ el: "carousel-marquee", classes: ["ticker__carousel"], attrs: { "data-carousel-speed": "40" } }]
    }],
    rules: [
      ...carouselRules("marquee"),
      { selector: ".ticker", css: `padding-block: ${SPACE.l};
padding-inline: 0;
border-block: 1px solid ${LINE};` },
      { selector: ".ticker__carousel", css: `font-size: var(--text-l, 1.25rem);
font-weight: 600;
color: ${DIM};` }
    ]
  }
];
var CTAS = [
  {
    id: "cta-banner",
    name: "Call to action",
    category: "cta",
    description: "One sentence and one button, on a band of color.",
    base: "cta",
    compose: [{
      el: "section",
      classes: ["cta"],
      children: [{
        el: "container",
        classes: ["cta__inner"],
        children: [
          {
            el: "div",
            classes: ["cta__copy"],
            children: [
              { el: "heading", classes: ["cta__title"], text: "Ready when you are" },
              { el: "text", classes: ["cta__text"], text: "The one line that makes pressing the button feel like the obvious next thing." }
            ]
          },
          { el: "button", classes: ["cta__button", "btn--white"], text: "Get started" }
        ]
      }]
    }],
    rules: [
      { selector: ".cta", css: `padding-block: ${SPACE.xl};
background: ${BRAND};
color: #fff;` },
      { selector: ".cta__inner", css: `display: flex;
flex-direction: row;
flex-wrap: wrap;
align-items: center;
justify-content: space-between;
gap: ${SPACE.m};` },
      { selector: ".cta__copy", css: `display: grid;
gap: ${SPACE.xs};` },
      { selector: ".cta__title", css: "margin: 0;\ncolor: inherit;\nfont-size: var(--h2, 2rem);" },
      { selector: ".cta__text", css: "margin: 0;\ncolor: rgb(255 255 255 / .82);" },
      { selector: ".cta__button", css: "flex: none;" }
    ]
  },
  {
    id: "cta-newsletter",
    name: "Newsletter signup",
    category: "cta",
    description: "A heading and the Newsletter form, delivery and all.",
    base: "newsletter",
    compose: [{
      el: "section",
      classes: ["newsletter"],
      children: [{
        el: "container",
        classes: ["newsletter__inner"],
        children: [
          { el: "heading", classes: ["newsletter__title"], text: "Once a month, nothing else" },
          { el: "text", classes: ["newsletter__text"], text: "What we learned, what we shipped, and what broke. Unsubscribe in one click." },
          { el: "form-preset-newsletter", classes: ["newsletter__form"] }
        ]
      }]
    }],
    rules: [
      { selector: ".newsletter", css: band() },
      { selector: ".newsletter__inner", css: `${stack(SPACE.s)}
justify-items: center;
max-inline-size: 36rem;
text-align: center;` },
      { selector: ".newsletter__title", css: "margin: 0;\nfont-size: var(--h2, 2rem);\ntext-wrap: balance;" },
      { selector: ".newsletter__text", css: `margin: 0;
color: ${DIM};` },
      { selector: ".newsletter__form", css: `inline-size: 100%;
margin-block-start: ${SPACE.xs};` }
    ]
  }
];
var footLink = (text) => ({
  el: "link",
  tag: "a",
  classes: ["footer-cols__link"],
  text,
  attrs: { href: "#" }
});
var footColumn = (title, links) => ({
  el: "div",
  classes: ["footer-cols__column"],
  children: [
    { el: "heading", tag: "h3", classes: ["footer-cols__title"], text: title },
    { el: "list", classes: ["footer-cols__list"], children: links.map((l) => ({ el: "div", tag: "li", children: [footLink(l)] })) }
  ]
});
var FOOTERS = [
  {
    id: "footer-simple",
    name: "Simple footer",
    category: "footer",
    description: "A name, a few links and the year, on one line.",
    base: "site-footer",
    compose: [{
      el: "section",
      tag: "footer",
      classes: ["site-footer"],
      children: [{
        el: "container",
        classes: ["site-footer__inner"],
        children: [
          { el: "text", classes: ["site-footer__copyright"], text: "\xA9 2026 Sitename" },
          {
            el: "div",
            classes: ["site-footer__links"],
            children: [
              { el: "link", tag: "a", classes: ["site-footer__link"], text: "Imprint", attrs: { href: "/impressum" } },
              { el: "link", tag: "a", classes: ["site-footer__link"], text: "Privacy", attrs: { href: "/datenschutz" } },
              { el: "link", tag: "a", classes: ["site-footer__link"], text: "Contact", attrs: { href: "/kontakt" } }
            ]
          }
        ]
      }]
    }],
    rules: [
      { selector: ".site-footer", css: `padding-block: ${SPACE.l};
border-block-start: 1px solid ${LINE};
font-size: var(--text-s, .9375rem);
color: ${DIM};` },
      { selector: ".site-footer__inner", css: `display: flex;
flex-direction: row;
flex-wrap: wrap;
align-items: center;
justify-content: space-between;
gap: ${SPACE.m};` },
      { selector: ".site-footer__copyright", css: "margin: 0;" },
      { selector: ".site-footer__links", css: `display: flex;
flex-wrap: wrap;
gap: ${SPACE.m};` },
      { selector: ".site-footer__link", css: "color: inherit;\ntext-decoration: none;\n\n&:hover {\n  text-decoration: underline;\n}" }
    ]
  },
  {
    id: "footer-columns",
    name: "Footer with columns",
    category: "footer",
    description: "Three lists of links and a line underneath.",
    base: "footer-cols",
    compose: [{
      el: "section",
      tag: "footer",
      classes: ["footer-cols"],
      children: [{
        el: "container",
        classes: ["footer-cols__inner"],
        children: [
          {
            el: "div",
            classes: ["footer-cols__grid"],
            children: [
              {
                el: "div",
                classes: ["footer-cols__brand"],
                children: [
                  { el: "text", classes: ["footer-cols__name"], text: "Sitename" },
                  { el: "text", classes: ["footer-cols__blurb"], text: "One line about what this is, for whoever scrolled all the way down." }
                ]
              },
              footColumn("Product", ["Features", "Pricing", "Changelog"]),
              footColumn("Company", ["About", "Blog", "Contact"]),
              footColumn("Legal", ["Imprint", "Privacy", "Terms"])
            ]
          },
          { el: "text", classes: ["footer-cols__copyright"], text: "\xA9 2026 Sitename. All rights reserved." }
        ]
      }]
    }],
    rules: [
      { selector: ".footer-cols", css: `padding-block: ${SPACE.xl};
border-block-start: 1px solid ${LINE};` },
      { selector: ".footer-cols__inner", css: stack(SPACE.l) },
      { selector: ".footer-cols__grid", css: `display: grid;
gap: ${SPACE.l};
grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));` },
      { selector: ".footer-cols__brand", css: `display: grid;
gap: ${SPACE.xs};` },
      { selector: ".footer-cols__name", css: `margin: 0;
font-weight: 700;
font-size: var(--text-l, 1.125rem);
color: ${HEAD};` },
      { selector: ".footer-cols__blurb", css: `margin: 0;
font-size: var(--text-s, .9375rem);
color: ${DIM};` },
      { selector: ".footer-cols__title", css: `margin: 0 0 ${SPACE.xs};
font-size: var(--text-s, .875rem);
letter-spacing: .06em;
text-transform: uppercase;
color: ${DIM};` },
      { selector: ".footer-cols__list", css: `display: grid;
gap: ${SPACE.xs};
margin: 0;
padding: 0;
list-style: none;` },
      { selector: ".footer-cols__link", css: `color: ${INK};
text-decoration: none;
font-size: var(--text-s, .9375rem);

&:hover {
  color: ${BRAND};
}` },
      { selector: ".footer-cols__copyright", css: `margin: 0;
padding-block-start: ${SPACE.m};
border-block-start: 1px solid ${LINE};
font-size: var(--text-s, .875rem);
color: ${DIM};` }
    ]
  }
];
var NOT_FOUND = [
  {
    id: "notfound-simple",
    name: "Not found",
    category: "notfound",
    description: "The number, one sentence, and the way back.",
    base: "error-page",
    compose: [{
      el: "section",
      classes: ["error-page"],
      children: [{
        el: "container",
        classes: ["error-page__inner"],
        children: [
          { el: "span", classes: ["error-page__code"], text: "404" },
          { el: "heading", tag: "h1", classes: ["error-page__title"], text: "That page is not here" },
          { el: "text", classes: ["error-page__text"], text: "The address may have changed, or it may never have existed. Neither is your fault." },
          { el: "button", tag: "a", classes: ["error-page__home"], text: "Back to the homepage", attrs: { href: "/" } }
        ]
      }]
    }],
    rules: [
      { selector: ".error-page", css: `display: grid;
place-items: center;
min-block-size: 70vh;
padding-block: ${BAND};
text-align: center;` },
      { selector: ".error-page__inner", css: `${stack(SPACE.s)}
justify-items: center;
max-inline-size: 34rem;` },
      { selector: ".error-page__code", css: `font-size: clamp(4rem, 18vw, 9rem);
font-weight: 800;
line-height: 1;
color: ${LINE};` },
      { selector: ".error-page__title", css: "margin: 0;\nfont-size: var(--h2, 2rem);\ntext-wrap: balance;" },
      { selector: ".error-page__text", css: `margin: 0;
color: ${DIM};` },
      { selector: ".error-page__home", css: `margin-block-start: ${SPACE.s};` }
    ]
  }
];
var PATTERN_PACK = [
  ...HEADERS,
  ...HEROES,
  ...CONTENT,
  ...GRIDS,
  ...TABS,
  ...SLIDERS,
  ...CTAS,
  ...FOOTERS,
  ...NOT_FOUND
];

// ../src/builder-core/hosting.ts
var HOSTS = [
  {
    id: "vercel",
    label: "Vercel",
    kind: "git",
    adapter: "vercel",
    serverless: true,
    hint: "Builds every push; previews every pull request.",
    connectUrl: (repo2) => repo2 ? `https://vercel.com/new/import?s=${encodeURIComponent(repo2)}` : "https://vercel.com/new",
    reports: /vercel/i
  },
  {
    id: "netlify",
    label: "Netlify",
    kind: "git",
    adapter: "netlify",
    serverless: true,
    hint: "Builds every push; previews every pull request.",
    connectUrl: () => "https://app.netlify.com/start",
    reports: /netlify/i
  },
  /* Workers with static assets is what Cloudflare now builds a new site on,
     and Pages is what most sites already there were made with — two products
     behind one dashboard with one adapter, which differ in how a build is
     deployed (`wrangler deploy`, reading a wrangler config) and in how they
     report on a commit. Workers is listed first because its reports are the
     more specific name: both arrive from the GitHub app "Cloudflare Workers
     and Pages", and Pages' pattern would claim a Workers Builds check too. */
  {
    id: "cloudflare-workers",
    label: "Cloudflare Workers",
    kind: "git",
    adapter: "cloudflare",
    serverless: true,
    hint: "Static assets on a Worker, built on every push by Workers Builds.",
    connectUrl: () => "https://dash.cloudflare.com/?to=/:account/workers-and-pages/create",
    reports: /workers builds/i
  },
  {
    id: "cloudflare",
    label: "Cloudflare Pages",
    kind: "git",
    adapter: "cloudflare",
    serverless: true,
    hint: "Builds every push; previews every branch.",
    connectUrl: () => "https://dash.cloudflare.com/?to=/:account/workers-and-pages/create/pages",
    reports: /cloudflare|pages/i
  },
  {
    id: "node",
    label: "Your own server",
    kind: "git",
    adapter: "node",
    hint: "Dokploy, Coolify or a VPS that builds from the repository.",
    reports: /dokploy|coolify|deploy/i
  },
  {
    id: "apache",
    label: "Web hosting (FTP)",
    kind: "files",
    hint: "A cPanel or Plesk plan: the site is built here and uploaded as files."
  },
  {
    id: "other",
    label: "Another host",
    kind: "git",
    hint: "Anything that runs npm run build and serves dist/.",
    reports: /deploy|preview|pages/i
  }
];
var HOST_BY_ID = Object.fromEntries(HOSTS.map((h2) => [h2.id, h2]));

// ../src/builder-core/sample.ts
var samplePage = {
  route: "generated-demo",
  title: "sitereal \u2014 plain builder",
  stylesheets: [
    {
      id: "global",
      name: "Global",
      rules: [
        { selector: ".hero", css: "min-height: 70vh;\ndisplay: grid;\nalign-content: center;\ngap: 1.25rem;\npadding: 4rem;\nbackground: #0e1220;\ncolor: #f5f6fa;\nfont-family: system-ui, sans-serif;" },
        { selector: ".hero__title", css: "margin: 0;\nfont-size: clamp(2.5rem, 6vw, 5rem);\nletter-spacing: -0.03em;\nline-height: 1.02;" },
        { selector: ".hero__lead", css: "margin: 0;\nmax-width: 42ch;\nfont-size: 1.2rem;\ncolor: #98a0b3;" },
        { selector: ".button", css: "justify-self: start;\nmargin-top: 0.5rem;\npadding: 0.8em 1.4em;\nbackground: #ff6a3d;\ncolor: #0a0b0f;\nborder-radius: 8px;\ntext-decoration: none;\nfont-weight: 600;" }
      ]
    }
  ],
  root: withElementAttrs([
    {
      id: "hero",
      tag: "section",
      classes: ["hero"],
      children: [
        { id: "hero-title", tag: "h1", classes: ["hero__title"], text: "We build brands that stand out." },
        { id: "hero-lead", tag: "p", classes: ["hero__lead"], text: "Photography, film, websites and brand design \u2014 one studio, no handovers." },
        { id: "hero-cta", tag: "a", classes: ["button"], attrs: { href: "#work" }, text: "See our work" }
      ]
    }
  ])
};

// ../engine/paths.ts
var import_node_path = require("node:path");
var import_node_fs = require("node:fs");
var import_node_os = require("node:os");
var appConfigDir = () => (
  /* An override for trying things without touching this machine's real
     license, recents or libraries — `npm run try:license` uses it. */
  process.env.SITEREAL_CONFIG_DIR ? (0, import_node_path.resolve)(process.env.SITEREAL_CONFIG_DIR) : process.platform === "darwin" ? (0, import_node_path.resolve)((0, import_node_os.homedir)(), "Library/Application Support/sitereal") : process.platform === "win32" ? (0, import_node_path.resolve)(process.env.APPDATA ?? (0, import_node_path.resolve)((0, import_node_os.homedir)(), "AppData/Roaming"), "sitereal") : (0, import_node_path.resolve)(process.env.XDG_CONFIG_HOME ?? (0, import_node_path.resolve)((0, import_node_os.homedir)(), ".config"), "sitereal")
);
function within(parent, child) {
  const rel = (0, import_node_path.relative)(parent, child);
  return rel === "" || rel !== ".." && !rel.startsWith(".." + import_node_path.sep) && !(0, import_node_path.isAbsolute)(rel);
}
function realWithin(parent, full) {
  const realParent = (() => {
    try {
      return (0, import_node_fs.realpathSync)(parent);
    } catch {
      return parent;
    }
  })();
  let probe = full;
  for (; ; ) {
    try {
      const real2 = (0, import_node_fs.realpathSync)(probe);
      return within(realParent, (0, import_node_path.resolve)(real2, (0, import_node_path.relative)(probe, full)));
    } catch {
      const up = (0, import_node_path.dirname)(probe);
      if (up === probe) return false;
      probe = up;
    }
  }
}

// ../engine/exe.ts
var import_node_child_process = require("node:child_process");
var import_promises = require("node:fs/promises");
var import_node_fs2 = require("node:fs");
var import_node_os2 = require("node:os");
var import_node_path2 = require("node:path");
var import_node_util = require("node:util");
var exec = (0, import_node_util.promisify)(import_node_child_process.execFile);
var win = process.platform === "win32";
var mac = process.platform === "darwin";
var WHERE = win ? (0, import_node_path2.join)(process.env.SystemRoot ?? "C:\\Windows", "System32", "where.exe") : "which";
var names = (cmd) => win ? [`${cmd}.exe`, `${cmd}.cmd`, `${cmd}.bat`, `${cmd}.com`] : [cmd];
var winNode = () => {
  const { ProgramFiles, LOCALAPPDATA, NVM_SYMLINK, APPDATA } = process.env;
  return [
    NVM_SYMLINK,
    ProgramFiles && (0, import_node_path2.join)(ProgramFiles, "nodejs"),
    LOCALAPPDATA && (0, import_node_path2.join)(LOCALAPPDATA, "Programs", "nodejs"),
    LOCALAPPDATA && (0, import_node_path2.join)(LOCALAPPDATA, "Volta", "bin"),
    // nvm-windows' default link, for an app started before NVM_SYMLINK was set
    "C:\\nvm4w\\nodejs",
    APPDATA && (0, import_node_path2.join)(APPDATA, "fnm", "aliases", "default"),
    (0, import_node_path2.join)((0, import_node_os2.homedir)(), "scoop", "shims")
  ].filter((d) => !!d);
};
async function newestIn(root, tail) {
  try {
    const versions = (await (0, import_promises.readdir)(root)).filter((v2) => /^v?\d+\./.test(v2));
    const key = (v2) => v2.replace(/^v/, "").split(".").map((n) => Number.parseInt(n, 10) || 0);
    versions.sort((a, b) => {
      const [x, y] = [key(a), key(b)];
      return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
    });
    return versions.slice(0, 1).map((v2) => (0, import_node_path2.join)(root, v2, ...tail));
  } catch {
    return [];
  }
}
var unixNode = async () => {
  const home = (0, import_node_os2.homedir)();
  return [
    (0, import_node_path2.join)(home, ".volta", "bin"),
    (0, import_node_path2.join)(home, ".local", "share", "fnm", "aliases", "default", "bin"),
    (0, import_node_path2.join)(home, "Library", "Application Support", "fnm", "aliases", "default", "bin"),
    ...await newestIn((0, import_node_path2.join)(process.env.NVM_DIR || (0, import_node_path2.join)(home, ".nvm"), "versions", "node"), ["bin"]),
    (0, import_node_path2.join)(home, ".asdf", "shims"),
    (0, import_node_path2.join)(home, ".local", "share", "mise", "shims"),
    (0, import_node_path2.join)(home, ".local", "bin")
  ];
};
var UNIX_BINS = ["/opt/homebrew/bin", "/usr/local/bin", "/home/linuxbrew/.linuxbrew/bin", "/usr/bin", "/bin", "/snap/bin"];
var dirs = async (cmd) => {
  const { ProgramFiles, LOCALAPPDATA } = process.env;
  const pf86 = process.env["ProgramFiles(x86)"];
  const real2 = (list2) => list2.filter((d) => !!d);
  if (win) {
    if (cmd === "gh") return real2([
      ProgramFiles && (0, import_node_path2.join)(ProgramFiles, "GitHub CLI"),
      ProgramFiles && (0, import_node_path2.join)(ProgramFiles, "GitHub CLI", "bin"),
      pf86 && (0, import_node_path2.join)(pf86, "GitHub CLI"),
      pf86 && (0, import_node_path2.join)(pf86, "GitHub CLI", "bin"),
      LOCALAPPDATA && (0, import_node_path2.join)(LOCALAPPDATA, "Programs", "GitHub CLI"),
      LOCALAPPDATA && (0, import_node_path2.join)(LOCALAPPDATA, "Programs", "GitHub CLI", "bin"),
      // winget's own shim folder, which is where a user-scope install lands
      LOCALAPPDATA && (0, import_node_path2.join)(LOCALAPPDATA, "Microsoft", "WinGet", "Links"),
      (0, import_node_path2.join)((0, import_node_os2.homedir)(), "scoop", "shims")
    ]);
    if (cmd === "git") return real2([
      ProgramFiles && (0, import_node_path2.join)(ProgramFiles, "Git", "cmd"),
      pf86 && (0, import_node_path2.join)(pf86, "Git", "cmd"),
      LOCALAPPDATA && (0, import_node_path2.join)(LOCALAPPDATA, "Programs", "Git", "cmd"),
      (0, import_node_path2.join)((0, import_node_os2.homedir)(), "scoop", "shims")
    ]);
    if (cmd === "winget") return real2([LOCALAPPDATA && (0, import_node_path2.join)(LOCALAPPDATA, "Microsoft", "WindowsApps")]);
    if (cmd === "npm" || cmd === "node" || cmd === "npx") return winNode();
    return [];
  }
  if (cmd === "npm" || cmd === "node" || cmd === "npx") return [...UNIX_BINS, ...await unixNode()];
  if (cmd === "gh" || cmd === "git" || cmd === "brew") return UNIX_BINS;
  return [];
};
var found = /* @__PURE__ */ new Map();
var runnable = async (p) => {
  try {
    await (0, import_promises.access)(p, win ? import_node_fs2.constants.F_OK : import_node_fs2.constants.X_OK);
    return true;
  } catch {
    return false;
  }
};
async function inDir(dir, cmd) {
  for (const name of names(cmd)) {
    const full = (0, import_node_path2.join)(dir, name);
    if (await runnable(full)) return full;
  }
  return null;
}
function adopt(dir) {
  const path = process.env.PATH ?? "";
  const same = (a, b) => win ? a.toLowerCase() === b.toLowerCase() : a === b;
  if (path.split(import_node_path2.delimiter).some((p) => same(p.replace(/[\\/]+$/, ""), dir))) return;
  process.env.PATH = path ? `${path}${import_node_path2.delimiter}${dir}` : dir;
}
var devTools = false;
async function hasDevTools() {
  if (!mac) return true;
  if (devTools) return true;
  try {
    const { stdout } = await exec("/usr/bin/xcode-select", ["-p"], { timeout: 1e4, encoding: "utf8" });
    devTools = !!stdout.trim() && await runnable(stdout.trim());
  } catch {
    devTools = false;
  }
  return devTools;
}
var isShim = async (cmd, full) => mac && cmd === "git" && full === "/usr/bin/git" && !await hasDevTools();
async function lookup(cmd) {
  const hit = found.get(cmd);
  if (hit) return hit;
  const take = (full) => {
    found.set(cmd, full);
    return full;
  };
  for (const dir of (process.env.PATH ?? "").split(import_node_path2.delimiter)) {
    const clean2 = dir.trim().replace(/^"|"$/g, "");
    if (!clean2) continue;
    const full = await inDir(clean2, cmd);
    if (full && !await isShim(cmd, full)) return take(full);
  }
  try {
    const { stdout } = await exec(WHERE, [cmd], { timeout: 1e4, encoding: "utf8" });
    const lines = stdout.split("\n").map((l) => l.trim()).filter(Boolean);
    const first = win ? lines.find((l) => /\.(exe|cmd|bat|com)$/i.test(l)) : lines[0];
    if (first && !await isShim(cmd, first)) return take(first);
  } catch {
  }
  for (const dir of process.env.SITEREAL_PATH_ONLY ? [] : await dirs(cmd)) {
    const full = await inDir(dir, cmd);
    if (!full || await isShim(cmd, full)) continue;
    adopt(dir);
    return take(full);
  }
  return null;
}
var has = async (cmd) => await lookup(cmd) !== null;
var rescan = () => {
  found.clear();
  devTools = false;
};

// ../engine/trust.ts
var import_promises3 = require("node:fs/promises");
var import_node_path4 = require("node:path");

// ../engine/app-state.ts
var import_promises2 = require("node:fs/promises");
var import_node_crypto = require("node:crypto");
var import_node_os3 = require("node:os");
var import_node_path3 = require("node:path");

// ../engine/github-remote.ts
var import_node_child_process2 = require("node:child_process");
function parseRemote(raw) {
  const url = (raw ?? "").trim();
  if (!url) return null;
  let host = "", path = "", ssh = false;
  const scp = /^(?:[^@/\s]+@)?([^:/\s]+):(?!\/\/)(.+)$/.exec(url);
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    try {
      const u = new URL(url);
      host = u.hostname;
      path = decodeURIComponent(u.pathname);
      ssh = /^(ssh|git\+ssh|ssh\+git):$/i.test(u.protocol);
    } catch {
      return null;
    }
  } else if (scp && !/^[a-z]:$/i.test(`${scp[1]}:`)) {
    host = scp[1];
    path = scp[2];
    ssh = true;
  } else return null;
  const parts = path.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "").split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { host: host.toLowerCase(), ssh, owner: parts[0], name: parts[1] };
}
var isGithub = (host) => host === "github.com" || host === "www.github.com";
var resolved = /* @__PURE__ */ new Map();
async function sshHostOf(alias) {
  const hit = resolved.get(alias);
  if (hit && Date.now() - hit.at < 6e4) return hit.host;
  if (!/^[A-Za-z0-9._-]+$/.test(alias) || alias.startsWith("-")) return null;
  const ssh = await lookup("ssh");
  const host = !ssh ? null : await new Promise((done) => {
    (0, import_node_child_process2.execFile)(ssh, ["-G", alias], { timeout: 5e3, encoding: "utf8", windowsHide: true }, (err, stdout) => {
      if (err) return done(null);
      const m = /^hostname\s+(\S+)\s*$/mi.exec(stdout);
      done(m ? m[1].toLowerCase() : null);
    });
  });
  resolved.set(alias, { at: Date.now(), host });
  return host;
}
async function githubRepoOf(remote, hostOf = sshHostOf) {
  const p = parseRemote(remote);
  if (!p) return null;
  const on = isGithub(p.host) || p.ssh && isGithub(await hostOf(p.host) ?? "");
  return on ? { owner: p.owner, name: p.name, url: `https://github.com/${p.owner}/${p.name}` } : null;
}

// ../engine/app-state.ts
var exists = async (p) => {
  try {
    await (0, import_promises2.stat)(p);
    return true;
  } catch {
    return false;
  }
};
var settingsFile = () => (0, import_node_path3.join)(appConfigDir(), "settings.json");
async function readSettings() {
  try {
    return JSON.parse(await (0, import_promises2.readFile)(settingsFile(), "utf8"));
  } catch {
    return {};
  }
}
async function writeSettings(patch) {
  const next = { ...await readSettings(), ...patch };
  await (0, import_promises2.mkdir)(appConfigDir(), { recursive: true });
  await (0, import_promises2.writeFile)(settingsFile(), JSON.stringify(next, null, 2) + "\n");
  return next;
}
var defaultParent = async () => {
  const chosen = (await readSettings()).defaultParent;
  if (chosen) return chosen;
  const docs = (0, import_node_path3.join)((0, import_node_os3.homedir)(), "Documents");
  return await exists(docs) ? docs : (0, import_node_os3.homedir)();
};
var recentsFile = () => (0, import_node_path3.join)(appConfigDir(), "projects.json");
async function migrateRecents() {
  if (await exists(recentsFile())) return;
  const old = (0, import_node_path3.join)(appConfigDir(), "..", "Strata", "projects.json");
  try {
    const raw = await (0, import_promises2.readFile)(old, "utf8");
    await (0, import_promises2.mkdir)(appConfigDir(), { recursive: true });
    await (0, import_promises2.writeFile)(recentsFile(), raw);
  } catch {
  }
}
async function recents() {
  try {
    const list2 = JSON.parse(await (0, import_promises2.readFile)(recentsFile(), "utf8")).projects;
    const alive = await Promise.all(list2.map(async (p) => await exists(p.path) ? p : null));
    return alive.filter((p) => !!p).sort((a, b) => b.opened - a.opened);
  } catch {
    return [];
  }
}
async function writeRecents(list2) {
  await (0, import_promises2.mkdir)(appConfigDir(), { recursive: true });
  await (0, import_promises2.writeFile)(recentsFile(), JSON.stringify({ projects: list2.slice(0, 40) }, null, 2));
}
async function remember(path, name = (0, import_node_path3.basename)(path)) {
  const list2 = await recents();
  const before = list2.find((p) => p.path === path);
  const rest = list2.filter((p) => p.path !== path);
  rest.unshift({ ...before, path, name, opened: Date.now() });
  await writeRecents(rest);
}
async function forget(path) {
  await writeRecents((await recents()).filter((p) => p.path !== path));
  await (0, import_promises2.rm)(thumbFile(path), { force: true });
}
async function pin(path, pinned) {
  await writeRecents((await recents()).map((p) => p.path === path ? { ...p, pinned } : p));
}
async function fileIn(paths, folder) {
  const name = folder?.trim() || void 0;
  const set = new Set(paths);
  await writeRecents((await recents()).map((p) => {
    if (!set.has(p.path)) return p;
    const { folder: _, ...rest } = p;
    return name ? { ...rest, folder: name } : rest;
  }));
}
async function githubRemote(path) {
  let text;
  try {
    text = await (0, import_promises2.readFile)((0, import_node_path3.join)(path, ".git", "config"), "utf8");
  } catch {
    return void 0;
  }
  const remotes = [];
  let current2 = null;
  for (const line3 of text.split(/\r?\n/)) {
    const head = line3.match(/^\s*\[remote\s+"([^"]+)"\]/);
    if (head) {
      current2 = head[1];
      continue;
    }
    if (/^\s*\[/.test(line3)) {
      current2 = null;
      continue;
    }
    const url = current2 && line3.match(/^\s*url\s*=\s*(.+?)\s*$/);
    if (url) remotes.push({ name: current2, url: url[1] });
  }
  const pick = remotes.find((r2) => r2.name === "origin") ?? remotes[0];
  const gh = await githubRepoOf(pick?.url);
  return gh ? `${gh.owner}/${gh.name}` : void 0;
}
async function listed() {
  const list2 = await recents();
  return Promise.all(list2.map(async (p) => {
    const github = await githubRemote(p.path);
    return github ? { ...p, github } : p;
  }));
}
async function inspect(path) {
  if (await exists((0, import_node_path3.join)(path, PROJECT_FILE))) return { ok: true };
  if (!await exists((0, import_node_path3.join)(path, "package.json"))) return { ok: false, reason: "No package.json \u2014 this is not a project folder." };
  const hasAstro = await exists((0, import_node_path3.join)(path, "astro.config.mjs")) || await exists((0, import_node_path3.join)(path, "astro.config.ts"));
  const hasLegacy = await exists((0, import_node_path3.join)(path, ".strata"));
  if (!hasAstro && !hasLegacy) return { ok: false, reason: "No Astro configuration found." };
  return { ok: true };
}
var thumbsDir = () => (0, import_node_path3.join)(appConfigDir(), "thumbs");
var thumbFile = (path) => (0, import_node_path3.join)(thumbsDir(), `${(0, import_node_crypto.createHash)("sha1").update(path).digest("hex").slice(0, 16)}.jpg`);
async function thumbnail(path) {
  try {
    return `data:image/jpeg;base64,${(await (0, import_promises2.readFile)(thumbFile(path))).toString("base64")}`;
  } catch {
    return null;
  }
}
var ICON_TYPES = {
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif"
};
var ICON_GUESSES = ["favicon.svg", "favicon.ico", "favicon.png", "icon.svg", "apple-touch-icon.png"];
var ICON_MAX = 512 * 1024;
async function publicDirOf(path) {
  for (const name of ["astro.config.mjs", "astro.config.js", "astro.config.ts", "astro.config.mts", "astro.config.cjs"]) {
    try {
      return (0, import_node_path3.resolve)(path, readSiteDirs(await (0, import_promises2.readFile)((0, import_node_path3.join)(path, name), "utf8")).dirs.public);
    } catch {
    }
  }
  return (0, import_node_path3.join)(path, "public");
}
async function projectIcon(path) {
  let named = [];
  try {
    const favicon = String(JSON.parse(await (0, import_promises2.readFile)((0, import_node_path3.join)(path, PROJECT_FILE), "utf8"))?.site?.favicon ?? "").trim();
    if (favicon.startsWith("/") && !favicon.startsWith("//")) {
      named = [decodeURIComponent(favicon.split(/[?#]/)[0].replace(/^\/+/, ""))];
    }
  } catch {
  }
  const pub = await publicDirOf(path);
  for (const rel of [...named, ...ICON_GUESSES]) {
    const file3 = (0, import_node_path3.resolve)(pub, rel);
    const type = ICON_TYPES[(0, import_node_path3.extname)(file3).toLowerCase()];
    if (!type || !within(pub, file3) || !realWithin(pub, file3)) continue;
    try {
      const s = await (0, import_promises2.stat)(file3);
      if (!s.isFile() || s.size > ICON_MAX) continue;
      return `data:${type};base64,${(await (0, import_promises2.readFile)(file3)).toString("base64")}`;
    } catch {
    }
  }
  return null;
}

// ../engine/trust.ts
var file = () => (0, import_node_path4.resolve)(appConfigDir(), "trusted.json");
var real = (p) => (0, import_promises3.realpath)(p).catch(() => (0, import_node_path4.resolve)(p));
async function load() {
  try {
    const d = JSON.parse(await (0, import_promises3.readFile)(file(), "utf8"));
    return Array.isArray(d.paths) ? d.paths : [];
  } catch {
    const seeded = await Promise.all((await recents()).map((r2) => real(r2.path)));
    await save(seeded);
    return seeded;
  }
}
async function save(paths) {
  await (0, import_promises3.mkdir)(appConfigDir(), { recursive: true });
  await (0, import_promises3.writeFile)(file(), JSON.stringify({ paths: [...new Set(paths)] }, null, 2) + "\n", { mode: 384 });
}
async function isTrusted(root) {
  const [list2, here] = await Promise.all([load(), real(root)]);
  return list2.includes(here);
}
async function trust(root) {
  const [list2, here] = await Promise.all([load(), real(root)]);
  if (!list2.includes(here)) await save([...list2, here]);
}

// ../engine/scaffold.ts
var presetsDir = () => (0, import_node_path5.join)(appConfigDir(), "presets");
async function defaultPreset() {
  let files = [];
  try {
    files = (await (0, import_promises4.readdir)(presetsDir())).filter((f2) => f2.endsWith(".json"));
  } catch {
    return null;
  }
  for (const file3 of files) {
    try {
      const entry = JSON.parse(await (0, import_promises4.readFile)((0, import_node_path5.join)(presetsDir(), file3), "utf8"));
      if (entry?.default !== true || !isPreset(entry.bundle)) continue;
      return { name: String(entry.bundle.name ?? "preset"), apply: (doc) => applyPreset(doc, entry.bundle) };
    } catch {
    }
  }
  return null;
}
var slugify = (name) => name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sitereal-site";
var ASTRO_VERSION = "^7.4.2";
async function folderIsUsable(path) {
  try {
    const s = await (0, import_promises4.stat)(path);
    if (!s.isDirectory()) return { ok: false, reason: "That is not a folder." };
    const entries = (await (0, import_promises4.readdir)(path)).filter((f2) => f2 !== ".DS_Store");
    if (entries.length) return { ok: false, reason: "The folder is not empty." };
    return { ok: true };
  } catch {
    return { ok: true };
  }
}
var GITIGNORE = `# build output
dist/

# generated types
.astro/

# dependencies
node_modules/

# logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# environment variables
.env
.env.production

# macOS-specific files
.DS_Store

# sitereal engine state (one machine, one run)
${RUNTIME_DIR}/
`;
var FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 292.1755 292.1755" width="292" height="292" role="img" aria-label="sitereal">
  <defs>
    <clipPath id="body">
      <path d="M226.512,0C262.777,0 292.176,29.399 292.176,65.664L292.176,226.512C292.176,262.777 262.777,292.176 226.512,292.176L65.664,292.176C29.399,292.176 0,262.777 0,226.512L0,65.664C0,29.399 29.399,0 65.664,0L226.512,0Z"/>
    </clipPath>
    <radialGradient id="violet" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="181.15" gradientTransform="translate(23.374,-29.218) scale(1,1.1451)">
      <stop offset="0" stop-color="#8b5cf6" stop-opacity="0.5"/>
      <stop offset="0.62" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="red" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="137.32" gradientTransform="translate(268.801,-5.844) scale(1,1.2128)">
      <stop offset="0" stop-color="#ff0040" stop-opacity="0.24"/>
      <stop offset="0.6" stop-color="#ff0040" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blue" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="227.90" gradientTransform="translate(157.775,303.863) scale(1,1.0513)">
      <stop offset="0" stop-color="#5b87ff" stop-opacity="0.3"/>
      <stop offset="0.64" stop-color="#5b87ff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g clip-path="url(#body)">
    <rect width="292.1755" height="292.1755" fill="#090c11"/>
    <rect width="292.1755" height="292.1755" fill="url(#violet)"/>
    <rect width="292.1755" height="292.1755" fill="url(#red)"/>
    <rect width="292.1755" height="292.1755" fill="url(#blue)"/>
  </g>
  <g fill="#fff" fill-rule="evenodd" transform="matrix(0.827838,0,0,0.827838,66.4497,63.5482)">
    <g transform="matrix(1,0,0,1,-1282.311206,-1909.676926)">
      <path transform="matrix(-0.930001,0.2279,-0.227876,-0.929906,2572.427732,3469.27643)" d="M791.015,1773.232C813.965,1773.232 832.57,1791.839 832.57,1814.791C832.57,1815.991 832.57,1817.192 832.57,1818.391C832.57,1841.344 813.965,1859.951 791.015,1859.951L787.407,1859.951C764.456,1859.951 745.851,1841.344 745.851,1818.391C745.851,1817.192 745.851,1815.991 745.851,1814.791C745.851,1791.839 764.456,1773.232 787.407,1773.232C788.609,1773.232 789.813,1773.232 791.015,1773.232Z"/>
      <path transform="matrix(-0.93012,0.227929,-0.227876,-0.929906,2482.502559,3568.262013)" d="M791.015,1773.232C813.965,1773.232 832.57,1791.839 832.57,1814.791C832.57,1815.991 832.57,1817.192 832.57,1818.391C832.57,1841.344 813.965,1859.951 791.015,1859.951L787.407,1859.951C764.456,1859.951 745.851,1841.344 745.851,1818.391C745.851,1817.192 745.851,1815.991 745.851,1814.791C745.851,1791.839 764.456,1773.232 787.407,1773.232C788.609,1773.232 789.813,1773.232 791.015,1773.232Z"/>
      <path transform="matrix(-0.93012,0.227929,-0.227876,-0.929906,2480.539872,3475.773969)" d="M791.015,1773.232C813.965,1773.232 832.57,1791.839 832.57,1814.791C832.57,1815.991 832.57,1817.192 832.57,1818.391C832.57,1841.344 813.965,1859.951 791.015,1859.951L787.407,1859.951C764.456,1859.951 745.851,1841.344 745.851,1818.391C745.851,1817.192 745.851,1815.991 745.851,1814.791C745.851,1791.839 764.456,1773.232 787.407,1773.232C788.609,1773.232 789.813,1773.232 791.015,1773.232Z"/>
      <path transform="matrix(1.296243,-7.982939,7.982939,1.296243,1307.043316,2128.525388)" d="M15.708,8.331C16.651,9.265 15.142,16.863 13.594,16.997C12.296,17.109 11.891,14.548 11.617,13.736C11.348,12.935 11.047,12.646 10.253,12.384C8.234,11.716 7.225,11.382 7.025,10.853C6.496,9.453 14.504,7.137 15.708,8.331Z"/>
    </g>
  </g>
</svg>
`;
var VSCODE_EXTENSIONS = { recommendations: ["astro-build.astro-vscode"], unwantedRecommendations: [] };
var VSCODE_LAUNCH = {
  version: "0.2.0",
  configurations: [
    { command: "./node_modules/.bin/astro dev", name: "Development server", request: "launch", type: "node-terminal" }
  ]
};
async function scaffoldFiles(path, name) {
  await (0, import_promises4.mkdir)((0, import_node_path5.join)(path, "src/layouts"), { recursive: true });
  await (0, import_promises4.mkdir)((0, import_node_path5.join)(path, "src/pages"), { recursive: true });
  await (0, import_promises4.mkdir)((0, import_node_path5.join)(path, "src/components"), { recursive: true });
  await (0, import_promises4.mkdir)((0, import_node_path5.join)(path, "public"), { recursive: true });
  await (0, import_promises4.mkdir)((0, import_node_path5.join)(path, ".vscode"), { recursive: true });
  const pkg = {
    name: slugify(name),
    type: "module",
    version: "0.0.1",
    private: true,
    scripts: {
      dev: "astro dev",
      build: "astro build",
      preview: "astro preview",
      astro: "astro"
    },
    dependencies: { astro: ASTRO_VERSION }
  };
  const json = (value) => JSON.stringify(value, null, 2) + "\n";
  await (0, import_promises4.writeFile)((0, import_node_path5.join)(path, "package.json"), json(pkg));
  await (0, import_promises4.writeFile)(
    (0, import_node_path5.join)(path, "astro.config.mjs"),
    "// @ts-check\nimport { defineConfig } from 'astro/config';\n\n// https://astro.build/config\nexport default defineConfig({});\n"
  );
  await (0, import_promises4.writeFile)((0, import_node_path5.join)(path, "tsconfig.json"), json({
    extends: "astro/tsconfigs/strict",
    include: [".astro/types.d.ts", "**/*"],
    exclude: ["dist"]
  }));
  await (0, import_promises4.writeFile)((0, import_node_path5.join)(path, ".gitignore"), GITIGNORE);
  await (0, import_promises4.writeFile)((0, import_node_path5.join)(path, ".vscode/extensions.json"), json(VSCODE_EXTENSIONS));
  await (0, import_promises4.writeFile)((0, import_node_path5.join)(path, ".vscode/launch.json"), json(VSCODE_LAUNCH));
  await (0, import_promises4.writeFile)((0, import_node_path5.join)(path, "public/favicon.svg"), FAVICON);
  await (0, import_promises4.writeFile)((0, import_node_path5.join)(path, "README.md"), readme(name));
  await (0, import_promises4.writeFile)((0, import_node_path5.join)(path, "AGENTS.md"), AGENTS);
  await (0, import_promises4.writeFile)((0, import_node_path5.join)(path, "CLAUDE.md"), "@AGENTS.md\n");
  await (0, import_promises4.writeFile)((0, import_node_path5.join)(path, "src/layouts/PlainBase.astro"), PLAIN_BASE);
}
function machineLang() {
  try {
    const env = [process.env.LC_ALL, process.env.LC_MESSAGES, process.env.LANG].find((v2) => v2 && !/^(C|POSIX)(\.|$)/i.test(v2));
    let mac2 = "";
    if (!env && process.platform === "darwin") {
      try {
        mac2 = (0, import_node_child_process3.execFileSync)("/usr/bin/defaults", ["read", "-g", "AppleLocale"], { encoding: "utf8", timeout: 2e3 }).trim();
      } catch {
      }
    }
    const tag = env || mac2 || Intl.DateTimeFormat().resolvedOptions().locale || "";
    const lang = tag.split(/[-_.]/)[0]?.toLowerCase();
    return lang && /^[a-z]{2,3}$/.test(lang) ? lang : "en";
  } catch {
    return "en";
  }
}
async function scaffold(path, name, log) {
  log("Creating project folder\u2026");
  await scaffoldFiles(path, name);
  const doc = emptyProject({ name, lang: machineLang(), favicon: "/favicon.svg" });
  doc.framework = { ...doc.framework, enabled: true };
  doc.site.seo = { ...doc.site.seo ?? {}, sitemap: true, robots: true };
  const preset = await defaultPreset();
  if (preset) {
    try {
      preset.apply(doc);
      log(`Applying preset "${preset.name}"\u2026`);
    } catch {
    }
  }
  if (!hasSiteTemplate(doc.templates)) doc.templates.push(newSiteTemplate());
  if (!Object.keys(doc.pages).length) {
    doc.pages.index = { route: "index", title: "Home", root: [], stylesheets: [{ id: "global", name: "Global", rules: [] }] };
  }
  if (!hasTemplateForRoute(doc.templates, "404")) doc.templates.push(newNotFoundTemplate());
  await (0, import_promises4.writeFile)((0, import_node_path5.join)(path, PROJECT_FILE), serializeProject(doc));
  await initRepo(path, log);
  await trust(path).catch(() => {
  });
}
async function initRepo(path, log) {
  if (!await lookup("git")) {
    log("Git is not installed \u2014 the project was created without a repository.");
    return;
  }
  log("git init");
  await new Promise((done) => {
    const child = (0, import_node_child_process3.spawn)("git", ["init", "-b", "main"], { cwd: path });
    child.on("error", () => {
      log("git could not be started \u2014 the project was created without a repository.");
      done();
    });
    child.on("close", () => done());
  });
}
var readme = (name) => `# ${name}

An Astro site, built with [sitereal](https://sitereal.app).

\`\`\`bash
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
\`\`\`

Everything here is ordinary Astro: pages in \`src/pages\`, components in
\`src/components\`, assets in \`public\`. Edit them by hand or in the builder \u2014
they are the same files. An edit to a page's, a component's or a layout's
markup shows up in the builder as you save it; anything else you edit by hand
is never written over: the builder notices, leaves it alone, and asks which
version to keep.

\`${PROJECT_FILE}\` holds what the builder needs to show this site visually
(page trees, design system, settings). The site itself never reads it: delete
it and \`npm run build\` still produces the same output \u2014 you would just lose
visual editing. Keep it in version control.
`;
var AGENTS = `# Working in this project

This is an Astro site edited visually with [sitereal](https://sitereal.app).
The pages, components and stylesheets are ordinary files; \`${PROJECT_FILE}\`
holds what the visual editor needs (page trees, design system, settings), and
the site never reads it.

- **Prefer sitereal's MCP tools when they are connected** (\`sitereal_*\`):
  a write through them updates the visual editor and every file that depends
  on it, and the user sees it on the canvas.
- **Editing a file directly is fine.** Pages, components (styles and script
  included), layouts, popups, HTML snippets, the stylesheets sitereal writes,
  the variables in \`framework.css\` and a collection's \`src/data/<slug>.json\`
  are read back into the visual editor, and a file you formatted keeps its
  formatting when the editor changes it. **A new \`.astro\` file under
  \`src/pages/\` becomes a page**: one shaped like the others is an ordinary
  page, anything else stays its own file, with nothing put around it. A
  collection stored as entry files keeps each entry as \`src/entries/<slug>/*.md\`
  (or \`.json\`): write a new one to add an entry. A line sitereal derives
  from a setting \u2014 a site-wide head prop, a frontmatter line it generates \u2014
  is not read back into the project, but your file keeps it. sitereal
  never writes over a file edited outside it: a change from the editor is
  merged into your edit, and where both changed one line yours stands.
  Deleting a page's file deletes the page. Say which files you edited.
- **Do not put rules into \`src/styles/generated/framework.css\`** (the design
  system's output): a rule written there is moved into \`global.css\`. Put CSS
  in your own stylesheet instead; the design system is changed in the app.
- Never edit \`${PROJECT_FILE}\` by hand.
`;
async function install(path, log) {
  if (!await lookup("npm")) {
    log("Node.js is not installed \u2014 the project was created without its packages.");
    return false;
  }
  return new Promise((done) => {
    log("Installing dependencies (npm install)\u2026");
    const child = (0, import_node_child_process3.spawn)("npm", ["install", "--no-audit", "--no-fund"], { cwd: path, shell: process.platform === "win32" });
    child.on("error", () => done(false));
    const tail = (d) => {
      const t = d.toString().trim().split("\n").pop();
      if (t) log(t.slice(0, 120));
    };
    child.stdout?.on("data", tail);
    child.stderr?.on("data", tail);
    child.on("close", (code) => done(code === 0));
  });
}

// ../engine/duplicate.ts
var import_promises6 = require("node:fs/promises");
var import_node_os4 = require("node:os");
var import_node_child_process6 = require("node:child_process");
var import_node_util4 = require("node:util");
var import_node_path7 = require("node:path");

// ../engine/github-cli.ts
var import_node_child_process5 = require("node:child_process");
var import_promises5 = require("node:fs/promises");
var import_node_util3 = require("node:util");
var import_node_path6 = require("node:path");

// ../engine/github-account.ts
var import_node_child_process4 = require("node:child_process");
var import_node_util2 = require("node:util");
var exec2 = (0, import_node_util2.promisify)(import_node_child_process4.execFile);
var quietGit = () => ({ ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" });
var out = async (cmd, args, cwd) => (await exec2(cmd, args, { cwd, timeout: 2e4, encoding: "utf8", env: quietGit() })).stdout.trim();
var said = async (cmd, args) => {
  try {
    const r2 = await exec2(cmd, args, { timeout: 2e4, encoding: "utf8" });
    return `${r2.stdout}${r2.stderr}`;
  } catch (e) {
    const r2 = e;
    return `${r2.stdout ?? ""}${r2.stderr ?? ""}`;
  }
};
async function accounts() {
  if (!await has("gh")) return { cli: false, loggedIn: false, user: null, list: [] };
  let list2 = [];
  try {
    const hosts2 = JSON.parse(await out("gh", ["auth", "status", "--json", "hosts"])).hosts ?? {};
    list2 = (hosts2["github.com"] ?? []).flatMap((h2) => h2.login ? [{ login: h2.login, active: !!h2.active }] : []);
  } catch {
    for (const line3 of (await said("gh", ["auth", "status"])).split("\n")) {
      const login3 = /Logged in to github\.com (?:account |as )([^\s(]+)/i.exec(line3)?.[1];
      if (login3) {
        list2.push({ login: login3, active: false });
        continue;
      }
      const active = /Active account:\s*(true|false)/i.exec(line3)?.[1];
      if (active && list2.length) list2[list2.length - 1].active = active === "true";
    }
  }
  if (list2.length && !list2.some((a) => a.active)) list2[0].active = true;
  const user = list2.find((a) => a.active)?.login ?? null;
  return { cli: true, loggedIn: list2.length > 0, user, list: list2 };
}
async function ownAddress() {
  try {
    const me = JSON.parse(await out("gh", ["api", "user"]));
    if (!me.login || !me.id) return null;
    return { name: me.login, email: `${me.id}+${me.login}@users.noreply.github.com` };
  } catch {
    return null;
  }
}
async function ensureIdentity(cwd) {
  const have = await out("git", ["-C", cwd, "config", "user.email"]).catch(() => "");
  if (have) return true;
  const mine = await ownAddress();
  if (!mine) return false;
  await setCommitIdentity(cwd, mine.name, mine.email);
  return true;
}
var isLogin = (s) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(s);
async function switchAccount(login3) {
  if (!isLogin(login3)) throw new Error("Not a GitHub username.");
  await out("gh", ["auth", "switch", "--hostname", "github.com", "--user", login3]);
}
async function setCommitIdentity(cwd, name, email, everywhere = false) {
  const clean2 = (s) => s.trim();
  const [n, e] = [clean2(name), clean2(email)];
  if (!n || /[\r\n]/.test(n)) throw new Error("Not a name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error("Not an email address.");
  const scope = everywhere ? "--global" : "--local";
  if (!everywhere && !await out("git", ["-C", cwd, "rev-parse", "--show-toplevel"]).catch(() => "")) {
    throw new Error("This project has no repository yet.");
  }
  await out("git", ["-C", cwd, "config", scope, "user.name", n]);
  await out("git", ["-C", cwd, "config", scope, "user.email", e]);
}

// ../engine/github-cli.ts
var exec3 = (0, import_node_util3.promisify)(import_node_child_process5.execFile);
var run = async (cmd, args, cwd, timeout = 12e4) => {
  const { stdout, stderr } = await exec3(cmd, args, { cwd, timeout, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  return (stdout + stderr).trim();
};
var INSTALL_TIMEOUT = 10 * 6e4;
var installer = async () => {
  if (process.platform === "win32") return await has("winget") ? "winget" : null;
  return await has("brew") ? "brew" : null;
};
var INSTALL_LABEL = { brew: "Homebrew", winget: "winget" };
var gitIn = async (cwd, ...args) => (await exec3("git", ["-C", cwd, ...args], { encoding: "utf8", env: quietGit() })).stdout.trim();
async function isOwnRepo(cwd) {
  const top = await gitIn(cwd, "rev-parse", "--show-toplevel").catch(() => "");
  if (!top) return false;
  try {
    return await (0, import_promises5.realpath)(top) === await (0, import_promises5.realpath)(cwd);
  } catch {
    return top === cwd;
  }
}
async function initRepo2(cwd) {
  if (!await isOwnRepo(cwd)) await gitIn(cwd, "init", "-b", "main");
}
async function state(cwd) {
  const install3 = await installer();
  const brew = install3 !== null;
  const { cli, loggedIn, user, list: list2 } = await accounts();
  if (!cwd) return { cli, brew, installer: install3, loggedIn, user, accounts: list2 };
  const git = async (...args) => gitIn(cwd, ...args);
  const repo2 = await isOwnRepo(cwd);
  return {
    cli,
    brew,
    installer: install3,
    loggedIn,
    user,
    accounts: list2,
    repo: repo2,
    remote: repo2 ? await git("remote", "get-url", "origin").catch(() => "") : "",
    branch: repo2 ? await git("rev-parse", "--abbrev-ref", "HEAD").catch(() => "") : "",
    changed: repo2 ? (await git("status", "--porcelain").catch(() => "")).split("\n").filter(Boolean).length : 0
  };
}
var pending = null;
var running = null;
var loginState = () => pending;
var ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
var loginCode = (out2) => /one-time code\W*([A-Z0-9]{4}-[A-Z0-9]{4})\b/i.exec(out2.replace(ANSI, ""))?.[1] ?? "";
var CODE_WAIT = 2e4;
async function login() {
  if (!await has("gh")) throw new Error("GitHub CLI (gh) is missing.");
  running?.kill();
  const env = { ...process.env, GH_PROMPT_DISABLED: "", NO_COLOR: "1" };
  for (const k of ["CLICOLOR_FORCE", "GH_FORCE_TTY", "FORCE_COLOR"]) delete env[k];
  const child = (0, import_node_child_process5.spawn)("gh", ["auth", "login", "--hostname", "github.com", "--git-protocol", "https", "--web"], { env });
  running = child;
  const mine = { code: "", url: "https://github.com/login/device", done: false };
  pending = mine;
  let out2 = "";
  let settle2 = () => {
  };
  const settled = new Promise((r2) => {
    settle2 = r2;
  });
  const watch = (buf) => {
    out2 += buf.toString();
    if (!mine.code) mine.code = loginCode(out2);
    if (/Logged in as|Authentication complete/i.test(out2)) mine.done = true;
    if (mine.code || mine.done) settle2();
  };
  child.stdout?.on("data", watch);
  child.stderr?.on("data", watch);
  child.stdin?.on("error", () => {
  });
  child.stdin?.write("\n");
  const end = (code, why) => {
    if (running === child) running = null;
    if (!mine.done && code !== 0) {
      const last = out2.replace(ANSI, "").split("\n").map((l) => l.trim()).filter(Boolean).pop();
      mine.error = why ?? last ?? "The GitHub CLI stopped before the sign-in finished.";
    }
    mine.done = true;
    settle2();
  };
  child.on("error", (e) => end(1, e.message));
  child.on("close", (code) => end(code));
  await Promise.race([settled, new Promise((r2) => setTimeout(r2, CODE_WAIT))]);
  return mine;
}
var attempt = async (cmd, args) => {
  try {
    return { out: await run(cmd, args, void 0, INSTALL_TIMEOUT), failed: false };
  } catch (e) {
    const r2 = e;
    return { out: `${r2.stdout ?? ""}${r2.stderr ?? ""}`.trim() || (r2.message ?? "failed"), failed: true };
  }
};
async function installCli() {
  const install3 = await installer();
  if (!install3) {
    throw new Error(process.platform === "win32" ? "winget not found \u2014 please install gh manually: https://cli.github.com" : "Homebrew not found \u2014 please install gh manually: https://cli.github.com");
  }
  const { out: out2, failed } = install3 === "winget" ? await attempt("winget", [
    "install",
    "--id",
    "GitHub.cli",
    "-e",
    "--source",
    "winget",
    "--silent",
    "--accept-package-agreements",
    "--accept-source-agreements"
  ]) : await attempt("brew", ["install", "gh"]);
  rescan();
  if (await has("gh")) return `${INSTALL_LABEL[install3]}: ${out2 || "installed"}`.slice(-2e3);
  if (failed) throw new Error(`${INSTALL_LABEL[install3]} could not install gh:
${out2}`.slice(0, 2e3));
  throw new Error(
    `${INSTALL_LABEL[install3]} reported success, but gh is still not runnable from here.
${out2}`.slice(0, 2e3)
  );
}
async function listRepos() {
  if (!await has("gh")) throw new Error("GitHub CLI (gh) is missing.");
  const { stdout } = await exec3("gh", [
    "repo",
    "list",
    "--limit",
    "200",
    "--json",
    "nameWithOwner,url,visibility,updatedAt,defaultBranchRef"
  ], { encoding: "utf8" });
  const list2 = JSON.parse(stdout);
  return list2.map((r2) => ({
    name: r2.nameWithOwner,
    url: r2.url,
    visibility: (r2.visibility ?? "").toLowerCase(),
    updated: r2.updatedAt,
    defaultBranch: r2.defaultBranchRef?.name ?? "main"
  })).sort((a, b) => a.updated < b.updated ? 1 : -1);
}
async function clone(parent, repo2, log) {
  if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(repo2)) throw new Error("Expected owner/repo.");
  if (!await has("gh")) throw new Error("GitHub CLI (gh) is missing.");
  if (!await has("git")) throw new Error("Git is not installed \u2014 install it from this dialog, then try again.");
  const dir = (0, import_node_path6.join)(parent, repo2.split("/")[1]);
  log(`cloning ${repo2}`);
  await run("gh", ["repo", "clone", repo2, dir], parent);
  return dir;
}
async function createRepoStep(cwd, name, isPrivate, log) {
  if (!await has("git")) {
    log("Git is not installed \u2014 skipped creating the GitHub repository.");
    return;
  }
  if (!await has("gh")) {
    log("The GitHub CLI is not installed \u2014 skipped creating the GitHub repository.");
    return;
  }
  try {
    await createRepo(cwd, name, isPrivate, log);
  } catch (e) {
    const r2 = e;
    const why = `${r2.stderr ?? ""}`.split("\n").map((l) => l.trim()).filter(Boolean).pop() ?? String(r2.message ?? e).split("\n")[0];
    log(`The GitHub repository was not created: ${why}`);
  }
}
async function createRepo(cwd, name, isPrivate, log) {
  if (!/^[A-Za-z0-9._-]+$/.test(name)) throw new Error("Invalid repo name.");
  if (!await has("gh")) throw new Error("GitHub CLI (gh) is missing.");
  if (!await has("git")) throw new Error("Git is not installed \u2014 it keeps the history and is what pushes to GitHub.");
  const git = async (...args) => gitIn(cwd, ...args);
  if (!await isOwnRepo(cwd)) {
    log("git init");
    await initRepo2(cwd);
  }
  const connected = await git("remote", "get-url", "origin").catch(() => "");
  if (connected) {
    throw new Error(`This project is already connected to ${connected}. Disconnect it first if you want a different repository.`);
  }
  const dirty = (await git("status", "--porcelain").catch(() => "")).length > 0;
  const hasCommit = await git("rev-parse", "HEAD").then(() => true).catch(() => false);
  if (dirty || !hasCommit) {
    if (!await ensureIdentity(cwd)) {
      throw new Error("git does not know who is committing \u2014 set a name and email under Settings \u2192 Repository \u2192 Identity.");
    }
    log("first commit");
    await git("add", "-A");
    await git("commit", "-m", "Initial commit").catch(() => {
    });
  }
  log(`creating repo ${name} on GitHub`);
  const out2 = await run("gh", [
    "repo",
    "create",
    name,
    isPrivate ? "--private" : "--public",
    "--source",
    cwd,
    "--remote",
    "origin",
    "--push"
  ], cwd);
  log(out2.split("\n").filter(Boolean).pop() ?? "done");
  return state(cwd);
}

// ../engine/duplicate.ts
var exec4 = (0, import_node_util4.promisify)(import_node_child_process6.execFile);
var SKIP = /* @__PURE__ */ new Set([".git", "node_modules", "dist", ".astro", RUNTIME_DIR, ".vercel", ".netlify", ".DS_Store"]);
var isEnv = (name) => name === ".env" || name.startsWith(".env.");
var isLocalDb = (name) => name === "local.db" || name.startsWith("local.db-");
async function filesOf(source) {
  const links = [];
  if (await has("git") && await isOwnRepo(source)) {
    const { stdout } = await exec4(
      "git",
      ["-C", source, "ls-files", "-z", "-co", "--exclude-standard"],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
    );
    const listed2 = [...new Set(stdout.split("\0").filter(Boolean))];
    const kept = [];
    for (const rel of listed2) {
      const parts = rel.split("/");
      if (parts.some((p) => SKIP.has(p)) || isEnv(parts[parts.length - 1])) continue;
      const st = await (0, import_promises6.lstat)((0, import_node_path7.join)(source, rel)).catch(() => null);
      if (st?.isSymbolicLink()) links.push(rel);
      else if (st?.isFile()) kept.push(rel);
    }
    return { files: kept, links };
  }
  const out2 = [];
  const walk = async (dir) => {
    for (const e of await (0, import_promises6.readdir)(dir, { withFileTypes: true })) {
      if (SKIP.has(e.name) || isEnv(e.name) || isLocalDb(e.name)) continue;
      const full = (0, import_node_path7.join)(dir, e.name);
      const rel = (0, import_node_path7.relative)(source, full).split(import_node_path7.sep).join("/");
      if (e.isSymbolicLink()) links.push(rel);
      else if (e.isDirectory()) await walk(full);
      else if (e.isFile()) out2.push(rel);
    }
  };
  await walk(source);
  return { files: out2, links };
}
async function duplicate(source, target, name, log) {
  if (!await exists(source)) throw new Error(`${source} is not there any more.`);
  const made = !await exists(target);
  try {
    await copyInto(source, target, name, log);
  } catch (e) {
    if (made) await (0, import_promises6.rm)(target, { recursive: true, force: true }).catch(() => {
    });
    throw e;
  }
}
async function copyInto(source, target, name, log) {
  log("Copying files\u2026");
  const { files, links } = await filesOf(source);
  for (const rel of files) {
    const to = (0, import_node_path7.join)(target, rel);
    await (0, import_promises6.mkdir)((0, import_node_path7.dirname)(to), { recursive: true });
    await (0, import_promises6.copyFile)((0, import_node_path7.join)(source, rel), to);
  }
  log(`${files.length} files copied`);
  if (links.length) {
    const shown = links.slice(0, 5).join(", ") + (links.length > 5 ? ` and ${links.length - 5} more` : "");
    log(`Not copied: ${links.length === 1 ? "a symbolic link" : `${links.length} symbolic links`} (${shown}) \u2014 a link would bring along whatever it points at.`);
  }
  const docPath = (0, import_node_path7.join)(target, PROJECT_FILE);
  if (await exists(docPath)) {
    const doc = normalizeProject(JSON.parse(await (0, import_promises6.readFile)(docPath, "utf8")));
    doc.site = { ...doc.site, name };
    await (0, import_promises6.writeFile)(docPath, serializeProject(doc));
  }
  const pkgPath = (0, import_node_path7.join)(target, "package.json");
  if (await exists(pkgPath)) {
    try {
      const pkg = JSON.parse(await (0, import_promises6.readFile)(pkgPath, "utf8"));
      pkg.name = slugify(name);
      await (0, import_promises6.writeFile)(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    } catch {
    }
  }
  if (await exists((0, import_node_path7.join)(source, ".env"))) {
    log("Not copied: .env \u2014 this site needs its own keys (Settings \u2192 Forms, Sources, Database).");
  }
  if (await has("git")) {
    log("git init");
    await initRepo2(target).catch(() => log("git init failed \u2014 the project was copied without a repository."));
  } else {
    log("Git is not installed \u2014 the project was copied without a repository.");
  }
  if (await isTrusted(source).catch(() => false)) await trust(target).catch(() => {
  });
  await (0, import_promises6.copyFile)(thumbFile(source), thumbFile(target)).catch(() => {
  });
}
async function fromRepo(repo2, target, name, log) {
  const scratch = await (0, import_promises6.mkdtemp)((0, import_node_path7.join)((0, import_node_os4.tmpdir)(), "sitereal-from-"));
  try {
    const cloned = await clone(scratch, repo2, log);
    await duplicate(cloned, target, name, log);
    await trust(target).catch(() => {
    });
  } finally {
    await (0, import_promises6.rm)(scratch, { recursive: true, force: true }).catch(() => {
    });
  }
}

// src/path.ts
var import_node_child_process7 = require("node:child_process");
var import_node_util5 = require("node:util");
var import_node_path8 = require("node:path");
var exec5 = (0, import_node_util5.promisify)(import_node_child_process7.execFile);
var FALLBACKS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"];
async function adoptRegistryPath() {
  const keys = [
    "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment",
    "HKCU\\Environment"
  ];
  const reg = (0, import_node_path8.join)(process.env.SystemRoot ?? "C:\\Windows", "System32", "reg.exe");
  const have = (process.env.PATH ?? "").split(";").filter(Boolean);
  const seen = new Set(have.map((d) => d.toLowerCase().replace(/\\+$/, "")));
  for (const key of keys) {
    try {
      const { stdout } = await exec5(reg, ["query", key, "/v", "Path"], { timeout: 5e3 });
      const value = /\s+Path\s+REG_(?:EXPAND_)?SZ\s+(.*)$/im.exec(stdout)?.[1] ?? "";
      for (const raw of value.split(";")) {
        const dir = raw.trim().replace(/%([^%]+)%/g, (m, v2) => process.env[v2] ?? m);
        const k = dir.toLowerCase().replace(/\\+$/, "");
        if (dir && !seen.has(k)) {
          seen.add(k);
          have.push(dir);
        }
      }
    } catch {
    }
  }
  process.env.PATH = have.join(";");
}
async function adoptShellPath() {
  if (process.platform === "win32") return adoptRegistryPath();
  const shell2 = process.env.SHELL || "/bin/zsh";
  try {
    const { stdout } = await exec5(shell2, ["-ilc", "command -v printenv >/dev/null && printenv PATH"], { timeout: 5e3 });
    const found2 = stdout.trim().split("\n").pop() ?? "";
    if (found2.includes("/")) process.env.PATH = found2;
  } catch {
  }
  const have = new Set((process.env.PATH ?? "").split(":").filter(Boolean));
  for (const dir of FALLBACKS) have.add(dir);
  process.env.PATH = [...have].join(":");
}

// ../engine/tools.ts
var import_node_child_process9 = require("node:child_process");
var import_node_util7 = require("node:util");

// ../engine/node-version.ts
var import_node_child_process8 = require("node:child_process");
var import_node_util6 = require("node:util");
var exec6 = (0, import_node_util6.promisify)(import_node_child_process8.execFile);
var win2 = process.platform === "win32";
var NEW_SITE_NODE = ">=22.23.4";
var parse = (v2) => {
  const m = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(v2);
  return m ? [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)] : null;
};
var cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
function comparator(c2) {
  const m = /^(>=|<=|>|<|=|\^|~)?\s*v?(\d+|x|\*)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?$/i.exec(c2.trim());
  if (!m) return null;
  const [, op = "", ...raw] = m;
  const wild = raw.map((p) => p === void 0 || /^[x*]$/i.test(p));
  const n = raw.map((p, i) => wild[i] ? 0 : Number(p));
  if (wild[0]) return () => true;
  if (!op || op === "=") {
    if (wild[1]) return (v2) => v2[0] === n[0];
    if (wild[2]) return (v2) => v2[0] === n[0] && v2[1] === n[1];
    return (v2) => cmp(v2, n) === 0;
  }
  if (op === ">=") return (v2) => cmp(v2, n) >= 0;
  if (op === ">") return (v2) => wild[1] ? v2[0] > n[0] : wild[2] ? v2[0] > n[0] || v2[0] === n[0] && v2[1] > n[1] : cmp(v2, n) > 0;
  if (op === "<") return (v2) => cmp(v2, n) < 0;
  if (op === "<=") return (v2) => wild[1] ? v2[0] <= n[0] : wild[2] ? v2[0] < n[0] || v2[0] === n[0] && v2[1] <= n[1] : cmp(v2, n) <= 0;
  if (op === "~") {
    const top2 = wild[1] ? [n[0] + 1, 0, 0] : [n[0], n[1] + 1, 0];
    return (v2) => cmp(v2, n) >= 0 && cmp(v2, top2) < 0;
  }
  const top = n[0] > 0 || wild[1] ? [n[0] + 1, 0, 0] : n[1] > 0 || wild[2] ? [0, n[1] + 1, 0] : [0, 0, n[2] + 1];
  return (v2) => cmp(v2, n) >= 0 && cmp(v2, top) < 0;
}
function satisfies(version, range) {
  const v2 = parse(version);
  if (!v2) return true;
  return range.split("||").some((set) => {
    const s = set.trim();
    if (!s) return true;
    const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(s);
    const parts = hyphen ? [`>=${hyphen[1]}`, `<=${hyphen[2]}`] : s.split(/\s+/);
    const tests = parts.map(comparator);
    if (tests.some((t) => !t)) return true;
    return tests.every((t) => t(v2));
  });
}
async function nodeVersion() {
  const at = await lookup("node");
  try {
    const { stdout } = await exec6("node", ["--version"], { timeout: 15e3, encoding: "utf8", shell: win2, windowsHide: true });
    const version = stdout.trim().replace(/^v/, "");
    return parse(version) ? { version, at } : null;
  } catch {
    return null;
  }
}
async function nodeGap(needs, astro) {
  const n = await nodeVersion();
  if (!n || satisfies(n.version, needs)) return null;
  return { have: n.version, at: n.at, needs, astro };
}

// ../engine/tools.ts
var exec7 = (0, import_node_util7.promisify)(import_node_child_process9.execFile);
var TOOL_PAGES = {
  git: "https://git-scm.com/downloads",
  node: "https://nodejs.org/en/download"
};
var PACKAGES = {
  winget: { git: "Git.Git", node: "OpenJS.NodeJS.LTS" },
  brew: { git: "git", node: "node" }
};
async function toolsState() {
  const [git, node, install3] = await Promise.all([lookup("git"), lookup("npm"), installer()]);
  const state3 = { git: !!git, node: !!node, installer: install3 };
  if (!git && process.platform === "darwin" && !await hasDevTools()) state3.gitVia = "xcode";
  if (node) {
    const gap = await nodeGap(NEW_SITE_NODE);
    if (gap) state3.nodeOld = { have: gap.have, at: gap.at, needs: gap.needs };
  }
  return state3;
}
var sleep = (ms) => new Promise((r2) => setTimeout(r2, ms));
async function installDevTools() {
  await new Promise((done) => {
    const child = (0, import_node_child_process9.spawn)("/usr/bin/xcode-select", ["--install"], { stdio: "ignore" });
    child.on("error", () => done());
    child.on("close", () => done());
  });
  const until = Date.now() + 20 * 6e4;
  while (Date.now() < until) {
    rescan();
    if (await hasDevTools()) return;
    await sleep(4e3);
  }
}
async function installTool(tool) {
  if (tool === "git" && process.platform === "darwin" && !await hasDevTools()) {
    await installDevTools();
    rescan();
    const state4 = await toolsState();
    if (state4.git) return state4;
    throw new Error("macOS installs Git with its command line developer tools. Confirm the dialog macOS opened \u2014 it may be behind this window \u2014 and Git is here once it has finished.");
  }
  const how = await installer();
  if (!how) throw new Error(`Nothing here can install it \u2014 download it from ${TOOL_PAGES[tool]}`);
  const args = how === "winget" ? ["install", "--id", PACKAGES.winget[tool], "-e", "--source", "winget", "--silent", "--accept-package-agreements", "--accept-source-agreements"] : ["install", PACKAGES.brew[tool]];
  let out2 = "";
  try {
    const r2 = await exec7(how, args, { timeout: 10 * 6e4, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
    out2 = `${r2.stdout}${r2.stderr}`;
  } catch (e) {
    const r2 = e;
    out2 = `${r2.stdout ?? ""}${r2.stderr ?? ""}`.trim() || (r2.message ?? "");
  }
  rescan();
  const state3 = await toolsState();
  if (tool === "git" ? state3.git : state3.node) return state3;
  throw new Error(`${how === "winget" ? "winget" : "Homebrew"} could not install ${tool === "git" ? "Git" : "Node.js"}:
${tidy(out2)}`.slice(0, 2e3));
}
var tidy = (out2) => out2.split(/\r?\n|\r/).map((l) => l.trim()).filter((l) => l && !/^[\s\-\\|/█▒░0-9.%KMGB]+$/.test(l)).slice(-12).join("\n");

// ../engine/cli-command.ts
var import_node_child_process10 = require("node:child_process");
var import_node_fs3 = require("node:fs");
var import_node_os5 = require("node:os");
var import_node_path9 = require("node:path");
var import_node_util8 = require("node:util");
var exec8 = (0, import_node_util8.promisify)(import_node_child_process10.execFile);
var shellLine = (0, import_node_util8.promisify)(import_node_child_process10.exec);
var win3 = process.platform === "win32";
function scriptPath() {
  return win3 ? (0, import_node_path9.join)(process.env.SITEREAL_HOME || (0, import_node_path9.join)(process.env.LOCALAPPDATA || (0, import_node_path9.join)((0, import_node_os5.homedir)(), "AppData", "Local"), "sitereal"), "bin", "sitereal.exe") : (0, import_node_path9.join)(process.env.SITEREAL_HOME || (0, import_node_path9.join)((0, import_node_os5.homedir)(), ".sitereal"), "bin", "sitereal");
}
function older(a, b) {
  const parse2 = (v2) => {
    const [main, pre] = v2.trim().replace(/^v/, "").split("-");
    return { nums: main.split(".").map((n) => Number(n) || 0), pre: pre ?? "" };
  };
  const x = parse2(a), y = parse2(b);
  for (let i = 0; i < 3; i++) if ((x.nums[i] ?? 0) !== (y.nums[i] ?? 0)) return (x.nums[i] ?? 0) < (y.nums[i] ?? 0);
  return !!x.pre && !y.pre;
}
async function cliState(than) {
  const found2 = await lookup("sitereal");
  const onPath = found2 && !/[\\/]Programs[\\/]sitereal[\\/]/i.test(found2) && !/\.app[\\/]Contents[\\/]/i.test(found2) ? found2 : null;
  const own = scriptPath();
  const path = onPath ?? ((0, import_node_fs3.existsSync)(own) ? own : null);
  if (!path) return { path: null, version: null, via: null, behind: false };
  let version = null;
  try {
    const opts = { timeout: 8e3, encoding: "utf8", env: { ...process.env, SITEREAL_NO_START: "1" } };
    const { stdout } = win3 && /\.(cmd|bat)$/i.test(path) ? await shellLine(`"${path}" --version`, opts) : await exec8(path, ["--version"], opts);
    version = /\d+\.\d+\.\d+(?:-[\w.]+)?/.exec(stdout)?.[0] ?? null;
  } catch {
  }
  let real2 = path;
  try {
    real2 = (0, import_node_fs3.realpathSync)(path);
  } catch {
  }
  const via = /[\\/](Cellar|homebrew|linuxbrew)[\\/]/i.test(path) || /[\\/](Cellar|homebrew|linuxbrew)[\\/]/i.test(real2) ? "brew" : "script";
  return { path, version, via, behind: !!version && older(version, than) };
}
async function upgradeCli(than, log = () => {
}) {
  const now = await cliState(than);
  const [cmd, args] = now.via === "brew" ? ["brew", ["upgrade", "meinaufwind/tap/sitereal"]] : win3 ? ["powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "irm https://get.sitereal.app/install.ps1 | iex"]] : ["sh", ["-c", "curl -fsSL https://get.sitereal.app | sh"]];
  const code = await new Promise((done) => {
    const child = (0, import_node_child_process10.spawn)(cmd, args, { env: { ...process.env, SITEREAL_NO_START: "1", CI: "1" }, stdio: ["ignore", "pipe", "pipe"] });
    const take = (b) => {
      for (const l of b.toString().split("\n")) if (l.trim()) log(l.trim());
    };
    child.stdout?.on("data", take);
    child.stderr?.on("data", take);
    child.on("error", (e) => {
      log(String(e.message));
      done(1);
    });
    child.on("exit", (c2) => done(c2 ?? 1));
  });
  rescan();
  const after = await cliState(than);
  if (code !== 0 && !(after.version && !after.behind)) throw new Error(`The update did not finish (${cmd} exited with ${code}).`);
  return after;
}

// ../engine/license.ts
var import_promises7 = require("node:fs/promises");
var import_node_path10 = require("node:path");
var import_node_crypto2 = require("node:crypto");
var import_node_os6 = require("node:os");
var API = (process.env.SITEREAL_API || "https://account.sitereal.app").replace(/\/+$/, "");
var PUBLIC_KEY_B64 = process.env.SITEREAL_LICENCE_KEY || "MCowBQYDK2VwAyEAtOi/xNz0jwrFN415nnHQyuUfo9SFgVA7BqUt2rUYBbk=";
var file2 = () => (0, import_node_path10.resolve)(appConfigDir(), "licence.json");
var b64urlToBuf = (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
function verify(token) {
  const dot = token.indexOf(".");
  if (dot < 1) return { ok: false, why: "malformed" };
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let key;
  try {
    key = (0, import_node_crypto2.createPublicKey)({ key: Buffer.from(PUBLIC_KEY_B64, "base64"), format: "der", type: "spki" });
  } catch {
    return { ok: false, why: "this build has no valid license key compiled into it" };
  }
  let good = false;
  try {
    good = (0, import_node_crypto2.verify)(null, Buffer.from(body), key, b64urlToBuf(sig));
  } catch {
    return { ok: false, why: "bad signature" };
  }
  if (!good) return { ok: false, why: "bad signature" };
  let payload;
  try {
    payload = JSON.parse(b64urlToBuf(body).toString("utf8"));
  } catch {
    return { ok: false, why: "unreadable" };
  }
  if (payload?.v !== 1 || !payload.plan) return { ok: false, why: "not a license this version understands" };
  if (payload.kind !== void 0) return { ok: false, why: "not a license" };
  return { ok: true, payload };
}
var today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
var UNLICENSED = false;
async function status() {
  const stored = await read();
  if (!stored) return { state: "none" };
  const check2 = verify(stored.token);
  if (!check2.ok) {
    return { state: "none", why: stored.token ? check2.why : void 0 };
  }
  const p = check2.payload;
  if (p.did && stored.deviceId && p.did !== stored.deviceId) {
    return { state: "none", why: "this license was issued to another computer \u2014 sign in here" };
  }
  const last = p.until ?? (p.plan === "trial" ? "1970-01-01" : null);
  if (last && today() > last) return { state: "ended", payload: p };
  if (p.plan === "trial") {
    const days = Math.ceil((Date.parse(last + "T23:59:59Z") - Date.now()) / 864e5);
    return { state: "trial", payload: p, daysLeft: Math.max(days, 0) };
  }
  return { state: "licensed", payload: p, stale: p.exp * 1e3 < Date.now() };
}
async function read() {
  try {
    return JSON.parse(await (0, import_promises7.readFile)(file2(), "utf8"));
  } catch {
    return null;
  }
}
async function write(stored) {
  await (0, import_promises7.mkdir)(appConfigDir(), { recursive: true });
  await (0, import_promises7.writeFile)(file2(), JSON.stringify(stored, null, 2) + "\n", { mode: 384 });
}
async function device() {
  const stored = await read();
  if (stored?.deviceId) return { deviceId: stored.deviceId, deviceName: stored.deviceName };
  const made = { deviceId: (0, import_node_crypto2.randomUUID)(), deviceName: (0, import_node_os6.hostname)() };
  await write({ token: stored?.token ?? "", ...made });
  return made;
}
async function post(path, body, timeoutMs = 15e3) {
  const c2 = new AbortController();
  const t = setTimeout(() => c2.abort(), timeoutMs);
  try {
    const r2 = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: c2.signal
    });
    const data = await r2.json().catch(() => ({}));
    if (!r2.ok) throw new Error(data?.error || `${r2.status} from the license server`);
    return data;
  } finally {
    clearTimeout(t);
  }
}
async function refresh() {
  const stored = await read();
  if (!stored?.token) return status();
  try {
    const answer2 = await post(
      "/api/licence/refresh",
      { token: stored.token, deviceId: stored.deviceId },
      4e3
    );
    if (answer2?.revoked) {
      await write({ token: "", deviceId: stored.deviceId, deviceName: stored.deviceName });
      return status();
    }
    if (answer2?.token) {
      const check2 = verify(answer2.token);
      if (check2.ok) await write({ ...stored, token: answer2.token, refreshedAt: Date.now() });
    }
  } catch {
  }
  return status();
}
async function beginLogin() {
  const d = await device();
  return post("/api/device/code", d);
}
async function completeLogin(code, onTick) {
  const until = Date.now() + code.expiresIn * 1e3;
  const stored = await device();
  while (Date.now() < until) {
    await new Promise((r2) => setTimeout(r2, Math.max(code.interval, 1) * 1e3));
    onTick?.();
    let answer2;
    try {
      answer2 = await post("/api/device/token", { deviceCode: code.deviceCode });
    } catch (e) {
      throw e;
    }
    if (answer2.status === "pending") continue;
    if (!answer2.token) throw new Error(answer2.status || "the sign-in was refused");
    const check2 = verify(answer2.token);
    if (!check2.ok) throw new Error(`the server sent a license this build cannot read (${check2.why})`);
    await write({ ...stored, token: answer2.token, refreshedAt: Date.now() });
    return status();
  }
  throw new Error("the code expired before it was confirmed");
}
var accountPass = null;
async function requestCode(email) {
  await post("/api/device/email", { email: email.trim().toLowerCase() });
}
async function verifyCode(email, otp, free, name) {
  const d = await device();
  accountPass = null;
  const answer2 = await post("/api/device/verify", {
    email: email.trim().toLowerCase(),
    otp: otp.replace(/\D/g, ""),
    deviceId: d.deviceId,
    deviceName: d.deviceName,
    ...free ? { free } : {},
    ...name?.trim() ? { name: name.trim() } : {}
  });
  if (answer2?.status !== "ok") {
    if (answer2?.status === "seats-full") return { status: "seats-full", seats: answer2.seats ?? [], limit: answer2.limit ?? 0 };
    if (answer2?.status === "no-licence") {
      if (typeof answer2.pass === "string") accountPass = answer2.pass;
      return { status: "no-licence", message: String(answer2.message ?? ""), choose: !!accountPass, trialUsed: !!answer2.trialUsed };
    }
    return { status: "bad-code" };
  }
  const check2 = verify(answer2.token);
  if (!check2.ok) throw new Error(`the server sent a license this build cannot read (${check2.why})`);
  await write({ ...d, token: answer2.token, refreshedAt: Date.now() });
  return { status: "ok", state: await status() };
}
async function keep(token) {
  const check2 = verify(token);
  if (!check2.ok) throw new Error(`the server sent a license this build cannot read (${check2.why})`);
  const d = await device();
  await write({ ...d, token, refreshedAt: Date.now() });
  accountPass = null;
  return status();
}
async function chooseStart(choice) {
  if (!accountPass) return { status: "expired" };
  const d = await device();
  let answer2;
  try {
    answer2 = await post("/api/device/start", { pass: accountPass, choice, deviceId: d.deviceId, deviceName: d.deviceName });
  } catch (e) {
    if (/sign in again/.test(String(e.message))) {
      accountPass = null;
      return { status: "expired" };
    }
    throw e;
  }
  if (answer2?.status === "ok" && answer2.token) return { status: "ok", state: await keep(answer2.token) };
  if (answer2?.status === "checkout") return { status: "checkout", url: String(answer2.url) };
  if (answer2?.status === "seats-full") return { status: "seats-full", seats: answer2.seats ?? [], limit: answer2.limit ?? 0 };
  if (answer2?.status === "trial-used" || answer2?.status === "licensed") return { status: answer2.status, message: String(answer2.message ?? "") };
  throw new Error("the license server gave an answer this build does not understand");
}
async function claimPurchase() {
  if (!accountPass) return { status: "expired" };
  const d = await device();
  let answer2;
  try {
    answer2 = await post("/api/device/claim", { pass: accountPass, deviceId: d.deviceId, deviceName: d.deviceName }, 8e3);
  } catch (e) {
    if (/sign in again/.test(String(e.message))) {
      accountPass = null;
      return { status: "expired" };
    }
    return { status: "pending" };
  }
  if (answer2?.status === "ok" && answer2.token) return { status: "ok", state: await keep(answer2.token) };
  if (answer2?.status === "seats-full") return { status: "seats-full", seats: answer2.seats ?? [], limit: answer2.limit ?? 0 };
  return { status: "pending" };
}
async function machines() {
  const stored = await read();
  if (!stored?.token) return [];
  const answer2 = await post("/api/device/machines", { token: stored.token });
  return Array.isArray(answer2?.seats) ? answer2.seats : [];
}
async function forget2(deviceId) {
  const stored = await read();
  if (!stored?.token) return;
  await post("/api/device/revoke", { token: stored.token, deviceId });
  if (deviceId === stored.deviceId) {
    await write({ token: "", deviceId: stored.deviceId, deviceName: stored.deviceName });
  }
}
async function changeEmail(email, otp, currentOtp) {
  const stored = await read();
  if (!stored?.token) return { status: "error", message: "this machine is not signed in" };
  let answer2;
  try {
    answer2 = await post("/api/account/email", {
      token: stored.token,
      email,
      deviceId: stored.deviceId,
      ...otp ? { otp } : {},
      ...currentOtp ? { currentOtp } : {}
    });
  } catch (e) {
    return { status: "error", message: String(e.message) };
  }
  if (answer2?.status === "sent") return { status: "sent", ...answer2.current ? { current: String(answer2.current) } : {} };
  if (answer2?.status === "bad-code") return { status: "bad-code", ...answer2.which ? { which: answer2.which } : {} };
  if (answer2?.status !== "ok") return { status: "error", message: "that did not work" };
  if (answer2.token && verify(answer2.token).ok) {
    await write({ ...stored, token: answer2.token, refreshedAt: Date.now() });
  }
  return { status: "ok", email: String(answer2.email ?? email), state: await status() };
}
async function logout() {
  const stored = await read();
  if (stored?.token) {
    try {
      await post("/api/device/revoke", { token: stored.token, deviceId: stored.deviceId }, 6e3);
    } catch {
    }
  }
  if (stored) await write({ token: "", deviceId: stored.deviceId, deviceName: stored.deviceName });
}
var allowed = (s) => s.state === "free" || s.state === "licensed" || s.state === "trial";
async function gate(force = false) {
  if (UNLICENSED) return { ok: true, state: { state: "free" } };
  let s = await status();
  if (force || s.state === "ended" || s.state === "licensed" && s.stale) s = await refresh();
  return { ok: allowed(s), state: s };
}
function describe(s) {
  switch (s.state) {
    case "free":
      return "No license needed \u2014 this version of sitereal is free to use";
    case "licensed":
      return s.payload.plan === "lifetime" ? `Licensed${s.payload.email ? ` to ${s.payload.email}` : ""} \u2014 lifetime` : `Licensed${s.payload.email ? ` to ${s.payload.email}` : ""} \u2014 updates until ${s.payload.updatesUntil}`;
    case "trial":
      return `Trial \u2014 ${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"} left`;
    case "ended":
      return s.payload.plan === "trial" ? "Your trial has ended" : `Your license ended on ${s.payload.until}`;
    case "none":
      return s.why ? `No usable license (${s.why})` : "No license yet";
  }
}

// ../engine/license-session.ts
var login2 = null;
var currentLogin = () => login2;
async function beginLogin2() {
  if (login2 && !login2.done && !login2.error) return login2;
  const code = await beginLogin();
  const here = { url: code.url, userCode: code.userCode, done: false };
  login2 = here;
  void completeLogin(code).then(() => {
    here.done = true;
  }).catch((e) => {
    here.error = String(e.message ?? e);
  });
  return here;
}
async function signOut() {
  await logout();
  login2 = null;
  return licenseState();
}
async function licenseState(force = false) {
  const { state: s } = await gate(force);
  return line2(s);
}
function line2(s) {
  return {
    state: s.state,
    line: describe(s),
    plan: "payload" in s ? s.payload.plan : null,
    email: "payload" in s ? s.payload.email ?? null : null,
    ok: allowed(s)
  };
}
var requestCode2 = (email) => requestCode(email);
async function verifyCode2(email, otp, free, name) {
  const answer2 = await verifyCode(email, otp, free, name);
  return answer2.status === "ok" ? { status: "ok", license: await licenseState() } : answer2;
}
async function chooseStart2(choice) {
  const r2 = await chooseStart(choice);
  return r2.status === "ok" ? { status: "ok", license: await licenseState() } : r2;
}
async function claimPurchase2() {
  const r2 = await claimPurchase();
  return r2.status === "ok" ? { status: "ok", license: await licenseState() } : r2;
}
var machines2 = () => machines();
async function forget3(deviceId) {
  await forget2(deviceId);
  return { seats: await machines(), license: await licenseState() };
}
async function changeEmail2(email, otp, currentOtp) {
  const r2 = await changeEmail(email, otp, currentOtp);
  return r2.status === "ok" ? { status: "ok", email: r2.email, license: await licenseState() } : r2;
}

// src/update.ts
var import_electron = require("electron");
var import_node_child_process11 = require("node:child_process");
var import_node_fs4 = require("node:fs");
var import_node_crypto3 = require("node:crypto");
var import_promises8 = require("node:fs/promises");
var import_node_fs5 = require("node:fs");
var import_node_path11 = require("node:path");
var import_node_util9 = require("node:util");
var exec9 = (0, import_node_util9.promisify)(import_node_child_process11.execFile);
var DEFAULT_REPO = "meinaufwind/sitereal-app";
var repo = process.env.SITEREAL_UPDATE_REPO || DEFAULT_REPO;
var setRepo = (slug) => {
  if (slug) repo = slug;
};
var API2 = process.env.SITEREAL_UPDATE_API || "https://api.github.com";
var state2 = { phase: "idle", current: import_electron.app.getVersion() };
var release = null;
var downloaded = null;
var readSkip = async () => void 0;
var writeSkip = async () => {
};
var restart = () => {
  import_electron.app.relaunch();
  import_electron.app.exit(0);
};
function configure(hooks) {
  setRepo(hooks.repo);
  readSkip = hooks.readSkip;
  writeSkip = hooks.writeSkip;
  restart = hooks.restart;
}
var lastSent = 0;
function publish(patch, throttle = false) {
  state2 = { ...state2, ...patch };
  if (throttle && Date.now() - lastSent < 200) return state2;
  lastSent = Date.now();
  for (const wc of import_electron.webContents.getAllWebContents()) {
    if (!wc.isDestroyed()) wc.send("update:state", state2);
  }
  return state2;
}
var current = () => state2;
function newer(a, b) {
  const parts = (v2) => {
    const [core, pre = ""] = v2.replace(/^v/, "").split("-", 2);
    return { nums: core.split(".").map((n) => parseInt(n, 10) || 0), pre };
  };
  const x = parts(a), y = parts(b);
  for (let i = 0; i < Math.max(x.nums.length, y.nums.length); i++) {
    const d = (x.nums[i] ?? 0) - (y.nums[i] ?? 0);
    if (d) return d > 0;
  }
  if (!x.pre !== !y.pre) return !x.pre;
  return x.pre > y.pre;
}
async function macVersion() {
  if (process.platform !== "darwin") return "";
  const asked = process.getSystemVersion?.();
  if (asked) return asked;
  try {
    return (await exec9("sw_vers", ["-productVersion"])).stdout.trim();
  } catch {
    return "";
  }
}
async function heldFor(needs) {
  if (process.platform !== "darwin" || !needs) return void 0;
  const runs = await macVersion();
  return runs && newer(needs, runs) ? { needs, runs } : void 0;
}
async function minimumMacOf(bundle) {
  try {
    const { stdout } = await exec9("plutil", ["-extract", "LSMinimumSystemVersion", "raw", "-o", "-", (0, import_node_path11.join)(bundle, "Contents/Info.plist")]);
    return stdout.trim() || void 0;
  } catch {
    return void 0;
  }
}
var heldRelease = null;
async function holds(version, asset) {
  return await heldFor(asset?.minOS) ?? (heldRelease && heldRelease.version === version ? heldRelease.held : void 0);
}
var NeedsNewerMac = class extends Error {
  constructor(held) {
    super(`This update needs macOS ${held.needs} or newer, and this Mac runs ${held.runs} \u2014 it was not installed.`);
    this.held = held;
  }
  held;
};
var ARCH = process.arch === "arm64" ? "arm64" : "x64";
function assetFor(assets) {
  const wants = process.platform === "darwin" ? /-mac\.zip$/i : process.platform === "win32" ? /\.exe$/i : /\.AppImage$/i;
  const scored = assets.filter((a) => wants.test(a.name)).map((a) => {
    const n = a.name.toLowerCase();
    const score = n.includes(ARCH) ? 3 : n.includes("universal") ? 2 : /arm64|x64|ia32/.test(n) ? 0 : 1;
    return { a, score };
  }).filter((s) => s.score > 0).sort((x, y) => y.score - x.score);
  return scored[0]?.a ?? null;
}
var FEED = process.env.SITEREAL_UPDATE_FEED || "https://get.sitereal.app/app.json";
var BUILDS = process.env.SITEREAL_APP_BASE || "https://sitereal.app/builds";
var FEED_KEY = `${process.platform === "win32" ? "windows" : process.platform}-${ARCH}`;
async function feedRelease() {
  const r2 = await fetch(FEED, { headers: { "user-agent": `sitereal/${import_electron.app.getVersion()}` }, signal: AbortSignal.timeout(15e3) });
  if (!r2.ok) throw new Error(`The update feed answered ${r2.status}`);
  const j = await r2.json();
  if (!j.version) return null;
  const mine = j.assets?.[FEED_KEY];
  return {
    version: j.version.replace(/^v/, ""),
    tag: `v${j.version.replace(/^v/, "")}`,
    name: `sitereal ${j.version}`,
    notes: j.notes ?? "",
    url: "https://sitereal.app/changelog",
    published: "",
    // A release with nothing for this machine is an empty list, which the
    // notice already answers with "download it yourself" and the page.
    assets: mine ? [{
      name: mine.file,
      size: mine.size ?? 0,
      url: `${BUILDS}/${encodeURIComponent(mine.file)}`,
      digest: mine.sha256 ? `sha256:${mine.sha256}` : void 0,
      minOS: mine.minOS
    }] : [],
    viaCli: false
  };
}
var usesFeed = () => repo === DEFAULT_REPO && !process.env.SITEREAL_UPDATE_API;
async function publicRelease() {
  const r2 = await fetch(`${API2}/repos/${repo}/releases/latest`, {
    headers: { accept: "application/vnd.github+json", "user-agent": `sitereal/${import_electron.app.getVersion()}` }
  });
  if (r2.status === 404 || r2.status === 401 || r2.status === 403) return null;
  if (!r2.ok) throw new Error(`GitHub answered ${r2.status}`);
  const j = await r2.json();
  if (j.draft || j.prerelease) return null;
  return {
    version: (j.tag_name ?? "").replace(/^v/, ""),
    tag: j.tag_name,
    name: j.name || j.tag_name,
    notes: j.body ?? "",
    url: j.html_url,
    published: j.published_at,
    assets: (j.assets ?? []).map((a) => ({ name: a.name, size: a.size, url: a.browser_download_url, digest: a.digest })),
    viaCli: false
  };
}
async function cliRelease() {
  let stdout;
  try {
    ({ stdout } = await exec9("gh", [
      "release",
      "view",
      "--repo",
      repo,
      "--json",
      "tagName,name,body,url,publishedAt,isDraft,isPrerelease,assets"
    ], { maxBuffer: 20 * 1024 * 1024, encoding: "utf8" }));
  } catch (e) {
    const said3 = String(e.stderr ?? e.message ?? e).trim().split("\n").pop() ?? "";
    if (/release not found|no releases/i.test(said3)) return null;
    throw new Error(said3 || "The GitHub CLI could not read the releases.");
  }
  const j = JSON.parse(stdout);
  if (j.isDraft || j.isPrerelease) return null;
  return {
    version: (j.tagName ?? "").replace(/^v/, ""),
    tag: j.tagName,
    name: j.name || j.tagName,
    notes: j.body ?? "",
    url: j.url,
    published: j.publishedAt,
    assets: j.assets ?? [],
    viaCli: true
  };
}
async function check() {
  if (state2.phase === "downloading" || state2.phase === "installing") return state2;
  publish({ phase: "checking", error: void 0, needsCli: void 0 });
  try {
    if (usesFeed()) return await offer(await feedRelease());
    const open = await publicRelease();
    if (!open && !await has("gh")) {
      release = null;
      downloaded = null;
      return publish({
        phase: "error",
        checkedAt: Date.now(),
        needsCli: true,
        error: "Checking for updates needs the GitHub CLI, because the releases are private.",
        version: void 0,
        notes: void 0,
        url: void 0,
        published: void 0,
        size: void 0,
        received: void 0,
        manual: void 0,
        held: void 0
      });
    }
    return await offer(open ?? await cliRelease());
  } catch (e) {
    return publish({ phase: "error", checkedAt: Date.now(), needsCli: void 0, held: void 0, error: String(e.message ?? e) });
  }
}
async function offer(found2) {
  release = found2;
  downloaded = null;
  if (!found2?.version || !newer(found2.version, import_electron.app.getVersion())) {
    return publish({
      phase: "current",
      checkedAt: Date.now(),
      skipped: await readSkip(),
      version: void 0,
      notes: void 0,
      url: void 0,
      published: void 0,
      size: void 0,
      received: void 0,
      manual: void 0,
      error: void 0,
      needsCli: void 0,
      held: void 0
    });
  }
  const asset = assetFor(found2.assets);
  return publish({
    phase: "available",
    checkedAt: Date.now(),
    version: found2.version,
    notes: found2.notes,
    url: found2.url,
    published: found2.published,
    manual: !asset,
    size: asset?.size,
    received: 0,
    skipped: await readSkip(),
    needsCli: void 0,
    // said at once when the feed knows it, so nobody downloads 100MB to learn it
    held: await holds(found2.version, asset)
  });
}
async function skip() {
  const v2 = state2.version;
  if (v2) await writeSkip(v2);
  return publish({ skipped: v2 });
}
var stageDir = () => (0, import_node_path11.join)(import_electron.app.getPath("userData"), "updates");
async function fetchTo(url, to, size2) {
  const r2 = await fetch(url, { headers: { "user-agent": `sitereal/${import_electron.app.getVersion()}` } });
  if (!r2.ok || !r2.body) throw new Error(`Download failed (${r2.status})`);
  const total = Number(r2.headers.get("content-length")) || size2;
  const file3 = (0, import_node_fs4.createWriteStream)(to);
  let got = 0;
  try {
    for await (const chunk of r2.body) {
      got += chunk.byteLength;
      if (!file3.write(chunk)) await new Promise((ok) => file3.once("drain", ok));
      publish({ received: got, size: total }, true);
    }
  } finally {
    await new Promise((ok, err) => file3.end((e) => e ? err(e) : ok()));
  }
}
async function cliDownload(asset, tag, dir) {
  const watch = setInterval(async () => {
    try {
      publish({ received: (await (0, import_promises8.stat)((0, import_node_path11.join)(dir, asset.name))).size, size: asset.size }, true);
    } catch {
    }
  }, 300);
  try {
    await exec9("gh", [
      "release",
      "download",
      tag,
      "--repo",
      repo,
      "--pattern",
      asset.name,
      "--dir",
      dir,
      "--clobber"
    ], { maxBuffer: 10 * 1024 * 1024 });
  } finally {
    clearInterval(watch);
  }
}
async function verify2(file3, digest) {
  if (!digest?.startsWith("sha256:")) return;
  const sum = (0, import_node_crypto3.createHash)("sha256").update(await (0, import_promises8.readFile)(file3)).digest("hex");
  if (sum !== digest.slice(7)) throw new Error("The download did not match its checksum.");
}
async function download() {
  if (!release) return publish({ phase: "error", error: "Nothing to download \u2014 check again." });
  const asset = assetFor(release.assets);
  if (!asset) return publish({ phase: "available", manual: true });
  const held = await holds(release.version, asset);
  if (held) return publish({ phase: "available", held });
  downloaded = null;
  publish({ phase: "downloading", received: 0, size: asset.size, error: void 0 });
  try {
    const dir = stageDir();
    await (0, import_promises8.rm)(dir, { recursive: true, force: true });
    await (0, import_promises8.mkdir)(dir, { recursive: true });
    const to = (0, import_node_path11.join)(dir, asset.name);
    if (release.viaCli) await cliDownload(asset, release.tag, dir);
    else await fetchTo(asset.url, to, asset.size);
    await verify2(to, asset.digest);
    downloaded = to;
    return publish({ phase: "ready", received: asset.size, size: asset.size });
  } catch (e) {
    await (0, import_promises8.rm)(stageDir(), { recursive: true, force: true }).catch(() => {
    });
    return publish({ phase: "available", received: 0, error: String(e.message ?? e) });
  }
}
async function rmBundle(path) {
  const p = process;
  const was = p.noAsar;
  p.noAsar = true;
  try {
    (0, import_node_fs5.rmSync)(path, { recursive: true, force: true });
  } finally {
    p.noAsar = was;
  }
}
var writable = async (p) => {
  try {
    await (0, import_promises8.access)(p, import_node_fs5.constants.W_OK);
    return true;
  } catch {
    return false;
  }
};
var bundlePath = () => /^(.*?\.app)\//.exec(import_electron.app.getPath("exe"))?.[1] ?? null;
async function teamOf(bundle) {
  try {
    const { stdout, stderr } = await exec9("codesign", ["-dv", bundle]);
    const t = /TeamIdentifier=(\S+)/.exec(`${stdout}${stderr}`)?.[1];
    return t && t !== "not" ? t : null;
  } catch {
    return null;
  }
}
async function checkSignature(incoming, current2) {
  try {
    await exec9("codesign", ["--verify", "--deep", "--strict", incoming]);
  } catch (e) {
    const why = String(e.stderr ?? "").trim().split(": ").pop();
    throw new Error(`The update's signature does not verify, so it was not installed${why ? ` (${why})` : ""}.`);
  }
  const want = await teamOf(current2);
  if (!want) return;
  const got = await teamOf(incoming);
  if (got !== want) throw new Error(`The update is signed by ${got ?? "nobody"}, not by sitereal (${want}), so it was not installed.`);
}
async function installMac(zip) {
  const current2 = bundlePath();
  if (!current2) throw new Error("Could not find the running app bundle.");
  const parent = (0, import_node_path11.dirname)(current2);
  if (!await writable(parent)) {
    throw new Error(`${parent} is not writable \u2014 move sitereal to your Applications folder, or install this update by hand.`);
  }
  const staging = (0, import_node_path11.join)(parent, `.sitereal-update-${process.pid}`);
  await rmBundle(staging);
  await (0, import_promises8.mkdir)(staging, { recursive: true });
  try {
    await exec9("ditto", ["-x", "-k", zip, staging], { maxBuffer: 10 * 1024 * 1024 });
    const app_ = (await (0, import_promises8.readdir)(staging)).find((n) => n.endsWith(".app"));
    if (!app_) throw new Error("The download did not contain an app.");
    const incoming = (0, import_node_path11.join)(staging, app_);
    await exec9("xattr", ["-dr", "com.apple.quarantine", incoming]).catch(() => {
    });
    const held = await heldFor(await minimumMacOf(incoming));
    if (held) throw new NeedsNewerMac(held);
    await checkSignature(incoming, current2);
    const backup = (0, import_node_path11.join)(parent, `.${app_}.old-${Date.now()}`);
    await (0, import_promises8.rename)(current2, backup);
    try {
      await (0, import_promises8.rename)(incoming, current2);
    } catch (e) {
      await (0, import_promises8.rename)(backup, current2);
      throw e;
    }
  } finally {
    await rmBundle(staging).catch(() => {
    });
  }
}
async function authenticode(file3) {
  const ps = `$s = Get-AuthenticodeSignature -LiteralPath $env:SITEREAL_SIGNED
ConvertTo-Json -Compress -InputObject @{ status = [string]$s.Status; subject = if ($s.SignerCertificate) { $s.SignerCertificate.Subject } else { '' } }`;
  const { stdout } = await exec9(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(ps, "utf16le").toString("base64")],
    { env: { ...process.env, SITEREAL_SIGNED: file3 }, windowsHide: true }
  );
  const r2 = JSON.parse(stdout);
  const cn = /(?:^|,\s*)CN=("(?:[^"]|"")*"|[^,]*)/.exec(r2.subject)?.[1];
  return { status: r2.status, signer: cn ? cn.replace(/^"(.*)"$/, "$1").replace(/""/g, '"').trim() : null };
}
async function checkWindowsSignature(setup) {
  let got, want;
  try {
    [got, want] = await Promise.all([authenticode(setup), authenticode(import_electron.app.getPath("exe"))]);
  } catch (e) {
    const why = String(e.stderr ?? "").trim().split("\n")[0] || e.message;
    throw new Error(`Could not check the update's signature, so it was not installed (${why}). Download it from sitereal.app instead.`);
  }
  if (got.status !== "Valid") throw new Error(`The update's signature does not verify (${got.status}), so it was not installed.`);
  if (want.status === "Valid" && want.signer && got.signer !== want.signer) {
    throw new Error(`The update is signed by ${got.signer ?? "nobody"}, not by sitereal's publisher (${want.signer}), so it was not installed.`);
  }
}
async function installWindows(setup) {
  await checkWindowsSignature(setup);
  const { spawn: spawn7 } = await import("node:child_process");
  spawn7(setup, [], { detached: true, stdio: "ignore" }).unref();
}
async function installAppImage(file3) {
  const target = process.env.APPIMAGE;
  if (!target) throw new Error("Not running from an AppImage \u2014 install this update by hand.");
  const { chmod, copyFile: copyFile2 } = await import("node:fs/promises");
  await copyFile2(file3, target);
  await chmod(target, 493);
}
async function install2() {
  if (!downloaded) return publish({ phase: "error", error: "Nothing downloaded yet." });
  publish({ phase: "installing", error: void 0 });
  try {
    if (process.platform === "darwin") await installMac(downloaded);
    else if (process.platform === "win32") await installWindows(downloaded);
    else await installAppImage(downloaded);
    await writeSkip(null);
    setTimeout(() => process.platform === "win32" ? import_electron.app.exit(0) : restart(), 400);
    return state2;
  } catch (e) {
    if (e instanceof NeedsNewerMac) {
      if (state2.version) heldRelease = { version: state2.version, held: e.held };
      downloaded = null;
      await (0, import_promises8.rm)(stageDir(), { recursive: true, force: true }).catch(() => {
      });
      return publish({ phase: "available", held: e.held, received: 0, error: void 0 });
    }
    return publish({ phase: "ready", error: String(e.message ?? e) });
  }
}
async function offerMove() {
  if (process.platform !== "darwin" || !import_electron.app.isPackaged || import_electron.app.isInApplicationsFolder()) return;
  const exe = import_electron.app.getPath("exe");
  if (!exe.startsWith("/Volumes/") && !exe.includes("/AppTranslocation/")) return;
  const { response } = await import_electron.dialog.showMessageBox({
    type: "question",
    message: "Move sitereal to your Applications folder?",
    detail: "It is running from the disk image or from Downloads, where it cannot update itself. Moving it puts it with your other apps and opens it again from there.",
    buttons: ["Move to Applications", "Not now"],
    defaultId: 0,
    cancelId: 1
  });
  if (response !== 0) return;
  try {
    import_electron.app.moveToApplicationsFolder({ conflictHandler: () => true });
  } catch (e) {
    await import_electron.dialog.showMessageBox({
      type: "warning",
      message: "sitereal could not be moved",
      detail: `Drag it into Applications in Finder instead. (${String(e.message ?? e)})`
    });
  }
}
async function sweep() {
  if (process.platform !== "darwin") return;
  const current2 = bundlePath();
  if (!current2) return;
  const parent = (0, import_node_path11.dirname)(current2);
  try {
    for (const name of await (0, import_promises8.readdir)(parent)) {
      if (/^\..+\.app\.old-\d+$/.test(name) || /^\.sitereal-update-\d+$/.test(name)) {
        await rmBundle((0, import_node_path11.join)(parent, name)).catch(() => {
        });
      }
    }
  } catch {
  }
}

// src/main.ts
var ENGINE = (0, import_node_path12.join)(__dirname, "engine.mjs");
var UI = (0, import_node_path12.join)(__dirname, "ui/index.html");
var MCP = (0, import_node_path12.join)(__dirname, "mcp.mjs");
var localRepo = null;
var configArg = (config) => `--strata-config=${Buffer.from(JSON.stringify(config), "utf8").toString("base64")}`;
var ICON = process.platform === "darwin" ? void 0 : (0, import_node_path12.join)(__dirname, "icon.png");
var sourceFile2 = () => (0, import_node_path12.join)(import_electron2.app.getPath("userData"), "local-source.json");
var builtAt = (repo2) => (0, import_node_path12.join)(repo2, "desktop", "dist");
async function usableBuild(repo2) {
  const d = builtAt(repo2);
  return await exists((0, import_node_path12.join)(d, "ui/index.html")) && await exists((0, import_node_path12.join)(d, "engine.mjs"));
}
async function readSource() {
  try {
    const repo2 = JSON.parse(await (0, import_promises9.readFile)(sourceFile2(), "utf8")).repo;
    return typeof repo2 === "string" && await usableBuild(repo2) ? repo2 : null;
  } catch {
    return null;
  }
}
var quitting = false;
function restart2() {
  for (const s of sessionList()) s.child.kill();
  import_electron2.app.relaunch();
  import_electron2.app.exit(0);
}
async function setSource(repo2) {
  await (0, import_promises9.mkdir)(import_electron2.app.getPath("userData"), { recursive: true });
  await (0, import_promises9.writeFile)(sourceFile2(), JSON.stringify({ repo: repo2 }, null, 2));
  restart2();
}
async function resolveSource() {
  if (DEV_REPO) {
    localRepo = DEV_REPO;
    return;
  }
  if (!import_electron2.app.isPackaged) {
    localRepo = (0, import_node_path12.resolve)(__dirname, "..", "..");
    return;
  }
  localRepo = await readSource();
  if (!localRepo) return;
  const d = builtAt(localRepo);
  ENGINE = (0, import_node_path12.join)(d, "engine.mjs");
  UI = (0, import_node_path12.join)(d, "ui/index.html");
  MCP = (0, import_node_path12.join)(d, "mcp.mjs");
}
var DEV_UI = process.env.STRATA_UI_URL;
var DEV_REPO = DEV_UI ? (0, import_node_path12.resolve)(__dirname, "..", "..") : null;
var guardNavigation = (wc) => {
  wc.on("will-navigate", (e, url) => {
    if (url === wc.getURL()) return;
    e.preventDefault();
    if (OPENABLE.test(url)) void import_electron2.shell.openExternal(url);
  });
  wc.setWindowOpenHandler(({ url }) => {
    if (OPENABLE.test(url)) void import_electron2.shell.openExternal(url);
    return { action: "deny" };
  });
};
var loadUI = (wc) => {
  guardNavigation(wc);
  let reported = false;
  const report = (what, detail) => {
    if (reported || wc.isDestroyed()) return;
    reported = true;
    console.error(`[sitereal] ${what}: ${detail}`);
    const esc = (t) => t.replace(/[&<]/g, (c2) => c2 === "&" ? "&amp;" : "&lt;");
    const html = `<meta charset="utf-8"><body style="font:14px/1.6 ui-sans-serif,system-ui,sans-serif;color:#e5e7eb;background:#0b0b0d;margin:0;padding:12vh 8vw"><h1 style="font:600 20px/1.3 inherit;margin:0 0 8px">sitereal could not start</h1><p style="color:#9ca3af;margin:0 0 16px">${esc(what)}</p><pre style="white-space:pre-wrap;word-break:break-word;font:12px/1.6 ui-monospace,monospace;color:#fca5a5;background:#141417;border:1px solid #26262b;border-radius:8px;padding:12px 14px">${esc(detail)}</pre><p style="color:#6b7280;margin-top:16px">UI: ${esc(UI)}</p></body>`;
    void wc.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  };
  wc.on("did-fail-load", (_e, code, description, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    report("The app\u2019s own page did not load.", `${description} (${code})
${url}`);
  });
  wc.on("preload-error", (_e, preloadPath, error) => {
    report(
      "The bridge between the app and your machine failed to load.",
      `${error?.message ?? String(error)}
${preloadPath}`
    );
  });
  const load2 = DEV_UI ? wc.loadURL(DEV_UI) : wc.loadFile(UI);
  return load2.catch((e) => report("The app\u2019s own page could not be opened.", String(e)));
};
var SHOT = { width: 1280, height: 960 };
var SHOT_EVERY = 2e4;
var SHOT_TIMEOUT = 1e4;
var lastShot = /* @__PURE__ */ new Map();
var heldShot = /* @__PURE__ */ new Map();
var finishing = /* @__PURE__ */ new Set();
var offscreen = /* @__PURE__ */ new Set();
var userWindows = () => import_electron2.BaseWindow.getAllWindows().filter((w) => !offscreen.has(w.id));
async function snapshot(path, engineUrl, force = false) {
  const wait = SHOT_EVERY - (Date.now() - (lastShot.get(path) ?? 0));
  if (!force && wait > 0) {
    if (!heldShot.has(path)) {
      heldShot.set(path, { url: engineUrl, timer: setTimeout(() => {
        heldShot.delete(path);
        void snapshot(path, engineUrl, true);
      }, wait) });
    }
    return;
  }
  const held = heldShot.get(path);
  if (held) {
    clearTimeout(held.timer);
    heldShot.delete(path);
  }
  lastShot.set(path, Date.now());
  const win4 = new import_electron2.BrowserWindow({
    ...SHOT,
    show: false,
    webPreferences: {
      // Offscreen so it renders without ever being on screen — a hidden
      // ordinary window has nothing painted to photograph. No JS: a thumbnail
      // is the page at rest, and the page is not ours to run.
      offscreen: true,
      javascript: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const shotId = win4.id;
  offscreen.add(shotId);
  const expired = setTimeout(() => {
    if (!win4.isDestroyed()) win4.destroy();
  }, SHOT_TIMEOUT);
  try {
    await win4.loadURL(`${engineUrl}/api/preview-doc`);
    await new Promise((r2) => setTimeout(r2, 700));
    if (win4.isDestroyed()) return;
    let shot = await win4.webContents.capturePage();
    if (shot.isEmpty() && !win4.isDestroyed()) {
      await new Promise((r2) => setTimeout(r2, 800));
      if (win4.isDestroyed()) return;
      shot = await win4.webContents.capturePage();
    }
    if (shot.isEmpty()) return;
    await (0, import_promises9.mkdir)(thumbsDir(), { recursive: true });
    await (0, import_promises9.writeFile)(thumbFile(path), shot.resize({ width: 720, quality: "good" }).toJPEG(80));
    for (const wc of managerContents()) wc.send("projects:changed", path);
  } catch {
  } finally {
    clearTimeout(expired);
    offscreen.delete(shotId);
    if (!win4.isDestroyed()) win4.destroy();
  }
}
function freePort() {
  return new Promise((ok, err) => {
    const s = (0, import_node_net.createServer)();
    s.on("error", err);
    s.listen(0, "127.0.0.1", () => {
      const port = s.address().port;
      s.close(() => ok(port));
    });
  });
}
var said2 = /* @__PURE__ */ new WeakMap();
var LOG_TAIL = 4e3;
function noteOutput(child, chunk) {
  const lines = said2.get(child) ?? [];
  lines.push(chunk);
  let total = lines.reduce((n, l) => n + l.length, 0);
  while (total > LOG_TAIL && lines.length > 1) total -= lines.shift().length;
  said2.set(child, lines);
}
async function waitForEngine(api, child) {
  const until = Date.now() + 15e3;
  const tail = () => {
    const out2 = (said2.get(child) ?? []).join("").trim();
    return out2 ? `

${out2}` : "";
  };
  while (Date.now() < until) {
    if (child.exitCode !== null) {
      throw new Error(`The engine stopped (exit code ${child.exitCode}).${tail()}`);
    }
    try {
      const r2 = await fetch(`${api}/api/pages`);
      if (r2.ok) {
        said2.delete(child);
        return;
      }
    } catch {
    }
    await new Promise((r2) => setTimeout(r2, 120));
  }
  throw new Error(`The engine did not answer within 15 seconds.${tail()}`);
}
function startEngine(root, port, token) {
  const child = (0, import_node_child_process12.spawn)(process.execPath, [ENGINE], {
    cwd: root,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      STRATA_ROOT: root,
      STRATA_ENGINE_PORT: String(port),
      SITEREAL_TOKEN: token,
      // Our window is a file:// page, whose Origin is `null` — see engine/access.ts.
      SITEREAL_NULL_ORIGIN: "1",
      // The bundled MCP bridge, started through Electron-as-Node — the project
      // itself has no npm script for it.
      STRATA_MCP_COMMAND: process.execPath,
      STRATA_MCP_ARGS: JSON.stringify([MCP]),
      // No STRATA_ENGINE here on purpose — the port changes per launch, so the
      // bridge discovers it from .strata/engine.json instead.
      STRATA_MCP_ENV: JSON.stringify({ ELECTRON_RUN_AS_NODE: "1" })
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout?.on("data", (d) => {
    noteOutput(child, String(d));
    process.stdout.write(`[engine ${port}] ${d}`);
  });
  child.stderr?.on("data", (d) => {
    noteOutput(child, String(d));
    process.stderr.write(`[engine ${port}] ${d}`);
  });
  child.on("error", (e) => noteOutput(child, `could not start the engine process: ${String(e)}
`));
  return child;
}
var hosts = /* @__PURE__ */ new Map();
var tabs = /* @__PURE__ */ new Map();
var focusOrder = [];
var sessionList = () => [...tabs.values()].flatMap((t) => t.session ? [t.session] : []);
var isLauncher = (win4) => !hosts.has(win4.id) && !offscreen.has(win4.id);
var managerContents = () => [
  ...userWindows().filter((w) => isLauncher(w) && w instanceof import_electron2.BrowserWindow).map((w) => w.webContents),
  ...[...tabs.values()].filter((t) => t.kind === "manager").map((t) => t.view.webContents)
].filter((wc) => !wc.isDestroyed());
var windowOf = (wc) => !wc || wc.isDestroyed() ? void 0 : tabs.get(wc.id)?.host.win ?? import_electron2.BrowserWindow.fromWebContents(wc) ?? void 0;
var focusedFrom = () => {
  const w = import_electron2.BaseWindow.getFocusedWindow();
  if (!w || offscreen.has(w.id)) return void 0;
  const host = hosts.get(w.id);
  if (host) {
    const wc = host.active?.view.webContents;
    return wc && !wc.isDestroyed() ? wc : void 0;
  }
  return w instanceof import_electron2.BrowserWindow ? w.webContents : void 0;
};
var focusedTab = () => {
  const w = import_electron2.BaseWindow.getFocusedWindow();
  return w && hosts.get(w.id)?.active || void 0;
};
var APP_BG = "#0c0c0d";
var placeOf = (from) => from && !from.isDestroyed() && !offscreen.has(from.id) ? { win: from, bounds: from.getNormalBounds(), max: from.isMaximized(), full: from.isFullScreen() } : null;
function handOver(win4, place, up) {
  if (!place || place.win === win4 || place.win.isDestroyed()) return;
  const bye = () => {
    if (!place.win.isDestroyed()) place.win.close();
  };
  const settle2 = () => {
    if (win4.isDestroyed()) return;
    if (!place.full || win4.isFullScreen()) {
      bye();
      return;
    }
    win4.once("enter-full-screen", bye);
    win4.setFullScreen(true);
  };
  if (up) void up.then(settle2, settle2);
  else settle2();
  setTimeout(bye, 4e3);
}
var readyToShow = (win4) => new Promise((ok) => win4.once("ready-to-show", () => ok()));
var firstLoad = (tab2) => new Promise((ok) => {
  const wc = tab2.view.webContents;
  wc.once("did-finish-load", () => ok());
  wc.once("did-fail-load", () => ok());
  setTimeout(ok, 4e3);
});
var titleOf = (t) => t?.kind === "project" ? `${t.name} \u2014 sitereal` : "sitereal";
function newHost(size2, place) {
  const win4 = new import_electron2.BaseWindow({
    ...size2,
    ...place?.full ? { fullscreen: true } : {},
    title: "sitereal",
    show: false,
    icon: ICON,
    backgroundColor: APP_BG
  });
  if (place?.max && !place.full) win4.maximize();
  const host = { id: win4.id, win: win4, tabs: [], active: null };
  hosts.set(host.id, host);
  const fit = () => layout(host);
  win4.on("resize", fit);
  win4.on("maximize", fit);
  win4.on("unmaximize", fit);
  win4.on("restore", fit);
  win4.on("enter-full-screen", fit);
  win4.on("leave-full-screen", fit);
  win4.on("focus", () => {
    focusOrder = [...focusOrder.filter((h2) => h2 !== host), host];
    const wc = host.active?.view.webContents;
    if (wc && !wc.isDestroyed()) wc.focus();
  });
  win4.on("closed", () => {
    hosts.delete(host.id);
    focusOrder = focusOrder.filter((h2) => h2 !== host);
    for (const t of host.tabs.splice(0)) endTab(t);
    tellAll();
  });
  return host;
}
function layout(host) {
  if (host.win.isDestroyed()) return;
  const [width, height] = host.win.getContentSize();
  for (const t of host.tabs) t.view.setBounds({ x: 0, y: 0, width, height });
}
function seat(host, tab2, at = host.tabs.length) {
  tab2.host = host;
  host.tabs.splice(Math.max(0, Math.min(at, host.tabs.length)), 0, tab2);
  host.win.contentView.addChildView(tab2.view);
  layout(host);
}
function makeTab(host, at, kind, name, config, opts = {}) {
  const view = new import_electron2.WebContentsView({
    webPreferences: {
      preload: (0, import_node_path12.join)(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [configArg(config)],
      ...opts.partition ? { partition: opts.partition } : {}
    }
  });
  view.setBackgroundColor(APP_BG);
  view.setVisible(false);
  const tab2 = { id: view.webContents.id, view, host, kind, name, ...opts.session ? { session: opts.session } : {} };
  tabs.set(tab2.id, tab2);
  seat(host, tab2, at);
  void loadUI(view.webContents);
  return tab2;
}
function show(tab2, focus = true, peek = false) {
  const host = tab2.host;
  host.active = tab2;
  for (const t of host.tabs) t.view.setVisible(t === tab2);
  if (!host.win.isDestroyed()) {
    host.win.setTitle(titleOf(tab2));
    if (focus && host.win.isVisible()) {
      if (host.win.isMinimized()) host.win.restore();
      if (!host.win.isFocused()) host.win.focus();
      if (!tab2.view.webContents.isDestroyed()) tab2.view.webContents.focus();
    }
  }
  tellAll(peek ? tab2 : void 0);
}
function endTab(tab2) {
  const wc = tab2.view.webContents;
  tabs.delete(tab2.id);
  const stop = () => {
    if (tab2.session) stopEngine(tab2.session);
  };
  if (wc.isDestroyed()) {
    stop();
    return;
  }
  wc.once("destroyed", stop);
  wc.once("will-prevent-unload", (e) => e.preventDefault());
  wc.close({ waitForBeforeUnload: true });
  setTimeout(() => {
    if (!wc.isDestroyed()) wc.close();
  }, 3e3);
}
function stopEngine(s) {
  const held = heldShot.get(s.path);
  if (held && !quitting) {
    finishing.add(s.child);
    void snapshot(s.path, held.url, true).finally(() => {
      s.child.kill();
      finishing.delete(s.child);
    });
  } else s.child.kill();
}
function closeTab(tab2) {
  const host = tab2.host;
  const i = host.tabs.indexOf(tab2);
  if (i < 0) return;
  host.tabs.splice(i, 1);
  if (!host.win.isDestroyed()) host.win.contentView.removeChildView(tab2.view);
  endTab(tab2);
  if (!host.tabs.length) {
    if (!host.win.isDestroyed()) host.win.close();
    return;
  }
  if (host.active === tab2) show(host.tabs[Math.min(i, host.tabs.length - 1)], host.win.isFocused());
  else tellAll();
}
function detach(tab2, to) {
  const from = tab2.host;
  if (to === from || !to && from.tabs.length < 2) return;
  const i = from.tabs.indexOf(tab2);
  if (i < 0) return;
  from.tabs.splice(i, 1);
  if (!from.win.isDestroyed()) from.win.contentView.removeChildView(tab2.view);
  if (from.active === tab2) from.active = null;
  let host = to;
  if (!host) {
    const b = from.win.getNormalBounds();
    host = newHost({ x: b.x + 36, y: b.y + 36, width: b.width, height: b.height }, null);
  }
  seat(host, tab2);
  show(tab2, false);
  if (!host.win.isVisible()) host.win.show();
  host.win.focus();
  if (!tab2.view.webContents.isDestroyed()) tab2.view.webContents.focus();
  if (!from.tabs.length) {
    if (!from.win.isDestroyed()) from.win.close();
  } else if (!from.active) show(from.tabs[Math.min(i, from.tabs.length - 1)], false);
  tellAll();
}
function moveTab(tab2, at) {
  const host = tab2.host;
  const i = host.tabs.indexOf(tab2);
  if (i < 0) return;
  host.tabs.splice(i, 1);
  host.tabs.splice(Math.max(0, Math.min(at, host.tabs.length)), 0, tab2);
  tellAll();
}
function cycle(step) {
  const t = focusedTab();
  if (!t || t.host.tabs.length < 2) return;
  const list2 = t.host.tabs;
  show(list2[(list2.indexOf(t) + step + list2.length) % list2.length]);
}
var barMode;
var BAR_MODES = ["always", "edge", "collapsed"];
var refOf = (t) => ({
  id: t.id,
  kind: t.kind,
  name: t.name,
  ...t.session ? { path: t.session.path } : {},
  icon: t.icon ?? null
});
function stateFor(tab2, peek = false) {
  const host = tab2.host;
  return {
    self: tab2.id,
    active: host.active ? host.active.id : null,
    tabs: host.tabs.map(refOf),
    windows: [...focusOrder].reverse().filter((h2) => h2 !== host && h2.active && !h2.win.isDestroyed()).map((h2) => ({ id: h2.id, name: h2.active.name })),
    bar: BAR_MODES.includes(barMode) ? barMode : "edge",
    ...peek ? { peek: true } : {}
  };
}
function tellAll(peek) {
  for (const t of tabs.values()) {
    const wc = t.view.webContents;
    if (!wc.isDestroyed()) wc.send("tabs:changed", stateFor(t, t === peek));
  }
}
function command(cmd) {
  const t = focusedTab();
  if (!t || t.view.webContents.isDestroyed()) return false;
  t.view.webContents.send("tabs:command", cmd);
  return true;
}
async function refreshIcon(tab2) {
  if (!tab2.session) return;
  const icon = await projectIcon(tab2.session.path).catch(() => null);
  if (icon === (tab2.icon ?? null)) return;
  tab2.icon = icon;
  tellAll();
}
function launcher(from) {
  const asker = from && !from.isDestroyed() ? tabs.get(from.id) : void 0;
  if (asker) {
    const host = asker.host;
    const open2 = host.tabs.find((t) => t.kind === "manager");
    if (open2) {
      show(open2);
      return open2.view.webContents;
    }
    const tab2 = makeTab(
      host,
      host.tabs.indexOf(asker) + 1,
      "manager",
      "All projects",
      { mode: "launcher", localRepo, version: import_electron2.app.getVersion(), tab: true }
    );
    show(tab2);
    return tab2.view.webContents;
  }
  const place = placeOf(windowOf(from));
  const size2 = place && !isLauncher(place.win) ? place.bounds : { width: 1180, height: 760 };
  const open = userWindows().find((w) => isLauncher(w));
  if (open) {
    open.focus();
    handOver(open, place);
    return open.webContents;
  }
  const win4 = new import_electron2.BrowserWindow({
    // Wide enough for the rail plus three cards — the manager is a grid of
    // sites now, not a list of folder names.
    ...size2,
    minWidth: 860,
    minHeight: 560,
    ...place?.full ? { fullscreen: true } : {},
    title: "sitereal",
    titleBarStyle: "hiddenInset",
    show: false,
    icon: ICON,
    backgroundColor: APP_BG,
    webPreferences: {
      preload: (0, import_node_path12.join)(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [configArg({ mode: "launcher", localRepo, version: import_electron2.app.getVersion() })]
    }
  });
  if (place?.max && !place.full) win4.maximize();
  loadUI(win4.webContents);
  win4.once("ready-to-show", () => win4.show());
  handOver(win4, place, readyToShow(win4));
  return win4.webContents;
}
async function entitled(from) {
  if ((await licenseState()).ok) return true;
  const wc = launcher(from);
  const tell = () => {
    if (!wc.isDestroyed()) wc.send("license:changed");
  };
  if (wc.isLoading()) wc.once("did-finish-load", tell);
  else tell();
  return false;
}
async function openProject(path, opts = {}) {
  if (!await entitled(opts.from)) return;
  const check2 = await inspect(path);
  if (!check2.ok) {
    await import_electron2.dialog.showMessageBox({ type: "error", message: "Cannot open project", detail: check2.reason });
    return;
  }
  const from = opts.from && !opts.from.isDestroyed() ? opts.from : void 0;
  const asker = from ? tabs.get(from.id) : void 0;
  const fromWindow = !asker && from ? windowOf(from) : void 0;
  const already = [...tabs.values()].find((t) => t.session?.path === path);
  if (already) {
    show(already);
    if (asker?.kind === "manager" && asker !== already) closeTab(asker);
    else if (fromWindow) handOver(already.host.win, placeOf(fromWindow));
    return;
  }
  const port = await freePort();
  const token = (0, import_node_crypto4.randomBytes)(24).toString("base64url");
  const api = `http://127.0.0.1:${port}/t/${token}`;
  const child = startEngine(path, port, token);
  try {
    await waitForEngine(api, child);
  } catch (e) {
    child.kill();
    await import_electron2.dialog.showMessageBox({ type: "error", message: "Engine failed to start", detail: String(e) });
    return;
  }
  if (opts.seed) {
    await fetch(`${api}/api/pages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ route: "index", title: "Startseite" })
    }).catch(() => {
    });
  }
  const config = {
    mode: "project",
    engineUrl: api,
    project: { path, name: (0, import_node_path12.basename)(path) }
  };
  const session = { child, port, path, api };
  const partition = `persist:project-${(0, import_node_crypto4.createHash)("sha1").update(path).digest("hex").slice(0, 12)}`;
  await remember(path);
  const name = (await recents().catch(() => [])).find((r2) => r2.path === path)?.name ?? (0, import_node_path12.basename)(path);
  const into = asker && !asker.host.win.isDestroyed() && hosts.has(asker.host.id) ? asker.host : !fromWindow ? focusOrder.filter((h2) => !h2.win.isDestroyed()).at(-1) : void 0;
  let tab2;
  if (into) {
    const stays = asker && into.tabs.includes(asker) ? asker : null;
    const at = stays ? into.tabs.indexOf(stays) + 1 : into.tabs.length;
    tab2 = makeTab(into, at, "project", name, config, { partition, session });
    show(tab2);
    if (stays?.kind === "manager") closeTab(stays);
  } else {
    const place = placeOf(fromWindow);
    const size2 = place && !isLauncher(place.win) ? place.bounds : { width: 1440, height: 900 };
    const host = newHost(size2, place);
    tab2 = makeTab(host, 0, "project", name, config, { partition, session });
    show(tab2, false);
    const up = firstLoad(tab2);
    void up.then(() => {
      if (host.win.isDestroyed()) return;
      host.win.show();
      host.win.focus();
      if (!tab2.view.webContents.isDestroyed()) tab2.view.webContents.focus();
    });
    handOver(host.win, place, up);
  }
  void refreshIcon(tab2);
  setTimeout(() => {
    void snapshot(path, api, true);
  }, 1500);
}
async function pickAndOpen(from) {
  const r2 = await import_electron2.dialog.showOpenDialog({ properties: ["openDirectory"], message: "Open Strata project", defaultPath: await defaultParent() });
  if (r2.canceled || !r2.filePaths[0]) return;
  await openProject((0, import_node_path12.resolve)(r2.filePaths[0]), { from });
}
var progressTo = (wc) => (text) => {
  if (wc && !wc.isDestroyed()) wc.send("projects:progress", text);
};
async function createProject(opts, from) {
  if (!await entitled(from)) return { ok: false, error: "There is no active license." };
  const name = opts.name.trim();
  if (!name) return { ok: false, error: "Please give the project a name." };
  const path = (0, import_node_path12.join)(opts.parent, slugify(name));
  const usable = await folderIsUsable(path);
  if (!usable.ok) return { ok: false, error: `${path}: ${usable.reason}` };
  const log = progressTo(from);
  try {
    await scaffold(path, name, log);
    await remember(path, name);
    if (opts.install !== false) {
      const ok = await install(path, log);
      if (!ok) log("The packages were not installed \u2014 the build indicator in the project has an Install button.");
    }
    if (opts.github?.create) {
      log("GitHub\u2026");
      await createRepoStep(path, opts.github.name || slugify(name), opts.github.private, log);
    }
    log("Opening project\u2026");
    await openProject(path, { from, seed: true });
    return { ok: true, path };
  } catch (e) {
    return { ok: false, error: String(e.message ?? e) };
  }
}
async function duplicateProject(opts, asker) {
  if (!await entitled(asker)) return { ok: false, error: "There is no active license." };
  const name = opts.name.trim();
  if (!name) return { ok: false, error: "Please give the project a name." };
  const path = (0, import_node_path12.join)(opts.parent, slugify(name));
  const usable = await folderIsUsable(path);
  if (!usable.ok) return { ok: false, error: `${path}: ${usable.reason}` };
  const log = progressTo(asker);
  try {
    if (opts.repo) await fromRepo(opts.repo, path, name, log);
    else if (opts.from) await duplicate((0, import_node_path12.resolve)(opts.from), path, name, log);
    else return { ok: false, error: "Nothing to copy from." };
    await remember(path, name);
    if (opts.install !== false) {
      const ok = await install(path, log);
      if (!ok) log("The packages were not installed \u2014 the build indicator in the project has an Install button.");
    }
    if (opts.github?.create) {
      log("GitHub\u2026");
      await createRepoStep(path, opts.github.name || slugify(name), opts.github.private, log);
    }
    log("Opening project\u2026");
    await openProject(path, { from: asker });
    return { ok: true, path };
  } catch (e) {
    return { ok: false, error: String(e.message ?? e) };
  }
}
async function cloneProject(opts, from) {
  if (!await entitled(from)) return { ok: false, error: "There is no active license." };
  const log = progressTo(from);
  try {
    const target = (0, import_node_path12.join)(opts.parent, opts.repo.split("/")[1] ?? "");
    if (await exists(target)) return { ok: false, error: `${target} already exists \u2014 use "Open project\u2026" there instead.` };
    const path = await clone(opts.parent, opts.repo, log);
    await remember(path);
    await trust(path).catch(() => {
    });
    const check2 = await inspect(path);
    if (!check2.ok) return { ok: false, error: `Cloned to ${path}, but: ${check2.reason}` };
    if (opts.install !== false) {
      const ok = await install(path, log);
      if (!ok) log("The packages were not installed \u2014 the build indicator in the project has an Install button.");
    }
    log("Opening project\u2026");
    await openProject(path, { from });
    return { ok: true, path };
  } catch (e) {
    return { ok: false, error: String(e.message ?? e) };
  }
}
import_electron2.ipcMain.handle("projects:list", () => listed());
import_electron2.ipcMain.handle("projects:pick", (e) => pickAndOpen(e.sender));
import_electron2.ipcMain.handle("projects:open", (e, path) => openProject(path, { from: e.sender }));
import_electron2.ipcMain.handle("projects:forget", (_e, path) => forget(path));
import_electron2.ipcMain.handle("projects:pin", (_e, path, pinned) => pin(path, pinned));
import_electron2.ipcMain.handle("projects:folder", (_e, paths, folder) => fileIn(paths, folder));
import_electron2.ipcMain.handle("projects:thumb", (_e, path) => thumbnail(path));
import_electron2.ipcMain.handle("projects:icon", async (_e, path) => {
  const known = [...tabs.values()].some((t) => t.session?.path === path) || (await recents()).some((r2) => r2.path === path);
  return known ? projectIcon(path).catch(() => null) : null;
});
import_electron2.ipcMain.handle("projects:snapshot", (e) => {
  const t = tabs.get(e.sender.id);
  if (!t?.session) return void 0;
  void refreshIcon(t);
  return snapshot(t.session.path, t.session.api);
});
import_electron2.ipcMain.handle("projects:reveal", (_e, path) => import_electron2.shell.showItemInFolder(path));
import_electron2.ipcMain.handle("projects:manager", (e) => {
  launcher(e.sender);
});
import_electron2.ipcMain.handle("projects:create", (e, opts) => createProject(opts, e.sender));
import_electron2.ipcMain.handle("projects:duplicate", (e, opts) => duplicateProject(opts, e.sender));
import_electron2.ipcMain.handle("projects:clone", (e, opts) => cloneProject(opts, e.sender));
var peerOf = (e, id) => {
  const me = tabs.get(e.sender.id);
  const t = typeof id === "number" ? tabs.get(id) : void 0;
  return me && t && t.host === me.host ? t : void 0;
};
import_electron2.ipcMain.handle("tabs:state", (e) => {
  const t = tabs.get(e.sender.id);
  return t ? stateFor(t) : null;
});
import_electron2.ipcMain.handle("tabs:select", (e, id, peek) => {
  const t = peerOf(e, id);
  if (t) show(t, true, peek === true);
});
import_electron2.ipcMain.handle("tabs:close", (e, id) => {
  const t = peerOf(e, id);
  if (t) closeTab(t);
});
import_electron2.ipcMain.handle("tabs:closeOthers", (e, id) => {
  const t = peerOf(e, id);
  if (!t) return;
  show(t);
  for (const o of [...t.host.tabs]) if (o !== t) closeTab(o);
});
import_electron2.ipcMain.handle("tabs:detach", (e, id, windowId) => {
  const t = peerOf(e, id);
  if (!t) return;
  if (windowId == null) {
    detach(t);
    return;
  }
  const to = hosts.get(windowId);
  if (to) detach(t, to);
});
import_electron2.ipcMain.handle("tabs:move", (e, id, at) => {
  const t = peerOf(e, id);
  if (t && Number.isInteger(at)) moveTab(t, at);
});
import_electron2.ipcMain.handle("projects:pickFolder", async () => {
  const r2 = await import_electron2.dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"], message: "Where should the project live?", defaultPath: await defaultParent() });
  return r2.canceled ? null : r2.filePaths[0];
});
import_electron2.ipcMain.handle("projects:defaultParent", () => defaultParent());
import_electron2.ipcMain.handle("settings:get", () => readSettings());
import_electron2.ipcMain.handle("settings:set", async (_e, patch) => {
  const next = await writeSettings(patch);
  if (patch && "projectsBar" in patch) {
    barMode = next.projectsBar;
    tellAll();
  }
  return next;
});
import_electron2.ipcMain.handle("update:state", () => current());
import_electron2.ipcMain.handle("update:check", () => check());
import_electron2.ipcMain.handle("update:download", () => download());
import_electron2.ipcMain.handle("update:install", () => install2());
import_electron2.ipcMain.handle("update:skip", () => skip());
import_electron2.ipcMain.handle("license:state", () => licenseState());
import_electron2.ipcMain.handle("license:check", () => licenseState(true));
import_electron2.ipcMain.handle("license:login", () => beginLogin2());
import_electron2.ipcMain.handle("license:loginState", () => currentLogin());
import_electron2.ipcMain.handle("license:logout", () => signOut());
import_electron2.ipcMain.handle("license:email", (_e, email) => requestCode2(email));
import_electron2.ipcMain.handle("license:verify", (_e, email, otp, free, name) => verifyCode2(email, otp, free, name));
import_electron2.ipcMain.handle("license:start", (_e, choice) => chooseStart2(choice));
import_electron2.ipcMain.handle("license:claim", () => claimPurchase2());
import_electron2.ipcMain.handle("license:machines", () => machines2());
import_electron2.ipcMain.handle("license:forget", (_e, deviceId) => forget3(deviceId));
import_electron2.ipcMain.handle("license:changeEmail", (_e, email, otp, currentOtp) => changeEmail2(email, otp, currentOtp));
import_electron2.ipcMain.handle("github:state", (_e, path) => state(path));
import_electron2.ipcMain.handle("github:login", () => login());
import_electron2.ipcMain.handle("github:loginState", () => loginState());
import_electron2.ipcMain.handle("github:installCli", () => installCli());
import_electron2.ipcMain.handle("tools:state", () => toolsState());
import_electron2.ipcMain.handle("tools:install", (_e, tool) => installTool(tool));
import_electron2.ipcMain.handle("cli:state", () => cliState(import_electron2.app.getVersion()));
import_electron2.ipcMain.handle("cli:upgrade", () => upgradeCli(import_electron2.app.getVersion()));
import_electron2.ipcMain.handle("github:repos", () => listRepos());
import_electron2.ipcMain.handle("github:switch", async (_e, user) => {
  await switchAccount(user);
  return state();
});
import_electron2.ipcMain.handle("github:createRepo", (e, path, name, isPrivate) => createRepo(path, name, isPrivate, progressTo(e.sender)));
var OPENABLE = /^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i;
import_electron2.ipcMain.handle("shell:openExternal", async (_e, url) => {
  if (!OPENABLE.test(url)) return { ok: false, error: `Refused to open ${url}` };
  try {
    await import_electron2.shell.openExternal(url);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message ?? e) };
  }
});
function menu2() {
  const mac2 = process.platform === "darwin";
  import_electron2.Menu.setApplicationMenu(import_electron2.Menu.buildFromTemplate([
    ...mac2 ? [{ role: "appMenu" }] : [],
    {
      label: "File",
      submenu: [
        /* A project is a tab: ⌘T opens the bar at its `+`, the quick way to the
           projects you have. In the manager's own window there is no bar, and
           it is the folder dialog instead. */
        {
          label: "New Tab\u2026",
          accelerator: "CmdOrCtrl+T",
          click: () => {
            if (!command("quickOpen")) void pickAndOpen(focusedFrom());
          }
        },
        { label: "Projects\u2026", accelerator: "CmdOrCtrl+Shift+P", click: () => launcher(focusedFrom()) },
        { label: "Open Project\u2026", accelerator: "CmdOrCtrl+O", click: () => pickAndOpen(focusedFrom()) },
        { type: "separator" },
        /* The manager is where an update is shown and installed, so this is
           the check plus the way to it — not a second updater in a dialog. */
        {
          label: "Check for Updates\u2026",
          click: async () => {
            launcher(focusedFrom());
            await check();
          }
        },
        { type: "separator" },
        /* ⌘W closes the tab in front, as in every app with tabs; the last one
           takes its window with it. A window that is not tabs closes. */
        {
          label: "Close Tab",
          accelerator: "CmdOrCtrl+W",
          click: () => {
            const t = focusedTab();
            if (t) closeTab(t);
            else import_electron2.BaseWindow.getFocusedWindow()?.close();
          }
        },
        { label: "Close Window", accelerator: "CmdOrCtrl+Shift+W", click: () => import_electron2.BaseWindow.getFocusedWindow()?.close() },
        ...mac2 ? [] : [{ type: "separator" }, { role: "quit" }]
      ]
    },
    { role: "editMenu" },
    /* Not `viewMenu`: its Reload and Toggle Developer Tools act on a
       BrowserWindow's own page, and a window of tabs is a BaseWindow whose
       pages are views — they would do nothing there. These act on the page in
       front. Zoom and full screen are the roles, which already work on either. */
    {
      label: "View",
      submenu: [
        { label: "Projects Bar", accelerator: mac2 ? "Ctrl+Cmd+S" : "Ctrl+Alt+S", click: () => {
          command("toggleBar");
        } },
        { label: "Next Project", accelerator: "Ctrl+Tab", click: () => cycle(1) },
        { label: "Previous Project", accelerator: "Ctrl+Shift+Tab", click: () => cycle(-1) },
        { type: "separator" },
        { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => focusedFrom()?.reload() },
        { label: "Force Reload", accelerator: "Shift+CmdOrCtrl+R", click: () => focusedFrom()?.reloadIgnoringCache() },
        { label: "Toggle Developer Tools", accelerator: mac2 ? "Alt+Cmd+I" : "Ctrl+Shift+I", click: () => focusedFrom()?.toggleDevTools() },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    { role: "windowMenu" },
    {
      // Running the installed app against a checkout, so testing it doesn't
      // mean building and reinstalling a DMG for every change.
      label: "Develop",
      submenu: [
        {
          label: localRepo ? `Running local build \u2014 ${localRepo}` : "Running bundled build",
          enabled: false
        },
        { type: "separator" },
        {
          label: "Use Local Build\u2026",
          click: async () => {
            const r2 = await import_electron2.dialog.showOpenDialog({
              properties: ["openDirectory"],
              message: "Pick the sitereal checkout to run from",
              defaultPath: localRepo ?? import_electron2.app.getPath("home")
            });
            if (r2.canceled || !r2.filePaths[0]) return;
            const repo2 = (0, import_node_path12.resolve)(r2.filePaths[0]);
            if (!await usableBuild(repo2)) {
              await import_electron2.dialog.showMessageBox({
                type: "error",
                message: "That checkout has no build yet",
                detail: `Expected ${(0, import_node_path12.join)(builtAt(repo2), "ui/index.html")}.

Run "npm run build" inside desktop/ first, then pick it again.`
              });
              return;
            }
            await setSource(repo2);
          }
        },
        {
          label: "Reload Local Build",
          accelerator: "CmdOrCtrl+Alt+R",
          enabled: !!localRepo,
          // The engine runs as a child process per project and the UI is
          // loaded from disk, so picking up a rebuild means restarting both —
          // i.e. restarting the app.
          click: () => restart2()
        },
        {
          label: "Use Bundled Build",
          enabled: !!localRepo,
          click: () => setSource(null)
        }
      ]
    }
  ]));
}
if (!import_electron2.app.requestSingleInstanceLock()) {
  import_electron2.app.quit();
} else {
  import_electron2.app.on("second-instance", (_e, argv) => {
    const asked = argv.find((a) => a.startsWith("--strata-open="));
    if (asked) {
      openProject((0, import_node_path12.resolve)(asked.slice("--strata-open=".length)));
      return;
    }
    const [win4] = userWindows();
    if (win4) {
      if (win4.isMinimized()) win4.restore();
      win4.focus();
    } else launcher();
  });
}
import_electron2.app.whenReady().then(async () => {
  await offerMove();
  await adoptShellPath();
  await migrateRecents();
  await resolveSource();
  configure({
    repo: (await readSettings()).updateRepo,
    readSkip: async () => (await readSettings()).updateSkipped,
    writeSkip: async (v2) => {
      await writeSettings({ updateSkipped: v2 ?? void 0 });
    },
    restart: restart2
  });
  barMode = (await readSettings()).projectsBar;
  menu2();
  if (process.env.STRATA_OPEN) openProject((0, import_node_path12.resolve)(process.env.STRATA_OPEN));
  else launcher();
  import_electron2.app.on("activate", () => {
    if (!userWindows().length) launcher();
  });
  setTimeout(() => {
    void sweep();
  }, 15e3);
  setTimeout(() => {
    void check();
  }, 4e3);
});
import_electron2.app.on("window-all-closed", () => {
  import_electron2.app.quit();
});
import_electron2.app.on("before-quit", () => {
  quitting = true;
  for (const s of sessionList()) s.child.kill();
  for (const c2 of finishing) c2.kill();
});
