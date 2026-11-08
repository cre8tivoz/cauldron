import { type VarEntry, type Rule } from './cssVarRead';
export interface Column {
    readonly id: string;
    readonly label: string;
    readonly selector: string;
    readonly context: readonly string[];
    readonly line: number;
}
export interface Cell {
    readonly name: string;
    readonly value: string;
    readonly file: string;
    readonly selector: string;
    readonly valueStart: number;
    readonly valueEnd: number;
    readonly line: number;
    readonly column: string;
}
export interface Row {
    readonly label: string;
    readonly name?: string;
    cells: (Cell | undefined)[];
}
export interface Block {
    readonly kind: 'rows' | 'matrix';
    readonly title: string | undefined;
    readonly titleStart?: number;
    readonly titleEnd?: number;
    readonly rows: Row[];
    readonly columns?: Column[];
}
export interface Group {
    readonly kind: 'modes' | 'single';
    readonly label: string;
    readonly columns: Column[];
    readonly blocks: Block[];
}
export interface FileModel {
    readonly rel: string;
    readonly name: string;
    readonly groups: Group[];
    readonly error?: string;
    readonly count?: number;
    declarations?: Rule[];
}
export interface TaggedVar extends VarEntry {
    readonly selector: string;
}
export declare function buildGroup(members: readonly Rule[], file: string): Group;
export declare function modesGroup(columns: Column[], byName: readonly Map<string, TaggedVar>[], file: string): Group;
export interface CommentSection {
    title: string | undefined;
    titleStart?: number;
    titleEnd?: number;
    names: string[];
}
export declare function commentSections(rule: Rule): CommentSection[];
export declare function sectionBlocks(section: CommentSection, rule: Rule, map: Map<string, TaggedVar> | undefined, file: string): Block[];
export declare function cellFor(map: Map<string, TaggedVar> | undefined, name: string, file: string, column: string): Cell | undefined;
export interface DescribedCell extends Cell {
    readonly ref?: string;
    readonly resolved?: string;
    readonly color?: string;
    readonly unknownColor: boolean;
    readonly kind: string;
}
export declare function describeCell(cell: Cell | undefined, map: Map<string, string>): DescribedCell | undefined;
export declare const shortLabel: (name: string, prefix?: string) => string;
/**
 * Every stylesheet in the project that declares custom properties, as groups of
 * tables. Files with none are left out — a variables panel is a place to find
 * variables, not a file browser.
 */
export declare function readVariables(projectPath: string): {
    files: FileModel[];
    values: Record<string, string>;
};
