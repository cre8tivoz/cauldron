import type { Result } from '../../shared/core/result';
interface StudioCommand {
    readonly command: string;
    readonly argumentsList: readonly string[];
    readonly directory: string;
    readonly project: string;
    readonly timeoutMs: number;
}
export declare function runStudioCommand(options: StudioCommand, onOutput: (output: string) => void): Promise<Result<void, string>>;
export {};
