export declare const FLOW_LIMITS: {
    /** Runnable files traced; one walk per file keeps this quadratic, so it is modest. */
    readonly filesMax: 3000;
};
export interface FlowText {
    readonly rel: string;
    readonly text: string;
}
/** A site of `from` and a site of `to` that some file's imports both lead to, if any. */
export declare function linkedSites(texts: readonly FlowText[], from: readonly string[], to: readonly string[]): {
    readonly from: string;
    readonly to: string;
} | undefined;
