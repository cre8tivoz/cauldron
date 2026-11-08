export declare const STUDIO_INSTALL_STAGES: readonly ["release", "files", "dependencies", "check", "build", "activate", "complete"];
export type StudioInstallStage = (typeof STUDIO_INSTALL_STAGES)[number];
export declare const STUDIO_LOG_CHARS_MAX = 24000;
export interface StudioInstallProgress {
    readonly projectPath: string;
    readonly requestId: string;
    readonly stage: StudioInstallStage;
    readonly output: string;
}
export type StudioInstallUpdate = {
    readonly kind: 'stage';
    readonly stage: StudioInstallStage;
} | {
    readonly kind: 'output';
    readonly text: string;
};
export declare function studioCompletedStages(stage: StudioInstallStage): number;
export declare function parseStudioRequestId(input: unknown): string;
export declare function parseStudioInstallProgress(input: unknown): StudioInstallProgress;
