export interface TreeInvariantNode {
    readonly id?: string;
    readonly kind: string;
    readonly children?: readonly TreeInvariantNode[] | undefined;
}
/** Check the producer's own tree without cloning it or claiming it has already
 * crossed the wire parser. Iteration makes the depth limit independent of the
 * JavaScript call stack. The receiver checks the same invariant after parsing. */
export declare function assertTreeInvariants(nodes: readonly TreeInvariantNode[]): void;
