"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planSelectorRemoval = planSelectorRemoval;
// Removing proven-unused selectors from their files. A cleanup is planned
// against a fresh analysis, never against the renderer's copy of a report: an
// id is removed only if it is still `unused` now and its file still has the
// bytes the user looked at.
//
// The edit is the smallest one that removes the selectors: one selector out of
// a list, a whole rule when its list empties, and an at-rule (`@media`) only
// when every rule in it went. Each region is then read again, and the selectors
// left must be exactly the ones that were there minus the ones removed — a
// planner bug fails that check before any byte is written.
const postcss_1 = __importDefault(require("postcss"));
const postcss_selector_parser_1 = __importDefault(require("postcss-selector-parser"));
const assert_1 = require("../../shared/core/assert");
const limits_1 = require("../../shared/core/limits");
const result_1 = require("../../shared/core/result");
const selectorSheets_1 = require("./selectorSheets");
/** The new text of every file the removal touches. */
function planSelectorRemoval(analysis, ids, expected) {
    const verdicts = new Map(analysis.report.entries.map((entry) => [entry.id, entry.verdict]));
    const digests = new Map(analysis.report.files.map((file) => [file.rel, file.digest]));
    for (const file of expected) {
        if (digests.get(file.rel) !== file.digest) {
            return (0, result_1.err)({ code: 'stale', message: `${file.rel} changed since it was checked. Check again before cleaning up.` });
        }
    }
    const byRegion = new Map();
    for (const id of new Set(ids)) {
        const selector = analysis.selectors.get(id);
        if (selector === undefined || verdicts.get(id)?.kind !== 'unused') {
            return (0, result_1.err)({ code: 'changed', message: 'A selector is no longer unused. Check again before cleaning up.' });
        }
        if (!expected.some((file) => file.rel === selector.region.rel)) {
            return (0, result_1.err)({ code: 'stale', message: `${selector.region.rel} was not part of the checked files.` });
        }
        const list = byRegion.get(selector.region) ?? [];
        list.push(selector);
        byRegion.set(selector.region, list);
    }
    const byFile = new Map();
    for (const [region, selectors] of byRegion) {
        const text = rewriteRegion(region, selectors);
        const list = byFile.get(region.rel) ?? [];
        list.push({ region, text });
        byFile.set(region.rel, list);
    }
    const changes = [];
    for (const [rel, regions] of byFile) {
        const before = analysis.sources.get(rel);
        (0, assert_1.assert)(before !== undefined, 'planSelectorRemoval: every analysed region has its file source');
        changes.push({ rel, before, after: spliceRegions(before, regions) });
    }
    return (0, result_1.ok)(changes);
}
function rewriteRegion(region, remove) {
    // Read exactly as the analysis did, so a missing semicolon it read past
    // does not stop the clean-up, and offsets map back to the region's bytes.
    const { root, original } = (0, selectorSheets_1.parseCss)(region.text);
    const rules = new Map();
    root.walkRules((rule) => {
        const start = rule.source?.start?.offset;
        (0, assert_1.assert)(start !== undefined, 'rewriteRegion: the analysis read every rule with a position');
        rules.set(original(start), rule);
    });
    const indexesByRule = new Map();
    for (const selector of remove) {
        (0, assert_1.assert)(selector.fixed === undefined, 'rewriteRegion: a fixed selector is never unused');
        const set = indexesByRule.get(selector.ruleStart) ?? new Set();
        set.add(selector.index);
        indexesByRule.set(selector.ruleStart, set);
    }
    const removedNodes = new Set();
    const splices = [];
    for (const [ruleStart, indexes] of indexesByRule) {
        const rule = rules.get(ruleStart);
        (0, assert_1.assert)(rule !== undefined, 'rewriteRegion: the rule is where the analysis found it');
        const kept = keptSelectors(region.text, rule, indexes, original);
        if (kept === undefined) {
            removedNodes.add(rule);
        }
        else {
            splices.push(kept);
        }
    }
    for (const node of [...removedNodes]) {
        removeEmptiedParents(node, removedNodes);
    }
    const removals = outermost([...removedNodes]).map((node) => wholeLines(region.text, nodeRange(node, original)));
    const all = [...removals, ...splices.filter((splice) => !removals.some((range) => range.start <= splice.start && splice.end <= range.end))];
    const text = applySplices(region.text, all);
    verifyRegion(region, text, remove);
    return text;
}
/** The selector list without the removed entries, or undefined when none are left. */
function keptSelectors(text, rule, remove, original) {
    const parsedStart = rule.source?.start?.offset;
    const start = parsedStart === undefined ? undefined : original(parsedStart);
    (0, assert_1.assert)(start !== undefined, 'keptSelectors: the rule has a position');
    (0, assert_1.assert)(text.startsWith(rule.selector, start), 'keptSelectors: the selector is written at the rule start');
    const items = [];
    (0, postcss_selector_parser_1.default)((root) => {
        root.each((item) => {
            items.push(item.toString());
        });
    }).processSync(rule.selector);
    (0, assert_1.assert)(items.length > 0, 'keptSelectors: a rule has at least one selector');
    for (const index of remove) {
        (0, assert_1.assert)(index < items.length, 'keptSelectors: removed indexes are inside the list');
    }
    const kept = items.map((item) => item.trim()).filter((_, index) => !remove.has(index));
    if (kept.length === 0) {
        return undefined;
    }
    // Reuse the list's own separator so `.a,\n.b` stays one per line.
    const first = items[0];
    (0, assert_1.assert)(first !== undefined, 'keptSelectors: the list has a first item');
    const separator = items.length > 1 ? ',' + (/^\s*/.exec(items[1] ?? '')?.[0] ?? ' ') : ', ';
    return { start, end: start + rule.selector.length, text: kept.join(separator) };
}
// An at-rule or nesting rule whose every child was removed goes with them; a
// comment left inside keeps it, since the comment may say why it is there.
function removeEmptiedParents(node, removed) {
    let parent = node.parent;
    let depth = 0;
    while (parent instanceof postcss_1.default.AtRule) {
        depth += 1;
        (0, assert_1.assert)(depth <= limits_1.LIMITS.treeDepthMax * 4, 'removeEmptiedParents: CSS nesting is bounded by the parse');
        const children = parent.nodes ?? [];
        if (!children.every((child) => removed.has(child))) {
            return;
        }
        removed.add(parent);
        parent = parent.parent;
    }
}
function outermost(nodes) {
    const set = new Set(nodes);
    return nodes.filter((node) => {
        let parent = node.parent;
        let depth = 0;
        while (parent !== undefined) {
            depth += 1;
            (0, assert_1.assert)(depth <= limits_1.LIMITS.treeDepthMax * 4, 'outermost: CSS nesting is bounded by the parse');
            if (parent instanceof postcss_1.default.Rule || parent instanceof postcss_1.default.AtRule) {
                if (set.has(parent)) {
                    return false;
                }
            }
            parent = parent.parent;
        }
        return true;
    });
}
function nodeRange(node, original) {
    const parsedStart = node.source?.start?.offset;
    const parsedEnd = node.source?.end?.offset;
    (0, assert_1.assert)(parsedStart !== undefined, 'nodeRange: parsed nodes have a start');
    (0, assert_1.assert)(parsedEnd !== undefined, 'nodeRange: parsed nodes have an end');
    const start = original(parsedStart);
    const end = original(parsedEnd);
    (0, assert_1.assert)(start < end, 'nodeRange: a node covers at least one character');
    return { start, end };
}
// A rule that sits on its own lines takes those lines with it, and one blank
// line when it was set off by blank lines on both sides; otherwise only its
// own characters go.
function wholeLines(text, range) {
    const lineStart = text.lastIndexOf('\n', range.start - 1) + 1;
    const lineEndIndex = text.indexOf('\n', range.end);
    const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex + 1;
    const ownLines = text.slice(lineStart, range.start).trim() === '' && text.slice(range.end, lineEnd).trim() === '';
    if (!ownLines) {
        return { start: range.start, end: range.end, text: '' };
    }
    let end = lineEnd;
    const blankBefore = /\n[ \t]*\r?\n$/.test(text.slice(Math.max(0, lineStart - 64), lineStart)) || lineStart === 0;
    const blankAfter = /^[ \t]*\r?\n/.exec(text.slice(end, end + 64));
    if (blankBefore) {
        if (blankAfter !== null) {
            end += blankAfter[0].length;
        }
    }
    return { start: lineStart, end, text: '' };
}
function applySplices(text, splices) {
    const sorted = [...splices].sort((left, right) => right.start - left.start);
    let out = text;
    let floor = text.length;
    for (const splice of sorted) {
        (0, assert_1.assert)(splice.end <= floor, 'applySplices: splices do not overlap');
        (0, assert_1.assert)(splice.start <= splice.end, 'applySplices: a splice is a forward range');
        out = out.slice(0, splice.start) + splice.text + out.slice(splice.end);
        floor = splice.start;
    }
    return out;
}
// The postcondition: the region still parses, and its selectors are the old
// ones minus those removed and minus whatever was nested inside a removed
// rule (which required the removed rule's own match, so matched nothing).
function verifyRegion(region, text, removed) {
    const before = (0, selectorSheets_1.readRegionRules)(region);
    const after = (0, selectorSheets_1.readRegionRules)({ ...region, text });
    (0, assert_1.assert)(before.kind === 'rules', 'verifyRegion: the analysed region was readable');
    (0, assert_1.assert)(after.kind === 'rules', 'verifyRegion: the cleaned region still parses');
    const removedKeys = new Set(removed.map((selector) => `${selector.ruleStart}:${selector.index}`));
    const goneRules = new Map();
    for (const selector of before.selectors) {
        const all = before.selectors.filter((other) => other.ruleStart === selector.ruleStart);
        if (all.every((other) => removedKeys.has(`${other.ruleStart}:${other.index}`))) {
            goneRules.set(selector.ruleStart, selector.ruleEnd);
        }
    }
    const expected = before.selectors
        .filter((selector) => !removedKeys.has(`${selector.ruleStart}:${selector.index}`))
        .filter((selector) => ![...goneRules].some(([start, end]) => start < selector.ruleStart && selector.ruleEnd <= end))
        .map(selectorSheets_1.shapeOf)
        .sort();
    const actual = after.selectors.map(selectorSheets_1.shapeOf).sort();
    (0, assert_1.assert)(actual.length === expected.length, 'verifyRegion: exactly the removed selectors are gone');
    (0, assert_1.assert)(actual.every((shape, index) => shape === expected[index]), 'verifyRegion: every kept selector is unchanged');
}
function spliceRegions(source, regions) {
    const sorted = [...regions].sort((left, right) => right.region.start - left.region.start);
    let out = source;
    for (const { region, text } of sorted) {
        (0, assert_1.assert)(source.slice(region.start, region.start + region.text.length) === region.text, 'spliceRegions: the region is where it was read');
        out = out.slice(0, region.start) + text + out.slice(region.start + region.text.length);
    }
    // Pair assertion: everything outside the edited regions is byte-identical.
    const outside = (text, edits) => {
        let rest = '';
        let cursor = 0;
        for (const edit of [...edits].sort((left, right) => left.start - right.start)) {
            rest += text.slice(cursor, edit.start);
            cursor = edit.start + edit.length;
        }
        return rest + text.slice(cursor);
    };
    const ascending = [...regions].sort((left, right) => left.region.start - right.region.start);
    let shift = 0;
    const after = ascending.map(({ region, text }) => {
        const edit = { start: region.start + shift, length: text.length };
        shift += text.length - region.text.length;
        return edit;
    });
    (0, assert_1.assert)(outside(source, ascending.map(({ region }) => ({ start: region.start, length: region.text.length }))) === outside(out, after), 'spliceRegions: no byte outside a style region changed');
    return out;
}
