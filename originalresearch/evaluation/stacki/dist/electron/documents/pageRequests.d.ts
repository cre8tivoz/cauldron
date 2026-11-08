import { type EditReport, type WriteReport } from './documentActors';
import type { IpcPayloads } from '../../shared/ipc/ipcPayloads';
import type { IpcResults, WirePageEditError, WirePageWriteFailure } from '../../shared/ipc/ipcResults';
export declare const PAGE_MD_RE: RegExp;
export declare const isMarkdownPage: (filePath: string) => boolean;
export declare const isMdx: (filePath: string) => boolean;
export declare function parsePageSource(pagePath: string, source: string): IpcResults['page:parse'];
export declare function pageWriteFailure(file: string, report: Extract<WriteReport, {
    readonly tag: 'uncertain' | 'backpressured';
}>): WirePageWriteFailure;
export declare function pageEditError(file: string, report: Exclude<EditReport, {
    readonly tag: 'applied';
}>): WirePageEditError;
export declare const resolvePagesDirectory: (projectPath: string, rel: string) => string;
export declare function fillRoute(pattern: string, params: Readonly<Record<string, unknown>>): string;
export declare function selectionTrail(state: IpcPayloads['selection:copy']): string[] | undefined;
