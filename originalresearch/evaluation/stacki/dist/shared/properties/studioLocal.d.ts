export declare const STUDIO_LOCAL_DIRECTORY = ".stacki/studio";
/** Drafts, the draft workspace's history, uploads and publishing state. */
export declare const STUDIO_STATE_DIRECTORY = ".stacki/studio/state";
/** The updater's staging, backups and lock. */
export declare const STUDIO_UPDATES_DIRECTORY = ".stacki/studio/updates";
/** Where each lived before, by where it lives now: moved once, on start. */
export declare const STUDIO_LEGACY_DIRECTORIES: Readonly<Record<string, string>>;
/**
 * Whether a project-relative POSIX path is Studio's own local state — never
 * site content, so never copied, published or committed. Older layouts count.
 */
export declare function isStudioLocalPath(file: string): boolean;
