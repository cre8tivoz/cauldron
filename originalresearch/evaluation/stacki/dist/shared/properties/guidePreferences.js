"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGuidePreferences = validateGuidePreferences;
const assert_1 = require("../core/assert");
// Disk guide validation is independent of browser CSS.supports and geometry.
const boundary_1 = require("../core/boundary");
const guideLimits_1 = require("./guideLimits");
function validateGuidePreferences(input) {
    const value = (0, boundary_1.record)(input);
    (0, boundary_1.boolean)(value['visible']);
    (0, boundary_1.boolean)(value['numbers']);
    const color = (0, boundary_1.text)(value['color']);
    if (color.length === 0 || color.length > guideLimits_1.GUIDE_LIMITS.colorCharsMax || color.includes('var(')) {
        throw new Error('Invalid guide color');
    }
    boundedNumber(value['opacity'], guideLimits_1.GUIDE_LIMITS.opacityMin, guideLimits_1.GUIDE_LIMITS.opacityMax);
    const columns = (0, boundary_1.record)(value['columns']);
    switch (columns['kind']) {
        case 'automatic':
            break;
        case 'count': {
            const count = boundedNumber(columns['count'], guideLimits_1.GUIDE_LIMITS.columnPickMin, guideLimits_1.GUIDE_LIMITS.columnPickMax);
            if (!Number.isSafeInteger(count)) {
                throw new Error('Guide columns must be a whole number');
            }
            break;
        }
        case 'variable':
            variableName(columns['name']);
            break;
        default:
            throw new Error('Invalid guide column setting');
    }
    for (const key of ['margin', 'gutter', 'widthMax']) {
        if (value[key] !== undefined) {
            validateGuideSize(value[key]);
        }
    }
}
function validateGuideSize(input) {
    const value = (0, boundary_1.record)(input);
    if (value['kind'] === 'variable') {
        variableName(value['name']);
        return;
    }
    if (value['kind'] !== 'length') {
        throw new Error('Invalid guide size');
    }
    const length = (0, boundary_1.record)(value['length']);
    const unit = length['unit'];
    if (unit !== 'px' && unit !== 'rem') {
        throw new Error('Invalid guide unit');
    }
    boundedNumber(length['amount'], 0, unit === 'px' ? guideLimits_1.GUIDE_LIMITS.lengthPxMax : guideLimits_1.GUIDE_LIMITS.lengthRemMax);
}
function variableName(input) {
    const name = (0, boundary_1.text)(input);
    if (name.length > guideLimits_1.GUIDE_LIMITS.variableCharsMax || !/^--[A-Za-z0-9_-]+$/.test(name)) {
        throw new Error('Invalid guide variable name');
    }
}
function boundedNumber(input, minimum, maximum) {
    (0, assert_1.assert)(minimum >= 0, 'Guide bounds never accept negative dimensions or counts');
    (0, assert_1.assert)(minimum <= maximum, 'Guide numeric bounds are ordered');
    if (typeof input !== 'number' || !Number.isFinite(input) || input < minimum || input > maximum) {
        throw new Error('Guide number is outside its allowed range');
    }
    return input;
}
