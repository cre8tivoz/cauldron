"use strict";
// Editing YAML without disturbing what is around the edit.
//
// YAML carries things a value alone cannot: comments, anchors, block scalars
// (`answer: |`), the difference between a plain and a quoted string, and the
// choice of flow or block style. Reading it into plain data and dumping it back
// out throws all of that away, which is why this goes through the `yaml`
// package's document model — the same node tree the file parses into, edited in
// place and re-emitted.
//
// Two rules do most of the work:
//   - a scalar that keeps its type is written into the existing node, so a
//     block scalar stays a block scalar and a quoted string stays quoted;
//   - anything else is set through the document, which quotes defensively.
//     This is the bug that bit the fixture project: an answer containing the
//     text `draft: true` has to come back out quoted, or the file no longer
//     parses.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.YAML = exports.DELETE = exports.parseDocument = exports.parseData = void 0;
exports.applyEdits = applyEdits;
exports.roundTrips = roundTrips;
const YAML = __importStar(require("yaml"));
exports.YAML = YAML;
const record_1 = require("../../../shared/core/record");
const transplant_1 = require("./transplant");
const PARSE_OPTIONS = { keepSourceTokens: true };
// Long strings are not re-wrapped and flow lists keep their spacing, which is
// what most files already look like.
const STRINGIFY_OPTIONS = { lineWidth: 0, flowCollectionPadding: false };
// An empty document parses to YAML's own `null`, a data value the file holds.
const parseData = (text) => YAML.parse(text);
exports.parseData = parseData;
const parseDocument = (text) => YAML.parseDocument(text, PARSE_OPTIONS);
exports.parseDocument = parseDocument;
// A YAML scalar: `null` here is the file's own null, not our absence.
const isPrimitive = (value) => value === null || ['string', 'number', 'boolean'].includes(typeof value);
const DELETE = Symbol('delete');
exports.DELETE = DELETE;
/**
 * Applies { path, value } edits to YAML source text. `DELETE` removes the key.
 */
function applyEdits(text, edits) {
    if (!edits.length) {
        return text;
    }
    const yamlDocument = parseDocument(text);
    // What the serializer makes of this file before anything is changed. When it
    // differs from the file on disk — a folded scalar it writes flat, a quote it
    // normalises — that difference is subtracted back out below rather than
    // landing in the user's diff.
    const before = yamlDocument.toString(STRINGIFY_OPTIONS);
    for (const { path, value, rename } of edits) {
        // A key renamed where it stands: the pair keeps its comments, its style and
        // its place among the others.
        if (rename !== undefined) {
            const parent = path.length > 1 ? yamlDocument.getIn(path.slice(0, -1), true) : yamlDocument.contents;
            const items = (0, record_1.toArray)((0, record_1.toRecord)(parent)?.['items']);
            const pair = items?.map((item) => (0, record_1.toRecord)(item)).find((item) => (0, record_1.toRecord)(item?.['key'])?.['value'] === path[path.length - 1]);
            const pairKey = (0, record_1.toRecord)(pair?.['key']);
            if (pairKey) {
                pairKey['value'] = rename;
            }
            continue;
        }
        if (!path.length) {
            if (value === DELETE) {
                continue;
            }
            const next = parseDocument(YAML.stringify(value, STRINGIFY_OPTIONS));
            yamlDocument.contents = next.contents;
            continue;
        }
        if (value === DELETE) {
            yamlDocument.deleteIn(path);
            continue;
        }
        const node = yamlDocument.getIn(path, true);
        const nodeRecord = (0, record_1.toRecord)(node);
        const nodeValue = nodeRecord?.['value'];
        // Writing into the node that is already there keeps its style — the block
        // scalar, the quoting, the comment sitting beside it.
        if (nodeRecord && nodeValue !== undefined && isPrimitive(value) && typeof nodeValue === typeof value) {
            nodeRecord['value'] = value;
            continue;
        }
        yamlDocument.setIn(path, value);
    }
    const after = yamlDocument.toString(STRINGIFY_OPTIONS);
    return before === text ? after : (0, transplant_1.transplant)(text, before, after);
}
/**
 * True when this text survives a parse and re-emit unchanged. Everything the
 * editor writes goes through the document model, so a file that does not round
 * trip cleanly would pick up unrelated changes on its first save — better to
 * know that before writing than to explain the diff afterwards.
 */
function roundTrips(text) {
    try {
        return parseDocument(text).toString(STRINGIFY_OPTIONS) === text;
    }
    catch {
        return false;
    }
}
