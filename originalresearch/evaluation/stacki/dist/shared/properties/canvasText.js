"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANVAS_TARGET_LIMIT = exports.CANVAS_TEXT_LIMIT = void 0;
exports.canvasTextValue = canvasTextValue;
exports.parseCanvasTextCatalog = parseCanvasTextCatalog;
exports.parseCanvasTextEvent = parseCanvasTextEvent;
exports.canvasTextFolded = canvasTextFolded;
exports.canvasTextUnfolded = canvasTextUnfolded;
// Only bounded text values cross the frame boundary. Source ranges stay in the editor.
const boundary_1 = require("../core/boundary");
const assert_1 = require("../core/assert");
exports.CANVAS_TEXT_LIMIT = 10_000;
exports.CANVAS_TARGET_LIMIT = 2_000;
function canvasTextValue(input) {
    const value = (0, boundary_1.text)(input);
    if (value.length > exports.CANVAS_TEXT_LIMIT) {
        throw new Error('Canvas text exceeds limit');
    }
    return value;
}
function parseCanvasTextCatalog(input) {
    const data = (0, boundary_1.record)(input);
    if (data['type'] !== 'avb:text-catalog') {
        throw new Error('Expected canvas text catalog');
    }
    const targets = (0, boundary_1.list)(parseTarget)(data['targets']);
    if (targets.length > exports.CANVAS_TARGET_LIMIT) {
        throw new Error('Too many canvas text targets');
    }
    return {
        type: 'avb:text-catalog',
        session: (0, boundary_1.pathText)(data['session']),
        file: (0, boundary_1.pathText)(data['file']),
        checksum: (0, boundary_1.digest)(data['checksum']),
        targets,
    };
}
function parseTarget(input) {
    const data = (0, boundary_1.record)(input);
    if (data['kind'] !== 'element' && data['kind'] !== 'component') {
        throw new Error('Expected text container kind');
    }
    if (typeof data['nested'] !== 'boolean') {
        throw new Error('Expected nested text flag');
    }
    const siblings = (0, boundary_1.list)(boundary_1.pathText)(data['siblings']);
    if (siblings.length > 100) {
        throw new Error('Too many protected text siblings');
    }
    return {
        kind: data['kind'],
        tag: (0, boundary_1.pathText)(data['tag']),
        siblings,
        key: (0, boundary_1.pathText)(data['key']),
        path: (0, boundary_1.pathText)(data['path']),
        parent: (0, boundary_1.pathText)(data['parent']),
        value: canvasTextValue(data['value']),
        label: (0, boundary_1.pathText)(data['label']),
        nested: data['nested'],
        ...(data['scope'] === undefined ? {} : { scope: (0, boundary_1.pathText)(data['scope']) }),
        ...(data['from'] === undefined ? {} : { from: parseFrom(data['from']) }),
        ...(data['segment'] === undefined ? {} : { segment: parseSegment(data['segment']) }),
    };
}
function parseFrom(input) {
    if (input !== 'slot' && input !== 'prop') {
        throw new Error('Expected where canvas text comes from');
    }
    return input;
}
// A text node's position inside its element: bounded like the element's text.
function parseSegment(input) {
    if (typeof input !== 'number' || !Number.isSafeInteger(input)) {
        throw new Error('Expected a text segment index');
    }
    if (input < 0 || input >= exports.CANVAS_TEXT_LIMIT) {
        throw new Error('Text segment index out of range');
    }
    return input;
}
function parseCanvasTextEvent(input) {
    const data = (0, boundary_1.record)(input);
    switch (data['type']) {
        case 'avb:text-save':
        case 'avb:text-draft':
            return {
                type: data['type'],
                session: (0, boundary_1.pathText)(data['session']),
                key: (0, boundary_1.pathText)(data['key']),
                value: canvasTextValue(data['value']),
            };
        case 'avb:text-refused':
            return { type: 'avb:text-refused', message: (0, boundary_1.pathText)(data['message']) };
        default:
            return undefined;
    }
}
// Positions in canvas text, counted the way HTML shows it: a run of ASCII
// whitespace is one space, and whitespace before the first word is nothing.
// The editor's text and the source text agree on this count even when their
// whitespace differs — a component's template indentation, a trimmed slot —
// which is the same sameness the frame requires before it opens an editor.
const FOLDABLE = /[\t\r\n ]/;
/** How many shown characters precede `offset` in `text`. */
function canvasTextFolded(text, offset) {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > text.length) {
        throw new Error('Canvas text offset is outside its text');
    }
    let count = 0;
    let started = false;
    let inSpace = false;
    (0, assert_1.assert)(offset <= text.length, 'A folded offset lies inside its text');
    for (let index = 0; index < offset; index += 1) {
        if (FOLDABLE.test(text.charAt(index))) {
            if (started && !inSpace) {
                count += 1;
            }
            inSpace = true;
        }
        else {
            started = true;
            inSpace = false;
            count += 1;
        }
    }
    (0, assert_1.assert)(count <= offset, 'Folding never adds characters');
    return count;
}
/**
 * The offset in `text` where `folded` shown characters have gone by: for a
 * start, at the next shown character; for an end, right after the last one.
 * Undefined when the text shows fewer characters than that.
 */
function canvasTextUnfolded(text, folded, edge) {
    if (!Number.isSafeInteger(folded) || folded < 0) {
        throw new Error('Canvas text position must be a non-negative integer');
    }
    (0, assert_1.assert)(text.length <= exports.CANVAS_TEXT_LIMIT * 2, 'Unfolded text is within the editing bound');
    // One pass: `count` is canvasTextFolded(text, index) at each step.
    let count = 0;
    let started = false;
    let inSpace = false;
    for (let index = 0; index <= text.length; index += 1) {
        const shown = index < text.length && !FOLDABLE.test(text.charAt(index));
        if (count === folded) {
            if (edge === 'end' || shown || index === text.length) {
                return index;
            }
        }
        if (count > folded || index === text.length) {
            return undefined;
        }
        if (shown) {
            started = true;
            inSpace = false;
            count += 1;
        }
        else {
            if (started && !inSpace) {
                count += 1;
            }
            inSpace = true;
        }
    }
    return undefined;
}
