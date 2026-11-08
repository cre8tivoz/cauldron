"use strict";
// Which tests the gate runs, found by name rather than listed by hand: every
// `*.test.js` and `*.test.ts` under test/, outside the fixtures, the corpus,
// the integration suite and the helpers. A new test file is in the gate the
// moment it exists; there is no second list to forget to update. The few
// suites that need something unusual say so in testSuites.ts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISCOVERY_LIMITS = void 0;
exports.discoverTestFiles = discoverTestFiles;
exports.suitesFor = suitesFor;
exports.selectSuites = selectSuites;
const fs = require("node:fs");
const path = require("node:path");
const testSuites_1 = require("./testSuites");
exports.DISCOVERY_LIMITS = {
    /** Test files in the tree. About 290 today. */
    testFilesMax: 2_000,
    /** Folder depth below test/. The mirror is three deep. */
    folderDepthMax: 8,
};
// Folders below test/ that hold inputs and support, never suites.
const NOT_SUITES = new Set(['corpus', 'fixtures', 'helpers', 'integration']);
const TEST_FILE = /\.test\.(?:js|ts)$/;
/** Every test file under `test/`, repository-relative, sorted. */
function discoverTestFiles(root) {
    const found = [];
    const pending = [{ folder: 'test', depth: 0 }];
    while (pending.length > 0) {
        const next = pending.pop();
        if (next === undefined) {
            break;
        }
        if (next.depth > exports.DISCOVERY_LIMITS.folderDepthMax) {
            throw new Error(`discoverTestFiles: ${next.folder} is deeper than the limit`);
        }
        for (const entry of fs.readdirSync(path.join(root, next.folder), { withFileTypes: true })) {
            const file = `${next.folder}/${entry.name}`;
            if (entry.isDirectory()) {
                if (!(next.depth === 0 && NOT_SUITES.has(entry.name))) {
                    pending.push({ folder: file, depth: next.depth + 1 });
                }
            }
            else if (TEST_FILE.test(entry.name)) {
                found.push(file);
            }
        }
        if (found.length > exports.DISCOVERY_LIMITS.testFilesMax) {
            throw new Error('discoverTestFiles: more test files than the limit');
        }
    }
    return found.sort();
}
/** The suites for these files, with each one's options from testSuites.ts. */
function suitesFor(files) {
    const known = new Set(files);
    const stale = Object.keys(testSuites_1.TEST_SUITES).filter((file) => !known.has(file));
    if (stale.length > 0) {
        throw new Error(`testSuites.ts names files that are not tests: ${stale.join(', ')}`);
    }
    return files.map((file) => ({
        file,
        name: file.slice('test/'.length).replace(TEST_FILE, ''),
        options: testSuites_1.TEST_SUITES[file] ?? {},
    }));
}
// A query's letters only, lower-cased: `test:popoverdropdown`, `popover-dropdown`
// and `popoverDropdown` all name the same suite.
function folded(text) {
    return text
        .replace(/^test:/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}
/**
 * The suites a command line asks for: each query matches a suite by its
 * name's last part, ignoring case and punctuation, or — when it holds a `/` —
 * every suite whose name starts with it (`electron/parse`). No queries is
 * every suite. Queries that match nothing come back for the caller to report.
 */
function selectSuites(suites, queries) {
    if (queries.length === 0) {
        return { selected: suites, unmatched: [] };
    }
    const selected = new Set();
    const unmatched = [];
    for (const query of queries) {
        const matches = suites.filter((suite) => matchesQuery(suite, query));
        if (matches.length === 0) {
            unmatched.push(query);
        }
        for (const suite of matches) {
            selected.add(suite);
        }
    }
    return { selected: suites.filter((suite) => selected.has(suite)), unmatched };
}
function matchesQuery(suite, query) {
    if (query.includes('/')) {
        return suite.name.startsWith(query.replace(/^test\//, ''));
    }
    const last = suite.name.split('/').pop() ?? suite.name;
    return folded(last) === folded(query);
}
