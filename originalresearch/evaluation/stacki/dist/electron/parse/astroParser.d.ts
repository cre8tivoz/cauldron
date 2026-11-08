import type { ParsedPage, SourceLocation } from './astroParserTypes';
import { parseAttrs, serializeAttrs } from './astroAttrs';
import { serializeNodes } from './astroSerialize';
import { parseTemplate } from './astroTemplate';
import { resolveChunks, markChunkHtml } from './astroChunks';
import { parsePropSchema } from './astroPropSchema';
import { parseSlots, rootTag, defaultSlotInline, parseExtendsTag } from './astroComponentApi';
import type { PreviewStamp } from '../../shared/page/previewToken';
export { parsePage, locateSelection, serializePage, serializePageMarked, parseTemplate, serializeNodes, resolveChunks, markChunkHtml, parsePropSchema, parseExtendsTag, parseSlots, defaultSlotInline, rootTag, parseAttrs, serializeAttrs, };
declare function parsePage(source: string, options?: {
    readonly locs?: boolean;
}): ParsedPage;
declare function serializePage(input: unknown): string;
declare function serializePageMarked(input: unknown, prefix?: string, stamp?: PreviewStamp | undefined): string;
declare function locateSelection(absPath: string, indexPath: string): SourceLocation | undefined;
