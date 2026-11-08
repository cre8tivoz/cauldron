export declare const RUNTIME_PATHS: {
    readonly preload: string;
    readonly rendererIndex: string;
    readonly morphClient: string;
    readonly previewMarkers: string;
    readonly componentPreview: string;
    readonly studioEntry: string;
    readonly previewWarmup: string;
};
/** An icon or other file the build copies to dist/resources/. */
export declare function resourcePath(name: string): string;
/** A module the content tooling copies into a project's temporary folder. */
export declare function contentWorkerPath(name: string): string;
