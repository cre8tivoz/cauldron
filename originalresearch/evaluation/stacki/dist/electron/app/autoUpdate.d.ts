import type { BrowserWindow, MessageBoxOptions, MessageBoxReturnValue } from 'electron';
import type { AppUpdater } from 'electron-updater';
export interface AutoUpdateHost {
    readonly app: Pick<Electron.App, 'isPackaged' | 'isReady' | 'getPath' | 'getVersion'>;
    readonly autoUpdater: AppUpdater;
    /** Runs just before the app quits to install a downloaded update. */
    readonly beforeInstall: () => void;
    /** The window a dialog belongs to, while one is open. */
    readonly parentWindow: () => BrowserWindow | undefined;
    readonly showMessageBox: (parent: BrowserWindow | undefined, options: MessageBoxOptions) => Promise<MessageBoxReturnValue>;
}
export declare class AutoUpdates {
    private readonly host;
    private interval;
    private checkInFlight;
    private errorDialogShown;
    private manualCheck;
    constructor(host: AutoUpdateHost);
    /** Checks now and every six hours, in the installed app only. */
    start(): void;
    checkFromMenu(): Promise<void>;
    private runCheck;
    private registerEvents;
    private promptToInstall;
    private log;
}
