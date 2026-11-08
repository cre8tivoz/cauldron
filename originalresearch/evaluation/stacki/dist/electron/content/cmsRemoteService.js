"use strict";
// What the CMS panel can do with one connected Sanity dataset, for a project at
// `root`: the same answers whichever host asks. Desktop calls it from its IPC
// handlers (cmsConnectionHandlers.ts) with a key it decrypted itself; Stacki
// Studio calls it from its server with the key its Worker decrypted for the
// request. Each read of the site's schema code is fresh, so a schema edit shows
// without a restart.
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmsRemoteService = cmsRemoteService;
exports.cmsFailureMessage = cmsFailureMessage;
const assert_1 = require("../../shared/core/assert");
const sanityContent_1 = require("./sanityContent");
const sanityEdits_1 = require("./sanityEdits");
const sanityHistory_1 = require("./sanityHistory");
const sanitySchema_1 = require("./sanitySchema");
const sanityStructure_1 = require("./sanityStructure");
const sanityUpload_1 = require("./sanityUpload");
function cmsRemoteService(root, target) {
    (0, assert_1.assert)(root.length > 0, 'A CMS service belongs to a project');
    (0, assert_1.assert)(target.token.length > 0, 'A CMS service holds a key');
    const schemaOf = () => {
        const named = (0, sanitySchema_1.sanityNamedTypes)(root);
        const lists = (0, sanitySchema_1.sanityConstantLists)(root);
        return (type) => (0, sanitySchema_1.sanityDocumentSchema)(named, type, lists);
    };
    const previewFor = (type) => (0, sanitySchema_1.sanityDocumentSchema)((0, sanitySchema_1.sanityNamedTypes)(root), type)?.preview;
    const documents = (collection, columns = []) => (0, sanityContent_1.sanityDocuments)(target, collection, previewFor(collection), columns);
    const document = (id) => (0, sanityContent_1.sanityDocument)(target, id, schemaOf());
    return {
        // In the order the site's own Studio lists them, each with its schema's icon.
        collections: async () => {
            const collections = await (0, sanityContent_1.sanityCollections)(target);
            const names = collections.map((collection) => collection.name);
            const order = (0, sanityStructure_1.inStructureOrder)(names, (0, sanityStructure_1.sanityStructureOrder)(root, names));
            const icons = (0, sanitySchema_1.sanityTypeIcons)(root);
            return order.flatMap((name) => collections.filter((entry) => entry.name === name).map((entry) => ({ ...entry, icon: icons.get(name) })));
        },
        documents,
        create: async (collection) => {
            const list = await (0, sanityContent_1.sanityDocuments)(target, collection);
            return (0, sanityEdits_1.sanityCreateDraft)(target, collection, { orderable: list.orderable });
        },
        remove: (ids) => (0, sanityEdits_1.sanityDelete)(target, ids),
        move: async (move) => {
            await (0, sanityEdits_1.sanityMove)(target, move);
            return documents(move.collection);
        },
        document,
        template: async (collection) => (0, sanityContent_1.sanityTemplate)(collection, schemaOf()),
        write: async (write) => {
            await (0, sanityContent_1.sanityWriteDraft)(target, write);
            return document(write.id);
        },
        // The document as it then stands, or none when discarding a never-published draft removed it.
        act: async (id, action) => {
            await (0, sanityEdits_1.sanityAct)(target, id, action);
            return document(id).catch(() => undefined);
        },
        history: (id) => (0, sanityHistory_1.sanityRevisions)(target, id),
        restore: async (id, revision) => {
            await (0, sanityHistory_1.sanityRestore)(target, id, revision);
            return document(id);
        },
        // Each choice with its picture, read by its type's own preview.
        references: (types) => {
            const named = (0, sanitySchema_1.sanityNamedTypes)(root);
            return (0, sanityContent_1.sanityReferenceOptions)(target, types, (type) => (0, sanitySchema_1.sanityDocumentSchema)(named, type)?.preview?.media);
        },
        upload: (kind, file) => (0, sanityUpload_1.sanityUploadBytes)(target, kind, file.name, file.bytes),
    };
}
/**
 * No network and a timed-out request read as what they are, not as fetch's own
 * words ("fetch failed"): Stacki works offline, and only the CMS waits for it.
 */
function cmsFailureMessage(error) {
    if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
            return 'The CMS took too long to answer. Check your connection and try again.';
        }
        if (error instanceof TypeError && error.message === 'fetch failed') {
            return 'Can’t reach the CMS. Check your internet connection and try again.';
        }
        return error.message || 'The CMS request failed.';
    }
    return String(error) || 'The CMS request failed.';
}
