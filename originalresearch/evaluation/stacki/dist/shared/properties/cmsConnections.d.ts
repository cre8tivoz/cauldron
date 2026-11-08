export declare const CMS_CONNECTION_LIMITS: {
    readonly connectionsPerProjectMax: 16;
    readonly datasetsPerProjectMax: 100;
    readonly labelCharsMax: 80;
    readonly messageCharsMax: 1000;
    readonly projectsMax: 200;
    readonly secretCharsMax: 4096;
    readonly urlCharsMax: 2048;
};
export declare const SANITY_LOGIN_TIMEOUT_MS: number;
export type CmsConnection = {
    readonly kind: 'sanity';
    readonly id: string;
    readonly label: string;
    readonly projectId: string;
    readonly dataset: string;
} | {
    readonly kind: 'payload';
    readonly id: string;
    readonly label: string;
    /** The site's Payload server, e.g. https://cms.example.com. */
    readonly baseUrl: string;
    /** The auth collection the API key belongs to, e.g. `users`. */
    readonly collection: string;
} | {
    readonly kind: 'custom';
    readonly id: string;
    readonly label: string;
    /** Where drafts are sent: POST {document, field, value}. */
    readonly baseUrl: string;
    /** The header the key goes in, e.g. `Authorization`. */
    readonly header: string;
};
/** A connection as it is saved: the public fields, without an id yet, and its key. */
export type CmsConnectionDraft = DistributiveOmit<CmsConnection, 'id'> & {
    readonly secret: string;
};
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export interface CmsConnectionList {
    /** Whether keys can be encrypted on this machine; none are saved without it. */
    readonly encryption: 'available' | 'unavailable';
    readonly connections: readonly CmsConnection[];
}
export type CmsSaveResult = {
    readonly ok: true;
    readonly list: CmsConnectionList;
} | {
    readonly ok: false;
    readonly message: string;
};
export interface SanityProjectChoice {
    readonly id: string;
    readonly name: string;
    readonly datasets: readonly string[];
}
export type SanityLoginRequest = {
    readonly action: 'start';
    readonly id: string;
} | {
    readonly action: 'status';
    readonly id: string;
} | {
    readonly action: 'cancel';
    readonly id: string;
} | {
    readonly action: 'choose';
    readonly id: string;
    readonly projectId: string;
    readonly dataset: string;
};
export type SanityLoginState = {
    readonly kind: 'starting';
} | {
    readonly kind: 'browser';
    readonly url: string;
} | {
    readonly kind: 'choosing';
    readonly projects: readonly SanityProjectChoice[];
    /** The project and dataset the site's own .env names, when it names one. */
    readonly suggestion: {
        readonly projectId: string;
        readonly dataset: string;
    } | undefined;
} | {
    readonly kind: 'creating';
} | {
    readonly kind: 'complete';
    readonly connection: CmsConnection;
} | {
    readonly kind: 'cancelled';
} | {
    readonly kind: 'failed';
    readonly message: string;
};
export declare function parseConnectionId(input: unknown): string;
export declare function parseSanityProjectId(input: unknown): string;
export declare function parseSanityDataset(input: unknown): string;
/** A CMS server address: https, or http on this machine for a local server. */
export declare function parseCmsURL(input: unknown): string;
/** A key: printable ASCII on one line, as every CMS issues them. */
export declare function parseCmsSecret(input: unknown): string;
export declare function parseCmsConnection(input: unknown): CmsConnection;
export declare function parseCmsConnectionDraft(input: unknown): CmsConnectionDraft;
export declare function parseCmsConnectionList(input: unknown): CmsConnectionList;
export declare function parseCmsSaveResult(input: unknown): CmsSaveResult;
export declare function parseSanityLoginRequest(input: unknown): SanityLoginRequest;
export declare function parseSanityLoginState(input: unknown): SanityLoginState;
/** The page Sanity signs in on: its own login site, over https, nothing else. */
export declare function parseSanityLoginURL(input: unknown): string;
export {};
