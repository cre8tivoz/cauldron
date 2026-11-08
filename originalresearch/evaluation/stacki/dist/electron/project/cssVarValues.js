"use strict";
// What a custom property's value is: resolved through the other variables, and
// classed as a colour, a size, a font or something else (cssVars.ts).
Object.defineProperty(exports, "__esModule", { value: true });
exports.FONT_WORDS = exports.isUncomputableColor = exports.COLOR_FUNCTION = exports.NAMED_COLORS = void 0;
exports.resolveValue = resolveValue;
exports.colorOf = colorOf;
exports.kindOf = kindOf;
const cssVarRead_1 = require("./cssVarRead");
exports.NAMED_COLORS = new Set([
    'transparent',
    'currentcolor',
    'black',
    'white',
    'red',
    'green',
    'blue',
    'yellow',
    'orange',
    'purple',
    'pink',
    'gray',
    'grey',
    'brown',
    'cyan',
    'magenta',
    'lime',
    'navy',
    'teal',
    'olive',
    'maroon',
    'silver',
    'gold',
    'beige',
    'ivory',
    'coral',
    'salmon',
    'khaki',
    'indigo',
    'violet',
]);
exports.COLOR_FUNCTION = /^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
function resolveValue(value, map, depth = 0) {
    if (depth > cssVarRead_1.CSS_VARIABLE_LIMITS.resolveDepthMax) {
        return String(value);
    }
    const next = String(value).replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*(?:\([^()]*\)[^()]*)*))?\)/g, (whole, name, fallback) => {
        const found = map.get(name);
        if (found !== undefined) {
            return found;
        }
        return fallback !== undefined ? fallback.trim() : whole;
    });
    return next === String(value) ? next : resolveValue(next, map, depth + 1);
}
function colorOf(resolved) {
    const value = String(resolved).trim();
    if (!value) {
        return undefined;
    }
    if (/^#[0-9a-f]{3,8}$/i.test(value)) {
        return value;
    }
    if (exports.COLOR_FUNCTION.test(value)) {
        return value;
    }
    if (exports.NAMED_COLORS.has(value.toLowerCase())) {
        return value;
    }
    return undefined;
}
// True for values that name a colour but cannot be drawn as one — the swatch
// shows a checkerboard rather than pretending.
const isUncomputableColor = (resolved) => /(^|\s|\()color-mix\(/i.test(String(resolved));
exports.isUncomputableColor = isUncomputableColor;
// What kind of thing a variable holds, which is what picks its glyph — the same
// four the style panel's variable picker uses, so a colour is a droplet in both
// places and a bare number is a number in both.
exports.FONT_WORDS = new RegExp('(serif|sans-serif|monospace|cursive|system-ui|uppercase|lowercase|capitalize|' + 'balance|pretty|italic|normal|inherit)', 'i');
function kindOf(value, resolved) {
    const text = String(resolved ?? value).trim();
    if (!text) {
        return 'size';
    }
    if (colorOf(text) || (0, exports.isUncomputableColor)(text)) {
        return 'color';
    }
    // Unitless: a line height, a weight, a column count, a fluid-scale bound.
    if (/^-?\d*\.?\d+$/.test(text)) {
        return 'number';
    }
    if (/^-?\d*\.?\d+([a-z%]+)$/i.test(text) || /^(calc|clamp|min|max)\(/i.test(text)) {
        return 'size';
    }
    if (/[a-z]/i.test(text) && (exports.FONT_WORDS.test(text) || text.includes(',') || /^[a-z-]+$/i.test(text))) {
        return 'font';
    }
    return 'size';
}
