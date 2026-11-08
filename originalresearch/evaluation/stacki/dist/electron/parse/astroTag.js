"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanTag = scanTag;
// One balanced tag reader serves template parsing and conditional scanning so
// operators and braces inside props cannot turn surrounding markup into code.
const assert_1 = require("../../shared/core/assert");
const astroLexical_1 = require("./astroLexical");
const TAG_NAME = /<([A-Za-z][\w.-]*)/y;
function scanTag(source, start) {
    TAG_NAME.lastIndex = start;
    const match = TAG_NAME.exec(source);
    if (!match) {
        return undefined;
    }
    const name = match[1];
    (0, assert_1.assert)(name !== undefined, 'A matched tag has a name');
    const attrsAt = start + match[0].length;
    if (!/[\s/>]/.test(source.charAt(attrsAt))) {
        return undefined;
    }
    for (let position = attrsAt; position < source.length; position++) {
        const character = source.charAt(position);
        if (character === '>') {
            const selfClose = source.charAt(position - 1) === '/' ? '/' : '';
            (0, assert_1.assert)(position >= attrsAt, 'A tag ends after its name');
            return {
                full: source.slice(start, position + 1),
                name,
                attrs: source.slice(attrsAt, position - selfClose.length),
                selfClose,
                end: position + 1,
            };
        }
        if (character === '<') {
            return undefined; // Comments and child tags cannot occur inside an opening tag.
        }
        if (character === '{') {
            const end = (0, astroLexical_1.findMatchingBrace)(source, position);
            if (end === -1) {
                return undefined;
            }
            position = end;
        }
        else if (character === '"' || character === "'") {
            const end = source.indexOf(character, position + 1);
            if (end === -1) {
                return undefined;
            }
            position = end;
        }
    }
    return undefined;
}
