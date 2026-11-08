import { type Result } from '../../shared/core/result';
export declare function hasLocalStudio(project: string): boolean;
export declare function createLocalStudio(project: string, log: (text: string) => void): {
    open(): Promise<Result<string, string>>;
    close(): void;
};
export declare function writeLocalStudioConfig(project: string, assets: string, port: number): string;
