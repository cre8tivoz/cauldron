"use strict";
// The canvas path of a node's ::before or ::after. The navigator lists them as
// layers of their own, and their outlines are measured by the canvas like any
// tracked path: `0.2.1::before` is the ::before of the node at `0.2.1`. Node
// paths never contain a colon, so the suffix cannot be mistaken for one.
Object.defineProperty(exports, "__esModule", { value: true });
exports.pseudoPath = pseudoPath;
exports.splitPseudoPath = splitPseudoPath;
const assert_1 = require("../core/assert");
/** The canvas path of `pseudo` on the node at `nodePath`. */
function pseudoPath(nodePath, pseudo) {
    (0, assert_1.assert)(nodePath.length > 0, 'pseudoPath: a pseudo-element belongs to a node');
    (0, assert_1.assert)(!nodePath.includes('::'), 'pseudoPath: the node path is not already a pseudo path');
    const path = `${nodePath}::${pseudo}`;
    (0, assert_1.assert)(splitPseudoPath(path)?.nodePath === nodePath, 'pseudoPath: the path reads back');
    return path;
}
/** The node and pseudo-element a pseudo path names, or undefined for a node's own path. */
function splitPseudoPath(path) {
    const match = /^(.+)::(before|after)$/.exec(path);
    if (match === null) {
        return undefined;
    }
    const nodePath = match[1] ?? '';
    const pseudo = match[2] === 'before' ? 'before' : 'after';
    (0, assert_1.assert)(nodePath.length > 0, 'splitPseudoPath: the node path is not empty');
    return { nodePath, pseudo };
}
