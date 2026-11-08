import type { RenderTag } from './astroParserTypes';
export declare function parseSlots(source: string): string[];
export declare function rootTag(source: string): RenderTag | undefined;
export declare function defaultSlotInline(source: string): boolean;
export declare function parseExtendsTag(source: string): string | undefined;
