"use strict";
// The invariants every page tree holds, whoever built it: unique ids, paired
// nodes owning their children, bounded depth and size (pageNode.ts).
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertTreeInvariants = assertTreeInvariants;
const limits_1 = require("../core/limits");
/** Check the producer's own tree without cloning it or claiming it has already
 * crossed the wire parser. Iteration makes the depth limit independent of the
 * JavaScript call stack. The receiver checks the same invariant after parsing. */
function assertTreeInvariants(nodes) {
    if (nodes.length > limits_1.LIMITS.treeNodesMax) {
        throw new Error(`Tree invariant violated: exceeds ${limits_1.LIMITS.treeNodesMax} nodes`);
    }
    const pending = nodes.map((node) => ({ node, depth: 0 }));
    const ids = new Set();
    for (let index = 0; index < pending.length; index++) {
        const entry = pending[index];
        if (!entry) {
            throw new Error('Tree invariant violated: missing traversal entry');
        }
        if (entry.depth > limits_1.LIMITS.treeDepthMax) {
            throw new Error(`Tree invariant violated: exceeds depth ${limits_1.LIMITS.treeDepthMax}`);
        }
        const { node, depth } = entry;
        if (typeof node.id !== 'string') {
            throw new Error('Tree invariant violated: missing id');
        }
        if (ids.has(node.id)) {
            throw new Error(`Tree invariant violated: duplicate id ${node.id}`);
        }
        ids.add(node.id);
        if (node.children) {
            if (pending.length + node.children.length > limits_1.LIMITS.treeNodesMax) {
                throw new Error(`Tree invariant violated: exceeds ${limits_1.LIMITS.treeNodesMax} nodes`);
            }
            for (const child of node.children) {
                pending.push({ node: child, depth: depth + 1 });
            }
        }
    }
}
