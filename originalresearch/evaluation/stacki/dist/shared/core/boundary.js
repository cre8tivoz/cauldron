"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOUNDARY_LIMITS = void 0;
exports.text = text;
exports.pathText = pathText;
exports.digest = digest;
exports.boolean = boolean;
exports.count = count;
exports.optional = optional;
exports.nullable = nullable;
exports.list = list;
exports.record = record;
exports.object = object;
exports.dictionary = dictionary;
exports.data = data;
exports.definedFields = definedFields;
// Small bounded parsers shared by IPC and disk readers. Parsers construct typed
// values; no library or assertion is needed to trust a field after this boundary.
const brand_1 = require("./brand");
const limits_1 = require("./limits");
const record_1 = require("./record");
// The wire bounds, named for these parsers. The numbers live in limits.ts so a
// disk reader and the IPC field that carries what it read answer to one bound
// (a 5 MiB copy here once refused files the 10 MB readers accepted).
exports.BOUNDARY_LIMITS = {
    textLengthMax: limits_1.LIMITS.ipcFieldCharsMax,
    pathLengthMax: limits_1.LIMITS.ipcPathCharsMax,
    itemsMax: limits_1.LIMITS.ipcItemsMax,
    depthMax: limits_1.LIMITS.ipcDepthMax,
};
function text(input) {
    if (typeof input !== 'string') {
        throw new Error('Expected string');
    }
    if (input.length > exports.BOUNDARY_LIMITS.textLengthMax) {
        throw new Error('String exceeds limit');
    }
    return input;
}
function pathText(input) {
    const value = text(input);
    if (value.length > exports.BOUNDARY_LIMITS.pathLengthMax) {
        throw new Error('Path exceeds limit');
    }
    if (value.includes('\0')) {
        throw new Error('Path contains NUL');
    }
    return value;
}
function digest(input) {
    if (typeof input !== 'string') {
        throw new Error('Expected digest string');
    }
    return (0, brand_1.toDigest)(input);
}
function boolean(input) {
    if (typeof input !== 'boolean') {
        throw new Error('Expected boolean');
    }
    return input;
}
function count(input) {
    if (typeof input !== 'number') {
        throw new Error('Expected number');
    }
    if (!Number.isSafeInteger(input)) {
        throw new Error('Expected safe integer');
    }
    if (input < 0) {
        throw new Error('Expected nonnegative integer');
    }
    return input;
}
function optional(parse) {
    return (input) => (input === undefined ? undefined : parse(input));
}
// For external producers that write `null` themselves (a project iframe's
// messages, legacy payloads). Our own results say absence with `undefined`.
// eslint-disable-next-line stacki/no-null -- parses producers outside our types that send null
function nullable(parse) {
    return (input) => (input === null ? input : parse(input));
}
function list(parse) {
    return (input) => {
        const values = (0, record_1.toArray)(input);
        if (!values) {
            throw new Error('Expected array');
        }
        if (values.length > exports.BOUNDARY_LIMITS.itemsMax) {
            throw new Error('Array exceeds limit');
        }
        return values.map(parse);
    };
}
function record(input) {
    const value = (0, record_1.toRecord)(input);
    if (!value) {
        throw new Error('Expected object');
    }
    if (Object.keys(value).length > exports.BOUNDARY_LIMITS.itemsMax) {
        throw new Error('Object exceeds limit');
    }
    return value;
}
function object(shape) {
    return (input) => {
        const source = record(input);
        const result = {};
        for (const [key, parse] of Object.entries(shape)) {
            const value = parse(source[key]);
            if (value !== undefined) {
                result[key] = value;
            }
        }
        // Each declared field was parsed above, and the shape controls the keys.
        return result;
    };
}
function dictionary(parse) {
    return (input) => Object.fromEntries(Object.entries(record(input)).map(([key, value]) => [pathText(key), parse(value)]));
}
function data(input) {
    // A per-message node budget also bounds wide nested objects, not just depth.
    let remaining = exports.BOUNDARY_LIMITS.itemsMax;
    const visit = (value, depth) => {
        if (--remaining < 0) {
            throw new Error('Data exceeds item limit');
        }
        if (depth > exports.BOUNDARY_LIMITS.depthMax) {
            throw new Error('Data exceeds depth limit');
        }
        if (value === undefined) {
            return value;
        }
        if (value === null) {
            return value;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            return text(value);
        }
        if (typeof value === 'number') {
            if (!Number.isFinite(value)) {
                throw new Error('Expected finite number');
            }
            return value;
        }
        const values = (0, record_1.toArray)(value);
        if (values) {
            return list((entry) => visit(entry, depth + 1))(values);
        }
        return dictionary((entry) => visit(entry, depth + 1))(value);
    };
    return visit(input, 0);
}
function definedFields(source) {
    // Dropping undefined keys makes explicit options safe for exact optional types.
    return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined));
}
