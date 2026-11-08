import type { StyleKeepList } from '../../shared/properties/styleKeepList';
import { type MentionInterest } from './selectorMentions';
import { type PackageScan, type UsageAnalysis, type UsageInput } from './selectorUsage';
export declare const SELECTOR_FILE_LIMITS: {
    /** Files one project walk reads. */
    readonly projectFilesMax: 50000;
    /** Bytes one project walk reads. */
    readonly projectBytesMax: number;
    /** Files one package walk reads: a large monorepo's node_modules fits. */
    readonly packageFilesMax: 600000;
    /** Bytes one package walk reads. */
    readonly packageBytesMax: number;
    /** One file read by either walk; a larger one makes the walk incomplete. */
    readonly fileBytesMax: number;
    /** Ancestor folders searched for node_modules (monorepos hoist packages up). */
    readonly ancestorsMax: 32;
    /** Cached package answers per project before the cache starts over. */
    readonly cachedAnswersMax: 200000;
    /** Projects whose package answers are cached at once. */
    readonly cachedProjectsMax: 8;
};
/** The whole check against a project on disk: read it, then analyse it. */
export declare function checkSelectorUsage(root: string, keepList: StyleKeepList, packages?: PackageSearch): Promise<UsageAnalysis>;
export declare function readSelectorUsageInput(root: string, keepList: StyleKeepList): Promise<UsageInput>;
/** How a check treats installed packages: answer from earlier searches only, or search now. */
export type PackageSearch = 'cached' | 'search';
/** Search installed packages for what the project's files did not mention. */
export declare function scanInstalledPackages(root: string, interest: MentionInterest, mode?: PackageSearch): Promise<PackageScan>;
