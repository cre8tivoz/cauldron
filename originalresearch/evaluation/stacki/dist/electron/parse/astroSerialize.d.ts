import type { ParserNode, MapNode } from './astroParserTypes';
export declare function isInlineRun(nodes: readonly ParserNode[], depth: number): boolean;
export declare function tagInlineRun(nodes: readonly ParserNode[], path: string, { atRoot, depth }: {
    readonly atRoot: boolean;
    readonly depth: number;
}): ParserNode[];
export declare function serializeNode(node: ParserNode, indent: string, lines: string[], depth: number): void;
export declare function serializeNodes(input: readonly unknown[]): string;
export declare function loopBodyWrapper(node: Pick<MapNode, 'children' | 'fragment'>): '<>' | 'Fragment' | undefined;
