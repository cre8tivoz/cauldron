"use strict";
// Narrowing `unknown` to a record is the first step of nearly every boundary
// parse (AGENTS.md §2). One validated home for it, so callers outside shared/
// never need the assertion the lint gate forbids.
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRecord = toRecord;
exports.toArray = toArray;
/** The record behind `input`, or undefined when it isn't a plain object. */
function toRecord(input) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        return undefined;
    }
    return input;
}
/** The array behind `input`, or undefined when it isn't one. */
function toArray(input) {
    if (!Array.isArray(input)) {
        return undefined;
    }
    return input;
}
