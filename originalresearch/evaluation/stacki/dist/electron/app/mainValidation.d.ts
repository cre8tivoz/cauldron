import type { Data } from '../../shared/core/boundary';
import type { ContentCollection } from '../content/contentEntries';
import type { DynamicEntry } from '../lib/mainTypes';
export { parseData, parseRecord, parseString, parseOptionalString } from '../lib/mainHelpers';
export interface AppSettings {
    readonly sound: boolean;
    readonly usageCountsEnabled: boolean;
    readonly usageNoticeVersion: number;
    readonly usageLastAttemptDay?: string;
}
export declare function parseSettings(input: unknown): AppSettings;
export declare const parseRecents: import("../../shared/core/boundary").Parser<({
    readonly path: string;
    readonly name: string;
    readonly openedAt: number;
} & {})[]>;
export interface Collection extends ContentCollection {
    readonly loader?: NonNullable<ContentCollection['loader']> & {
        readonly kind: string;
    };
    readonly extensions?: readonly string[];
    readonly hasBody?: boolean;
    readonly idFromFile?: boolean;
    readonly crossFieldChecks?: boolean;
    readonly freeform?: boolean | undefined;
    readonly error?: string | undefined;
}
export interface ContentConfig {
    readonly collections: readonly Collection[];
    readonly missing?: true;
    readonly error?: string;
    readonly configPath?: string;
}
export declare function parseContentConfig(input: unknown): ContentConfig;
export declare function parseDynamicPaths(input: unknown): {
    readonly entries: readonly DynamicEntry[];
    readonly error: string | undefined;
};
export declare function parseSampleEntry(input: unknown): {
    readonly entry: Data;
    readonly error?: string;
};
export declare function parseSampleValue(input: unknown): {
    readonly value: Data;
    readonly error?: string;
};
export declare const parseValidationResult: import("../../shared/core/boundary").Parser<{
    readonly issues: ({
        readonly path: (string | number)[];
        readonly message: string;
        readonly code: string;
    } & {})[];
} & {
    readonly unchecked?: boolean;
    readonly error?: string;
}>;
