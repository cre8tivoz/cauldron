"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SELECTOR_USAGE_LIMITS = void 0;
exports.parseSelectorReport = parseSelectorReport;
exports.parseSelectorReportResult = parseSelectorReportResult;
exports.parseSelectorRemovalResult = parseSelectorRemovalResult;
exports.parseSelectorRemoval = parseSelectorRemoval;
exports.parseSelectorFileChange = parseSelectorFileChange;
exports.parseSelectorIds = parseSelectorIds;
exports.parseSelectorFileDigests = parseSelectorFileDigests;
exports.parseSelectorFileChanges = parseSelectorFileChanges;
exports.verdictNames = verdictNames;
exports.selectorEntryId = selectorEntryId;
// The unused-selector report: every class or id selector in the project's
// stylesheets with a verdict on whether anything can still match it, and the
// cleanup requests that remove the proven-unused ones. Desktop's style
// selectors panel, the delete prompt and `check-project` all read this shape.
//
// The verdicts are asymmetric on purpose. `unused` is a proof: no project file,
// installed package or allowed source of markup mentions a name the selector
// requires. Anything that weakens the proof makes the selector `unknown`, which
// is shown and never removed. A wrong `unknown` costs a leftover rule; a wrong
// `unused` breaks a live page.
const assert_1 = require("../core/assert");
const boundary_1 = require("../core/boundary");
const result_1 = require("../core/result");
exports.SELECTOR_USAGE_LIMITS = {
    /** Selector entries in one report. A large site holds a few thousand. */
    entriesMax: 50_000,
    /** Characters of one selector as reported; longer selectors are cut for display only. */
    selectorCharsMax: 2_048,
    /** Required names one entry lists. */
    namesPerEntryMax: 64,
    /** Characters of one class or id name. */
    nameCharsMax: 256,
    /** Project notes in one report: files that could not be read, and why. */
    notesMax: 500,
    /** Stylesheet files one report or cleanup covers. */
    filesMax: 5_000,
    /** Selectors one cleanup may remove. */
    removalsMax: 10_000,
};
function parseSelectorReport(input) {
    const value = (0, boundary_1.record)(input);
    const entries = (0, boundary_1.list)(parseSelectorEntry)(value['entries']);
    if (entries.length > exports.SELECTOR_USAGE_LIMITS.entriesMax) {
        throw new Error('Selector report exceeds its entry limit');
    }
    const notes = (0, boundary_1.list)((0, boundary_1.object)({ rel: boundary_1.pathText, message: boundary_1.text }))(value['notes']);
    if (notes.length > exports.SELECTOR_USAGE_LIMITS.notesMax) {
        throw new Error('Selector report exceeds its note limit');
    }
    const files = (0, boundary_1.list)((0, boundary_1.object)({ rel: boundary_1.pathText, digest: boundary_1.digest }))(value['files']);
    if (files.length > exports.SELECTOR_USAGE_LIMITS.filesMax) {
        throw new Error('Selector report exceeds its file limit');
    }
    return { entries, notes, files };
}
function parseSelectorReportResult(input) {
    return parseResult(input, parseSelectorReport);
}
function parseSelectorRemovalResult(input) {
    return parseResult(input, parseSelectorRemoval);
}
function parseSelectorRemoval(input) {
    const value = (0, boundary_1.record)(input);
    const changes = (0, boundary_1.list)(parseSelectorFileChange)(value['changes']);
    if (changes.length > exports.SELECTOR_USAGE_LIMITS.filesMax) {
        throw new Error('Selector cleanup exceeds its file limit');
    }
    return { removed: (0, boundary_1.count)(value['removed']), changes };
}
function parseSelectorFileChange(input) {
    return (0, boundary_1.object)({ rel: boundary_1.pathText, before: boundary_1.text, after: boundary_1.text })(input);
}
/** A cleanup request: which entries, against which stylesheet bytes. */
function parseSelectorIds(input) {
    const ids = (0, boundary_1.list)(selectorId)(input);
    if (ids.length === 0) {
        throw new Error('Choose at least one selector to remove');
    }
    if (ids.length > exports.SELECTOR_USAGE_LIMITS.removalsMax) {
        throw new Error(`A cleanup removes at most ${exports.SELECTOR_USAGE_LIMITS.removalsMax} selectors`);
    }
    return ids;
}
function parseSelectorFileDigests(input) {
    const files = (0, boundary_1.list)((0, boundary_1.object)({ rel: boundary_1.pathText, digest: boundary_1.digest }))(input);
    if (files.length > exports.SELECTOR_USAGE_LIMITS.filesMax) {
        throw new Error('Selector cleanup exceeds its file limit');
    }
    return files;
}
function parseSelectorFileChanges(input) {
    const changes = (0, boundary_1.list)(parseSelectorFileChange)(input);
    if (changes.length === 0) {
        throw new Error('Nothing to restore');
    }
    if (changes.length > exports.SELECTOR_USAGE_LIMITS.filesMax) {
        throw new Error('Selector restore exceeds its file limit');
    }
    return changes;
}
/** The verdict's names, the ones a user can add to the keep list. */
function verdictNames(verdict) {
    switch (verdict.kind) {
        case 'used':
        case 'untracked':
            return [];
        case 'unused':
        case 'kept':
        case 'unknown':
        case 'checking':
            return verdict.names;
        default: {
            const exhaustive = verdict;
            return exhaustive;
        }
    }
}
/** Entry ids encode where the rule is, so a stale id can never name another rule. */
function selectorEntryId(input) {
    (0, assert_1.assert)(Number.isSafeInteger(input.block), 'selectorEntryId: block is an index');
    (0, assert_1.assert)(input.block >= 0, 'selectorEntryId: block is nonnegative');
    (0, assert_1.assert)(Number.isSafeInteger(input.offset), 'selectorEntryId: offset is an index');
    (0, assert_1.assert)(input.offset >= 0, 'selectorEntryId: offset is nonnegative');
    (0, assert_1.assert)(Number.isSafeInteger(input.index), 'selectorEntryId: list index is an index');
    (0, assert_1.assert)(input.index >= 0, 'selectorEntryId: list index is nonnegative');
    (0, assert_1.assert)(input.rel !== '', 'selectorEntryId: the stylesheet is named');
    return `${input.rel}|${input.block}|${input.offset}|${input.index}`;
}
function parseSelectorEntry(input) {
    const value = (0, boundary_1.record)(input);
    const line = (0, boundary_1.count)(value['line']);
    if (line === 0) {
        throw new Error('Selector line is 1-based');
    }
    const scope = value['scope'];
    if (scope !== 'global' && scope !== 'scoped') {
        throw new Error('Unknown selector scope');
    }
    const selector = (0, boundary_1.text)(value['selector']);
    if (selector.length > exports.SELECTOR_USAGE_LIMITS.selectorCharsMax) {
        throw new Error('Selector exceeds its display limit');
    }
    return { id: selectorId(value['id']), rel: (0, boundary_1.pathText)(value['rel']), line, selector, scope, verdict: parseVerdict(value['verdict']) };
}
function parseVerdict(input) {
    const value = (0, boundary_1.record)(input);
    const kind = value['kind'];
    switch (kind) {
        case 'used':
        case 'untracked':
            return { kind };
        case 'unused':
        case 'kept':
        case 'checking':
            return { kind, names: parseNames(value['names']) };
        case 'unknown': {
            const names = parseNames(value['names']);
            const reason = (0, boundary_1.text)(value['reason']);
            return { kind, names, reason };
        }
        default:
            throw new Error('Unknown selector verdict');
    }
}
function parseNames(input) {
    const names = (0, boundary_1.list)(boundary_1.text)(input);
    if (names.length > exports.SELECTOR_USAGE_LIMITS.namesPerEntryMax) {
        throw new Error('Selector names exceed their limit');
    }
    for (const name of names) {
        if (name.length === 0 || name.length > exports.SELECTOR_USAGE_LIMITS.nameCharsMax) {
            throw new Error('Selector name length is out of range');
        }
    }
    return names;
}
function selectorId(input) {
    const value = (0, boundary_1.text)(input);
    if (!/^[^|]+\|\d+\|\d+\|\d+$/.test(value)) {
        throw new Error('Invalid selector id');
    }
    return value;
}
function parseResult(input, parse) {
    const value = (0, boundary_1.record)(input);
    if (value['ok'] === true) {
        return (0, result_1.ok)(parse(value['value']));
    }
    if (value['ok'] === false) {
        return (0, result_1.err)((0, boundary_1.object)({ code: boundary_1.text, message: boundary_1.text })(value['error']));
    }
    throw new Error('Expected a result');
}
