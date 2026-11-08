export declare const PREVIEW_CONTEXT_LIMITS: {
    readonly astroFilesMax: 4000;
    readonly directoriesMax: 1024;
    readonly propsMax: 256;
    readonly slotCharsMax: 4096;
    readonly sourceBytesMax: number;
    readonly stylesCharsMax: number;
    readonly globalFilesMax: 64;
    readonly importsPerFileMax: 512;
};
export type PreviewSampleValue = string | boolean | number;
export type PreviewSlot = {
    readonly kind: 'name';
} | {
    readonly kind: 'none';
} | {
    readonly kind: 'html';
    readonly html: string;
};
export interface PreviewSample {
    readonly props: Readonly<Record<string, PreviewSampleValue>>;
    readonly slot: PreviewSlot;
}
export interface PreviewDocumentAttributes {
    readonly html: Readonly<Record<string, string>>;
    readonly body: Readonly<Record<string, string>>;
}
export interface PreviewProjectFile {
    /** Project-relative POSIX path, such as `src/pages/index.astro`. */
    readonly relative: string;
    readonly source: string;
    readonly imports: ReadonlyArray<PreviewImport>;
}
export interface PreviewImport {
    readonly name: string;
    readonly relative: string;
}
export interface PreviewProjectIndex {
    readonly pages: ReadonlyArray<PreviewProjectFile>;
    readonly others: ReadonlyArray<PreviewProjectFile>;
}
export interface PreviewContextModule {
    readonly code: string;
    readonly watchFiles: readonly string[];
}
export interface PreviewSampleFound {
    readonly sample: PreviewSample;
    readonly host: string;
}
/** Reads every .astro file under src once, with the imports each one declares. */
export declare function readPreviewProjectIndex(projectDirectory: string): PreviewProjectIndex;
/** The `export` module the preview route imports for its page context. */
export declare function componentPreviewContextModule(projectDirectory: string, index: PreviewProjectIndex): PreviewContextModule;
/**
 * The files the pages share: those imported by a majority of the pages, in the order
 * the pages import them. A layout, a global style embed, a navbar and a footer qualify;
 * a section used on one page does not.
 */
export declare function componentPreviewGlobalFiles(pages: ReadonlyArray<ReadonlyArray<string>>): readonly string[];
/**
 * The literal CSS of a template's `<style is:inline>` and `<style is:global>` blocks.
 * Scoped styles only reach the component's own elements, and preprocessed languages
 * would need the compiler, so neither is copied.
 */
export declare function componentPreviewInlineStyles(source: string): readonly string[];
/** Literal `class` and `data-*` attributes of a layout's <html> and <body> tags. */
export declare function componentPreviewDocumentAttributes(source: string): PreviewDocumentAttributes;
/**
 * The first instance of a component in the project, pages first, as preview inputs.
 * Pages show a component as visitors see it; other components are the fallback.
 */
export declare function componentPreviewSample(index: PreviewProjectIndex, component: string): PreviewSampleFound | undefined;
/** Literal props and plain-HTML children of the first `<Name …>` in a template. */
export declare function componentPreviewInstance(source: string, name: string): PreviewSample | undefined;
/** Default .astro imports that resolve to project files, by relative or `@/`/`~/` alias. */
export declare function previewImports(source: string, relative: string): ReadonlyArray<PreviewImport>;
