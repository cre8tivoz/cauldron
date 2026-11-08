import type { ChildProcess, ExecFileOptions } from 'child_process';
export declare function shellPathDirectories(): string[];
export declare const cmpVersion: (left: string, right: string) => number;
export declare function nodeDirectoryGuesses(home: string): string[];
export declare let toolPathHome: string | undefined;
export declare function setToolPathHome(home: string): void;
export declare let toolPathReady: boolean;
export declare function ensureToolPath(): void;
export declare function resolveNodeBin(): string | undefined;
export declare function resolveCliEntry(binPath: string): string | undefined;
export declare function nodeCliCommand(binPath: string, args: readonly string[]): [string, string[]];
export declare function run(cmd: string, args: readonly string[], cwd: string, options?: ExecFileOptions): Promise<{
    stdout: string;
    stderr: string;
}>;
export declare function git(projectPath: string, args: readonly string[], options?: ExecFileOptions): Promise<{
    stdout: string;
    stderr: string;
}>;
export declare function findFreePort(start: number): Promise<number>;
export declare function findFreePortProbe(port: number): Promise<boolean>;
export declare function stopProcessTree(proc: ChildProcess | undefined): void;
export declare function spawnAstroServer(projectPath: string, localBin: string, args: readonly string[], extraEnvironment?: Readonly<Record<string, string>>): import("child_process").ChildProcessByStdio<null, import("stream").Readable, import("stream").Readable>;
