import type { IncomingMessage, ServerResponse } from 'node:http';
interface WarmupRoute {
    readonly origin?: string;
    readonly entrypoint?: string;
}
interface WarmupServer {
    readonly middlewares: {
        readonly use: (handler: (request: IncomingMessage, response: ServerResponse, next: () => void) => void) => void;
    };
    readonly httpServer?: {
        readonly once: (event: 'close', callback: () => void) => void;
        readonly address?: () => unknown;
    };
    readonly environments?: Readonly<Record<string, {
        readonly runner?: {
            readonly import: (file: string) => Promise<unknown>;
        };
    }>>;
    readonly ssrLoadModule: (file: string) => Promise<unknown>;
}
export interface WarmupPlan {
    /** Page modules to compile, resolved lazily because routes resolve after setup. */
    readonly files: () => readonly string[];
    /** The component preview route to render, or undefined when the address is unknown. */
    readonly previewURL: () => string | undefined;
    readonly request: (url: string) => Promise<void>;
}
interface WarmupConfig {
    readonly base?: string;
    readonly trailingSlash?: string;
}
export declare function previewWarmupIntegration(project: string): {
    name: string;
    hooks: {
        'astro:config:done': ({ config: done }: {
            readonly config: WarmupConfig;
        }) => void;
        'astro:routes:resolved': ({ routes }: {
            readonly routes: readonly WarmupRoute[];
        }) => void;
        'astro:server:setup': ({ server, logger }: {
            readonly server: WarmupServer;
            readonly logger: {
                readonly warn: (message: string) => void;
            };
        }) => void;
    };
};
/** The component preview route on this server, honouring the project's base and slash policy. */
export declare function previewWarmupURL(input: unknown, config: WarmupConfig): string | undefined;
export declare function previewWarmupFiles(routes: readonly WarmupRoute[]): readonly string[];
export declare function previewWarmupAfterPage(server: WarmupServer, plan: WarmupPlan, report: (error: unknown) => void): void;
export {};
