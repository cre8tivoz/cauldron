export declare const RELEASE_REPOSITORY = "flowtricks/stacki-releases";
export declare function boundedText(response: Response, maximum: number): Promise<string>;
export declare function latestRelease(): Promise<{
    version: string;
    url: string;
} | undefined>;
export declare function downloadRelease(input: unknown): Promise<import("../../shared/ipc/studioRelease").StudioRelease>;
