import type { Splice } from './planner';
import type { Projection } from '../page/sourceProjection';
import { type ByteSpan, type ByteString } from '../core/span';
/** The projection of `bytes` with `splice` applied, or undefined when the
 * splice is not a value edit this module can prove structure-neutral — the
 * caller then reparses. `projection` must describe `bytes`. */
export declare function projectValueSplice(projection: Projection, bytes: ByteString, splice: Splice): Projection | undefined;
/** Where a value's host sits, which decides the bytes it may hold. */
export type HostContext = 'markup' | 'expression' | 'refused';
/** Bytes that are inert inside a quoted value in `context` (see the header):
 * printable ASCII except quotes, backtick, backslash, angle brackets and
 * braces, and any byte of a multi-byte UTF-8 sequence; inside an expression,
 * also none of `( ) [ ] ? : & ; / *`. */
export declare function valueBytesNeutral(bytes: ByteString, context: Exclude<HostContext, 'refused'>): boolean;
/** The context of the host of the one string value at exactly `range`:
 * `refused` when no string value is there, or when an ancestor is neither
 * markup nor a condition or loop. */
export declare function hostContext(projection: Projection, range: ByteSpan): HostContext;
