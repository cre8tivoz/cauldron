#!/usr/bin/env node
"use strict";
// Compare the preview diff against a Git checkpoint without changing checkout.
//
//   node dist/scripts/reports/performanceReport.js [<ref> [<source path at ref>]]
//
// The current diff is read from the build; a reference is read from its
// source at <ref> (the morph client's source path by default; name the path
// the file had at that revision when it differs) and transpiled when it is
// TypeScript.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_child_process_1 = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const node_perf_hooks_1 = require("node:perf_hooks");
const ts = require("typescript");
const repoRoot_1 = require("../lib/repoRoot");
const root = (0, repoRoot_1.repositoryRoot)();
const SOURCE_PATH = 'electron/previewClient/morphPatch.ts';
// Where the diff lived before the client was split into modules, for a
// reference revision from then.
const SOURCE_PATH_BEFORE_SPLIT = 'electron/previewClient/morphClient.ts';
function load(source) {
    let allocatedBytes = 0;
    const startIndex = source.indexOf('function diffChildren(');
    const endIndex = source.indexOf('// Raised when the live document', startIndex);
    if (startIndex < 0 || endIndex < 0) {
        throw new Error('Cannot locate the preview diff in this revision.');
    }
    function TrackedArray(size) {
        allocatedBytes += size * Int32Array.BYTES_PER_ELEMENT;
        return new Int32Array(size);
    }
    // The diff charges a per-patch work budget (spendMorphWork) in revisions
    // that have one; the report measures the diff, so the budget is a no-op.
    const factoryInput = Reflect.construct(Function, ['Int32Array', 'spendMorphWork', `${source.slice(startIndex, endIndex)}\nreturn diffChildren;`]);
    if (typeof factoryInput !== 'function') {
        throw new Error('Preview diff source did not produce a factory');
    }
    const spendMorphWork = () => undefined;
    const candidate = Reflect.apply(factoryInput, undefined, [TrackedArray, spendMorphWork]);
    if (typeof candidate !== 'function') {
        throw new Error('Preview diff source did not produce a function');
    }
    return {
        diff: (before, after) => {
            const result = Reflect.apply(candidate, undefined, [before, after]);
            return result;
        },
        allocation: () => allocatedBytes,
        reset: () => {
            allocatedBytes = 0;
        },
    };
}
function measure(implementation, before, after) {
    implementation.diff(before, after);
    implementation.reset();
    const runs = 5;
    const started = node_perf_hooks_1.performance.now();
    for (let index = 0; index < runs; index += 1) {
        implementation.diff(before, after);
    }
    return {
        ms: ((node_perf_hooks_1.performance.now() - started) / runs).toFixed(3),
        matrixBytes: implementation.allocation() / runs,
    };
}
// The working tree's source rather than the build: the shipped client is a
// bundle, whose text keeps none of the comments the diff is found by.
const current = load(asJavaScript(fs.readFileSync(path.join(root, SOURCE_PATH), 'utf8'), SOURCE_PATH));
const reference = process.argv[2];
const before = reference ? load(referenceSource(reference, process.argv[3])) : undefined;
// A revision's source, as JavaScript: the named file, or wherever the diff
// lived in that revision.
function referenceSource(revision, named) {
    const candidates = named === undefined ? [SOURCE_PATH, SOURCE_PATH_BEFORE_SPLIT] : [named];
    for (const file of candidates) {
        try {
            const source = (0, node_child_process_1.execFileSync)('git', ['show', `${revision}:${file}`], {
                cwd: root,
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
            });
            return asJavaScript(source, file);
        }
        catch {
            // Not in this revision; try where it lived before.
        }
    }
    throw new Error(`No preview diff source in ${revision}: ${candidates.join(', ')}`);
}
// A TypeScript file is transpiled, which keeps the comments the diff's own
// markers are found by; JavaScript is taken as it is.
function asJavaScript(source, file) {
    if (!file.endsWith('.ts')) {
        return source;
    }
    const options = { compilerOptions: { target: ts.ScriptTarget.ES2022, removeComments: false } };
    return ts.transpileModule(source, options).outputText;
}
const keys = Array.from({ length: 2_000 }, (_, index) => `node:${index}`);
const cases = [
    ['Unchanged siblings', keys, keys],
    ['Append one sibling', keys, [...keys, 'new']],
    ['Remove last sibling', keys, keys.slice(0, -1)],
    ['Swap first two siblings', keys.slice(0, 200), [keys[1] ?? '', keys[0] ?? '', ...keys.slice(2, 200)]],
];
console.log('Preview sibling diff; mean of 5 warm runs. Matrix bytes exclude inputs.');
for (const [label, oldKeys, newKeys] of cases) {
    if (before) {
        strict_1.default.deepEqual(current.diff(oldKeys, newKeys), before.diff(oldKeys, newKeys), `${label} preserves exact edit operations`);
    }
    console.log(JSON.stringify({
        case: label,
        siblings: oldKeys.length,
        ...(before ? { before: measure(before, oldKeys, newKeys) } : {}),
        after: measure(current, oldKeys, newKeys),
    }));
}
