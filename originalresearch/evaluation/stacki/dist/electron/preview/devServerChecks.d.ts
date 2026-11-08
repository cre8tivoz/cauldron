export declare const parseAstroLock: import("../../shared/core/boundary").Parser<{
    readonly url: string;
} & {}>;
export declare const TRAILING_SLASH_MODES: string[];
export declare const ASTRO_CONFIG_FILES: string[];
export declare function trailingSlashFromSource(text: string): string | undefined;
export declare function portAnswers(port: number, host?: string): Promise<unknown>;
export declare function previewPort(projectPath: string): number;
export declare function serverResponds(url: string): Promise<boolean>;
export declare function parseExistingServer(log: string): string | undefined;
export declare function parsesAsModule(file: string): boolean;
export declare function serverAlive(urlString: string): Promise<boolean>;
export declare function readAstroLock(projectPath: string): ({
    readonly url: string;
} & {}) | undefined;
export declare function satisfiesRange(version: string | undefined, range: string | undefined): boolean;
export declare function nodeVersionOf(bin: string): string | undefined;
