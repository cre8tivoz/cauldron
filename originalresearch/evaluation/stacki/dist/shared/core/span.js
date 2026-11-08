"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toByteSpan = toByteSpan;
exports.toUtf16Span = toUtf16Span;
exports.parseByteSpan = parseByteSpan;
exports.parseUtf16Span = parseUtf16Span;
exports.spanContains = spanContains;
exports.spansAscending = spansAscending;
exports.utf16ToByteOffsets = utf16ToByteOffsets;
exports.utf8ByteLength = utf8ByteLength;
exports.toByteString = toByteString;
exports.encodeUtf8 = encodeUtf8;
exports.decodeUtf8 = decodeUtf8;
exports.byteStringsEqual = byteStringsEqual;
// Offsets, spans and exact bytes (plan §3.2). The parser reports positions in
// UTF-16 code units, because that is how JavaScript indexes a string; splices,
// witnesses and anchors address the file's UTF-8 bytes, because the file is
// bytes. The two are different types, and utf16ToByteOffsets is the only place
// one becomes the other — mixing them anywhere else is a compile error.
const assert_1 = require("./assert");
const brand_1 = require("./brand");
const limits_1 = require("./limits");
const record_1 = require("./record");
const result_1 = require("./result");
function toByteSpan(start, end) {
    const span = { start: (0, brand_1.toByteOffset)(start), end: (0, brand_1.toByteOffset)(end) };
    if (span.end < span.start) {
        throw new Error('ByteSpan: end must not precede start');
    }
    return span;
}
function toUtf16Span(start, end) {
    const span = { start: (0, brand_1.toUtf16Offset)(start), end: (0, brand_1.toUtf16Offset)(end) };
    if (span.end < span.start) {
        throw new Error('Utf16Span: end must not precede start');
    }
    return span;
}
/** Wire parser for a byte span: safe integers, ordered, inside the file bound. */
function parseByteSpan(input, where) {
    const record = (0, record_1.toRecord)(input);
    if (record === undefined) {
        throw new Error(`${where}: expected span object`);
    }
    const start = record['start'];
    const end = record['end'];
    if (typeof start !== 'number') {
        throw new Error(`${where}.start: expected number`);
    }
    if (typeof end !== 'number') {
        throw new Error(`${where}.end: expected number`);
    }
    if (end > limits_1.LIMITS.sourceBytesMax) {
        throw new Error(`${where}.end: exceeds ${limits_1.LIMITS.sourceBytesMax} bytes`);
    }
    return toByteSpan(start, end);
}
/** Wire parser for a UTF-16 span, bounded by the longest string IPC carries. */
function parseUtf16Span(input, where) {
    const record = (0, record_1.toRecord)(input);
    if (record === undefined) {
        throw new Error(`${where}: expected span object`);
    }
    const start = record['start'];
    const end = record['end'];
    if (typeof start !== 'number') {
        throw new Error(`${where}.start: expected number`);
    }
    if (typeof end !== 'number') {
        throw new Error(`${where}.end: expected number`);
    }
    if (end > limits_1.LIMITS.ipcFieldCharsMax) {
        throw new Error(`${where}.end: exceeds ${limits_1.LIMITS.ipcFieldCharsMax} chars`);
    }
    return toUtf16Span(start, end);
}
/** Whether `inner` lies entirely inside `outer` (both ends inclusive). */
function spanContains(outer, inner) {
    if (outer.start <= inner.start) {
        return inner.end <= outer.end;
    }
    return false;
}
/** Whether spans are sorted by start and pairwise disjoint (touching is fine). */
function spansAscending(spans) {
    for (let index = 1; index < spans.length; index++) {
        const previous = spans[index - 1];
        const current = spans[index];
        (0, assert_1.assert)(previous !== undefined, 'Previous span exists inside the bounds');
        (0, assert_1.assert)(current !== undefined, 'Current span exists inside the bounds');
        if (previous.end <= current.start) {
            continue;
        }
        return false;
    }
    return true;
}
/** The byte offsets of ascending UTF-16 offsets into `text`, in one pass.
 *
 * This is the single conversion between the two coordinate systems. It counts
 * UTF-8 bytes per code point instead of encoding prefixes, so converting every
 * span of a projection is linear in the file, not quadratic. A lone surrogate
 * counts as the three bytes of U+FFFD, which is what TextEncoder writes for it;
 * an offset that splits a surrogate pair names no byte and is a caller bug. */
