import { type LinkPreview } from '../../shared/properties/linkPreview';
export declare const LINK_PREVIEW_FETCH: {
    readonly timeoutMs: 8000;
    readonly oembedBytesMax: number;
    /** The page's head, where its meta tags are; the rest is never read. */
    readonly pageBytesMax: number;
    readonly thumbnailBytesMax: 1500000;
};
type Fetch = (url: string, init: RequestInit) => Promise<Response>;
/** A video link's card, or undefined when its host will not describe it. */
export declare function fetchLinkPreview(url: string, fetcher?: Fetch): Promise<LinkPreview | undefined>;
/** The page's own summary, from its Open Graph or standard description tag. */
export declare function metaDescription(html: string): string | undefined;
export {};
