import { type ValidProjection } from './planSupport';
import type { StructuralPath } from '../page/ref';
import type { ProjectedNode } from '../page/sourceProjection';
import { type ByteSpan, type ByteString } from '../core/span';
export interface LoopParameter {
    readonly name: string;
    readonly span: ByteSpan;
}
export interface LoopHead {
    /** The expression the loop maps over: `items` in `{items.map((item) => (`. */
    readonly data: ByteSpan;
    readonly parameters: readonly LoopParameter[];
    /** A statement body's code (`=> { const x = …; return (`), up to the markup. */
    readonly body: ByteSpan | undefined;
}
/** A replacement the planner splices: absolute byte span, new text. */
export interface SourceReplacement {
    readonly span: ByteSpan;
    readonly text: string;
}
/** What a dropped binding becomes (src/editor/loopBindings.ts, UNBOUND_TEXT). */
export declare const UNBOUND_TEXT = "content";
/** The head of a `map` node, or undefined when it is not the form above. */
export declare function loopHead(projection: ValidProjection, bytes: ByteString, node: ProjectedNode): LoopHead | undefined;
/** The loop variables in scope at a node: every enclosing loop's parameters.
 * Undefined when an enclosing loop's head cannot be read. */
export declare function scopeAt(projection: ValidProjection, bytes: ByteString, path: StructuralPath): readonly string[] | undefined;
/** Every place a rename of the loop's parameter `from` must touch: the
 * declaration, then each reference below the loop, skipping loops that
 * declare the name again (they shadow it). The model rule is renamedLoopVar. */
export declare function renameSites(projection: ValidProjection, bytes: ByteString, loop: ProjectedNode, from: string): readonly ByteSpan[] | undefined;
/** The edits that keep a subtree valid once it leaves the loops declaring
 * `lost`: the byte form of strippedBindings. Undefined when a reading of a
 * lost name sits somewhere this cannot rewrite (a statement body, a head or a
 * test it cannot delimit). */
export declare function stripEdits(projection: ValidProjection, bytes: ByteString, root: ProjectedNode, lost: readonly string[]): readonly SourceReplacement[] | undefined;
