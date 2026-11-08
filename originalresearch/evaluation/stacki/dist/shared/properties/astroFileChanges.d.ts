export declare const ASTRO_FILES_MAX = 20000;
export interface AstroFileChange {
    readonly kind: 'added' | 'removed';
    readonly file: string;
}
export declare function parseAstroFileChanges(input: unknown): readonly AstroFileChange[];
export declare function diffAstroFiles(previous: ReadonlySet<string>, current: ReadonlySet<string>): readonly AstroFileChange[];
export declare function astroChangeMessages(changes: readonly AstroFileChange[]): readonly string[];
