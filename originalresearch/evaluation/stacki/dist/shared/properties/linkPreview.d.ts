export declare const LINK_PREVIEW_LIMITS: {
    readonly urlCharsMax: 2048;
    readonly titleCharsMax: 300;
    readonly descriptionCharsMax: 2000;
    readonly authorCharsMax: 200;
    /** The thumbnail travels as a data URL: 1.5 MB of image, base64-encoded. */
    readonly thumbnailCharsMax: 2100000;
};
export interface VideoHost {
    /** Shown as the card's "Source". */
    readonly name: string;
    /** The host's oEmbed endpoint; the link is added as `url`. */
    readonly oembed: string;
    /** Host names it serves videos from; a listed name also matches its subdomains. */
    readonly domains: readonly string[];
}
export declare const VIDEO_HOSTS: readonly VideoHost[];
/** A link to a known video host, by its parsed address. */
export interface VideoLink {
    readonly url: string;
    readonly host: VideoHost;
}
export interface LinkPreview {
    readonly url: string;
    readonly title: string;
    readonly source: string;
    readonly description?: string;
    readonly author?: string;
    /** A `data:image/…` URL, so no page has to load images from the video host. */
    readonly thumbnail?: string;
}
/** The video host a field's text links to, or undefined for any other text. */
export declare function videoLinkOf(text: string): VideoLink | undefined;
/** The known video host serving a host name, matching subdomains (www., m., player.). */
export declare function videoHostOf(hostname: string): VideoHost | undefined;
/** The link a request names: a video host link, or an error at this boundary. */
export declare function parseVideoLinkURL(input: unknown): string;
export declare function parseLinkPreview(input: unknown): LinkPreview;
