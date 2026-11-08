interface Starter {
    readonly label: string;
    readonly create: string;
}
declare const STARTERS: Record<string, Starter>;
type OnLog = (text: string) => void;
declare const run: (cmd: string, args: readonly string[], cwd: string, onLog?: OnLog) => Promise<string>;
interface CreateStarterOptions {
    readonly starter?: string;
    readonly parentPath?: string;
    readonly name?: string;
    /** The npm command to run, so a test can hand it one that needs no network. */
    readonly npm?: string;
    readonly onLog?: OnLog;
}
/**
 * Runs a starter's scaffolder in `parentPath` to make `parentPath/name`.
 * Installing what it needs and its first commit (`startSiteHistory`) are the
 * caller's — this is the part that has to be right before anything is
 * installed into it.
 */
declare function createStarter({ starter, parentPath, name, npm, onLog }?: CreateStarterOptions): Promise<{
    ok: boolean;
    projectPath: string;
}>;
/**
 * Gives a new site a history of its own: one commit of the site as it stands.
 * The caller runs it after the install, so the lockfile is part of that commit.
 */
declare function startSiteHistory(directory: string, label: string, onLog?: OnLog): Promise<void>;
/**
 * The folder a new site gets, `parentPath/name`, which must not exist yet. The
 * starter and the Astro wizard both use it, so the name rules and their
 * messages are the same in either flow.
 */
declare function newSiteDirectory(parentPath: string | undefined, name: string | undefined): string;
export { createStarter, newSiteDirectory, run as runCreateCommand, startSiteHistory, STARTERS };
