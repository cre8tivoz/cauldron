export declare const PREFLIGHT_RUN_LIMITS: {
    readonly repeatMax: 5;
    readonly jobsMax: 4;
    /** One pass over the probes; about a minute on an M-series Mac. */
    readonly probePassMsMax: number;
    /** Findings printed per check; the count says how many more there are. */
    readonly findingsShownMax: 20;
    readonly gitOutputBytesMax: number;
};
interface Options {
    readonly staticOnly: boolean;
    readonly repeat: number;
    readonly jobs: number;
    readonly only: string | undefined;
}
export declare function parseOptions(argumentsList: readonly string[]): Options;
export {};
