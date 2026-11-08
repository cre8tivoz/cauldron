/** The characters an entity stands for. Anything unrecognised is left alone —
 *  a name this doesn't know is still valid HTML, and rewriting it as itself is
 *  better than mangling it. */
declare function decodeEntities(text: unknown): string;
/**
 * Characters as text in a file: markup delimiters, Astro expression braces,
 * and the spaces that are invisible in a source file. Everything else
 * goes in as itself — `©` is a character the file can hold, and spelling it
 * `&copy;` in a file that says `©` everywhere else would be the editor imposing
 * its own habits.
 */
declare function encodeText(text: unknown): string;
declare function collapseText(raw: string): string;
declare function textValue(raw: string): string;
/**
 * The value a text node holds once an edited value has been written to the
 * file and read back: `encodeText` is how the serializer writes an edited
 * node, `textValue` how the parser reads it. Emitting this instead of the raw
 * characters makes the save echo identical to what was emitted, so a space
 * typed after a word survives, and three typed spaces converge on one at once
 * instead of mismatching once. The characters `encodeText` writes as entities
 * (U+00A0 among them) are kept: the parser collapses before it decodes.
 *
 * A value that is only whitespace is not a text node to the parser at all —
 * it drops the run between tags — so no value round-trips; one space is what
 * a browser renders for it, and is kept rather than doubled by the boundary
 * rule.
 */
declare function textValueCanonical(value: string): string;
export { collapseText, decodeEntities, encodeText, textValue, textValueCanonical };
