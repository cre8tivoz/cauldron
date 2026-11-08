"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSelectorUsage = analyzeSelectorUsage;
exports.digestOf = digestOf;
// The unused-selector analysis: given every stylesheet region, every other
// project text and a way to search installed packages, decide for each
// selector whether anything can still produce the names it requires.
//
// Where a selector can match decides which texts count:
// - A global selector (a stylesheet, `<style is:global>`, `is:inline`) can
//   match any element, so a mention anywhere protects it.
// - A scoped selector matches only elements its own component renders. Another
//   component's static `class="…"` cannot reach them, so those values are left
//   out — that is what finds `.title` dead in Card while Hero still uses its own
//   `.title`. Scripts, data, packages and the file itself still count. A
//   component that computes its classes or spreads attributes takes classes
//   from its callers, so for it every mention counts again.
//
// Then the project-wide facts that can break the proof (taintOf) turn a would-be
// `unused` into `unknown`, naming the file and the reason.
const node_crypto_1 = require("node:crypto");
const assert_1 = require("../../shared/core/assert");
const brand_1 = require("../../shared/core/brand");
const styleKeepList_1 = require("../../shared/properties/styleKeepList");
const selectorUsage_1 = require("../../shared/properties/selectorUsage");
const selectorMentions_1 = require("./selectorMentions");
const selectorFlow_1 = require("./selectorFlow");
const selectorSheets_1 = require("./selectorSheets");
async function analyzeSelectorUsage(input, scanPackages) {
    const notes = [...input.unreadable];
    const sources = new Map();
    const regions = [];
    for (const sheet of input.stylesheets) {
        sources.set(sheet.rel, sheet.text);
        regions.push((0, selectorSheets_1.cssFileRegion)(sheet.rel, sheet.text));
    }
    const astroByRel = new Map();
    for (const sheet of input.astro) {
        astroByRel.set(sheet.rel, sheet);
        if (sheet.unreadable !== undefined) {
            notes.push({ rel: sheet.rel, message: `Its styles were not checked: ${sheet.unreadable}` });
        }
        regions.push(...sheet.regions);
    }
    const rules = readRules(regions, notes);
    const interest = (0, selectorMentions_1.mentionInterest)(new Set(rules.flatMap((rule) => rule.names)));
    const scans = scanProject(input, interest);
    const packages = (0, selectorMentions_1.interestIsEmpty)((0, selectorMentions_1.remainingInterest)(interest, scans.foreign))
        ? { kind: 'complete', hits: (0, selectorMentions_1.emptyHits)() }
        : await scanPackages((0, selectorMentions_1.remainingInterest)(interest, scans.foreign));
    const taint = taintOf(input, packages);
    const keep = (0, styleKeepList_1.keepMatcher)(input.keepList);
    const entries = [];
    const selectors = new Map();
    // Merged once per scope, not once per selector: a site has thousands of
    // selectors and a handful of scopes.
    const hitsByScope = new Map();
    for (const rule of rules) {
        const sheet = astroByRel.get(rule.region.rel);
        const scopeKey = rule.region.scope === 'global' || sheet?.dynamicClass === true ? '' : rule.region.rel;
        const hits = hitsByScope.get(scopeKey) ?? hitsFor(rule.region, sheet, scans, packages);
        hitsByScope.set(scopeKey, hits);
        const unanswered = packages.kind === 'pending' ? packages.unanswered : undefined;
        const verdict = verdictOf(rule, hits, taintFor(rule.region, sheet, taint), unanswered, keep);
        const id = (0, selectorUsage_1.selectorEntryId)({ rel: rule.region.rel, block: rule.region.block, offset: rule.ruleStart, index: rule.index });
        (0, assert_1.assert)(!selectors.has(id), 'analyzeSelectorUsage: entry ids are unique');
        selectors.set(id, rule);
        entries.push({
            id,
            rel: rule.region.rel,
            line: rule.line,
            selector: rule.text.slice(0, selectorUsage_1.SELECTOR_USAGE_LIMITS.selectorCharsMax),
            scope: rule.region.scope,
            verdict,
        });
    }
    for (const sheet of input.astro) {
        if (sheet.regions.length > 0) {
            sources.set(sheet.rel, sheet.source);
        }
    }
    const files = [...sources].map(([rel, text]) => ({ rel, digest: digestOf(text) }));
    (0, assert_1.assert)(entries.length === selectors.size, 'analyzeSelectorUsage: one entry per selector');
    return { report: { entries, notes: notes.slice(0, selectorUsage_1.SELECTOR_USAGE_LIMITS.notesMax), files }, selectors, sources };
}
function digestOf(text) {
    return (0, brand_1.toDigest)((0, node_crypto_1.createHash)('sha256').update(text).digest('hex'));
}
function scanProject(input, interest) {
    const all = (0, selectorMentions_1.emptyHits)();
    const foreign = (0, selectorMentions_1.emptyHits)();
    const own = new Map();
    for (const other of input.others) {
        (0, selectorMentions_1.scanMentions)(other.text, interest, foreign);
    }
    (0, selectorMentions_1.mergeHits)(all, foreign);
    for (const sheet of input.astro) {
        const hits = (0, selectorMentions_1.emptyHits)();
        (0, selectorMentions_1.scanMentions)(sheet.ownText, interest, hits);
        own.set(sheet.rel, hits);
        (0, selectorMentions_1.mergeHits)(all, hits);
        (0, selectorMentions_1.scanMentions)(sheet.foreignText, interest, foreign);
    }
    // Pair assertion: foreign texts are the own texts with values blanked, so
    // they can never mention more.
    (0, assert_1.assert)(foreign.words.size <= all.words.size, 'scanProject: foreign mentions are a subset of all mentions');
    return { all, foreign, own };
}
function hitsFor(region, sheet, scans, packages) {
    const hits = (0, selectorMentions_1.emptyHits)();
    if (region.scope === 'global') {
        (0, selectorMentions_1.mergeHits)(hits, scans.all);
    }
    else {
        (0, assert_1.assert)(sheet !== undefined, 'hitsFor: a scoped region belongs to an .astro file');
        if (sheet.dynamicClass) {
            (0, selectorMentions_1.mergeHits)(hits, scans.all);
        }
        else {
            (0, selectorMentions_1.mergeHits)(hits, scans.foreign);
            const own = scans.own.get(sheet.rel);
            (0, assert_1.assert)(own !== undefined, 'hitsFor: every .astro file was scanned');
            (0, selectorMentions_1.mergeHits)(hits, own);
        }
    }
    if (packages.kind !== 'incomplete') {
        (0, selectorMentions_1.mergeHits)(hits, packages.hits);
    }
    return hits;
}
function verdictOf(rule, hits, taint, unanswered, keep) {
    if (rule.names.length === 0) {
        return { kind: 'untracked' };
    }
    const absent = rule.names.filter((name) => !hits.words.has(name));
    if (absent.length === 0) {
        return { kind: 'used' };
    }
    if (taint !== undefined) {
        return { kind: 'unknown', names: absent, reason: taint.reason };
    }
    // A name a package search has not answered yet is neither dead nor alive.
    const waiting = unanswered === undefined ? [] : absent.filter((name) => (0, selectorMentions_1.asksAbout)(unanswered, name));
    const dead = absent
        .filter((name) => !waiting.includes(name))
        .filter((name) => (0, selectorMentions_1.assembledPiece)(name, hits) === undefined)
        .filter((name) => !keep(name));
    if (dead.length > 0) {
        // One dead required name proves the selector matches nothing.
        if (rule.fixed !== undefined) {
            return { kind: 'unknown', names: dead, reason: rule.fixed };
        }
        return { kind: 'unused', names: dead };
    }
    if (waiting.length > 0) {
        return { kind: 'checking', names: waiting };
    }
    // A name code assembles (`w--${state}`) is one the code uses, like a name it
    // writes out: in use, so it is neither flagged nor removed.
    if (absent.some((name) => (0, selectorMentions_1.assembledPiece)(name, hits) !== undefined)) {
        return { kind: 'used' };
    }
    (0, assert_1.assert)(absent.every(keep), 'verdictOf: an absent name that is not dead or assembled is kept');
    return { kind: 'kept', names: absent };
}
function taintFor(region, sheet, taint) {
    if (taint.everything !== undefined) {
        return taint.everything;
    }
    if (region.scope === 'global') {
        return taint.injected ?? taint.remote;
    }
    if (sheet?.dynamicClass === true) {
        return taint.remote;
    }
    return undefined;
}
const SET_HTML = /\bset:html\b/;
const REMOTE_CHANNEL = /\bXMLHttpRequest\b|\bnew\s+WebSocket\b|\bnew\s+EventSource\b|\bcreateClient\s*\(/;
const FETCH = /\bfetch\s*\(\s*/g;
// Data from outside the project. A fetch of the site's own path (`/search.json`,
// `./data.json`) returns what the project itself serves, which is already read;
// any other fetch — a URL, or a value — may not be.
function loadsRemoteData(text) {
    if (REMOTE_CHANNEL.test(text)) {
        return true;
    }
    FETCH.lastIndex = 0;
    for (let match = FETCH.exec(text); match !== null; match = FETCH.exec(text)) {
        const argument = text.slice(match.index + match[0].length, match.index + match[0].length + 4);
        if (!/^['"`](?:\/(?!\/)|\.\.?\/)/.test(argument)) {
            return true;
        }
    }
    return false;
}
// Only code that can run can insert HTML, load data or add classes: prose that
// mentions `innerHTML` and type declarations that mention `fetch` do neither.
// Astro serves HTML only from public/ (src/pages renders its own); an HTML file
// elsewhere — an old site export kept for reference — never runs. Every file
// still counts as a mention; this only decides which can weaken a proof.
const RUNNABLE = /\.(?:astro|[cm]?[jt]sx?|vue|svelte|mdx)$/i;
// The site is rendered by src/, served from public/ and configured by root
// files (astro.config.mjs). A worker/ or scripts/ folder beside it is deployed
// or run on its own and cannot put classes into the site's pages.
const SITE_PREFIXES = ['src/', 'public/', 'styles/'];
function runnable(text) {
    if (!text.rel.includes('/')) {
        // A root file: configuration, which can load integrations.
    }
    else if (!SITE_PREFIXES.some((prefix) => text.rel.startsWith(prefix))) {
        return false;
    }
    if (/\.d\.[cm]?ts$/i.test(text.rel)) {
        return false;
    }
    if (/\.html?$/i.test(text.rel)) {
        return text.rel.startsWith('public/');
    }
    return RUNNABLE.test(text.rel);
}
function taintOf(input, packages) {
    const texts = [...input.others.filter(runnable), ...input.astro.map((sheet) => ({ rel: sheet.rel, text: sheet.ownText }))];
    // Every weakness at once, so settling one does not just reveal the next.
    const weaknesses = [];
    if (input.unreadable.length > 0) {
        const first = input.unreadable[0];
        (0, assert_1.assert)(first !== undefined, 'taintOf: the list is not empty');
        weaknesses.push({ reason: `${first.rel} could not be read` });
    }
    if (packages.kind === 'incomplete') {
        weaknesses.push({ reason: packages.reason });
    }
    // Classes a script adds at runtime are not tracked: a script's own class
    // names count as mentions (so their rules stay), and nothing a script does
    // — remote or local — weakens a verdict. Outside data matters only where it
    // reaches a template, through set:html or a computed class (selectorFlow.ts).
    const flowTexts = flowParts(input);
    const remotes = flowTexts.filter((text) => loadsRemoteData(text.text)).map((text) => text.rel);
    // A package loader's entries reach every page through `astro:content`, not
    // through an import of the config, so it is linked to every site.
    const loader = firstRemoteLoader(texts);
    const flowTo = (sites) => {
        const first = sites[0];
        if (loader !== undefined && first !== undefined) {
            return { from: loader, to: first };
        }
        return (0, selectorFlow_1.linkedSites)(flowTexts, remotes, sites);
    };
    const injectFlow = flowTo(input.astro.filter((sheet) => SET_HTML.test(serverText(sheet.ownText))).map((sheet) => sheet.rel));
    const computedFlow = flowTo(input.astro.filter((sheet) => sheet.dynamicClass).map((sheet) => sheet.rel));
    // Inserted HTML built from props and content in the project's own files has
    // its classes in those files, which are already read. Only HTML that can
    // come from outside the project hides classes.
    return {
        everything: combined(weaknesses),
        injected: injectFlow === undefined ? undefined : { reason: `${injectFlow.to} inserts HTML that ${injectFlow.from} can supply from outside the project` },
        remote: computedFlow === undefined ? undefined : { reason: `${computedFlow.to} computes classes from data ${computedFlow.from} loads from outside the project` },
    };
}
// Content collections whose loader comes from a package (a Notion or Sanity
// loader, say) fill pages with data that is not in the project files. Astro's
// own loaders read files, which the check reads too.
const CONTENT_CONFIG = /(?:^|\/)content\.config\.[cm]?[jt]s$|^src\/content\/config\.[cm]?[jt]s$/;
const LOCAL_LOADERS = new Set(['astro/loaders', 'astro/zod', 'zod']);
function firstRemoteLoader(texts) {
    for (const text of texts) {
        if (!CONTENT_CONFIG.test(text.rel)) {
            continue;
        }
        // Import statements only: a schema field named "from" is not an import.
        for (const match of text.text.matchAll(/^\s*import\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]/gm)) {
            const specifier = match[1] ?? match[2] ?? '';
            const bare = !specifier.startsWith('.') && !specifier.startsWith('/');
            if (bare && !specifier.startsWith('astro:') && !LOCAL_LOADERS.has(specifier)) {
                return text.rel;
            }
        }
    }
    return undefined;
}
function combined(weaknesses) {
    if (weaknesses.length === 0) {
        return undefined;
    }
    return { reason: weaknesses.map((weakness) => weakness.reason).join('; and ') };
}
// For data flow a component is its frontmatter and template, which run on the
// server and pass props down through imports. Its <script> runs in the browser
// and never reaches a template, so script bodies are left out.
const SCRIPT_BLOCK = /(<script\b[^>]*>)([\s\S]*?)(<\/script\s*>)/gi;
function serverText(text) {
    return text.replace(SCRIPT_BLOCK, (_match, open, body, close) => open + body.replace(/[^\n]/g, ' ') + close);
}
function flowParts(input) {
    return [...input.others.filter(runnable), ...input.astro.map((sheet) => ({ rel: sheet.rel, text: serverText(sheet.ownText) }))];
}
function readRules(regions, notes) {
    const rules = [];
    for (const region of regions) {
        const read = (0, selectorSheets_1.readRegionRules)(region);
        if (read.kind === 'unreadable') {
            notes.push({ rel: region.rel, message: `Its styles were not checked: ${read.reason}` });
            continue;
        }
        if (rules.length + read.selectors.length > selectorUsage_1.SELECTOR_USAGE_LIMITS.entriesMax) {
            notes.push({ rel: region.rel, message: 'Its styles were not checked: the project has too many selectors' });
            continue;
        }
        rules.push(...read.selectors);
    }
    return rules;
}
