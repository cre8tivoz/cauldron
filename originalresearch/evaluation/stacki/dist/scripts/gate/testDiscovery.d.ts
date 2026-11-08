import { type SuiteOptions } from './testSuites';
export declare const DISCOVERY_LIMITS: {
    /** Test files in the tree. About 290 today. */
    readonly testFilesMax: 2000;
    /** Folder depth below test/. The mirror is three deep. */
    readonly folderDepthMax: 8;
};
export interface Suite {
    readonly file: string;
    readonly name: string;
    readonly options: SuiteOptions;
}
/** Every test file under `test/`, repository-relative, sorted. */
export declare function discoverTestFiles(root: string): readonly string[];
/** The suites for these files, with each one's options from testSuites.ts. */
export declare function suitesFor(files: readonly string[]): readonly Suite[];
/**
 * The suites a command line asks for: each query matches a suite by its
 * name's last part, ignoring case and punctuation, or — when it holds a `/` —
 * every suite whose name starts with it (`electron/parse`). No queries is
 * every suite. Queries that match nothing come back for the caller to report.
 */
export declare function selectSuites(suites: readonly Suite[], queries: readonly string[]): {
    readonly selected: readonly Suite[];
    readonly unmatched: readonly string[];
};
