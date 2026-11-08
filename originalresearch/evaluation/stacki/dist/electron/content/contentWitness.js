"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertContentWitness = assertContentWitness;
// Compare the exact entry snapshot under the synchronous write path. A canvas edit
// must not overwrite a CMS update that arrived after the editing session began.
function assertContentWitness(input, locator, expected) {
    let current = input;
    for (const part of locator) {
        if (typeof part === 'number' && Array.isArray(current)) {
            const item = current[part];
            current = item;
        }
        else if (typeof current === 'object' && current !== null && typeof part === 'string' && Object.hasOwn(current, part)) {
            current = Object.getOwnPropertyDescriptor(current, part)?.value;
        }
        else {
            throw new Error('Content entry moved. Reopen the text before saving.');
        }
    }
    if (JSON.stringify(current) !== JSON.stringify(expected)) {
        throw new Error('Content changed. Reopen the text before saving.');
    }
}
