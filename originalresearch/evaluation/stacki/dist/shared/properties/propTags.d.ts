/** Every tag a prop's doc can state; undefined is "not stated". */
export interface PropTags {
    readonly tooltip: string;
    readonly min: number | undefined;
    readonly max: number | undefined;
    readonly step: number | undefined;
    readonly decimals: number | undefined;
    readonly integer: boolean;
    readonly onLabel: string | undefined;
    readonly offLabel: string | undefined;
    readonly format: string | undefined;
    readonly group: string | undefined;
    readonly deprecated: string | undefined;
}
export declare const PROP_TAG_LIMITS: {
    readonly docCharsMax: number;
    readonly decimalsMax: 10;
    readonly labelCharsMax: 40;
    readonly groupCharsMax: 80;
};
/** The tags a doc comment states; tags that are not valid are absent. */
export declare function readPropTags(documentation: string | undefined): PropTags;
/**
 * The step a number field moves by, from the tags: an explicit `@step`, else
 * the precision `@decimals` states (2 is 0.01), else 1 for `@int`.
 */
export declare function tagStep(tags: Pick<PropTags, 'step' | 'decimals' | 'integer'>): number | undefined;
/** A doc's `@deprecated` text, spaces collapsed ('' for the bare tag); undefined when it has no such tag. */
export declare function deprecationOf(documentation: string | undefined): string | undefined;
/** The doc as a reader sees it: the setting tags taken out, every other word kept. */
export declare function withoutSettingTags(documentation: string): string;
