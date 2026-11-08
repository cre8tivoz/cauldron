declare const WIDTH_PX_MIN = 1024;
declare const HEIGHT_PX_MIN = 640;
/** The display's work area — the screen minus whatever the OS keeps for
 * itself. Every field is optional because the caller reads it from Electron's
 * `display.workArea` and may hand us nothing at all. */
interface WorkArea {
    readonly x?: number;
    readonly y?: number;
    readonly width?: number;
    readonly height?: number;
}
interface WindowBounds {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly minWidth: number;
    readonly minHeight: number;
}
/**
 * The bounds to open at on a display, given that display's work area — the
 * screen minus whatever the OS keeps for itself.
 *
 * A display smaller than the minimum still gets the minimum: the panels have a
 * width below which they stop being usable, and a window that starts too small
 * to use is worse than one that hangs over an edge.
 */
declare function openingBounds(workArea?: WorkArea): WindowBounds;
export { openingBounds, WIDTH_PX_MIN, HEIGHT_PX_MIN };
export type { WorkArea, WindowBounds };
