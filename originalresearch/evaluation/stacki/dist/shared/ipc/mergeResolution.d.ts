import type { WireConflictPart } from './ipcWire';
export type MergePick = 'ours' | 'theirs' | 'both' | 'merged';
export type MergeTextResolution = {
    readonly kind: 'text';
    readonly text: string;
    readonly expected: string;
    readonly expectedBranch: string | undefined;
};
export type MergeResolution = 'ours' | 'theirs' | readonly MergePick[] | MergeTextResolution;
export declare function parseMergePick(input: unknown): MergePick;
export declare function parseMergeResolution(input: unknown): MergeResolution;
export declare function mergeConflictSnapshot(parts: readonly WireConflictPart[]): string;
