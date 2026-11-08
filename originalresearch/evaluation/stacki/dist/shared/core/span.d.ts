import { type Brand, type ByteOffset, type Utf16Offset } from './brand';
import { type Result } from './result';
/** A half-open byte range `[start, end)` in one version of a file. */
export interface ByteSpan {
    readonly start: ByteOffset;
    readonly end: ByteOffset;
}
/** A half-open range `[start, end)` in a decoded source string. */
export interface Utf16Span {
    readonly start: Utf16Offset;
    readonly end: Utf16Offset;
}
/** A file's exact bytes. Built only by toByteString, which copies its input, so
 * no caller keeps a mutable alias to bytes a snapshot or a witness relies on. */
export type ByteString = Brand<Uint8Array, 'ByteString'>;
export declare function toByteSpan(start: number, end: number): ByteSpan;
export declare function toUtf16Span(start: number, end: number): Utf16Span;
/** Wire parser for a byte span: safe integers, ordered, inside the file bound. */
export declare function parseByteSpan(input: unknown, where: string): ByteSpan;
/** Wire parser for a UTF-16 span, bounded by the longest string IPC carries. */
export declare function parseUtf16Span(input: unknown, where: string): Utf16Span;
/** Whether `inner` lies entirely inside `outer` (both ends inclusive). */
export declare function spanContains(outer: ByteSpan | Utf16Span, inner: ByteSpan | Utf16Span): boolean;
/** Whether spans are sorted by start and pairwise disjoint (touching is fine). */
export declare function spansAscending(spans: readonly (ByteSpan | Utf16Span)[]): boolean;
/** The byte offsets of ascending UTF-16 offsets into `text`, in one pass.
 *
 * This is the single conversion between the two coordinate systems. It counts
 * UTF-8 bytes per code point instead of encoding prefixes, so converting every
 * span of a projection is linear in the file, not quadratic. A lone surrogate
 * counts as the three bytes of U+FFFD, which is what TextEncoder writes for it;
 * an offset that splits a surrogate pair names no byte and is a caller bug. */
export declare function utf16ToByteOffsets(text: string, offsets: readonly Utf16Offset[]): readonly ByteOffset[];
/** UTF-8 length of `text`: the byte offset of its end. */
export declare function utf8ByteLength(text: string): number;
/** A private copy of `bytes`, refused past the source-file bound. Always a
 * plain Uint8Array: `slice` on a Node Buffer returns a view, not a copy, so a
 * byte string built with it from `fs.readFileSync` would alias the caller's
 * buffer (found by the step-3 spike). */
export declare function toByteString(bytes: Uint8Array): ByteString;
export declare function encodeUtf8(text: string): ByteString;
export type DecodeError = {
    readonly code: 'invalid-utf8';
    readonly message: string;
};
/** Strict decoding (plan §3.2): invalid UTF-8 is a typed error, never a lossy
 * replacement character. A leading byte-order mark is kept in the text so
 * offsets index the file as read; the parser reads past it. */
export declare function decodeUtf8(bytes: ByteString): Result<string, DecodeError>;
/** Byte equality. A plain loop, 32 bits at a time where both strings start on
 * a word boundary (toByteString copies into a fresh buffer, so they do): the
 * step-3 spike found `every` with a closure at ~200 ms per 10 MB, most of the
 * identity fast path's cost. */
export declare function byteStringsEqual(left: ByteString, right: ByteString): boolean;
