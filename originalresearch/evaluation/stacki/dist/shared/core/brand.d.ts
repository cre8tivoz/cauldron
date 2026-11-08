declare const brand: unique symbol;
export type Brand<T, B> = T & {
    readonly [brand]: B;
};
/** A page-tree node id: `n<digits>` for Astro nodes, `m<digits>` for Markdown, plus the two
 * well-known ids the app itself assigns — 'layout' (the detected page wrapper)
 * and `chunk<N>` (a serialization chunk group). */
export type NodeId = Brand<string, 'NodeId'>;
/** An absolute filesystem path as it crosses a boundary. POSIX or Windows
 * separators are both valid; the brand only proves non-emptiness. */
export type FilePath = Brand<string, 'FilePath'>;
/** The project root as configured in the app. Distinct from FilePath so a
 * scan request can never be pointed at a stray file path. */
export type ProjectPath = Brand<string, 'ProjectPath'>;
/** SHA-256 of a file's exact bytes as 64 lowercase hex characters: the token that
 * names which version of a file a read returned or an edit was authored against
 * (plan §3.1). Built only by toDigest — the wire parser and the main-process hash
 * function both go through it, so an unchecked string can never pose as one. */
export type Digest = Brand<string, 'Digest'>;
export declare function toNodeId(value: string): NodeId;
export declare function toDigest(value: string): Digest;
export declare function toFilePath(value: string): FilePath;
export declare function toProjectPath(value: string): ProjectPath;
/** A position in a file's UTF-8 bytes: what splices, witnesses and anchors use
 * (plan §3.2). Distinct from Utf16Offset so the two can never be mixed; the one
 * conversion between them is utf16ToByteOffsets in shared/core/span.ts. */
export type ByteOffset = Brand<number, 'ByteOffset'>;
/** A position in a decoded source string, as JavaScript indexes it (UTF-16
 * code units): what the parser reports. */
export type Utf16Offset = Brand<number, 'Utf16Offset'>;
/** Names one submitted intent from authoring to its terminal outcome. Minted by
 * the submitting client; the pattern keeps it printable and bounded, so it can
 * appear in a log line without escaping (plan §9a). */
export type IntentId = Brand<string, 'IntentId'>;
export declare function toByteOffset(value: number): ByteOffset;
export declare function toUtf16Offset(value: number): Utf16Offset;
export declare function toIntentId(value: string): IntentId;
export {};
