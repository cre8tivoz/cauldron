import { type Result } from '../../shared/core/result';
import type { PageRenamePlan, RenameText } from './pageRenamePlan';
/** Witness every text before writing; restore only our own bytes if an operation fails. */
export interface RenameWriter {
    readonly current: (file: string) => Result<string>;
    readonly write: (entry: RenameText) => Result<void>;
    readonly lease: (texts: readonly RenameText[], run: () => Result<void>) => Result<void>;
}
export declare function applyPageRename(plan: PageRenamePlan, writer: RenameWriter): Result<void>;
/** Used only before Studio acknowledges a durable checkpoint. */
export declare function undoPageRename(plan: PageRenamePlan, writer: RenameWriter): Result<void>;
