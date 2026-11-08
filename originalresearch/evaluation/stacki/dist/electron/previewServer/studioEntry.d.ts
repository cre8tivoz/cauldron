import type { IncomingMessage, ServerResponse } from 'node:http';
interface PreviewServer {
    readonly middlewares: {
        readonly use: (handler: (request: IncomingMessage, response: ServerResponse, next: () => void) => void) => void;
    };
    readonly httpServer?: {
        readonly once: (event: 'close', callback: () => void) => void;
    };
    readonly config: {
        readonly logger: {
            readonly info: (message: string) => void;
        };
    };
}
export declare function studioEntryPlugin(project: string): {
    name: string;
    configureServer(server: PreviewServer): void;
};
export declare function studioEntryHTML(origin: string): string;
export {};
