import { type StudioReleaseEnvironment } from '../project/studioSetup';
import type { MainHost } from './mainHost';
export declare function registerStudioHandlers(host: Pick<MainHost, 'ipcMain' | 'assertInProject' | 'showOpenDialog' | 'send'>, environment: StudioReleaseEnvironment, desktopVersion: () => string): void;
