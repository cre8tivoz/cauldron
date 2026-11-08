import { type Digest } from './brand';
export declare const BOUNDARY_LIMITS: {
    readonly textLengthMax: 10000000;
    readonly pathLengthMax: 32768;
    readonly itemsMax: 100000;
    readonly depthMax: 128;
};
export type Parser<T> = (input: unknown) => T;
export type Parsed<P> = P extends Parser<infer T> ? T : never;
export type Data = undefined | null | boolean | number | string | Data[] | DataRecord;
export interface DataRecord {
    readonly [key: string]: Data;
}
export declare function text(input: unknown): string;
export declare function pathText(input: unknown): string;
export declare function digest(input: unknown): Digest;
export declare function boolean(input: unknown): boolean;
export declare function count(input: unknown): number;
export declare function optional<T>(parse: Parser<T>): Parser<T | undefined>;
export declare function nullable<T>(parse: Parser<T>): Parser<T | null>;
export declare function list<T>(parse: Parser<T>): Parser<T[]>;
export declare function record(input: unknown): Record<string, unknown>;
type Shape = Readonly<Record<string, Parser<unknown>>>;
type ShapeValue<S extends Shape> = {
    readonly [K in keyof S as undefined extends Parsed<S[K]> ? never : K]: Parsed<S[K]>;
} & {
    readonly [K in keyof S as undefined extends Parsed<S[K]> ? K : never]?: Exclude<Parsed<S[K]>, undefined>;
};
export declare function object<S extends Shape>(shape: S): Parser<ShapeValue<S>>;
export declare function dictionary<T>(parse: Parser<T>): Parser<Record<string, T>>;
export declare function data(input: unknown): Data;
type DefinedFields<T> = {
    readonly [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
    readonly [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};
export declare function definedFields<T extends Readonly<Record<string, unknown>>>(source: T): DefinedFields<T>;
export {};
