export interface SuiteOptions {
    readonly phase?: 'alone';
    readonly flaky?: string;
    readonly runner?: 'electron';
    readonly nodeArguments?: readonly string[];
    readonly build?: 'renderer';
}
export declare const TEST_SUITES: Readonly<Record<string, SuiteOptions>>;
