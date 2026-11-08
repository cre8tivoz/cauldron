"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syntaxNodes = syntaxNodes;
exports.isAstroProps = isAstroProps;
// The TypeScript syntax helpers every reader of a component's frontmatter
// shares: a bounded walk over a syntax tree, and the test for `Astro.props`
// (through the `as` and parentheses a component may wrap it in). The prop
// model (propModel/) and the Properties panel's editor
// (electron/properties/propertySyntax.ts, which re-exports these) read the
// same nodes the same way.
const typescript_1 = __importDefault(require("typescript"));
const assert_1 = require("../../shared/core/assert");
const propertyEditing_1 = require("../../shared/properties/propertyEditing");
function syntaxNodes(root) {
    const pending = [root];
    const output = [];
    // Every node is visited once and the node budget caps both work and memory.
    for (let index = 0; index < pending.length; index += 1) {
        (0, assert_1.assert)(pending.length <= propertyEditing_1.PROPERTY_LIMITS.nodesMax, 'TypeScript node budget');
        const node = pending[index];
        (0, assert_1.assert)(node !== undefined, 'Queued syntax node exists');
        output.push(node);
        node.forEachChild((child) => {
            pending.push(child);
        });
    }
    return output;
}
function isAstroProps(node) {
    if (!node) {
        return false;
    }
    if (typescript_1.default.isAsExpression(node) || typescript_1.default.isParenthesizedExpression(node)) {
        return isAstroPropsUnwrap(node);
    }
    return typescript_1.default.isPropertyAccessExpression(node) && typescript_1.default.isIdentifier(node.expression) && node.expression.text === 'Astro' && node.name.text === 'props';
}
// `(Astro.props as Props)` nests a wrapper or two; a hundred is a generated file.
const PROPS_WRAPPER_DEPTH_MAX = 128;
function isAstroPropsUnwrap(node) {
    let current = node;
    for (let depth = 0; depth < PROPS_WRAPPER_DEPTH_MAX; depth += 1) {
        if (typescript_1.default.isAsExpression(current) || typescript_1.default.isParenthesizedExpression(current)) {
            current = current.expression;
        }
        else {
            return isAstroProps(current);
        }
    }
    (0, assert_1.assert)(false, 'Astro.props wrapper depth is bounded');
}
