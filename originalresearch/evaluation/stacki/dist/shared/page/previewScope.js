"use strict";
// The dev preview's record of each file's last-rendered frontmatter values,
// shared by the three places that touch it: the statement the marked copy of
// a file ends its frontmatter with (electron/previewServer/scopeCapture.ts),
// the dev server's value route that reads it back
// (electron/preview/markerConfig.ts, SCOPE_SOURCE), and the renderer, which
// checks that route's answer here before the binding picker uses it.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREVIEW_SCOPE_LIMITS = exports.SCOPE_STORE_KEY = void 0;
exports.parseScopeSamples = parseScopeSamples;
const assert_1 = require("../core/assert");
const boundary_1 = require("../core/boundary");
const record_1 = require("../core/record");
/** The `Symbol.for` key the record is filed under on `globalThis`. */
exports.SCOPE_STORE_KEY = 'stacki.scope';
exports.PREVIEW_SCOPE_LIMITS = {
    // Files whose last render is kept. Each holds references to what its render
    // computed, so the bound is on memory the dev server keeps alive.
    filesMax: 128,
    // Names one file files and one answer samples: a page binds a handful of
    // values, and a frontmatter with more is generated code.
    namesMax: 64,
};
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
/**
 * The sampled values by binding name. Anything that is not a record of
 * identifiers to sampled data is no answer, an empty one, rather than an
 * error: a page the dev server cannot sample still opens, with "no sample"
 * where the values would be. A `null` value is a binding with nothing in it,
 * which is no sample either.
 */
function parseScopeSamples(input) {
    const source = (0, record_1.toRecord)(input);
    if (source === undefined) {
        return {};
    }
    const out = {};
    for (const name of Object.keys(source).slice(0, exports.PREVIEW_SCOPE_LIMITS.namesMax)) {
        const value = source[name];
        if (!IDENTIFIER.test(name)) {
            continue;
        }
        if (value === undefined || value === null) {
            continue;
        }
        out[name] = (0, boundary_1.data)(value);
    }
    (0, assert_1.assert)(Object.keys(out).length <= exports.PREVIEW_SCOPE_LIMITS.namesMax, 'Scope samples are bounded by name count');
    return out;
}
