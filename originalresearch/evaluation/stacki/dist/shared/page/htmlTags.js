"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTML_VOID_TAGS = void 0;
// HTML void elements cannot acquire children, even when written with Astro's /> syntax.
exports.HTML_VOID_TAGS = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
]);
