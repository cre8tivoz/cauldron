"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renameVariables = exports.readVariables = exports.labelForRule = exports.groupRules = exports.findFamilies = exports.findStylesheets = exports.readDeclarations = void 0;
exports.setSectionTitle = setSectionTitle;
exports.removeSection = removeSection;
exports.addSection = addSection;
exports.moveHeading = moveHeading;
exports.setVariable = setVariable;
exports.moveVariable = moveVariable;
exports.moveSection = moveSection;
exports.addVariable = addVariable;
const variableWorkspace_1 = require("./variableWorkspace");
const path_1 = __importDefault(require("path"));
const postcss_1 = __importDefault(require("postcss"));
const variableWorkspace_2 = require("./variableWorkspace");
const assert_1 = require("../../shared/core/assert");
/**
 * Replaces one variable's value in place. The value it is replacing has to be
 * the value that was read, or the file has changed underneath the panel and the
 * offsets no longer mean anything.
 */
function setVariable(projectPath, { file, valueStart, valueEnd, expect, value }) {
    const abs = path_1.default.resolve(projectPath, file);
    const text = variableWorkspace_1.variableFiles.readFileSync(abs, 'utf8');
    const current = text.slice(valueStart, valueEnd);
    if (expect !== undefined && current !== expect) {
        return { ok: false, stale: true, error: 'This file changed since the panel read it.' };
    }
    const next = text.slice(0, valueStart) + value + text.slice(valueEnd);
    (0, variableWorkspace_2.writeProjectText)(abs, next);
    return { ok: true };
}
/**
 * Renames a heading that is a comment.
 *
 * A file with one rule takes its headings from the comments in it, so the
 * heading is not a property of anything — it is those words, and renaming it is
 * writing them. Like a value, it is written back only if the file still says
 * what the panel read.
 */
function setSectionTitle(projectPath, { file, start, end, expect, title }) {
    const next = String(title ?? '').trim();
    if (!next) {
        return { ok: false, error: 'A heading needs a name.' };
    }
    // The words live inside a comment, and `*/` would end it early — the rest of
    // the rule would become the comment's text and the variables under it would
    // stop existing.
    if (next.includes('*/')) {
        return { ok: false, error: 'A heading cannot contain "*/".' };
    }
    const abs = path_1.default.resolve(projectPath, file);
    const text = variableWorkspace_1.variableFiles.readFileSync(abs, 'utf8');
    const current = text.slice(start, end);
    if (expect !== undefined && current !== expect) {
        return { ok: false, stale: true, error: 'This file changed since the panel read it.' };
    }
    (0, variableWorkspace_2.writeProjectText)(abs, text.slice(0, start) + next + text.slice(end));
    return { ok: true };
}
/**
 * Removes a heading that is a comment.
 *
 * The variables under it do not go anywhere — they join the section above,
 * which is what a heading meant in the first place: a line drawn between two
 * runs of declarations. Rubbing the line out leaves both runs.
 *
 * Takes the same range as a rename (where the WORDS are) and grows outwards to
 * the `/*` and `*\/` around them, then to the whole line when the comment has
 * one to itself — a heading removed by cutting the words alone would leave an
 * empty comment behind.
 */
