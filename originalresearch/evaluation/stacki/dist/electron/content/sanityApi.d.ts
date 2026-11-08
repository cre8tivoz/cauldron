import { type SanityProjectChoice } from '../../shared/properties/cmsConnections';
export declare class SanityRequestError extends Error {
    readonly status: number;
    constructor(message: string, status: number);
}
/**
 * Sanity's own login page, where the person picks Google, GitHub or email. It
 * returns to `origin` (a localhost address, which Sanity allows) with a one-time
 * session id, as Sanity's SDK does (sanity-io/sdk, AuthenticationGuide.md).
 */
export declare function sanityLoginURL(origin: string): string;
/** Exchanges the one-time session id for the person's login token. */
export declare function sanityTokenForSession(sid: string): Promise<string>;
/** The person's projects, each with its datasets, at most the list's limit. */
export declare function sanityProjects(token: string): Promise<SanityProjectChoice[]>;
/**
 * A project key with the Editor role: what Stacki keeps instead of the login.
 * Editor reads drafts and writes them, and nothing about members or billing.
 */
export declare function createSanityEditorKey(token: string, projectId: string, label: string): Promise<string>;
/** Ends the login session; the token stops working everywhere. */
export declare function sanityLogout(token: string): Promise<void>;
