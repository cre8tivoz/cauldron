import type { PublishCommand } from '../../shared/properties/publishCommands';
import type { PackageManager } from '../../shared/properties/packageManager';
export declare function projectHasWrangler(root: string): boolean;
export interface ExecutableCommand extends Omit<PublishCommand, 'executable'> {
    readonly executable: PublishCommand['executable'] | PackageManager;
}
export declare function resolvePublishExecutable(root: string, command: ExecutableCommand): {
    readonly executable: string;
    readonly arguments: readonly string[];
};
