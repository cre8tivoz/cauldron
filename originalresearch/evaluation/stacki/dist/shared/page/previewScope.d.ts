import { type Data } from '../core/boundary';
/** The `Symbol.for` key the record is filed under on `globalThis`. */
export declare const SCOPE_STORE_KEY = "stacki.scope";
export declare const PREVIEW_SCOPE_LIMITS: {
    readonly filesMax: 128;
    readonly namesMax: 64;
};
/**
 * The sampled values by binding name. Anything that is not a record of
 * identifiers to sampled data is no answer, an empty one, rather than an
 * error: a page the dev server cannot sample still opens, with "no sample"
 * where the values would be. A `null` value is a binding with nothing in it,
 * which is no sample either.
 */
export declare function parseScopeSamples(input: unknown): Readonly<Record<string, Data>>;
