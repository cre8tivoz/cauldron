"use strict";
// A connected Sanity dataset, as the CMS panel reads and writes it.
//
//   Collections  the document types in the dataset, with a count each. Sanity
//                does not serve a project's schema over its API (a schema lives
//                in the Studio's code), so types are read from the documents.
//   Documents    the newest of one type. Read raw, so a draft and its published
//                document are told apart: a draft alone is "draft", both is
//                "changed", the published alone is "published".
//   Fields       one document's fields, the draft's where there is one, typed
//                by the site's schema code (sanitySchema.ts, sanityFields.ts),
//                with the addresses of the images and files they point at.
//   Writes       Sanity's own "edit" action, which creates the draft from the
//                published document when there is none and sets or removes one
//                field. Nothing is published (docs/contracts.md, "CMS
//                connections"). Uploads store an asset; a write then points at it.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SANITY_TIMEOUT_MS = exports.SANITY_API_VERSION = void 0;
exports.sanityCollections = sanityCollections;
exports.sanityDocuments = sanityDocuments;
exports.sanityDocument = sanityDocument;
exports.sanityTemplate = sanityTemplate;
exports.sanityWriteDraft = sanityWriteDraft;
exports.sanityReferenceOptions = sanityReferenceOptions;
exports.sanityQuery = sanityQuery;
exports.sanityRequest = sanityRequest;
exports.sanityGet = sanityGet;
const assert_1 = require("../../shared/core/assert");
const sanityRank_1 = require("./sanityRank");
const sanityFields_1 = require("./sanityFields");
const sanityPreview_1 = require("./sanityPreview");
const cmsRemote_1 = require("../../shared/properties/cmsRemote");
exports.SANITY_API_VERSION = 'v2025-02-19';
exports.SANITY_TIMEOUT_MS = 15_000;
// A type a person made: a valid name, not one of Sanity's own (also excluded by
// the query; checked here too, so a change there cannot list them).
function userType(name) {
    if (!/^[A-Za-z_][\w.-]{0,127}$/.test(name)) {
        return false;
    }
    return !name.startsWith('sanity.') && !name.startsWith('system.');
}
// Documents Sanity keeps for itself: system types, and ids in the `_.` namespace.
const USER_DOCUMENTS = '!(_id in path("_.**")) && !(_type match "sanity.*") && !(_type match "system.*")';
async function sanityCollections(target) {
    const types = await sanityQuery(target, `array::unique(*[${USER_DOCUMENTS}]._type)`, {}, 'raw');
    if (!Array.isArray(types)) {
        throw new Error('Sanity returned an unexpected type list.');
    }
    const names = types
        .filter((name) => typeof name === 'string' && userType(name))
        .slice(0, cmsRemote_1.CMS_REMOTE_LIMITS.collectionsMax)
        .sort((left, right) => left.localeCompare(right));
    if (names.length === 0) {
        return [];
    }
    // One request for every count: {"c0": count(*[_type == $t0 …]), …}.
    const params = Object.fromEntries(names.map((name, index) => [`t${index}`, name]));
    const counts = names.map((_name, index) => `"c${index}": count(*[_type == $t${index} && ${USER_DOCUMENTS}])`).join(', ');
    const result = await sanityQuery(target, `{${counts}}`, params, 'published');
    return names.map((name, index) => ({
        name,
        count: countOf(result, `c${index}`),
        icon: undefined,
    }));
}
async function sanityDocuments(target, type, preview, columns = []) {
    const rows = await sanityQuery(target, `*[_type == $type && ${USER_DOCUMENTS}] | order(_updatedAt desc) [0...$limit]` +
        `{_id, _updatedAt, orderRank, ${(0, sanityPreview_1.previewProjection)(preview)}${cellsProjection(columns)}}`, { type, limit: cmsRemote_1.CMS_REMOTE_LIMITS.documentsMax * 2 }, 'raw');
    if (!Array.isArray(rows)) {
        throw new Error('Sanity returned an unexpected document list.');
    }
    const summaries = summarise(rows, columns);
    // Ordered where every document carries a rank (the orderable plugin's list);
    // otherwise newest first, as the query returned them.
    const orderable = summaries.length > 0 && summaries.every((entry) => entry.rank !== undefined);
    const ordered = orderable ? [...summaries].sort((left, right) => ((left.rank ?? '') < (right.rank ?? '') ? -1 : 1)) : summaries;
    return { orderable, documents: ordered.map(({ rank: _rank, ...summary }) => summary) };
}
async function sanityDocument(target, id, schemaOf) {
    const result = await sanityQuery(target, '*[_id in [$id, "drafts." + $id]]', { id }, 'raw');
    if (!Array.isArray(result)) {
        throw new Error('Sanity returned an unexpected document.');
    }
    const both = result;
    const draft = both.find((entry) => idOf(entry) === `drafts.${id}`);
    const published = both.find((entry) => idOf(entry) === id);
    const shown = draft ?? published;
    if (typeof shown !== 'object' || shown === null) {
        throw new Error('This document no longer exists.');
    }
    const type = Reflect.get(shown, '_type');
    if (typeof type !== 'string') {
        throw new Error('This document has no type.');
    }
    const schema = schemaOf(type);
    const fields = (0, sanityFields_1.documentFields)(shown, schema);
    const refs = fields.flatMap((field) => (0, sanityFields_1.assetRefs)(field.value));
    return {
        id,
        type,
        status: statusOf({ draft: draft !== undefined, published: published !== undefined }),
        fields,
        assets: refs.length === 0 ? [] : await sanityAssets(target, refs),
        editedAt: draft === undefined ? undefined : stringAt(draft, '_updatedAt'),
        publishedAt: published === undefined ? undefined : stringAt(published, '_updatedAt'),
        editURL: undefined,
        ...fieldGroupsOf(schema),
    };
}
/** A type's fields with no values: what a new document is edited as before it is created. */
function sanityTemplate(type, schemaOf) {
    const schema = schemaOf(type);
    const fields = (0, sanityFields_1.documentFields)({ _type: type }, schema);
    (0, assert_1.assert)(fields.every((field) => field.value === undefined), 'A template holds no values');
    return {
        id: cmsRemote_1.REMOTE_TEMPLATE_ID,
        type,
        status: 'draft',
        fields,
        assets: [],
        editedAt: undefined,
        publishedAt: undefined,
        editURL: undefined,
        ...fieldGroupsOf(schema),
    };
}
// The tabs a document's schema splits its fields into, when it names any.
function fieldGroupsOf(schema) {
    return schema?.fieldGroups === undefined ? {} : { fieldGroups: schema.fieldGroups };
}
// The stored files behind asset references: their addresses and file names.
async function sanityAssets(target, ids) {
    const bounded = ids.slice(0, cmsRemote_1.CMS_REMOTE_LIMITS.assetsMax);
    const rows = await sanityQuery(target, '*[_id in $ids]{_id, url, originalFilename}', { ids: bounded }, 'raw');
    const out = [];
    for (const row of Array.isArray(rows) ? rows : []) {
        const id = idOf(row);
        const url = stringAt(row, 'url');
        if (id !== undefined && url !== undefined && url.startsWith('https://')) {
            out.push({ id, url, filename: stringAt(row, 'originalFilename') ?? id });
        }
    }
    (0, assert_1.assert)(out.length <= bounded.length, 'Each asset is found at most once');
    return out;
}
/** Sets one field on the document's draft, or removes it; the draft is made when needed. */
async function sanityWriteDraft(target, write) {
    (0, assert_1.assert)(!write.id.startsWith('drafts.'), 'A write names the published id');
    (0, assert_1.assert)(!write.field.startsWith('_'), 'A write never touches system keys');
    const patch = write.value === undefined ? { unset: [write.field] } : { set: { [write.field]: write.value } };
    const action = {
        actionType: 'sanity.action.document.edit',
        publishedId: write.id,
        draftId: `drafts.${write.id}`,
        patch,
    };
    await sanityRequest(target, `actions/${target.dataset}`, { actions: [action] });
}
/** Published documents of these types, to pick one for a reference. */
async function sanityReferenceOptions(target, types, mediaOf = () => undefined) {
    if (types.length === 0) {
        return [];
    }
    const rows = await sanityQuery(target, `*[_type in $types && ${USER_DOCUMENTS}] | order(_updatedAt desc) [0...$limit]` +
        `{_id, _type, "title": coalesce(title, name, heading, label, slug.current, _id)${(0, sanityPreview_1.mediaProjection)(types, mediaOf)}}`, { types, limit: cmsRemote_1.CMS_REMOTE_LIMITS.documentsMax }, 'published');
    const options = (Array.isArray(rows) ? rows : []).flatMap((row) => {
        const id = idOf(row);
        const type = stringAt(row, '_type');
        if (id === undefined || type === undefined || !/^[\w][\w.-]{0,127}$/.test(id)) {
            return [];
        }
        const media = stringAt(row, 'media');
        const imageURL = media !== undefined && media.startsWith('https://') ? media : undefined;
        return [{ id, type, title: (stringAt(row, 'title') ?? id).slice(0, 200), imageURL }];
    });
    return options.sort((left, right) => left.title.localeCompare(right.title));
}
// The fields a list shows as columns, under `cells`: a reference by its document's name.
// Names are passed through JSON quoting into `@[...]`, so no name is read as GROQ.
function cellsProjection(columns) {
    (0, assert_1.assert)(columns.length <= cmsRemote_1.CMS_REMOTE_LIMITS.columnsMax, 'A list asks for few columns');
    if (columns.length === 0) {
        return '';
    }
    const cells = columns.map((name) => {
        const field = `@[${JSON.stringify(name)}]`;
        return `${JSON.stringify(name)}: coalesce(${field}->title, ${field}->name, ${field})`;
    });
    return `, "cells": {${cells.join(', ')}}`;
}
// A row's columns, each as its short value; a field with nothing to show is left out.
function cellsOf(row, columns) {
    const stored = typeof row === 'object' && row !== null ? Reflect.get(row, 'cells') : {};
    const out = {};
    for (const name of columns) {
        const cell = (0, cmsRemote_1.remoteCell)(typeof stored === 'object' && stored !== null ? Reflect.get(stored, name) : undefined);
        if (cell !== undefined) {
            out[name] = cell;
        }
    }
    return out;
}
function summarise(rows, columns) {
    const byId = new Map();
    for (const row of rows) {
        const raw = idOf(row);
        if (raw === undefined || raw.startsWith('versions.')) {
            continue;
        }
        const id = raw.startsWith('drafts.') ? raw.slice('drafts.'.length) : raw;
        const entry = byId.get(id) ?? {};
        byId.set(id, raw.startsWith('drafts.') ? { ...entry, draft: row } : { ...entry, published: row });
    }
    const out = [];
    for (const [id, entry] of byId) {
        const shown = entry.draft ?? entry.published;
        if (out.length >= cmsRemote_1.CMS_REMOTE_LIMITS.documentsMax || !/^[\w][\w.-]{0,127}$/.test(id)) {
            continue;
        }
        const shownPreview = (0, sanityPreview_1.previewOf)(shown);
        out.push({
            id,
            title: shownPreview.title ?? id,
            subtitle: shownPreview.subtitle,
            imageURL: shownPreview.imageURL,
            status: statusOf({
                draft: entry.draft !== undefined,
                published: entry.published !== undefined,
            }),
            updatedAt: stringAt(shown, '_updatedAt') ?? '',
            ...(columns.length === 0 ? {} : { cells: cellsOf(shown, columns) }),
            rank: rankOf(entry.published) ?? rankOf(entry.draft),
        });
    }
    return out;
}
function rankOf(document) {
    const rank = stringAt(document, 'orderRank');
    return (0, sanityRank_1.isRank)(rank) ? rank : undefined;
}
function statusOf(has) {
    if (!has.draft) {
        return 'published';
    }
    return has.published ? 'changed' : 'draft';
}
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function idOf(value) {
    return stringAt(value, '_id');
}
function stringAt(value, key) {
    if (!isPlainObject(value)) {
        return undefined;
    }
    const found = Reflect.get(value, key);
    return typeof found === 'string' ? found : undefined;
}
function countOf(result, key) {
    const found = isPlainObject(result) ? Reflect.get(result, key) : undefined;
    return typeof found === 'number' && Number.isSafeInteger(found) && found >= 0 ? found : 0;
}
async function sanityQuery(target, query, params, perspective) {
    // A POST query takes its perspective in the address, its query and params in the body.
    const body = await sanityRequest(target, `query/${target.dataset}?perspective=${perspective}`, {
        query,
        params,
    });
    return isPlainObject(body) ? Reflect.get(body, 'result') : undefined;
}
async function sanityRequest(target, path, body) {
    (0, assert_1.assert)(/^[a-z0-9]{1,64}$/.test(target.projectId), 'A Sanity project id is lower-case');
    const url = `https://${target.projectId}.api.sanity.io/${exports.SANITY_API_VERSION}/data/${path}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${target.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        redirect: 'error',
        signal: AbortSignal.timeout(exports.SANITY_TIMEOUT_MS),
    });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : undefined;
    if (!response.ok) {
        const message = isPlainObject(parsed) ? Reflect.get(parsed, 'message') : undefined;
        throw new Error(typeof message === 'string' && message ? message.slice(0, 300) : `Sanity answered ${response.status}.`);
    }
    return parsed;
}
/** A GET against the dataset's API (history), its answer as text; NDJSON is the caller's. */
async function sanityGet(target, url) {
    (0, assert_1.assert)(url.startsWith('https://'), 'A Sanity read is over https');
    (0, assert_1.assert)(/^[a-z0-9]{1,64}$/.test(target.projectId), 'A Sanity project id is lower-case');
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${target.token}` },
        redirect: 'error',
        signal: AbortSignal.timeout(exports.SANITY_TIMEOUT_MS),
    });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Sanity answered ${response.status}.`);
    }
    return text;
}
