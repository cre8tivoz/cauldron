"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASTRO_FILES_MAX = void 0;
exports.parseAstroFileChanges = parseAstroFileChanges;
exports.diffAstroFiles = diffAstroFiles;
exports.astroChangeMessages = astroChangeMessages;
const boundary_1 = require("../core/boundary");
const assert_1 = require("../core/assert");
exports.ASTRO_FILES_MAX = 20_000;
function parseAstroFileChanges(input) {
    if (!Array.isArray(input) || input.length > exports.ASTRO_FILES_MAX * 2) {
        throw new Error('Invalid Astro file changes');
    }
    return input.map((entry) => {
        const value = (0, boundary_1.record)(entry);
        const kind = value['kind'];
        const file = (0, boundary_1.pathText)(value['file']);
        if (kind !== 'added' && kind !== 'removed') {
            throw new Error('Invalid Astro file change kind');
        }
        if (!/^src\/.+\.astro$/i.test(file) || file.split('/').some((part) => part === '..')) {
            throw new Error('Invalid Astro file change path');
        }
        if (file.includes('\\')) {
            throw new Error('Astro file changes require project-relative POSIX paths');
        }
        return { kind, file };
    });
}
function diffAstroFiles(previous, current) {
    (0, assert_1.assert)(previous.size <= exports.ASTRO_FILES_MAX, 'Previous Astro inventory exceeds limit');
    (0, assert_1.assert)(current.size <= exports.ASTRO_FILES_MAX, 'Current Astro inventory exceeds limit');
    const changes = [];
    let removedCount = 0;
    for (const file of previous) {
        if (!current.has(file)) {
            changes.push({ kind: 'removed', file });
            removedCount++;
        }
    }
    for (const file of current) {
        if (!previous.has(file)) {
            changes.push({ kind: 'added', file });
        }
    }
    (0, assert_1.assert)(previous.size + changes.length - 2 * removedCount === current.size, 'Astro changes must account for the inventory size');
    return changes;
}
// A large agent operation gets a summary instead of evicting every useful notice in the stack.
function astroChangeMessages(changes) {
    (0, assert_1.assert)(changes.length <= exports.ASTRO_FILES_MAX * 2, 'Astro changes exceed inventory bounds');
    const messages = [];
    if (changes.length <= 3) {
        for (const { kind, file } of changes) {
            messages.push(`${kind === 'added' ? 'Added' : 'Removed'} ${file}`);
        }
        return messages;
    }
    for (const kind of ['added', 'removed']) {
        let count = 0;
        const examples = [];
        for (const change of changes) {
            if (change.kind === kind) {
                count++;
                if (examples.length < 3) {
                    examples.push(change.file);
                }
            }
        }
        if (count > 0) {
            messages.push(`${kind === 'added' ? 'Added' : 'Removed'} ${count} Astro files\n${examples.join('\n')}`);
        }
    }
    (0, assert_1.assert)(messages.length <= 2, 'Each Astro operation has at most one summary');
    return messages;
}
