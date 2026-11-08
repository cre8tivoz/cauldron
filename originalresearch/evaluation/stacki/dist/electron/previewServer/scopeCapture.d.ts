export declare const SCOPE_CAPTURE_LIMITS: {
    readonly bindingsMax: 64;
    readonly frontmatterCharsMax: 200000;
    readonly patternDepthMax: 16;
};
/**
 * The names `frontmatter` binds at its top level and that hold values: its
 * `const`/`let`/`var` declarations (destructured names included) and its value
 * imports. Type-only names, ambient declarations, functions and classes are
 * left out: a type has no value to read, and code is not data.
 */
export declare function frontmatterBindings(frontmatter: string): readonly string[];
/**
 * The statement that files `names` under `file` when the frontmatter reaches
 * its end. One line, opened with `;` so a last statement written without one
 * cannot run into it, and wrapped in a block so its one local stays its own.
 */
export declare function scopeCaptureStatement(file: string, names: readonly string[]): string;
/**
 * `marked` (a marked .astro module, which always opens with its frontmatter
 * fence) with the capture statement as the frontmatter's last line, or
 * `marked` unchanged when its frontmatter binds nothing.
 */
export declare function withScopeCapture(marked: string, file: string): string;
