"use strict";
// A Sanity document's revision history, and restoring an earlier version, as
// the Studio's History panel does.
//
//   Revisions  the transactions that touched the document or its draft, newest
//              first, from Sanity's history API, each with when and by whom
//              (names from the project's member list; an unknown author is
//              "Someone" rather than a failure).
//   Restore    the document as it stood after a transaction — its draft then,
//              else its published version — becomes the draft, with Sanity's
//              replace-draft action. Nothing is published.
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanityRevisions = sanityRevisions;
exports.sanityRestore = sanityRestore;
const assert_1 = require("../../shared/core/assert");
const cmsRemote_1 = require("../../shared/properties/cmsRemote");
const sanityContent_1 = require("./sanityContent");
const MANAGE_VERSION = 'v2021-06-07';
async function sanityRevisions(target, id) {
    const ids = [id, `drafts.${id}`].map(encodeURIComponent).join(',');
    const text = await (0, sanityContent_1.sanityGet)(target, `${dataAddress(target)}/history/${target.dataset}/transactions/${ids}` + `?excludeContent=true&reverse=true&limit=${cmsRemote_1.CMS_REMOTE_LIMITS.revisionsMax}`);
    const rows = text
        .split('\n')
        .filter((line) => line.trim() !== '')
        .slice(0, cmsRemote_1.CMS_REMOTE_LIMITS.revisionsMax)
        .map((line) => JSON.parse(line));
    const transactions = rows.flatMap((row) => {
        const id = stringAt(row, 'id');
        const timestamp = stringAt(row, 'timestamp');
        const author = stringAt(row, 'author') ?? '';
        return id === undefined || timestamp === undefined ? [] : [{ id, timestamp, author }];
    });
    const names = await authorNames(target, [...new Set(transactions.map((entry) => entry.author))]);
    (0, assert_1.assert)(transactions.length <= cmsRemote_1.CMS_REMOTE_LIMITS.revisionsMax, 'History stays within its bound');
    return transactions.map((entry) => ({
        id: entry.id,
        timestamp: entry.timestamp,
        author: names.get(entry.author) ?? 'Someone',
    }));
}
async function sanityRestore(target, id, revision) {
    const ids = [`drafts.${id}`, id].map(encodeURIComponent).join(',');
    const text = await (0, sanityContent_1.sanityGet)(target, `${dataAddress(target)}/history/${target.dataset}/documents/${ids}` + `?revision=${encodeURIComponent(revision)}`);
    const body = JSON.parse(text);
    const documents = isObject(body) ? Reflect.get(body, 'documents') : undefined;
    const list = Array.isArray(documents) ? documents : [];
    const draft = list.find((entry) => idOf(entry) === `drafts.${id}`);
    const shown = draft ?? list.find((entry) => idOf(entry) === id);
    if (!isObject(shown)) {
        throw new Error('That version can no longer be read.');
    }
    // The content as it was; Sanity sets the system fields of the new draft itself.
    const attributes = Object.fromEntries(Object.entries(shown).filter(([key]) => !['_rev', '_createdAt', '_updatedAt'].includes(key)));
    (0, assert_1.assert)(typeof Reflect.get(attributes, '_type') === 'string', 'A restored version has a type');
    await (0, sanityContent_1.sanityRequest)(target, `actions/${target.dataset}`, {
        actions: [
            {
                actionType: 'sanity.action.document.replaceDraft',
                publishedId: id,
                attributes: { ...attributes, _id: `drafts.${id}` },
            },
        ],
    });
}
// Display names for user ids, from the project's members; any it cannot read are left out.
async function authorNames(target, ids) {
    const named = ids.filter((id) => /^[A-Za-z0-9_-]{1,64}$/.test(id)).slice(0, 50);
    if (named.length === 0) {
        return new Map();
    }
    try {
        const project = `https://api.sanity.io/${MANAGE_VERSION}/projects/${target.projectId}`;
        const text = await (0, sanityContent_1.sanityGet)(target, `${project}/users/${named.join(',')}`);
        const body = JSON.parse(text);
        const users = Array.isArray(body) ? body : [body];
        return new Map(users.flatMap((user) => {
            const id = stringAt(user, 'id');
            const name = stringAt(user, 'displayName');
            return id === undefined || name === undefined ? [] : [[id, name]];
        }));
    }
    catch {
        return new Map();
    }
}
function dataAddress(target) {
    return `https://${target.projectId}.api.sanity.io/${sanityContent_1.SANITY_API_VERSION}/data`;
}
function stringAt(value, key) {
    const found = isObject(value) ? Reflect.get(value, key) : undefined;
    return typeof found === 'string' ? found.slice(0, 200) : undefined;
}
function idOf(value) {
    const id = isObject(value) ? Reflect.get(value, '_id') : undefined;
    return typeof id === 'string' ? id : undefined;
}
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
