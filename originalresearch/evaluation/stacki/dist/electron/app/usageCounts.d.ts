export declare const USAGE_NOTICE_VERSION = 1;
export declare const USAGE_COUNTS_URL = "https://stacki-usage-counts.timothymricks.workers.dev/daily";
export declare function usageDay(date: Date): string;
export declare function shouldCountUsage(input: {
    readonly packaged: boolean;
    readonly enabled: boolean;
    readonly noticeVersion: number;
    readonly lastAttemptDay: string | undefined;
}, day: string): boolean;
export declare function sendUsageCount(options: {
    readonly signal: AbortSignal;
}, request: (url: string, options: RequestInit) => Promise<Response>): Promise<boolean>;
