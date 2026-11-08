import { data, record, text } from '../../shared/core/boundary';
export { data as parseData, record as parseRecord, text as parseString };
export declare const parseOptionalString: import("../../shared/core/boundary").Parser<string | undefined>;
export declare const SHORT_COMMAND: {
    readonly timeout: 10000;
    readonly maxBuffer: number;
};
export declare const isWin: boolean;
export declare function toPosix(filePath: string): string;
export declare function errorMessage(error: unknown): string;
export declare function capture(match: RegExpMatchArray, index: number): string;
export declare function readJson(file: string): unknown;
export declare function parseDataList(input: unknown): unknown[];
