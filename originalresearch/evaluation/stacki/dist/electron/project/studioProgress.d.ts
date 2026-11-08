import { type StudioInstallProgress, type StudioInstallUpdate } from '../../shared/ipc/studioProgress';
export declare function createStudioProgress(identity: Pick<StudioInstallProgress, 'projectPath' | 'requestId'>, send: (progress: StudioInstallProgress) => void): {
    update(update: StudioInstallUpdate): void;
    close(): void;
};
