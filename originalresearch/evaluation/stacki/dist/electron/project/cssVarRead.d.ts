export declare const CSS_VARIABLE_LIMITS: {
    readonly stylesheetDepthMax: 8;
    readonly renameTargetDepthMax: 10;
    readonly resolveDepthMax: 8;
};
export declare const SKIPPED_DIRECTORIES: Set<string>;
export declare const toPosix: (filePath: string) => string;
export declare function findStylesheets(projectPath: string): string[];
export interface VarEntry {
    readonly kind: 'var';
    readonly name: string;
    readonly value: string;
    readonly important: boolean;
    readonly valueStart: number;
    readonly valueEnd: number;
    readonly line: number;
}
export interface CommentEntry {
    readonly kind: 'comment';
    readonly text: string;
    readonly textStart: number;
    readonly textEnd: number;
}
export type Entry = VarEntry | CommentEntry;
export interface Rule {
    selector: string;
    selectors: readonly string[];
    context: readonly string[];
    line: number;
    entries: Entry[];
}
/** The indentation in front of `text`, absent when nothing matches (never). */
export declare const leading: (text: string) => number;
export declare function readDeclarations(text: string): Rule[];
