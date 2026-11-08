import type { MainHost } from './mainHost';
export declare function registerCmsHandlers(host: Pick<MainHost, 'ipcMain' | 'send' | 'shell'>): void;
