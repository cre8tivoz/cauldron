"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RELEASE_REPOSITORY = void 0;
exports.boundedText = boundedText;
exports.latestRelease = latestRelease;
exports.downloadRelease = downloadRelease;
const studioValidation_1 = require("../../shared/ipc/studioValidation");
const studioRelease_1 = require("../../shared/ipc/studioRelease");
exports.RELEASE_REPOSITORY = 'flowtricks/stacki-releases';
async function boundedText(response, maximum) {
    if (!response.ok || !response.body) {
        throw new Error('Stacki release request failed');
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false });
    let bytes = 0;
    let text = '';
    try {
        while (bytes <= maximum) {
            const chunk = await reader.read();
            if (chunk.done) {
                return text + decoder.decode();
            }
            const value = chunk.value;
            if (!(value instanceof Uint8Array) || value.byteLength === 0) {
                throw new Error('Invalid release response chunk');
            }
            bytes += value.byteLength;
            if (bytes > maximum) {
                throw new Error('Stacki release response exceeds its limit');
            }
            text += decoder.decode(value, { stream: true });
        }
        throw new Error('Stacki release response exceeds its limit');
    }
    finally {
        await reader.cancel();
    }
}
async function latestRelease() {
    const response = await fetch(`https://api.github.com/repos/${exports.RELEASE_REPOSITORY}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Stacki-Studio' },
        signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 404) {
        return undefined;
    }
    const value = (0, studioValidation_1.record)(JSON.parse(await boundedText(response, 1_000_000)));
    const version = (0, studioRelease_1.releaseVersion)((0, studioValidation_1.string)(value['tag_name'], 50).replace(/^v/, ''));
    const assets = value['assets'];
    if (!Array.isArray(assets) || assets.length > 100) {
        throw new Error('Invalid release assets');
    }
    if (!assets.some((asset) => (0, studioValidation_1.record)(asset)['name'] === `stacki-studio-${version}.json`)) {
        return undefined;
    }
    return { version, url: `https://github.com/${exports.RELEASE_REPOSITORY}/releases/tag/v${version}` };
}
async function downloadRelease(input) {
    const version = (0, studioRelease_1.releaseVersion)(input);
    const base = `https://github.com/${exports.RELEASE_REPOSITORY}/releases/download/v${version}`;
    const url = `${base}/stacki-studio-${version}.json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    const release = (0, studioRelease_1.parseRelease)(JSON.parse(await boundedText(response, studioRelease_1.RELEASE_BYTES_MAX)));
    if (release.version !== version) {
        throw new Error('Downloaded a different Studio release');
    }
    return release;
}
