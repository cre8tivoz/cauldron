import { type StudioRelease } from '../../shared/ipc/studioRelease';
export declare function writeRelease(directory: string, release: StudioRelease): Promise<void>;
export declare function validateInstallation(directory: string, project: string): Promise<void>;
export declare function installRelease(target: string, release: StudioRelease, validate?: (directory: string, project: string) => Promise<void>): Promise<{
    version: string;
    backup: string | undefined;
}>;
export declare function installNewRelease(target: string, release: StudioRelease, validate?: (directory: string, project: string) => Promise<void>): Promise<{
    version: string;
    backup: string | undefined;
}>;
