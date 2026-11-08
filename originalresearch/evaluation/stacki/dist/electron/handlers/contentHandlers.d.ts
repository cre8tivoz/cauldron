import type { MainHost } from './mainHost';
/** What the content handlers ask of the running preview. */
export interface ContentPreview {
    /** Restart the dev server at this URL if its content config is newer than it (DevServers). */
    readonly restartForNewContentConfig: (devUrl: string) => Promise<boolean>;
}
export declare function registerContentHandlers(host: Pick<MainHost, 'ipcMain' | 'noteAppWrite' | 'send' | 'shell'>, preview: ContentPreview): void;