function removeSection(projectPath, { file, start, end, expect }) {
    const abs = path_1.default.resolve(projectPath, file);
    const text = variableWorkspace_1.variableFiles.readFileSync(abs, 'utf8');
    if (expect !== undefined && text.slice(start, end) !== expect) {
        return { ok: false, stale: true, error: 'This file changed since the panel read it.' };
    }
    const open = text.lastIndexOf('/*', start);
    const close = text.indexOf('*/', end);
    if (open === -1 || close === -1) {
        return { ok: false, error: 'That heading is no longer a comment.' };
    }
    let from = open;
    let to = close + 2;
    // A line of its own goes with it; a comment sharing a line with something
    // else leaves that something else where it is.
    const lineStart = text.lastIndexOf('\n', from - 1) + 1;
    const lineEnd = text.indexOf('\n', to);
    const before = text.slice(lineStart, from);
    const after = text.slice(to, lineEnd === -1 ? text.length : lineEnd);
    if (!before.trim() && !after.trim()) {
        from = lineStart;
        to = lineEnd === -1 ? text.length : lineEnd + 1;
    }
    (0, variableWorkspace_2.writeProjectText)(abs, text.slice(0, from) + text.slice(to));
    return { ok: true };
}
/**
 * Moves a heading, and only the heading.
 *
 * The variables do not travel with it, because they were never inside it: a
 * group is the run of lines between one comment and the next, so dragging a
 * comment up past three variables is how those three variables come to be under
 * it. Moving the run wholesale is a different gesture (moveSection) and a
 * different intent.
 *
 * `before` is the declaration it should sit above; null puts it after the last
 * one, where it heads whatever is added next.
 */
function moveHeading(projectPath, { file, selector, start, end, expect, before }) {
    const abs = path_1.default.resolve(projectPath, file);
    const text = variableWorkspace_1.variableFiles.readFileSync(abs, 'utf8');
    if (expect !== undefined && text.slice(start, end) !== expect) {
        return { ok: false, stale: true, error: 'This file changed since the panel read it.' };
    }
    const open = text.lastIndexOf('/*', start);
    const close = text.indexOf('*/', end);
    if (open === -1 || close === -1) {
        return { ok: false, error: 'That heading is no longer a comment.' };
    }
    const comment = text.slice(open, close + 2);
    let from = open;
    let to = close + 2;
    const lineStart = text.lastIndexOf('\n', from - 1) + 1;
    const lineEnd = text.indexOf('\n', to);
    if (!text.slice(lineStart, from).trim() && !text.slice(to, lineEnd === -1 ? text.length : lineEnd).trim()) {
        from = lineStart;
        to = lineEnd === -1 ? text.length : lineEnd + 1;
    }
    const cut = text.slice(0, from) + text.slice(to);
    const root = postcss_1.default.parse(cut);
    const matches = [];
    root.walkRules((candidate) => {
        if (candidate.selector === selector) {
            matches.push(candidate);
        }
    });
    const rule = matches[0];
    if (!rule) {
        return { ok: false, error: `${selector} is no longer in ${file}.` };
    }
    const decls = (rule.nodes || []).filter((node) => node.type === 'decl');
    const anchorDecl = before ? decls.find((declaration) => declaration.prop === before) : undefined;
    let at;
    if (anchorDecl) {
        const offset = anchorDecl.source?.start?.offset ?? 0;
        at = cut.lastIndexOf('\n', offset - 1) + 1;
    }
    else {
        // After everything: the line following the last declaration, or just inside
        // the brace when the rule has none left.
        const last = decls[decls.length - 1];
        if (last) {
            const offset = last.source?.end?.offset ?? 0;
            const nl = cut.indexOf('\n', offset);
            at = nl === -1 ? cut.length : nl + 1;
        }
        else {
            const openOffset = rule.source?.start?.offset ?? 0;
            at = cut.indexOf('{', openOffset) + 2;
        }
    }
    const indent = cut.slice(cut.lastIndexOf('\n', at - 1) + 1, at).match(/^\s*/)?.[0] || '  ';
    (0, variableWorkspace_2.writeProjectText)(abs, `${cut.slice(0, at)}${indent}${comment}\n${cut.slice(at)}`);
    return { ok: true };
}
/**
 * Writes another heading into the rule.
 *
 * A heading is a line between declarations, so a second one is how a run of
 * variables becomes two runs — and an empty one, written directly above another
 * heading, is a group waiting to be filled.
 *
 * `at` puts it on the line holding that offset (above an existing heading);
 * `before` puts it above a named declaration. Either way it takes the
 * indentation of the line it lands on.
 */
