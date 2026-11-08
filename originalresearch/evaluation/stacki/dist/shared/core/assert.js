"use strict";
// Programmer errors crash loudly (AGENTS.md §9). The `asserts condition`
// signature narrows for the compiler from the same statement that checks at
// runtime — one assertion, both channels.
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = assert;
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}
