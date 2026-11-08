"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePreferenceResult = exports.parsePreferences = void 0;
exports.parsePreferenceName = parsePreferenceName;
const boundary_1 = require("../core/boundary");
function parsePreferenceName(input) {
    if (input === 'sound' || input === 'usageCountsEnabled') {
        return input;
    }
    throw new Error('Unknown preference');
}
exports.parsePreferences = (0, boundary_1.object)({ sound: boundary_1.boolean, usageCountsEnabled: boundary_1.boolean });
exports.parsePreferenceResult = (0, boundary_1.object)({
    sound: boundary_1.boolean,
    usageCountsEnabled: boundary_1.boolean,
    saved: boundary_1.boolean,
});
