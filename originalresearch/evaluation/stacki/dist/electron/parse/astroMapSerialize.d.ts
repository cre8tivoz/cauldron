import type { MapNode, ParserNode } from './astroParserTypes';
export declare function serializeMapCallback(node: MapNode, render: (child: ParserNode, index: number) => string): string;
