#!/usr/bin/env node
export interface FixtureLimits {
    readonly sourceBytesMax: number;
    readonly treeNodesMax: number;
}
export interface LargeFixture {
    readonly name: string;
    readonly axis: 'bytes' | 'nodes';
    readonly percent: number;
    readonly text: string;
}
export interface ManifestEntry {
    readonly name: string;
    readonly axis: 'bytes' | 'nodes';
    readonly percent: number;
    readonly target: number;
    readonly bytes: number;
    readonly utf16Units: number;
    readonly nodes: number;
    readonly sha256: string;
}
/** Counts every node the parser produces for `text`, or undefined when the
 * text does not parse (a piece that does not stand alone is skipped). */
export type NodeCounter = (text: string) => number | undefined;
export declare const PERCENTS: readonly [25, 50, 100];
export declare function generateLargeFixtures(limits: FixtureLimits, corpus: ReadonlyMap<string, string>, countNodes: NodeCounter): readonly LargeFixture[];
export declare function manifestEntry(fixture: LargeFixture, limits: FixtureLimits, countNodes: NodeCounter): ManifestEntry;
/** The real parser as a node counter, for the CLI. */
export declare function parserNodeCounter(parsePage: (text: string) => unknown): NodeCounter;