function addSection(projectPath, { file, selector, title, before, at }) {
    const next = String(title ?? '').trim();
    if (!next) {
        return { ok: false, error: 'A heading needs a name.' };
    }
    if (next.includes('*/')) {
        return { ok: false, error: 'A heading cannot contain "*/".' };
    }
    const abs = path_1.default.resolve(projectPath, file);
    const text = variableWorkspace_1.variableFiles.readFileSync(abs, 'utf8');
    let offset = at;
    if (typeof offset !== 'number') {
        const matches = [];
        const root = postcss_1.default.parse(text);
        root.walkRules((candidate) => {
            if (candidate.selector === selector) {
                matches.push(candidate);
            }
        });
        const rule = matches[0];
        if (!rule) {
            return { ok: false, error: `${selector} is no longer in ${file}.` };
        }
        const decls = (rule.nodes || []).filter((node) => node.type === 'decl');
        const anchorDecl = (before && decls.find((declaration) => declaration.prop === before)) || decls[decls.length - 1] || undefined;
        if (!anchorDecl) {
            return { ok: false, error: `${selector} has nothing to head.` };
        }
        offset = anchorDecl.source?.start?.offset ?? 0;
    }
    const sane = offset > text.length ? text.length : offset < 0 ? 0 : offset;
    if (sane < 0 || sane > text.length) {
        return { ok: false, error: 'That place is no longer in the file.' };
    }
    const lineStart = text.lastIndexOf('\n', sane - 1) + 1;
    const indent = text.slice(lineStart, sane).match(/^\s*/)?.[0] ?? '';
    const heading = `${indent}/* ${next} */\n`;
    (0, variableWorkspace_2.writeProjectText)(abs, `${text.slice(0, lineStart)}${heading}${text.slice(lineStart)}`);
    return { ok: true, title: next };
}
function lineSpan(text, node) {
    const start = node.source?.start?.offset ?? 0;
    // `postcss` ends a declaration on its last character, which for a line that
    // ends in a newline IS that newline — so the search for the end of the line
    // starts there, not after it, or the span swallows the line below.
    const end = node.source?.end?.offset ?? start;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const nextLine = text.indexOf('\n', end);
    return { from: lineStart, to: nextLine === -1 ? text.length : nextLine + 1 };
}
/**
 * Moves one declaration to sit before another inside the same rule. The panel
 * reorders rows; the file is what actually holds the order, so a row that moves
 * moves the line — indentation, trailing comment and all — rather than being
 * rewritten somewhere else.
 *
 * `target` is the name to land in front of; null means the end of the rule.
 */
function moveVariable(projectPath, { file, selector, name, target, at: landAt }) {
    const abs = path_1.default.resolve(projectPath, file);
    const text = variableWorkspace_1.variableFiles.readFileSync(abs, 'utf8');
    const root = postcss_1.default.parse(text);
    const matches = [];
    root.walkRules((candidate) => {
        if (candidate.selector === selector) {
            matches.push(candidate);
        }
    });
    const rule = matches[0];
    if (!rule) {
        return { ok: false, error: `${selector} is no longer in ${file}.` };
    }
    const declOf = (prop) => (rule.nodes || []).find((node) => node.type === 'decl' && node.prop === prop);
    const moved = declOf(name);
    if (!moved) {
        return { ok: false, error: `${name} is no longer declared there.` };
    }
    const before = target ? declOf(target) : undefined;
    if (target && !before) {
        return { ok: false, error: `${target} is no longer declared there.` };
    }
    const span = lineSpan(text, moved);
    const line = text.slice(span.from, span.to);
    // Landing in front of a declaration is not enough on its own: a group ends at
    // a COMMENT, and "in front of the next declaration" steps over that comment
    // and into the next group. So a drop at the end of a group says where it
    // means, as an offset — the start of the line the variable should land above,
    // comment or not.
    const allDecls = (rule.nodes || []).filter((node) => node.type === 'decl');
    const lastDecl = allDecls[allDecls.length - 1] ?? moved;
    const at = typeof landAt === 'number'
        ? text.lastIndexOf('\n', Math.max(0, Math.min(landAt, text.length)) - 1) + 1
        : before
            ? lineSpan(text, before).from
            : lineSpan(text, lastDecl).to;
    // Cut first, then insert at a position corrected for the cut.
    const withoutLine = text.slice(0, span.from) + text.slice(span.to);
    const insertAt = at > span.from ? at - (span.to - span.from) : at;
    const next = withoutLine.slice(0, insertAt) + line + withoutLine.slice(insertAt);
    if (next === text) {
        return { ok: true, changed: false };
    }
    (0, variableWorkspace_2.writeProjectText)(abs, next);
    return { ok: true, changed: true };
}
/**
 * Moves a whole group — the comment that heads it and every declaration under
 * it — to sit in front of another group's first declaration, or to the end of
 * the rule. Same idea as moving one row, except that a group is several lines
 * that are not always next to each other (a family's names interleave), so they
 * are cut out and re-inserted together, in the order they were in.
 */
