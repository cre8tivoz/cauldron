import { type PreviewSample, type PreviewSampleValue, type PreviewSlot } from './componentPreviewContext';
export interface ComponentPreviewInputs {
    readonly props: Readonly<Record<string, PreviewSampleValue>>;
    readonly missing: readonly string[];
    readonly slot: PreviewSlot;
}
export declare function componentPreviewInputs(source: unknown, name: unknown, sample?: PreviewSample): ComponentPreviewInputs;
export declare function componentPreviewPath(paths: readonly string[], requestedPath: unknown, requestedName: unknown): string | undefined;
export declare function componentPreviewPlugin(projectDirectories: readonly string[], packages?: (root: string) => readonly PackagePreviewSource[]): {
    name: string;
    enforce: "pre";
    resolveId(id: string): string | undefined;
    watchChange(id: string): void;
    load(this: unknown, id: string): string | undefined;
};
export declare function renderComponentPreviewPage(): string;
interface PackagePreviewSource {
    readonly file: string;
    readonly importPath: string;
    readonly source: string;
}
export {};
