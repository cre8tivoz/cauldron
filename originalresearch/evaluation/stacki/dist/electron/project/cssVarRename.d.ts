export declare const RENAME_EXTS: RegExp;
/**
 * Every file in the project that could spell a variable's name.
 *
 * The panel READS variables from `src`, `public` and `styles` — that is where a
 * project keeps its stylesheets. References are not so tidy: a `style` attribute
 * in a layout, a `--x` in a Tailwind or Astro config at the root, a themed
 * string in a helper module. So this walks the project rather than those three
 * roots, and skips only what is not the project's own text (dependencies, build
 * output, version control, caches).
 *
 * Broad on purpose. A missed reference is a variable that silently stops
 * resolving somewhere the panel cannot see, which is the failure that has no
 * symptom until someone looks at the page.
 */
export declare function findRenameTargets(projectPath: string): string[];
/** A custom property name, as a name and not as a prefix of a longer one. */
export declare const NAME_RE: RegExp;
export declare const EDGE = "[-\\w\\u00a0-\\uffff]";
export interface Rename {
    readonly from: string;
    readonly to: string;
}
/**
 * Renames custom properties across the project — declarations and references
 * alike, in one pass.
 *
 * `renames` is [{ from, to }]. Everything is checked before anything is written:
 * a rename that would land on a name already in use, or that is not a name at
 * all, takes the whole batch down rather than leaving a group half renamed.
 */
export declare function renameVariables(projectPath: string, { renames }: {
    readonly renames?: readonly Rename[];
}): {
    ok: boolean;
    files?: number;
    occurrences?: number;
    error?: string;
};
export declare function renameBatchProblem(list: readonly Rename[]): string | undefined;
export declare function renameTakenProblem(projectPath: string, list: readonly Rename[]): string | undefined;
