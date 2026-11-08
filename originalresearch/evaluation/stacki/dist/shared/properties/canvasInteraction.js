"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCanvasInteraction = parseCanvasInteraction;
exports.parseCanvasNavigation = parseCanvasNavigation;
function parseCanvasInteraction(input) {
    if (typeof input !== 'object' || input === null) {
        return undefined;
    }
    if (!('type' in input) || input.type !== 'avb:interaction') {
        return undefined;
    }
    if ('mode' in input && (input.mode === 'select' || input.mode === 'interact')) {
        return input.mode;
    }
    return undefined;
}
function parseCanvasNavigation(input) {
    if (typeof input !== 'object' || input === null) {
        return undefined;
    }
    if (!('type' in input) || input.type !== 'avb:navigated') {
        return undefined;
    }
    if (!('path' in input) || typeof input.path !== 'string') {
        return undefined;
    }
    const path = input.path;
    if (path.length > 4000 || !path.startsWith('/') || path.startsWith('//')) {
        return undefined;
    }
    if (/[\\\x00-\x20]/.test(path)) {
        return undefined;
    }
    return path;
}