function utf16ToByteOffsets(text, offsets) {
    (0, assert_1.assert)(text.length <= limits_1.LIMITS.ipcFieldCharsMax, 'Converted text is inside the source bound');
    const result = [];
    let bytes = 0;
    let unit = 0;
    for (const offset of offsets) {
        (0, assert_1.assert)(offset <= text.length, 'UTF-16 offset lies inside the text');
        const previous = result.length === 0 ? undefined : offsets[result.length - 1];
        if (previous !== undefined) {
            (0, assert_1.assert)(previous <= offset, 'UTF-16 offsets are converted in ascending order');
        }
        // The hot loop of every projection: one branch per unit, no call for the
        // one- and two-byte cases. A pair that straddles the offset walks one unit
        // past it, which the assertion after the loop reports.
        while (unit < offset) {
            const code = text.charCodeAt(unit);
            if (code < 0x800) {
                bytes += code < 0x80 ? 1 : 2;
                unit += 1;
            }
            else {
                const width = utf16PointUnits(text, unit);
                bytes += width === 2 ? 4 : utf8UnitBytes(code);
                unit += width;
            }
        }
        (0, assert_1.assert)(unit <= offset, 'UTF-16 offset does not split a surrogate pair');
        (0, assert_1.assert)(unit === offset, 'Conversion walked exactly to the requested offset');
        result.push((0, brand_1.toByteOffset)(bytes));
    }
    return result;
}
/** UTF-8 length of `text`: the byte offset of its end. */
function utf8ByteLength(text) {
    const [end] = utf16ToByteOffsets(text, [(0, brand_1.toUtf16Offset)(text.length)]);
    (0, assert_1.assert)(end !== undefined, 'Conversion returns one offset per input');
    return end;
}
/** A private copy of `bytes`, refused past the source-file bound. Always a
 * plain Uint8Array: `slice` on a Node Buffer returns a view, not a copy, so a
 * byte string built with it from `fs.readFileSync` would alias the caller's
 * buffer (found by the step-3 spike). */
function toByteString(bytes) {
    if (bytes.length > limits_1.LIMITS.sourceBytesMax) {
        throw new Error(`ByteString: exceeds ${limits_1.LIMITS.sourceBytesMax} bytes`);
    }
    const copy = new Uint8Array(bytes);
    (0, assert_1.assert)(copy.length === bytes.length, 'Copied bytes keep their length');
    (0, assert_1.assert)(copy.buffer !== bytes.buffer, 'A byte string shares no memory with its input');
    return copy;
}
function encodeUtf8(text) {
    return toByteString(new TextEncoder().encode(text));
}
/** Strict decoding (plan §3.2): invalid UTF-8 is a typed error, never a lossy
 * replacement character. A leading byte-order mark is kept in the text so
 * offsets index the file as read; the parser reads past it. */
function decodeUtf8(bytes) {
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    try {
        return (0, result_1.ok)(decoder.decode(bytes));
    }
    catch (error) {
        return (0, result_1.err)({ code: 'invalid-utf8', message: String(error) });
    }
}
/** Byte equality. A plain loop, 32 bits at a time where both strings start on
 * a word boundary (toByteString copies into a fresh buffer, so they do): the
 * step-3 spike found `every` with a closure at ~200 ms per 10 MB, most of the
 * identity fast path's cost. */
function byteStringsEqual(left, right) {
    if (left.length === right.length) {
        return sameLengthBytesEqual(left, right);
    }
    return false;
}
function sameLengthBytesEqual(left, right) {
    (0, assert_1.assert)(left.length === right.length, 'Compared bytes have one length');
    (0, assert_1.assert)(left.length <= limits_1.LIMITS.sourceBytesMax, 'Compared bytes are inside the file bound');
    let index = 0;
    if (left.byteOffset % 4 === 0) {
        if (right.byteOffset % 4 === 0) {
            const words = Math.floor(left.length / 4);
            const leftWords = new Uint32Array(left.buffer, left.byteOffset, words);
            const rightWords = new Uint32Array(right.buffer, right.byteOffset, words);
            for (let word = 0; word < words; word++) {
                if (leftWords[word] !== rightWords[word]) {
                    return false;
                }
            }
            index = words * 4;
        }
    }
    for (; index < left.length; index++) {
        if (left[index] !== right[index]) {
            return false;
        }
    }
    return true;
}
/** Code units of the code point at `unit`: 2 for a surrogate pair, else 1. */
function utf16PointUnits(text, unit) {
    const code = text.charCodeAt(unit);
    if (code >= 0xd800) {
        if (code <= 0xdbff) {
            const next = text.charCodeAt(unit + 1);
            if (next >= 0xdc00) {
                return next <= 0xdfff ? 2 : 1;
            }
        }
    }
    return 1;
}
function utf8UnitBytes(code) {
    if (code < 0x80) {
        return 1;
    }
    if (code < 0x800) {
        return 2;
    }
    return 3;
}
