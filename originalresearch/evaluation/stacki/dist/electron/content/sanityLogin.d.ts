import { type SanityLoginRequest, type SanityLoginState } from '../../shared/properties/cmsConnections';
import type { CmsConnectionStore } from './cmsConnectionStore';
export declare class SanityLogin {
    private readonly store;
    private session;
    constructor(store: CmsConnectionStore);
    request(projectRoot: string, request: SanityLoginRequest): SanityLoginState;
    private start;
    private callback;
    private signedIn;
    private choose;
    private fail;
    private set;
}
