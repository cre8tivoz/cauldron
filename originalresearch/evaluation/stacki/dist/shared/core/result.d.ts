export interface AppError {
    /** Stable machine code — the part a caller can switch on. */
    readonly code: string;
    readonly message: string;
}
export type Result<T, E = AppError> = {
    readonly ok: true;
    readonly value: T;
} | {
    readonly ok: false;
    readonly error: E;
};
export declare const ok: <T>(value: T) => Result<T, never>;
export declare const err: <E>(error: E) => Result<never, E>;
