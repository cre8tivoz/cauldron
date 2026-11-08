import { type PackageManager } from '../../shared/properties/packageManager';
import type { MainHost } from './mainHost';
export declare function registerProjectHandlers(host: Pick<MainHost, 'ipcMain' | 'send' | 'showOpenDialog'>): void;
export declare function installDependencies({ send }: Pick<MainHost, 'send'>, directory: string, pm?: PackageManager): Promise<void>;
export declare const PROGRESS_CLEARED: {
    readonly message: undefined;
};
