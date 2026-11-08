import type { ParserNode, BranchNode, ParseBail, ParsedTemplate } from './astroParserTypes';
export declare function makeBranch(name: 'then' | 'else', children: ParserNode[], raw: string, base: number | undefined): BranchNode;
export declare const branchIsMarkup: (kids: readonly ParserNode[] | undefined) => boolean;
export declare function exprBranch(raw: string, base?: number | undefined): ParserNode[] | undefined;
export declare const parseState: {
    lastBail: ParseBail | undefined;
    depth: number;
    nodes: number;
    conditions: number;
};
export declare function bail(nodes: ParserNode[], template: string, at: number, what: string): ParsedTemplate;
export declare function resetParseBail(): void;
export type TemplateTagResult = {
    readonly kind: 'tag';
    readonly node: ParserNode;
    readonly end: number;
} | {
    readonly kind: 'bail';
    readonly what: string;
} | {
    readonly kind: 'child-bail';
};
export declare function parseTemplateAt(node: ParserNode, base: number | undefined, from: number, to: number): ParserNode;
export interface TemplateTagOpen {
    readonly template: string;
    readonly lt: number;
    readonly base: number | undefined;
    readonly name: string;
    readonly attrs: string;
    readonly afterOpen: number;
    readonly shorthand: boolean;
    readonly kind: 'component' | 'element';
}
export declare function parseTemplateWithinBounds(nodes: readonly ParserNode[]): boolean;
