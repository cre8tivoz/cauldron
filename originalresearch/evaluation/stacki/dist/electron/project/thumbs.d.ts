declare const VIEWPORT: {
    readonly width: 1440;
    readonly height: 900;
};
declare const thumbPathFor: (userDataPath: string, projectPath: string) => string;
declare function fingerprint(projectPath: string): string;
declare function readMeta(userDataPath: string, projectPath: string): Record<string, unknown> | undefined;
/**
 * True when the site has changed since its picture was taken — including
 * changes made with the app closed, which is most of them.
 */
declare function isStale(userDataPath: string, projectPath: string): boolean;
declare function readThumb(userDataPath: string, projectPath: string): string | undefined;
declare function forget(userDataPath: string, projectPath: string): void;
type CaptureResult = {
    readonly ok: true;
} | {
    readonly ok: false;
    readonly error: string;
};
/**
 * Renders `url` and stores the top of the page as this project's thumbnail.
 * A thumbnail is never worth throwing over, so every failure comes back as a
 * value and the old picture stays.
 */
declare function capture(userDataPath: string, projectPath: string, url: string): Promise<CaptureResult>;
export { capture, fingerprint, isStale, readMeta, readThumb, forget, thumbPathFor, VIEWPORT };
