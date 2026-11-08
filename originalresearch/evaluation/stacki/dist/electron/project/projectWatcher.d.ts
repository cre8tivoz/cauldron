import fs from 'fs';
interface WatchProjectDeps {
    readonly projectPath: string;
    readonly send: (channel: string, payload: unknown) => void;
    readonly isSelfWrite: (absolutePath: string) => boolean;
    /** An outside change to a source file: the document actors' hint (plan §7). */
    readonly noteExternalChange: (absolutePath: string) => void;
    readonly notePageMayHaveChanged: (changed: boolean) => void;
    readonly scheduleThumb: (projectPath: string, delayMs: number) => void;
    readonly mediaPattern: RegExp;
    readonly watch?: typeof fs.watch;
}
declare function watchProject({ projectPath, send, isSelfWrite, noteExternalChange, notePageMayHaveChanged, scheduleThumb, mediaPattern, watch, }: WatchProjectDeps): {
    close: () => void;
};
export { watchProject };
