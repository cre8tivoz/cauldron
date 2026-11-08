import type { ByteString } from '../core/span';
/** The prefix every line of the node starting at `offset` carries after its
 * first: the bytes before it on its line, with each list marker there turned
 * into as many spaces (an item's lines are indented to its content, not
 * marked again). Undefined when those bytes are not container syntax alone —
 * then the node does not begin its line's content, and has no Markdown
 * prefix. */
export declare function markdownPrefix(bytes: ByteString, offset: number): string | undefined;
/** The visible part of a prefix, which a blank line inside the container
 * carries: a quote's `>`, nothing for an item's indentation. */
export declare function blankLinePrefix(prefix: string): string;
