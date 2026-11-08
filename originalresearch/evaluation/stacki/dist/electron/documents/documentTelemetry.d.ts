import type { FilePath } from '../../shared/core/brand';
import { type Outcome, type RejectionReason } from '../../shared/engine/intent';
/** What one line records. (The step-0 save guard's `conflict` went with the
 * last whole-file save at step 10: a stale edit is an outcome, `rejected`.) */
export type TelemetryEvent = {
    readonly tag: 'outcome';
    readonly outcome: Outcome;
} | {
    readonly tag: 'backpressured';
}
/** An actor could not release its lock (documentDisk.ts breaks it later). */
 | {
    readonly tag: 'lock-leaked';
};
export interface TelemetryCounts {
    readonly applied: number;
    readonly uncertain: number;
    readonly backpressured: number;
    readonly lockLeaked: number;
    readonly rejected: Readonly<Record<RejectionReason, number>>;
}
export interface DocumentTelemetry {
    record(file: FilePath, event: TelemetryEvent): void;
    counts(): TelemetryCounts;
}
/** The event name every line starts with, for grepping a log. */
export declare const TELEMETRY_EVENT = "stacki.document";
export declare function createDocumentTelemetry(log: (line: string) => void): DocumentTelemetry;
export declare function hashPath(file: string): string;
