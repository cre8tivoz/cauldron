"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MENTION_LIMITS = void 0;
exports.mentionInterest = mentionInterest;
exports.emptyHits = emptyHits;
exports.scanMentions = scanMentions;
exports.mergeHits = mergeHits;
exports.assembledPiece = assembledPiece;
exports.asksAbout = asksAbout;
exports.remainingInterest = remainingInterest;
exports.interestIsEmpty = interestIsEmpty;
// Whether any text could produce a class or id name. A name counts as
// mentioned when it appears as a whole word: between characters that cannot be
// part of a class name. It also counts when code assembles it: a piece ending
// in a separator right before `${` or a closing quote (`btn-${size}`,
// 'btn-' + size), or a piece starting with one right after `}` or an opening
// quote (`${base}--active`). Matching is deliberately loose in that direction:
// a stray word in a README protects a rule, which costs a leftover; missing a
// real use breaks a page.
//
// Scanning is one pass over each text with a token regex and set lookups, so
// its cost grows with the bytes read, not with how many names are asked about.
const assert_1 = require("../../shared/core/assert");
exports.MENTION_LIMITS = {
    /** Distinct names one scan asks about. Bounded by the report's entries. */
    namesMax: 100_000,
    /** Separator runs one name is split at for its pieces. */
    piecesPerNameMax: 16,
};
const WORD_ONLY = /^[A-Za-z0-9_-]+$/;
const SEPARATORS = /[-_]+/g;
function mentionInterest(names) {
    const words = new Set();
    const odd = [];
    const heads = new Set();
    const bareHeads = new Set();
    const tails = new Set();
    for (const name of names) {
        (0, assert_1.assert)(name.length > 0, 'mentionInterest: names are non-empty');
        if (!WORD_ONLY.test(name)) {
            odd.push(name);
            continue;
        }
        words.add(name);
        for (const piece of namePieces(name)) {
            heads.add(piece.head);
            bareHeads.add(piece.bareHead);
            tails.add(piece.tail);
        }
    }
    (0, assert_1.assert)(words.size + odd.length <= exports.MENTION_LIMITS.namesMax, 'mentionInterest: the report bounds names');
    return { words, odd, heads, bareHeads, tails };
}
function emptyHits() {
    return { words: new Set(), heads: new Set(), tails: new Set() };
}
const indexes = new WeakMap();
const TOKEN_CHARS_MAX = 256;
function indexOf(interest) {
    const existing = indexes.get(interest);
    if (existing !== undefined) {
        return existing;
    }
    const all = new Set([...interest.words, ...interest.heads, ...interest.bareHeads, ...interest.tails]);
    const lengths = new Uint8Array(TOKEN_CHARS_MAX + 1);
    for (const token of all) {
        if (token.length <= TOKEN_CHARS_MAX) {
            lengths[token.length] = 1;
        }
    }
    const index = { all, lengths };
    indexes.set(interest, index);
    return index;
}
/** Add what `text` mentions to `hits`. Bare heads are recorded as heads. */
function scanMentions(text, interest, hits) {
    const { all, lengths } = indexOf(interest);
    const length = text.length;
    let start = 0;
    // One pass over the characters: a token is a maximal run of word characters.
    while (start < length) {
        if (!isWordCode(text.charCodeAt(start))) {
            start += 1;
            continue;
        }
        let end = start + 1;
        while (end < length && isWordCode(text.charCodeAt(end))) {
            end += 1;
        }
        const size = end - start;
        if (size <= TOKEN_CHARS_MAX && lengths[size] === 1) {
            const token = text.slice(start, end);
            if (all.has(token)) {
                recordToken(text, token, start, end, interest, hits);
            }
        }
        start = end;
    }
    for (const name of interest.odd) {
        if (!hits.words.has(name)) {
            if (containsWord(text, name)) {
                hits.words.add(name);
            }
        }
    }
}
function recordToken(text, token, start, end, interest, hits) {
    if (interest.words.has(token)) {
        hits.words.add(token);
    }
    if (interest.heads.has(token)) {
        if (isQuote(text.charCodeAt(end)) || text.startsWith('${', end)) {
            hits.heads.add(token);
        }
    }
    if (interest.bareHeads.has(token)) {
        if (isQuote(text.charCodeAt(end)) && /^\s*\+/.test(text.slice(end + 1, end + 64))) {
            hits.heads.add(token);
        }
    }
    if (interest.tails.has(token)) {
        const before = text.charCodeAt(start - 1);
        if (before === 0x7d || isQuote(before)) {
            hits.tails.add(token);
        }
    }
}
function mergeHits(target, source) {
    for (const word of source.words) {
        target.words.add(word);
    }
    for (const head of source.heads) {
        target.heads.add(head);
    }
    for (const tail of source.tails) {
        target.tails.add(tail);
    }
}
/** The assembled piece that protects `name` in `hits`, if one does. */
function assembledPiece(name, hits) {
    if (!WORD_ONLY.test(name)) {
        return undefined;
    }
    for (const piece of namePieces(name)) {
        if (hits.heads.has(piece.head)) {
            return `${piece.head}…`;
        }
        if (hits.heads.has(piece.bareHead)) {
            return `${piece.bareHead} + …`;
        }
        if (hits.tails.has(piece.tail)) {
            return `…${piece.tail}`;
        }
    }
    return undefined;
}
/** Whether `interest` still asks about `name` or any piece it could be built from. */
function asksAbout(interest, name) {
    if (interest.words.has(name) || interest.odd.includes(name)) {
        return true;
    }
    if (!WORD_ONLY.test(name)) {
        return false;
    }
    return namePieces(name).some((piece) => interest.heads.has(piece.head) || interest.bareHeads.has(piece.bareHead) || interest.tails.has(piece.tail));
}
/** The interest left after `hits`: what a further scan still has to find. */
function remainingInterest(interest, hits) {
    const words = new Set([...interest.words].filter((word) => !hits.words.has(word)));
    const odd = interest.odd.filter((name) => !hits.words.has(name));
    return {
        words,
        odd,
        heads: new Set([...interest.heads].filter((head) => !hits.heads.has(head))),
        bareHeads: new Set([...interest.bareHeads].filter((head) => !hits.heads.has(head))),
        tails: new Set([...interest.tails].filter((tail) => !hits.tails.has(tail))),
    };
}
function interestIsEmpty(interest) {
    return interest.words.size === 0 && interest.odd.length === 0 && interest.heads.size === 0 && interest.bareHeads.size === 0 && interest.tails.size === 0;
}
/** Every split of `name` at a separator run: `btn-large` → btn- / btn / -large. */
function namePieces(name) {
    const pieces = [];
    SEPARATORS.lastIndex = 0;
    for (let match = SEPARATORS.exec(name); match !== null; match = SEPARATORS.exec(name)) {
        if (pieces.length >= exports.MENTION_LIMITS.piecesPerNameMax) {
            break;
        }
        const start = match.index;
        const end = start + match[0].length;
        // A separator at either end leaves one side empty: no piece to build from.
        if (start > 0) {
            if (end < name.length) {
                pieces.push({ head: name.slice(0, end), bareHead: name.slice(0, start), tail: name.slice(start) });
            }
        }
    }
    return pieces;
}
function containsWord(text, name) {
    for (let index = text.indexOf(name); index !== -1; index = text.indexOf(name, index + 1)) {
        if (!isWordCode(text.charCodeAt(index - 1))) {
            if (!isWordCode(text.charCodeAt(index + name.length))) {
                return true;
            }
        }
    }
    return false;
}
function isWordCode(code) {
    if (code >= 0x30 && code <= 0x39) {
        return true;
    }
    if (code >= 0x41 && code <= 0x5a) {
        return true;
    }
    if (code >= 0x61 && code <= 0x7a) {
        return true;
    }
    return code === 0x2d || code === 0x5f;
}
function isQuote(code) {
    return code === 0x22 || code === 0x27 || code === 0x60;
}
