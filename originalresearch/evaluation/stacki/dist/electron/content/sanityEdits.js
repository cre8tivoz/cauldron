"use strict";
// Edits to a Sanity collection as a whole, from the CMS panel: a new document,
// deleting documents, and dragging one into a new place.
//
//   New      a draft of the collection's type, nothing published; in an ordered
//            collection it is ranked after the last document.
//   Delete   what Sanity Studio's Delete does, after the panel has confirmed it:
//            a published document goes with its draft; a draft that was never
//            published is discarded. Sanity keeps the history of both.
//   Move     what the orderable-document-list plugin does: the moved document's
//            rank, on its published document and its draft alike, becomes one
//            between its new neighbours' (sanityRank.ts). Only it is written.
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanityCreateDraft = sanityCreateDraft;
exports.sanityDelete = sanityDelete;
exports.sanityMove = sanityMove;
exports.sanityAct = sanityAct;
const node_crypto_1 = require("node:crypto");
const assert_1 = require("../../shared/core/assert");
const sanityContent_1 = require("./sanityContent");
const sanityRank_1 = require("./sanityRank");
async function sanityCreateDraft(target, type, ordered) {
    const id = (0, node_crypto_1.randomUUID)();
    const last = ordered.orderable ? await lastRank(target, type) : undefined;
    const attributes = {
        _id: `drafts.${id}`,
        _type: type,
        ...(ordered.orderable ? { orderRank: (0, sanityRank_1.rankBetween)(last, undefined) } : {}),
    };
    await (0, sanityContent_1.sanityRequest)(target, `actions/${target.dataset}`, {
        actions: [
            {
                actionType: 'sanity.action.document.create',
                publishedId: id,
                attributes,
                ifExists: 'fail',
            },
        ],
    });
    return {
        id,
        title: 'Untitled',
        subtitle: undefined,
        imageURL: undefined,
        status: 'draft',
        updatedAt: new Date().toISOString(),
    };
}
async function sanityDelete(target, ids) {
    (0, assert_1.assert)(ids.length > 0, 'A delete names documents');
    const existing = await existingIds(target, ids);
    const actions = ids.flatMap((id) => {
        const published = existing.has(id);
        const draft = existing.has(`drafts.${id}`);
        if (published) {
            return [
                {
                    actionType: 'sanity.action.document.delete',
                    publishedId: id,
                    includeDrafts: draft ? [`drafts.${id}`] : [],
                },
            ];
        }
        return draft ? [{ actionType: 'sanity.action.document.discard', draftId: `drafts.${id}` }] : [];
    });
    if (actions.length > 0) {
        await (0, sanityContent_1.sanityRequest)(target, `actions/${target.dataset}`, { actions });
    }
    return actions.length;
}
async function sanityMove(target, move) {
    const neighbours = [move.after, move.before].filter((id) => id !== undefined);
    const ranks = await ranksOf(target, neighbours);
    const after = move.after === undefined ? undefined : ranks.get(move.after);
    const before = move.before === undefined ? undefined : ranks.get(move.before);
    if (move.after !== undefined && after === undefined) {
        throw new Error('The list changed in Sanity. Reopen it and try again.');
    }
    if (move.before !== undefined && before === undefined) {
        throw new Error('The list changed in Sanity. Reopen it and try again.');
    }
    const orderRank = (0, sanityRank_1.rankBetween)(after, before);
    const existing = await existingIds(target, [move.id]);
    const patches = [move.id, `drafts.${move.id}`].filter((id) => existing.has(id)).map((id) => ({ patch: { id, set: { orderRank } } }));
    (0, assert_1.assert)(patches.length > 0, 'A moved document exists');
    await (0, sanityContent_1.sanityRequest)(target, `mutate/${target.dataset}`, { mutations: patches });
}
// Which of these documents, and their drafts, exist.
async function existingIds(target, ids) {
    const all = ids.flatMap((id) => [id, `drafts.${id}`]);
    const found = await (0, sanityContent_1.sanityQuery)(target, '*[_id in $ids]._id', { ids: all }, 'raw');
    return new Set(Array.isArray(found) ? found.filter((id) => typeof id === 'string') : []);
}
// Each document's rank: its published document's, which the plugin writes, else its draft's.
async function ranksOf(target, ids) {
    const all = ids.flatMap((id) => [id, `drafts.${id}`]);
    const rows = await (0, sanityContent_1.sanityQuery)(target, '*[_id in $ids]{_id, orderRank}', { ids: all }, 'raw');
    const ranks = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
        const id = typeof row === 'object' && row !== null ? Reflect.get(row, '_id') : undefined;
        const rank = typeof row === 'object' && row !== null ? Reflect.get(row, 'orderRank') : undefined;
        if (typeof id === 'string' && (0, sanityRank_1.isRank)(rank)) {
            const published = id.replace(/^drafts\./, '');
            if (!ranks.has(published) || id === published) {
                ranks.set(published, rank);
            }
        }
    }
    return ranks;
}
async function lastRank(target, type) {
    const rank = await (0, sanityContent_1.sanityQuery)(target, '*[_type == $type && defined(orderRank)] | order(orderRank desc) [0].orderRank', { type }, 'raw');
    return (0, sanityRank_1.isRank)(rank) ? rank : undefined;
}
/**
 * Publish, discard or unpublish, with Sanity's own actions — what the Studio's
 * Publish button and its menu do. Publishing needs a draft; discarding a draft
 * that was never published removes the document; unpublishing keeps its
 * content as a draft.
 */
async function sanityAct(target, id, action) {
    (0, assert_1.assert)(!id.startsWith('drafts.'), 'An action names the published id');
    const existing = await existingIds(target, [id]);
    const draft = existing.has(`drafts.${id}`);
    const published = existing.has(id);
    const request = actionRequest(id, action, { draft, published });
    (0, assert_1.assert)(request.actionType.startsWith('sanity.action.document.'), 'An action is Sanity’s own');
    await (0, sanityContent_1.sanityRequest)(target, `actions/${target.dataset}`, { actions: [request] });
}
function actionRequest(id, action, has) {
    switch (action) {
        case 'publish':
            if (!has.draft) {
                throw new Error('There are no changes to publish.');
            }
            return {
                actionType: 'sanity.action.document.publish',
                draftId: `drafts.${id}`,
                publishedId: id,
            };
        case 'discard':
            if (!has.draft) {
                throw new Error('There are no changes to discard.');
            }
            return { actionType: 'sanity.action.document.discard', draftId: `drafts.${id}` };
        case 'unpublish':
            if (!has.published) {
                throw new Error('This item is not published.');
            }
            return {
                actionType: 'sanity.action.document.unpublish',
                draftId: `drafts.${id}`,
                publishedId: id,
            };
        default: {
            const exhaustive = action;
            return exhaustive;
        }
    }
}
