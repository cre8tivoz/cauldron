import type { DevServers } from './devServers';
import type { MainHost } from './mainHost';
export interface ThumbnailHost {
    readonly devServers: Pick<DevServers, 'current'>;
    /** Electron's userData folder, where the pictures are kept. */
    readonly userDataPath: () => string;
}
export declare class Thumbnails {
    private readonly host;
    private readonly queueCapture;
    private captureEra;
    private captureController;
    private thumbTimer;
    constructor(host: ThumbnailHost);
    capture(projectPath: string): Promise<{
        readonly ok: true;
    } | {
        readonly ok: false;
        readonly error: string;
    }>;
    /** Give the editor priority over active and queued welcome-screen server startups. */
    noteProjectOpened(): void;
    /** The project closed: no background capture is left pending for it. */
    stop(): void;
    schedule(projectPath: string, delay: number): void;
    private captureNow;
}
export declare function registerThumbnailHandlers({ ipcMain, thumbnails, userDataPath, }: Pick<MainHost, 'ipcMain'> & {
    readonly thumbnails: Thumbnails;
    readonly userDataPath: () => string;
}): void;
