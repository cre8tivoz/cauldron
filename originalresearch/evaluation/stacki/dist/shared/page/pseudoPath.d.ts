/** A pseudo-element the navigator shows as a layer. */
export type PseudoLayer = 'before' | 'after';
/** The canvas path of `pseudo` on the node at `nodePath`. */
export declare function pseudoPath(nodePath: string, pseudo: PseudoLayer): string;
/** The node and pseudo-element a pseudo path names, or undefined for a node's own path. */
export declare function splitPseudoPath(path: string): {
    readonly nodePath: string;
    readonly pseudo: PseudoLayer;
} | undefined;
