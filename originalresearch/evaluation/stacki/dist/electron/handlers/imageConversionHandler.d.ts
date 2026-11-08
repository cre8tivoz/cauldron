import type { MainHost } from './mainHost';
export declare function registerImageConversionHandler(host: Pick<MainHost, 'ipcMain' | 'shell' | 'noteAppWrite' | 'send'>): void;
