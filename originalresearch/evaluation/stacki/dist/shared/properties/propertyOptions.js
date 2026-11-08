"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.literalOptions = literalOptions;
const propertyEditing_1 = require("./propertyEditing");
// Only literal unions expose option controls. Complex unions remain in the type editor.
function literalOptions(type) {
    const tokens = type.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?|true|false/g);
    if (!tokens || tokens.length < 1 || tokens.length > propertyEditing_1.PROPERTY_LIMITS.fieldsMax) {
        return undefined;
    }
    const remaining = type.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?|true|false/g, '');
    if (!/^\s*(?:\|\s*)*$/.test(remaining)) {
        return undefined;
    }
    if ((remaining.match(/\|/g)?.length ?? 0) !== tokens.length - 1) {
        return undefined;
    }
    return tokens;
}
