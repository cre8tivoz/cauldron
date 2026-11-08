type Send = (channel: string, payload: unknown) => void;
/**
 * @param send        (channel, payload) => void — posts to the renderer
 * @param projectRoot () => string|undefined — the open project, for the cwd check
 */
declare function registerTerminalHandlers({ send, projectRoot }: {
    readonly send: Send;
    readonly projectRoot: () => string | undefined;
}): void;
declare function cleanupTerminals(): void;
export { registerTerminalHandlers, cleanupTerminals };
