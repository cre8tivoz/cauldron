import type { IpcMainInvokeEvent } from 'electron';
import type { IpcChannel, IpcPayloads } from '../../shared/ipc/ipcPayloads';
import type { IpcResults } from '../../shared/ipc/ipcResults';
export declare function createIpcRegistrar(ipcMain: Pick<Electron.IpcMain, 'handle'>): <K extends IpcChannel>(channel: K, listener: (event: IpcMainInvokeEvent, payload: IpcPayloads[K]) => IpcResults[K] | Promise<IpcResults[K]>) => void;
