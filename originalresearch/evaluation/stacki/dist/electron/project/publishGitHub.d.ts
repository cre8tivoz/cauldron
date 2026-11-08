import type { PublishConfig } from '../../shared/properties/publishConfig';
/** URL-based pushes need an explicit tracking update so availability sees the confirmed commit. */
export declare function recordPublishedGitHub(root: string, branch: string, commit: string): Promise<void>;
/** Resolve the selected account without changing gh's global active account. */
export declare function publishingGitEnvironment(root: string, config: PublishConfig): Promise<NodeJS.ProcessEnv>;
export declare function publishingGitRemote(root: string, config: PublishConfig): Promise<string>;