function moveSection(projectPath, { file, selector, names, target }) {
    const abs = path_1.default.resolve(projectPath, file);
    const text = variableWorkspace_1.variableFiles.readFileSync(abs, 'utf8');
    const root = postcss_1.default.parse(text);
    const matches = [];
    root.walkRules((candidate) => {
        if (candidate.selector === selector) {
            matches.push(candidate);
        }
    });
    const rule = matches[0];
    if (!rule) {
        return { ok: false, error: `${selector} is no longer in ${file}.` };
    }
    const nodes = rule.nodes || [];
    const declOf = (prop) => nodes.find((node) => node.type === 'decl' && node.prop === prop);
    const decls = names.map(declOf).filter((declaration) => declaration !== undefined);
    const firstDecl = decls[0];
    if (!firstDecl) {
        return { ok: false, error: 'Those variables are no longer declared there.' };
    }
    const spans = decls.map((declaration) => lineSpan(text, declaration));
    const firstSpan = spans[0];
    if (!firstSpan) {
        return { ok: false, error: 'Those variables are no longer declared there.' };
    }
    // The comment above the first one is the group's name — it goes too.
    const firstAt = nodes.indexOf(firstDecl);
    const heading = firstAt > 0 && nodes[firstAt - 1]?.type === 'comment' ? nodes[firstAt - 1] : undefined;
    if (heading?.type === 'comment') {
        spans.unshift(lineSpan(text, heading));
    }
    spans.sort((left, right) => left.from - right.from);
    // The blank line under a group belongs to it — leaving it behind closes the
    // gap where the group was and glues the group to whatever it lands on.
    const last = spans[spans.length - 1] ?? firstSpan;
    const blank = text.slice(last.to).match(/^[ \t]*\r?\n/);
    if (blank) {
        last.to += blank[0]?.length ?? 0;
    }
    let block = spans.map((span) => text.slice(span.from, span.to)).join('');
    const landing = target ? declOf(target) : undefined;
    if (target && !landing) {
        return { ok: false, error: `${target} is no longer declared there.` };
    }
    // In front of the target group's own heading, if it has one.
    const landingAt = landing ? nodes.indexOf(landing) : -1;
    const landingHeading = landingAt > 0 ? nodes[landingAt - 1] : undefined;
    const lastDecl = decls[decls.length - 1] ?? firstDecl;
    const at = landing ? lineSpan(text, landingHeading?.type === 'comment' ? landingHeading : landing).from : lineSpan(text, lastDecl).to;
    // At the end of the rule there is nothing to separate from below, so the
    // group keeps its gap above instead of leaving one before the closing brace.
    if (!landing) {
        block = block.replace(/(?:[ \t]*\r?\n)+$/, '\n').replace(/^/, '\n');
    }
    else if (!/\n[ \t]*\r?\n$/.test(block)) {
        block += '\n';
    }
    const next = cutAndInsert(text, spans, block, at);
    if (next === text) {
        return { ok: true, changed: false };
    }
    (0, variableWorkspace_2.writeProjectText)(abs, next);
    return { ok: true, changed: true };
}
// The text with every span cut out and `block` inserted at `at`, an offset into the text as it
// was before the cut.
function cutAndInsert(text, spans, block, at) {
    // Cut from the bottom up so the offsets above stay valid, then insert at the
    // target corrected for everything removed before it.
    let out = text;
    for (const span of [...spans].reverse()) {
        out = out.slice(0, span.from) + out.slice(span.to);
    }
    const removedBefore = spans.reduce((sum, span) => (span.to <= at ? sum + (span.to - span.from) : sum), 0);
    const insertAt = at - removedBefore;
    // The spans cut before `at` all end at or before it, so they never sum past it.
    (0, assert_1.assert)(insertAt >= 0, 'cutAndInsert: the insertion point is not before the text');
    return out.slice(0, insertAt) + block + out.slice(insertAt);
}
/**
 * Adds a declaration to a rule, under the group it belongs to. `after` is the
 * name it should follow — the last variable of that group — so a new one lands
 * at the bottom of its own group rather than at the bottom of the rule, which
 * for a file like this would be two hundred lines away from what it belongs to.
 */
