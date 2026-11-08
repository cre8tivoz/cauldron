export type CanvasTextOverlayEvent = {
    readonly type: 'avb:text-active';
    readonly session: string;
    readonly key: string;
} | {
    readonly type: 'avb:text-inactive';
    readonly session: string;
};
export declare function parseCanvasTextOverlay(input: unknown): CanvasTextOverlayEvent | undefined;
export interface CanvasTextFocus {
    readonly type: 'avb:text-focus';
    readonly paths: readonly string[];
}
export declare const CANVAS_FOCUS_PATHS_MAX = 256;
export declare function canvasTextFocus(paths: readonly string[]): CanvasTextFocus;
export declare function parseCanvasTextFocus(input: unknown): CanvasTextFocus | undefined;
export declare function parseCanvasTextClose(input: unknown): {
    readonly session: string;
    readonly action: "cancel" | "apply";
} | undefined;
export interface CanvasTextSelectionRange {
    readonly start: number;
    readonly end: number;
    readonly rect: {
        readonly x: number;
        readonly y: number;
        readonly w: number;
        readonly h: number;
    };
}
export interface CanvasTextSelection {
    readonly type: 'avb:text-selection';
    readonly session: string;
    readonly key: string;
    readonly range: CanvasTextSelectionRange | undefined;
}
export declare function parseCanvasTextSelection(input: unknown): CanvasTextSelection | undefined;
