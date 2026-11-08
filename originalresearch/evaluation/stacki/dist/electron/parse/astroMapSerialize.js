"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeMapCallback = serializeMapCallback;
// A general callback is code with markup holes. Interleave it without moving
// returns, declarations, comments, or awaits across their original scopes.
const assert_1 = require("../../shared/core/assert");
const limits_1 = require("../../shared/core/limits");
const astroScan_1 = require("./astroScan");
function serializeMapCallback(node, render) {
    const parts = node.bodyParts;
    (0, assert_1.assert)(parts !== undefined, 'General callbacks carry their JavaScript parts');
    (0, assert_1.assert)(parts.length === node.children.length + 1, 'Every markup root has surrounding code');
    (0, assert_1.assert)(parts.length <= limits_1.LIMITS.treeNodesMax + 1, 'Callback serialization is bounded');
    (0, assert_1.assert)(node.head.endsWith('('), 'A normalized callback head ends with its body placeholder');
    const head = node.headSource && (0, astroScan_1.normalizeHead)(node.headSource) === node.head ? node.headSource : node.head;
    const output = ['{', head.slice(0, -1)];
    for (let index = 0; index < parts.length; index++) {
        const part = parts[index];
        (0, assert_1.assert)(part !== undefined, 'Callback part index is in bounds');
        output.push(part);
        const child = node.children[index];
        if (child !== undefined) {
            output.push(render(child, index));
        }
    }
    return output.join('');
}
