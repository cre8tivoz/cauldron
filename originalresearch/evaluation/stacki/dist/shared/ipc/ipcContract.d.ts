import type { IpcChannel, IpcPayloads } from './ipcPayloads';
import type { IpcResults } from './ipcResults';
export { parseIpcPayload, IPC_PAYLOADS } from './ipcPayloads';
export type { IpcChannel, IpcPayloads } from './ipcPayloads';
export type { IpcResults } from './ipcResults';
/** What src:readSymbol / src:resolvePath return — a hand-rolled Result pair. */
export type SymbolReadResult = {
    readonly ok: true;
    readonly rel: string;
    readonly text: string;
    readonly line: number;
} | {
    readonly ok: false;
    readonly reason?: 'not-found' | 'too-large';
};
export type ResolvePathResult = {
    readonly ok: true;
    readonly rel: string;
} | {
    readonly ok: false;
};
export type IpcContract = {
    readonly [K in IpcChannel]: {
        readonly payload: IpcPayloads[K];
        readonly result: IpcResults[K];
    };
};
/** window.avb as the renderer sees it: one method per contracted channel. */
export type AvbBridge = {
    readonly [K in keyof IpcContract]: (payload: IpcContract[K]['payload']) => Promise<IpcContract[K]['result']>;
};
export declare function parseSymbolReadResult(input: unknown): SymbolReadResult;
export declare function parseResolvePathResult(input: unknown): ResolvePathResult;
export declare function parseTextResult(input: unknown): {
    readonly text: string;
};
export declare function parseOkResult(input: unknown): {
    readonly ok: true;
};
