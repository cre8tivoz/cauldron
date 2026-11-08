import type { ByteString } from '../core/span';
/** How many times `needle` occurs in `haystack`, overlapping occurrences
 * included, counted up to `countMax` and no further. */
export declare function countOccurrences(haystack: ByteString, needle: ByteString, countMax: number): number;
