import type { IpcPayloads } from '../../shared/ipc/ipcPayloads';
import * as gitHistory from './gitHistory';
export declare const parkTag: (branch: string | undefined) => string;
export declare function isDirty(projectPath: string): Promise<boolean>;
export declare function parkedRef(projectPath: string, branch: string | undefined): Promise<string | undefined>;
export declare function parkBranch(projectPath: string, branch: string | undefined): Promise<boolean>;
export declare function unparkBranch(projectPath: string, branch: string | undefined): Promise<{
    restored: boolean;
    error?: never;
} | {
    restored: boolean;
    error: string;
}>;
export declare function currentBranch(projectPath: string): Promise<string | undefined>;
export declare function readGitLog(payload: IpcPayloads['git:log']): Promise<{
    commits: {
        files: (gitHistory.FileChange & gitHistory.FileDescription & {
            readonly from: string | undefined;
        })[] | undefined;
        hash: string | undefined;
        shortHash: string | undefined;
        author: string | undefined;
        email: string | undefined;
        when: string | undefined;
        subject: string | undefined;
        parents: readonly string[];
        refs: readonly string[];
        isMerge: boolean;
    }[];
    atEnd: boolean;
}>;
export declare function readGitIdentity(projectPath: string): Promise<{
    branch: string;
    head: string | undefined;
    userEmail: string | undefined;
}>;
export declare function readGitParked(projectPath: string): Promise<string[]>;
