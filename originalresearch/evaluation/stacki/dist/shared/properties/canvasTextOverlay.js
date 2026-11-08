"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANVAS_FOCUS_PATHS_MAX = void 0;
exports.parseCanvasTextOverlay = parseCanvasTextOverlay;
exports.canvasTextFocus = canvasTextFocus;
exports.parseCanvasTextFocus = parseCanvasTextFocus;
exports.parseCanvasTextClose = parseCanvasTextClose;
exports.parseCanvasTextSelection = parseCanvasTextSelection;
const boundary_1 = require("../core/boundary");
const assert_1 = require("../core/assert");
const canvasText_1 = require("./canvasText");
function parseCanvasTextOverlay(input) {
    const data = (0, boundary_1.record)(input);
    if (data['type'] === 'avb:text-active') {
        return {
            type: 'avb:text-active',
            session: (0, boundary_1.pathText)(data['session']),
            key: (0, boundary_1.pathText)(data['key']),
        };
    }
    if (data['type'] === 'avb:text-inactive') {
        return { type: 'avb:text-inactive', session: (0, boundary_1.pathText)(data['session']) };
    }
    return undefined;
}
// A selection is never deeper than this; a longer list is not a selection.
exports.CANVAS_FOCUS_PATHS_MAX = 256;
function canvasTextFocus(paths) {
    (0, assert_1.assert)(paths.length <= exports.CANVAS_FOCUS_PATHS_MAX, 'Canvas text focus stays within its bound');
    (0, assert_1.assert)(!paths.includes(''), 'Canvas text focus names real paths');
    return { type: 'avb:text-focus', paths };
}
function parseCanvasTextFocus(input) {
    const data = (0, boundary_1.record)(input);
    if (data['type'] !== 'avb:text-focus') {
        return undefined;
    }
    const paths = (0, boundary_1.list)(boundary_1.pathText)(data['paths']);
    if (paths.length > exports.CANVAS_FOCUS_PATHS_MAX) {
        throw new Error('Canvas text focus exceeds limit');
    }
    return { type: 'avb:text-focus', paths: paths.filter((path) => path !== '') };
}
function parseCanvasTextClose(input) {
    const data = (0, boundary_1.record)(input);
    if (data['type'] !== 'avb:text-close') {
        return undefined;
    }
    if (data['action'] !== 'apply' && data['action'] !== 'cancel') {
        throw new Error('Expected text editing close action');
    }
    return { session: (0, boundary_1.pathText)(data['session']), action: data['action'] };
}
// A frame is at most this many pixels in any direction; anything past it is
// not a box on the page.
const SELECTION_PIXELS_MAX = 1_000_000;
function parseCanvasTextSelection(input) {
    const data = (0, boundary_1.record)(input);
    if (data['type'] !== 'avb:text-selection') {
        return undefined;
    }
    const session = (0, boundary_1.pathText)(data['session']);
    const key = (0, boundary_1.pathText)(data['key']);
    if (data['range'] === undefined) {
        return { type: 'avb:text-selection', session, key, range: undefined };
    }
    return { type: 'avb:text-selection', session, key, range: parseSelectionRange(data['range']) };
}
function parseSelectionRange(input) {
    const data = (0, boundary_1.record)(input);
    const start = selectionOffset(data['start']);
    const end = selectionOffset(data['end']);
    if (start >= end) {
        throw new Error('Expected a non-empty text selection');
    }
    const rect = (0, boundary_1.record)(data['rect']);
    return {
        start,
        end,
        rect: {
            x: selectionPixels(rect['x']),
            y: selectionPixels(rect['y']),
            w: selectionSize(rect['w']),
            h: selectionSize(rect['h']),
        },
    };
}
function selectionOffset(input) {
    if (typeof input !== 'number' || !Number.isSafeInteger(input)) {
        throw new Error('Expected a text offset');
    }
    if (input < 0 || input > canvasText_1.CANVAS_TEXT_LIMIT) {
        throw new Error('Text offset is outside the editing limit');
    }
    return input;
}
function selectionPixels(input) {
    if (typeof input !== 'number' || !Number.isFinite(input)) {
        throw new Error('Expected a selection coordinate');
    }
    if (Math.abs(input) > SELECTION_PIXELS_MAX) {
        throw new Error('Selection coordinate is off the page');
    }
    return input;
}
function selectionSize(input) {
    const size = selectionPixels(input);
    if (size < 0) {
        throw new Error('Expected a non-negative selection size');
    }
    return size;
}
