import type { Hosting } from './publishConfig';
export interface PublishCommand {
    readonly executable: 'npm' | 'wrangler' | 'vercel';
    readonly arguments: readonly string[];
    readonly environment: Readonly<Record<string, string>>;
}
export declare function scriptCommand(script: string): PublishCommand;
export declare function hostingCommand(hosting: Exclude<Hosting, {
    provider: 'none';
}>): PublishCommand;
