import type { Digest } from '../../shared/core/brand';
import { type DocumentActors, type WriteReport } from './documentActors';
interface DocumentHost {
    readonly documents: DocumentActors;
    /** The app wrote `file` (main tells the canvas it may have changed). */
    readonly noteWrite: (file: string) => void;
}
/** Install the process's document host (see the header on replacing one). */
export declare function installDocumentHost(host: DocumentHost): void;
export declare function documentHost(): DocumentHost;
/** Write project text that no edit named a base for, through its actor: the
 * diff from the file as it is now, witnessed by those bytes (never the whole
 * file); a missing file is created, and anything but `applied` throws like the
 * `fs.writeFileSync` it replaces did. */
export declare function writeProjectText(file: string, text: string, expectedSource?: string): Digest;
/** Create a new project file through its actor; never overwrites. */
export declare function createProjectText(file: string, text: string): Digest;
/** A user-facing sentence for a write that did not apply. */
export declare function describeWriteReport(file: string, report: Exclude<WriteReport, {
    readonly tag: 'applied';
}>): string;
export {};
