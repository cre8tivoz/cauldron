export declare const SLOW_MOTION_ENVIRONMENT = "STACKI_SLOW_MOTION";
export declare const SLOW_MOTION_LOG_ENVIRONMENT = "STACKI_SLOW_MOTION_LOG";
export interface SlowMotion {
    readonly frameDelayMs: number;
    readonly animationRate: number;
}
export declare const SLOW_MOTION_LIMITS: {
    readonly frameDelayMsMax: 2000;
    readonly animationRateMin: 0.01;
};
/** Parse the profile the preflight passes in the environment. */
export declare function parseSlowMotion(raw: string): SlowMotion;
/** The preload that delays every animation frame in the page's own world.
 * With context isolation off, the preload already shares the page's world. */
export declare function frameDelayPreload(frameDelayMs: number): string;
