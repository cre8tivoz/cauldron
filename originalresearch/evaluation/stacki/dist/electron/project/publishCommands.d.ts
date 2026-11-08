import type { PublishConfig } from '../../shared/properties/publishConfig';
import type { PublishCommand } from '../../shared/properties/publishCommands';
export declare function runPublishScripts(root: string, scripts: readonly string[], environment?: Readonly<Record<string, string>>): Promise<void>;
export declare function deployHosting(root: string, config: PublishConfig): Promise<void>;
/** Run installed tools only: publishing must never implicitly download executable packages. */
export declare function runPublishCommand(root: string, command: PublishCommand): Promise<void>;
export declare function publishEnvironment(): NodeJS.ProcessEnv;
export declare function stopPublishProcess(pid: number | undefined): void;
