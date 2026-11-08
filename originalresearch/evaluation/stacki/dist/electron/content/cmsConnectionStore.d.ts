import { type CmsConnection, type CmsConnectionDraft, type CmsConnectionList } from '../../shared/properties/cmsConnections';
/** The operating system's encryption, as Electron's safeStorage offers it. */
export interface CmsCrypt {
    readonly available: () => boolean;
    readonly encrypt: (text: string) => Buffer;
    readonly decrypt: (data: Buffer) => string;
}
export declare class CmsConnectionStore {
    private readonly crypt;
    /** The app's data folder, read when first needed (it is set once the app is ready). */
    private readonly folder;
    constructor(crypt: CmsCrypt, 
    /** The app's data folder, read when first needed (it is set once the app is ready). */
    folder: () => string);
    list(projectRoot: string): CmsConnectionList;
    /** Saves a connection with its key; one of a kind and target replaces the old one. */
    save(projectRoot: string, draft: CmsConnectionDraft): CmsConnection;
    remove(projectRoot: string, id: string): void;
    /** The key of one connection, decrypted; main process only. */
    secret(projectRoot: string, id: string): string | undefined;
    private file;
    private read;
    private write;
}
