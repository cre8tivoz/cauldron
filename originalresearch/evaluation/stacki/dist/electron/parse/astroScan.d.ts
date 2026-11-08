import { findMatchingBrace, skipStringOrComment, findMatchingParen } from './astroLexical';
export { findMatchingBrace, findMatchingParen, skipStringOrComment };
export declare const normalizeHead: (text: string) => string;
export declare function dedentHead(text: string): string;
export declare function splitBlockLoopBody(block: string): {
    body: string[];
    markup: string;
    at: number;
} | undefined;
export declare const blockHead: (head: string) => string;
export declare function topLevelOps(source: string): {
    op: '?' | ':' | '&&';
    at: number;
}[];
interface Delimiters {
    readonly lt: number;
    readonly br: number;
    readonly next: number;
}
export declare const NOT_YET_FOUND: Delimiters;
export declare function nextDelimiters(template: string, from: number, previous: Delimiters): Delimiters;
export declare function findMatchingClose(template: string, from: number, name: string): number;
export declare function findMatchingFragmentClose(template: string, from: number): number;
