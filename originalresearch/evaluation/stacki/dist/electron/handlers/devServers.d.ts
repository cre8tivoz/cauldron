import type { IpcResults } from '../../shared/ipc/ipcResults';
import type { DevServer } from '../lib/mainTypes';
import type { MainHost } from './mainHost';
import type { Thumbnails } from './thumbnails';
export declare class DevServers {
    private readonly host;
    private readonly previewEnvironment;
    private server;
    private contentConfigAtStart;
    private logBuffer;
    private readonly starts;
    constructor(host: Pick<MainHost, 'send'>, previewEnvironment?: (projectRoot: string) => Readonly<Record<string, string>>);
    /** The dev server the canvas shows, while one runs. */
    current(): DevServer | undefined;
    /** A checkout must wait until the old watcher stops before replacing its files. */
    pause(): Promise<void>;
    /** Runs `task` as the project's one dev start; a later start cancels it. */
    run(projectPath: string, task: (assertActive: () => void) => Promise<IpcResults['dev:start']>): Promise<IpcResults['dev:start']>;
    stop(cancelPending?: boolean): void;
    /**
     * Restarts the dev server at `devUrl` when its project gained a content
     * config after it started, so Astro loads the collections it declares.
     * Once per server: the restarted one starts with the config, so it never
     * asks again. Resolves true when the server is back at the same address
     * (its port comes from the project path, so it normally is) — the canvas's
     * Vite client reconnects to it by itself. False when there was nothing to
     * do, or the server came back somewhere else; the app then hears of it as
     * an exit and offers to start the preview again.
     */
    restartForNewContentConfig(devUrl: string): Promise<boolean>;
    /** The trailing-slash mode the project's dev server serves. */
    readTrailingSlash(projectPath: string): string;
    /** The generated config's path, or undefined when the dev server runs without it. */
    writeMarkerConfig(projectPath: string): string | undefined;
    /** Starts the project's dev server, or answers with the one already running. */
    start(projectPath: string, assertActive: () => void): Promise<{
        url: string;
        external: boolean;
        bare?: never;
    } | {
        url: string;
        external?: never;
        bare?: never;
    } | {
        url: string;
        bare: boolean;
        external?: never;
    }>;
    private spawn;
    private installedBin;
    private failureDetail;
    private pushLog;
    private recentLog;
}
export declare function registerDevServerHandlers({ ipcMain, devServers, thumbnails, }: Pick<MainHost, 'ipcMain'> & {
    readonly devServers: DevServers;
    readonly thumbnails: Thumbnails;
}): void;
