import { type DefaultsSnapshot } from './componentDefaults';
export declare const CANVAS_DIRECTORY = ".stacki/canvas/";
export declare function isDefaultsCanvas(file: string): boolean;
export declare function isCanvasPage(file: string): boolean;
export declare function defaultsCanvasFile(input: unknown): string;
export declare function defaultsCanvasSource(input: unknown): string;
export declare const parseCanvasCreate: import("../core/boundary").Parser<{
    readonly file: string;
    readonly source: string;
} & {}>;
export declare const parseCanvasFile: import("../core/boundary").Parser<{
    readonly file: string;
} & {}>;
export declare function defaultsCanvasRoute(file: string): string;
export interface DefaultsCanvasSession {
    readonly file: string;
    readonly component: string;
    readonly targetPath: string;
    readonly context: string;
    readonly snapshot: DefaultsSnapshot;
}
