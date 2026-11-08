import { type PreviewStamp } from '../../shared/page/previewToken';
import type { ParserNode } from './astroParserTypes';
interface MarkedPlace {
    readonly path: string;
    readonly inSlot: boolean;
    readonly atRoot: boolean;
    readonly depth: number;
    readonly stamp: PreviewStamp | undefined;
}
export declare function serializeNodeMarked(node: ParserNode, indent: string, lines: string[], place: MarkedPlace): void;
export {};
