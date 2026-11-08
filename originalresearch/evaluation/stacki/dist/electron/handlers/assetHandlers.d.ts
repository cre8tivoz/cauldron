import type { MainHost } from './mainHost';
export declare function registerAssetHandlers(host: Pick<MainHost, 'assertInProject' | 'ipcMain' | 'noteAppWrite' | 'send' | 'shell' | 'showOpenDialog'>): void;
