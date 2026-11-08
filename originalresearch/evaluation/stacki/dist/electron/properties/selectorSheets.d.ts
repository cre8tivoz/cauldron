import postcss from 'postcss';
import { type SelectorScope } from '../../shared/properties/selectorUsage';
export interface StyleRegion {
    readonly rel: string;
    /** 0 for a stylesheet file; the block's position among the file's `<style>` blocks otherwise. */
    readonly block: number;
    /** UTF-16 offset of the region's first character in its file. */
    readonly start: number;
    readonly text: string;
    readonly scope: SelectorScope;
    /** 1-based line of the region's first character in its file. */
    readonly line: number;
}
/** What an `.astro` file contributes: its style regions and the text that can mention names. */
export interface AstroSheet {
    readonly rel: string;
    /** The file as read; the regions' offsets index it. */
    readonly source: string;
    readonly regions: readonly StyleRegion[];
    /** The file with its readable style blocks blanked: everything that can name a class. */
    readonly ownText: string;
    /** `ownText` with static `class="…"` values blanked as well: what can reach another file's elements. */
    readonly foreignText: string;
    /** The template computes a class or spreads attributes, so its classes are not all written down. */
    readonly dynamicClass: boolean;
    /** Why the file's own style blocks could not be read, when they could not. */
    readonly unreadable: string | undefined;
}
export interface RuleSelector {
    readonly region: StyleRegion;
    /** The rule's offsets in the region text: [ruleStart, ruleEnd). */
    readonly ruleStart: number;
    readonly ruleEnd: number;
    /** Position in the rule's selector list. */
    readonly index: number;
    /** Selectors in the rule's list. */
    readonly listCount: number;
    readonly text: string;
    /** Class and id names the selector requires at its top level. */
    readonly names: readonly string[];
    /** 1-based line in the file. */
    readonly line: number;
    /** Why this selector can never be removed, when it cannot. */
    readonly fixed: string | undefined;
    /** The at-rules and rules around this one, outermost first, for postconditions. */
    readonly context: string;
}
export type RegionRules = {
    readonly kind: 'rules';
    readonly selectors: readonly RuleSelector[];
} | {
    readonly kind: 'unreadable';
    readonly reason: string;
};
export declare function cssFileRegion(rel: string, text: string): StyleRegion;
export declare function readAstroSheet(rel: string, source: string): AstroSheet;
/** Every selector of every rule in a region, or why the region cannot be read. */
export declare function readRegionRules(region: StyleRegion): RegionRules;
export declare const CSS_REPAIR_LIMITS: {
    /** Missing semicolons one stylesheet region may be read past. */
    readonly repairsMax: 256;
};
/** A parsed region, and the map from the parse's offsets back to the region's own. */
export interface ParsedCss {
    readonly root: postcss.Root;
    readonly original: (offset: number) => number;
}
export declare function parseCss(text: string): ParsedCss;
/** Context strings of every selector in a region, the shape a cleanup must preserve. */
export declare function selectorShapes(region: StyleRegion): readonly string[] | undefined;
export declare function shapeOf(selector: RuleSelector): string;
export declare const TEMPLATE_SCAN_LIMITS: {
    /** Characters scanned past one tag's `<` looking for its `>`. */
    readonly tagCharsMax: number;
};
