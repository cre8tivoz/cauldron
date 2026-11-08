export type CanvasInteraction = 'select' | 'interact';
export declare function parseCanvasInteraction(input: unknown): CanvasInteraction | undefined;
export declare function parseCanvasNavigation(input: unknown): string | undefined;
