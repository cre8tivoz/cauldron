export declare function parsePreferenceName(input: unknown): 'sound' | 'usageCountsEnabled';
export declare const parsePreferences: import("../core/boundary").Parser<{
    readonly sound: boolean;
    readonly usageCountsEnabled: boolean;
} & {}>;
export declare const parsePreferenceResult: import("../core/boundary").Parser<{
    readonly sound: boolean;
    readonly usageCountsEnabled: boolean;
    readonly saved: boolean;
} & {}>;
