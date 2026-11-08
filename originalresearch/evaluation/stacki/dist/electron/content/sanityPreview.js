"use strict";
// How a Sanity document shows in a list, as the Studio shows it: a title, a
// subtitle and an image, chosen by its schema's `preview.select` (sanitySchema.ts).
//
// A selected path may cross a reference, as `campus.name` does, so each step is
// read both through the reference and as a plain field. A `prepare` function
// that builds a subtitle is the Studio's code; its other selected values are
// shown as they are instead — a date as a date, a list as a count, text as text.
// A type with no preview is titled by its usual name fields.
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewProjection = previewProjection;
exports.mediaProjection = mediaProjection;
exports.previewOf = previewOf;
const assert_1 = require("../../shared/core/assert");
const entryTitle_1 = require("../../shared/properties/entryTitle");
const KEY = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const PATH = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*){0,2}$/;
// The name fields Astro entries are titled by too (entryTitle.ts), then the slug.
const FALLBACK_TITLE = `${entryTitle_1.NAME_KEYS.join(', ')}, slug.current`;
const SUBTITLE_CHARS_MAX = 200;
/** The query projection that reads a list row's preview values. */
function previewProjection(preview) {
    const title = preview?.title ? `${read(preview.title)}, ` : '';
    (0, assert_1.assert)((preview?.parts ?? []).every((part) => KEY.test(part.key)), 'Preview keys are names');
    const parts = [
        `"title": coalesce(${title}${FALLBACK_TITLE}, _id)`,
        preview?.media ? `"media": ${read(preview.media, '.asset->url')}` : '',
        // Each subtitle value in its place and under its selected name, so a list
        // is counted as what it holds ("4 links").
        ...(preview?.parts ?? []).map((part, index) => `"part${index}_${part.key}": ${read(part.path)}`),
    ].filter((part) => part !== '');
    return `"preview": {${parts.join(', ')}}`;
}
/**
 * The query projection that reads each document's picture by its own type's
 * preview `media`, for a list that mixes types (a reference's choices). A type
 * whose preview shows no picture reads none.
 */
function mediaProjection(types, mediaOf) {
    const cases = types.flatMap((type) => {
        const media = mediaOf(type);
        // The type is quoted as JSON, so no type name is read as GROQ.
        return media === undefined ? [] : [`_type == ${JSON.stringify(type)} => ${read(media, '.asset->url')}`];
    });
    (0, assert_1.assert)(cases.length <= types.length, 'One picture path per type at most');
    return cases.length === 0 ? '' : `, "media": select(${cases.join(', ')})`;
}
/** A row's title, subtitle and image from what the projection read. */
function previewOf(row) {
    const preview = isObject(row) ? Reflect.get(row, 'preview') : undefined;
    const value = (key) => (isObject(preview) ? Reflect.get(preview, key) : undefined);
    const title = value('title');
    const media = value('media');
    const parts = Object.keys(isObject(preview) ? preview : {})
        .map((key) => ({ key, match: /^part(\d+)_(\w+)$/.exec(key) }))
        .filter((entry) => entry.match !== null)
        .sort((left, right) => Number(left.match?.[1]) - Number(right.match?.[1]))
        .map((entry) => shown(value(entry.key), entry.match?.[2] ?? 'items'));
    const subtitle = parts
        .filter((part) => part !== undefined && part !== '')
        .join(' · ')
        .slice(0, SUBTITLE_CHARS_MAX);
    return {
        title: typeof title === 'string' ? title : undefined,
        subtitle: subtitle || undefined,
        imageURL: typeof media === 'string' && media.startsWith('https://') ? media : undefined,
    };
}
// A path read through references where a step is one, and as a field where not.
function read(path, suffix = '') {
    (0, assert_1.assert)(PATH.test(path), 'A preview path is plain field names');
    const steps = path.split('.');
    let ways = [steps[0] ?? ''];
    for (const step of steps.slice(1)) {
        ways = ways.flatMap((way) => [`${way}->${step}`, `${way}.${step}`]);
    }
    (0, assert_1.assert)(ways.length <= 4, 'A preview path is read at most four ways');
    return `coalesce(${ways.map((way) => `${way}${suffix}`).join(', ')})`;
}
// A selected value as text: a date read as a date, a list as how many it holds,
// named for what it was selected as ("4 links", "1 link").
function shown(value, name) {
    if (typeof value === 'number') {
        return String(value);
    }
    if (Array.isArray(value)) {
        const plural = name.endsWith('s') ? name : `${name}s`;
        const word = value.length === 1 ? plural.replace(/s$/, '') : plural;
        return `${value.length} ${word}`;
    }
    if (typeof value !== 'string') {
        return undefined;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(Date.parse(value))) {
        return new Date(value).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }
    return value;
}
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
