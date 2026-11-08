#!/usr/bin/env node
export declare function sourceFiles(directory: string): readonly string[];
/** Node mutations and prop-index writes in one file's text. */
export declare function countTreeEdits(text: string): {
    readonly mutations: number;
    readonly propIndexWrites: number;
};
/** Wrapper call sites in one file's text, definitions excluded. */
export declare function countWrapperCalls(text: string): {
    readonly mutateModelCalls: number;
    readonly applyEditCalls: number;
};
/** Whole-file write sites in one file's text: the `replace-source` operation
 * named, or a `replaceSource(` call. */
export declare function countWholeFileWrites(text: string): number;
