"use strict";
// A video link in a CMS field, previewed as a card: its thumbnail, title,
// description, author and where it is hosted. Only links to the video hosts
// named here are previewed, for two reasons: each publishes an oEmbed endpoint
// that describes a video without scraping, and fetching only from known hosts
// keeps the app from being pointed at arbitrary or local addresses by content
// it did not write. The fetch is electron/content/linkPreview.ts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIDEO_HOSTS = exports.LINK_PREVIEW_LIMITS = void 0;
exports.videoLinkOf = videoLinkOf;
exports.videoHostOf = videoHostOf;
exports.parseVideoLinkURL = parseVideoLinkURL;
exports.parseLinkPreview = parseLinkPreview;
const assert_1 = require("../core/assert");
const record_1 = require("../core/record");
exports.LINK_PREVIEW_LIMITS = {
    urlCharsMax: 2048,
    titleCharsMax: 300,
    descriptionCharsMax: 2000,
    authorCharsMax: 200,
    /** The thumbnail travels as a data URL: 1.5 MB of image, base64-encoded. */
    thumbnailCharsMax: 2_100_000,
};
exports.VIDEO_HOSTS = [
    {
        name: 'YouTube',
        oembed: 'https://www.youtube.com/oembed?format=json',
        domains: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'],
    },
    {
        name: 'Vimeo',
        oembed: 'https://vimeo.com/api/oembed.json',
        domains: ['vimeo.com'],
    },
    {
        name: 'Loom',
        oembed: 'https://www.loom.com/v1/oembed',
        domains: ['loom.com'],
    },
    {
        name: 'Wistia',
        oembed: 'https://fast.wistia.com/oembed',
        domains: ['wistia.com', 'wistia.net', 'wi.st'],
    },
    {
        name: 'Dailymotion',
        oembed: 'https://www.dailymotion.com/services/oembed?format=json',
        domains: ['dailymotion.com', 'dai.ly'],
    },
];
/** The video host a field's text links to, or undefined for any other text. */
function videoLinkOf(text) {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
        return undefined;
    }
    if (trimmed.length > exports.LINK_PREVIEW_LIMITS.urlCharsMax) {
        return undefined;
    }
    if (!URL.canParse(trimmed)) {
        return undefined;
    }
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return undefined;
    }
    const host = videoHostOf(url.hostname);
    return host === undefined ? undefined : { url: url.href, host };
}
/** The known video host serving a host name, matching subdomains (www., m., player.). */
function videoHostOf(hostname) {
    const name = hostname.toLowerCase();
    (0, assert_1.assert)(exports.VIDEO_HOSTS.length > 0, 'Some video hosts are known');
    return exports.VIDEO_HOSTS.find((host) => host.domains.some((domain) => name === domain || name.endsWith('.' + domain)));
}
/** The link a request names: a video host link, or an error at this boundary. */
function parseVideoLinkURL(input) {
    if (typeof input !== 'string') {
        throw new Error('Video link: expected text');
    }
    const link = videoLinkOf(input);
    if (link === undefined) {
        throw new Error('Video link: not a link to a known video host');
    }
    return link.url;
}
function parseLinkPreview(input) {
    const value = (0, record_1.toRecord)(input);
    if (value === undefined) {
        throw new Error('Link preview: expected object');
    }
    const url = parseVideoLinkURL(value['url']);
    const title = textField(value['title'], 'title', exports.LINK_PREVIEW_LIMITS.titleCharsMax);
    const source = textField(value['source'], 'source', exports.LINK_PREVIEW_LIMITS.authorCharsMax);
    if (title === undefined) {
        throw new Error('Link preview.title: expected text');
    }
    if (source === undefined) {
        throw new Error('Link preview.source: expected text');
    }
    const description = textField(value['description'], 'description', exports.LINK_PREVIEW_LIMITS.descriptionCharsMax);
    const author = textField(value['author'], 'author', exports.LINK_PREVIEW_LIMITS.authorCharsMax);
    const thumbnail = thumbnailField(value['thumbnail']);
    return {
        url,
        title,
        source,
        ...(description === undefined ? {} : { description }),
        ...(author === undefined ? {} : { author }),
        ...(thumbnail === undefined ? {} : { thumbnail }),
    };
}
function textField(input, name, charsMax) {
    if (input === undefined) {
        return undefined;
    }
    if (typeof input !== 'string') {
        throw new Error(`Link preview.${name}: expected text`);
    }
    if (input.length > charsMax) {
        throw new Error(`Link preview.${name}: exceeds ${charsMax} characters`);
    }
    return input;
}
function thumbnailField(input) {
    const thumbnail = textField(input, 'thumbnail', exports.LINK_PREVIEW_LIMITS.thumbnailCharsMax);
    if (thumbnail === undefined) {
        return undefined;
    }
    if (!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(thumbnail)) {
        throw new Error('Link preview.thumbnail: expected an image data URL');
    }
    return thumbnail;
}
