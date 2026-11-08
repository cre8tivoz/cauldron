import type { MainHost } from './mainHost';
import type { CmsConnectionStore } from '../content/cmsConnectionStore';
import type { SanityLogin } from '../content/sanityLogin';
import { cmsFailureMessage } from '../content/cmsRemoteService';
export declare function registerCmsConnectionHandlers(host: Pick<MainHost, 'ipcMain' | 'assertInProject' | 'showOpenDialog'>, store: CmsConnectionStore, login: SanityLogin): void;
/** A failure as the panel says it (cmsRemoteService.ts). */
export declare const failureMessage: typeof cmsFailureMessage;
