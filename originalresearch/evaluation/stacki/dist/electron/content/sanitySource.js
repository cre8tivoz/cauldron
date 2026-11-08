"use strict";
// Reading a Sanity schema's source text without running it: brackets matched
// outside strings and comments, an array split into its entries, and an object
// literal's own keys told apart from its nested objects' (sanitySchema.ts).
Object.defineProperty(exports, "__esModule", { value: true });
exports.ownString = ownString;
exports.ownBracketed = ownBracketed;
exports.ownSource = ownSource;
exports.entryObject = entryObject;
exports.entries = entries;
exports.ownKey = ownKey;
exports.closing = closing;
exports.walk = walk;
const assert_1 = require("../../shared/core/assert");
// Entries one array may hold, and characters one string value may run to.
const ENTRIES_MAX = 256;
const STRING_CHARS_MAX = 1000;
/** The string literal value of this object's own `key`, if it is one. */
function ownString(body, key) {
    const at = ownKey(body, key);
    if (at === undefined) {
        return undefined;
    }
    const start = body.slice(at).search(/\S/);
    const quote = start === -1 ? '' : body.charAt(at + start);
    if (quote !== '"' && quote !== "'" && quote !== '`') {
        return undefined;
    }
    return stringAt(body, at + start + 1, quote);
}
/** The body of this object's own `key` when its value is a bracketed literal. */
function ownBracketed(body, key, open) {
    const at = ownKey(body, key);
    if (at === undefined) {
        return undefined;
    }
    const start = body.slice(at).search(/\S/);
    if (start === -1 || body.charAt(at + start) !== open) {
        return undefined;
    }
    const close = closing(body, at + start);
    return close === undefined ? undefined : body.slice(at + start + 1, close);
}
/** The source text of this object's own `key` value, up to the next own comma. */
function ownSource(body, key) {
    const at = ownKey(body, key);
    if (at === undefined) {
        return undefined;
    }
    const rest = body.slice(at);
    return entries(rest)[0] ?? '';
}
// A string literal's text from just after its opening quote; a template with
// `${…}` is not a constant, and so not a value.
function stringAt(text, from, quote) {
    let out = '';
    for (let index = from; index < text.length && out.length <= STRING_CHARS_MAX; index++) {
        const char = text.charAt(index);
        if (char === '\\') {
            const escape = escapeAt(text, index);
            out += escape.text;
            index += escape.length - 1;
        }
        else if (char === quote) {
            return out;
        }
        else if (quote === '`' && text.startsWith('${', index)) {
            return undefined;
        }
        else {
            out += char;
        }
    }
    (0, assert_1.assert)(out.length > 0 || from <= text.length, 'A string read starts inside the text');
    return undefined;
}
// An entry's own object: the body of its first `{`, which is the entry itself
// (`{ name: … }`) or the one argument of `defineField({ name: … })`.
function entryObject(entry) {
    const open = entry.indexOf('{');
    const close = open === -1 ? undefined : closing(entry, open);
    return close === undefined ? '' : entry.slice(open + 1, close);
}
// The array's top-level entries, split at commas outside brackets and strings.
function entries(list) {
    const out = [];
    let start = 0;
    walk(list, (index, depth) => {
        if (depth === 0 && list.charAt(index) === ',') {
            out.push(list.slice(start, index));
            start = index + 1;
        }
        return out.length < ENTRIES_MAX;
    });
    out.push(list.slice(start));
    return out.filter((entry) => entry.trim() !== '');
}
// Where the value of this object's own `key:` begins, outside nested brackets.
function ownKey(body, key) {
    const pattern = new RegExp(`(?<![\\w$])${key}\\s*:`, 'y');
    let found;
    walk(body, (index, depth) => {
        pattern.lastIndex = index;
        const match = depth === 0 ? pattern.exec(body) : undefined;
        if (match) {
            found = index + match[0].length;
        }
        return found === undefined;
    });
    return found;
}
// The index of the bracket closing the one at `open`, outside strings.
function closing(text, open) {
    let found;
    walk(text.slice(open), (index, depth) => {
        if (depth === 0 && index > 0) {
            found = open + index;
        }
        return found === undefined;
    });
    (0, assert_1.assert)(found === undefined || found > open, 'A bracket closes after it opens');
    return found;
}
// Visits each character outside string literals and comments with its bracket
// depth — after an opening bracket, before a closing one — until `visit` returns
// false. An apostrophe in a comment is not a string. Template literals' `${…}`
// are skipped as string text; schemas rarely use them.
function walk(text, visit) {
    let depth = 0;
    let quote;
    for (let index = 0; index < text.length; index++) {
        const char = text.charAt(index);
        if (quote !== undefined) {
            if (char === '\\') {
                index += 1;
            }
            else if (char === quote) {
                quote = undefined;
            }
            continue;
        }
        const comment = commentEnd(text, index);
        if (comment !== undefined) {
            index = comment;
            continue;
        }
        if (char === '"' || char === "'" || char === '`') {
            quote = char;
            continue;
        }
        if (char === '}' || char === ']' || char === ')') {
            depth -= 1;
        }
        if (!visit(index, depth)) {
            return;
        }
        if (char === '{' || char === '[' || char === '(') {
            depth += 1;
        }
    }
}
// The last index of a comment starting at `index`, if one does.
function commentEnd(text, index) {
    if (text.startsWith('//', index)) {
        const end = text.indexOf('\n', index);
        return end === -1 ? text.length : end;
    }
    if (text.startsWith('/*', index)) {
        const end = text.indexOf('*/', index + 2);
        return end === -1 ? text.length : end + 1;
    }
    return undefined;
}
// A string escape at `index` (its backslash) as the text it stands for, and its
// length in the source: `\u2192` is an arrow, not "u2192".
function escapeAt(text, index) {
    const unicode = /^\\u(?:\{([0-9a-fA-F]{1,6})\}|([0-9a-fA-F]{4}))/.exec(text.slice(index, index + 10));
    const hex = /^\\x([0-9a-fA-F]{2})/.exec(text.slice(index, index + 4));
    if (unicode) {
        const code = parseInt(unicode[1] ?? unicode[2] ?? '', 16);
        if (code <= 0x10ffff) {
            return { text: String.fromCodePoint(code), length: unicode[0].length };
        }
    }
    if (hex) {
        return { text: String.fromCharCode(parseInt(hex[1] ?? '0', 16)), length: hex[0].length };
    }
    const next = text.charAt(index + 1);
    const named = { n: '\n', t: '\t', r: '\r' };
    (0, assert_1.assert)(next.length <= 1, 'An escape names one character');
    return { text: named[next] ?? next, length: 2 };
}
