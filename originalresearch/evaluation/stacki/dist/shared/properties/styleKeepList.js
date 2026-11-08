"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_KEEP_LIST = exports.STYLE_KEEP_LIMITS = void 0;
exports.parseStyleKeepList = parseStyleKeepList;
exports.serializeStyleKeepList = serializeStyleKeepList;
exports.keepMatcher = keepMatcher;
// The project's `.stacki/styles.json`: class and id names the unused-selector
// cleanup must never remove. It is a tracked project setting, shared by
// Desktop, Studio and the `check-project` command, so every tool answers "may
// this go?" the same way.
const assert_1 = require("../core/assert");
const boundary_1 = require("../core/boundary");
exports.STYLE_KEEP_LIMITS = {
    /** Patterns in one keep list. A design system's state classes fit in dozens. */
    patternsMax: 1_000,
    /** Characters in one pattern: a class name with room for a wildcard. */
    patternCharsMax: 128,
};
exports.EMPTY_KEEP_LIST = { version: 1, keep: [] };
// A pattern is a selector name as it appears unescaped in markup. Whitespace,
// quotes and commas would let one entry silently mean several names.
const PATTERN = /^[^\s"'`,{}<>]+$/;
function parseStyleKeepList(input) {
    const value = (0, boundary_1.record)(input);
    if (value['version'] !== 1) {
        throw new Error('Unsupported styles settings version');
    }
    const keep = value['keep'] === undefined ? [] : (0, boundary_1.list)(keepPattern)(value['keep']);
    if (keep.length > exports.STYLE_KEEP_LIMITS.patternsMax) {
        throw new Error(`Keep list exceeds ${exports.STYLE_KEEP_LIMITS.patternsMax} patterns`);
    }
    // An earlier version also stored `trustedScripts`; scripts no longer affect
    // the check, so a file that still has the key reads the same and loses it on
    // its next save.
    return { version: 1, keep };
}
/** The keep list as JSON text, in the stable shape a diff reviews easily. */
function serializeStyleKeepList(keepList) {
    const keep = [...new Set(keepList.keep)].sort();
    const source = JSON.stringify({ version: 1, keep }, undefined, 2) + '\n';
    // Pair assertion: what is written must read back as the same list.
    const written = JSON.parse(source);
    const reread = parseStyleKeepList(written);
    (0, assert_1.assert)(reread.keep.length === keep.length, 'serializeStyleKeepList: keep patterns round-trip');
    return source;
}
/** A matcher for the keep list's patterns; exact names are a set lookup. */
function keepMatcher(keepList) {
    const exact = new Set();
    const wildcards = [];
    for (const pattern of keepList.keep) {
        if (pattern.includes('*')) {
            const body = pattern
                .split('*')
                .map((part) => part.replace(/[\\^$.+?()[\]{}|/]/g, '\\$&'))
                .join('.*');
            wildcards.push(new RegExp(`^${body}$`));
        }
        else {
            exact.add(pattern);
        }
    }
    (0, assert_1.assert)(exact.size + wildcards.length <= exports.STYLE_KEEP_LIMITS.patternsMax, 'keepMatcher: the parser bounds patterns');
    return (name) => {
        if (exact.has(name)) {
            return true;
        }
        return wildcards.some((wildcard) => wildcard.test(name));
    };
}
function keepPattern(input) {
    const value = (0, boundary_1.text)(input);
    if (value.length === 0 || value.length > exports.STYLE_KEEP_LIMITS.patternCharsMax) {
        throw new Error(`Keep patterns must be 1 to ${exports.STYLE_KEEP_LIMITS.patternCharsMax} characters`);
    }
    if (!PATTERN.test(value)) {
        throw new Error(`Keep pattern "${value}" contains whitespace, quotes or commas`);
    }
    if (value.replaceAll('*', '').length === 0) {
        throw new Error('A keep pattern must name more than a wildcard');
    }
    return value;
}
