import { type StudioRelease } from '../../shared/ipc/studioRelease';
import type { StudioStatus } from '../../shared/ipc/studioSetup';
import type { StudioInstallUpdate } from '../../shared/ipc/studioProgress';
export type StudioReleaseEnvironment = {
    readonly kind: 'packaged';
} | {
    readonly kind: 'development';
    readonly appPath: string;
};
export declare function automaticStudio(input: string, environment: StudioReleaseEnvironment): Promise<StudioRelease>;
export declare function studioStatus(project: string, desktopVersion: string): Promise<StudioStatus>;
export declare function readStudioRelease(file: string): Promise<StudioRelease>;
export declare function installStudio(project: string, release: StudioRelease, onProgress?: (update: StudioInstallUpdate) => void): Promise<string>;
export declare function publishedStudio(version: string): Promise<StudioRelease>;
