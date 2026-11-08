"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.record = void 0;
exports.string = string;
const boundary_1 = require("../core/boundary");
Object.defineProperty(exports, "record", { enumerable: true, get: function () { return boundary_1.record; } });
function string(value, maximum = 1_000_000) {
    if (typeof value !== 'string' || value.length > maximum) {
        throw new Error('Invalid string');
    }
    return value;
}
