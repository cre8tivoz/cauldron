#!/usr/bin/env node
"use strict";
// Human-readable view of the round-trip gate. This reports parser coverage;
// `npm test` remains the pass/fail gate.
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("node:fs");
const path = require("node:path");
const repoRoot_1 = require("../lib/repoRoot");
const FILES_MAX = 100_000;
const root = (0, repoRoot_1.repositoryRoot)();
const corpusDirectory = path.join(root, 'test', 'corpus');
const skipDirectories = new Set(['node_modules', '.git', 'dist', '.astro', 'release', 'build']);
function record(input, where) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new Error(`${where}: expected object`);
    }
    return Object.fromEntries(Object.entries(input));
}
function parserAPI() {
    const input = require('../../electron/parse/astroParser.js');
    const value = record(input, 'astroParser');
    const parsePage = value['parsePage'];
    const serializePage = value['serializePage'];
    if (typeof parsePage !== 'function' || typeof serializePage !== 'function') {
        throw new Error('astroParser: expected parsePage and serializePage functions');
    }
    return {
        parsePage: (source) => {
            const result = Reflect.apply(parsePage, undefined, [source]);
            return result;
        },
        serializePage: (model) => {
            const result = Reflect.apply(serializePage, undefined, [model]);
            return result;
        },
    };
}
function readExpectations(filePath) {
    const input = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const value = record(input, 'expectations');
    const output = {};
    for (const [name, rawExpectation] of Object.entries(value)) {
        if (name === '_comment') {
            continue;
        }
        const expectation = record(rawExpectation, `expectations.${name}`);
        if (typeof expectation['severity'] !== 'string') {
            throw new Error(`expectations.${name}.severity: expected string`);
        }
        output[name] = {
            severity: expectation['severity'],
            note: readNote(expectation['note'], name),
        };
    }
    return output;
}
// A note is stored as an array of lines so the file stays within 100 columns
// (JSON strings cannot wrap); the lines were split at spaces, and rejoin so.
const NOTE_LINES_MAX = 64;
function readNote(input, name) {
    if (!Array.isArray(input) || input.length === 0 || input.length > NOTE_LINES_MAX) {
        throw new Error(`expectations.${name}.note: expected 1–${NOTE_LINES_MAX} lines`);
    }
    const lines = input;
    return lines
        .map((line, index) => {
        if (typeof line !== 'string') {
            throw new Error(`expectations.${name}.note[${index}]: expected string`);
        }
        return line;
    })
        .join(' ');
}
function collect(directory) {
    const files = [];
    const pending = [directory];
    let visited = 0;
    while (pending.length > 0) {
        visited += 1;
        if (visited > FILES_MAX) {
            throw new Error(`Round-trip scan exceeds ${FILES_MAX} directories`);
        }
        const current = pending.pop();
        if (current === undefined) {
            continue;
        }
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const entryPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                if (!skipDirectories.has(entry.name)) {
                    pending.push(entryPath);
                }
            }
            else if (entry.name.endsWith('.astro')) {
                files.push(entryPath);
            }
        }
    }
    return files.sort();
}
const api = parserAPI();
function classify(filePath) {
    const source = fs.readFileSync(filePath, 'utf8');
    let parsed;
    try {
        parsed = api.parsePage(source);
    }
    catch (error) {
        return { status: 'threw', detail: error instanceof Error ? error.message : String(error) };
    }
    const result = record(parsed, 'parse result');
    if (result['editable'] !== true) {
        return {
            status: 'not-editable',
            detail: typeof result['reason'] === 'string' ? result['reason'] : '',
        };
    }
    try {
        const output = api.serializePage(result['model']);
        if (typeof output !== 'string') {
            throw new Error('serializePage: expected string');
        }
        return { status: output === source ? 'identical' : 'differs', detail: '' };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { status: 'threw', detail: `serialize: ${message}` };
    }
}
const expectations = readExpectations(path.join(root, 'test/corpus/expectations.json'));
const target = process.argv[2];
const base = target ? path.resolve(target) : corpusDirectory;
const files = collect(base);
const counts = {
    identical: 0,
    differs: 0,
    'not-editable': 0,
    threw: 0,
};
const rows = files.map((filePath) => {
    const result = classify(filePath);
    counts[result.status] += 1;
    return { name: path.relative(base, filePath), ...result };
});
const marks = {
    identical: '  ok  ',
    differs: ' diff ',
    'not-editable': ' code ',
    threw: ' THREW',
};
const width = Math.max(0, ...rows.map((row) => row.name.length));
console.log(`\n  ${base}\n`);
for (const row of rows) {
    const known = expectations[row.name];
    const tag = known ? `  (known: ${known.severity})` : '';
    console.log(`  ${marks[row.status]}  ${row.name.padEnd(width)}${tag}`);
}
const percentage = (count) => (files.length > 0 ? `${Math.round((count / files.length) * 100)}%` : '0%');
console.log(`\n  ${files.length} files — ${counts.identical} round-trip clean ` +
    `(${percentage(counts.identical)}), ${counts.differs} rewritten ` +
    `(${percentage(counts.differs)}), ${counts['not-editable']} code-view only ` +
    `(${percentage(counts['not-editable'])}), ${counts.threw} crashed\n`);
if (!target) {
    const known = Object.entries(expectations).sort((left, right) => left[1].severity.localeCompare(right[1].severity));
    const corruption = known.filter((entry) => entry[1].severity === 'corruption');
    console.log(`  Known defects: ${known.length} (${corruption.length} change meaning)\n`);
    for (const [name, information] of known) {
        console.log(`  [${information.severity}] ${name}`);
        console.log(`      ${information.note}\n`);
    }
}