function addVariable(projectPath, { file, selector, name, value = 'unset', after }) {
    const abs = path_1.default.resolve(projectPath, file);
    const text = variableWorkspace_1.variableFiles.readFileSync(abs, 'utf8');
    const root = postcss_1.default.parse(text);
    const matches = [];
    root.walkRules((candidate) => {
        if (candidate.selector === selector) {
            matches.push(candidate);
        }
    });
    const rule = matches[0];
    if (!rule) {
        return { ok: false, error: `${selector} is no longer in ${file}.` };
    }
    const decls = (rule.nodes || []).filter((node) => node.type === 'decl');
    if (decls.some((declaration) => declaration.prop === name)) {
        return { ok: false, error: `${name} is already declared in ${selector}.` };
    }
    const previous = (after && decls.find((declaration) => declaration.prop === after)) || decls[decls.length - 1] || undefined;
    const indentOf = (node) => {
        const start = node.source?.start?.offset ?? 0;
        return text.slice(text.lastIndexOf('\n', start - 1) + 1, start);
    };
    const line = `${previous ? indentOf(previous) : '  '}${name}: ${value};\n`;
    let at;
    if (previous) {
        const end = previous.source?.end?.offset ?? 0;
        const nextLine = text.indexOf('\n', end);
        at = nextLine === -1 ? text.length : nextLine + 1;
    }
    else {
        // An empty rule: just inside the brace.
        const openOffset = rule.source?.start?.offset ?? 0;
        at = text.indexOf('{', openOffset) + 2;
    }
    (0, variableWorkspace_2.writeProjectText)(abs, text.slice(0, at) + line + text.slice(at));
    return { ok: true, name };
}
// The reading, grouping, model and renaming halves live beside this file; their
// public names are still answered here, where every caller imports them from.
var cssVarRead_1 = require("./cssVarRead");
Object.defineProperty(exports, "readDeclarations", { enumerable: true, get: function () { return cssVarRead_1.readDeclarations; } });
Object.defineProperty(exports, "findStylesheets", { enumerable: true, get: function () { return cssVarRead_1.findStylesheets; } });
var cssVarGroups_1 = require("./cssVarGroups");
Object.defineProperty(exports, "findFamilies", { enumerable: true, get: function () { return cssVarGroups_1.findFamilies; } });
Object.defineProperty(exports, "groupRules", { enumerable: true, get: function () { return cssVarGroups_1.groupRules; } });
Object.defineProperty(exports, "labelForRule", { enumerable: true, get: function () { return cssVarGroups_1.labelForRule; } });
var cssVarModel_1 = require("./cssVarModel");
Object.defineProperty(exports, "readVariables", { enumerable: true, get: function () { return cssVarModel_1.readVariables; } });
var cssVarRename_1 = require("./cssVarRename");
Object.defineProperty(exports, "renameVariables", { enumerable: true, get: function () { return cssVarRename_1.renameVariables; } });
