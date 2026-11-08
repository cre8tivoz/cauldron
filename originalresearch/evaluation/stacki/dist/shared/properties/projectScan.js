"use strict";
// The project scan: what 'project:scan' returns. pages/layouts/components are
// separate arrays in the payload; the contract keeps them separate so the
// renderer can never confuse a page route with a component folder.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseScanResult = parseScanResult;
exports.parseScanPages = parseScanPages;
const limits_1 = require("../core/limits");
const componentSources_1 = require("./componentSources");
const propSchema_1 = require("./propSchema");
function fail(where, what) {
    throw new Error(`ScanResult.${where}: ${what}`);
}
/** The scan payload carries each component's schema as an ARRAY of fields —
 * the shape the project:scan handler assembles and the props panel reads. Validate every field
 * with the same parser the Map shape uses, so both stay in agreement. */
function parseSchemaArray(input, where) {
    if (!Array.isArray(input)) {
        fail(where, 'expected array of fields');
    }
    if (input.length > limits_1.LIMITS.propSchemaFieldsMax) {
        fail(where, `exceeds ${limits_1.LIMITS.propSchemaFieldsMax} fields`);
    }
    return input.map((field, index) => (0, propSchema_1.parseField)(field, `${where}[${index}]`));
}
function asString(value, where) {
    if (typeof value !== 'string') {
        fail(where, 'expected string');
    }
    if (value.length > limits_1.LIMITS.ipcFieldCharsMax) {
        fail(where, `exceeds ${limits_1.LIMITS.ipcFieldCharsMax} chars`);
    }
    return value;
}
function asArray(input, where, max) {
    if (!Array.isArray(input)) {
        fail(where, 'expected array');
    }
    if (input.length > max) {
        fail(where, `exceeds ${max} entries`);
    }
    return input;
}
function asRecord(input, where) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        fail(where, 'expected object');
    }
    return input;
}
function parsePage(input, where) {
    const record = asRecord(input, where);
    return {
        path: asString(record['path'], `${where}.path`),
        name: asString(record['name'], `${where}.name`),
        route: asString(record['route'], `${where}.route`),
        ...(record['title'] === undefined ? {} : { title: asString(record['title'], `${where}.title`) }),
        ...(record['inheritedTitle'] === undefined ? {} : { inheritedTitle: asString(record['inheritedTitle'], `${where}.inheritedTitle`) }),
    };
}
function parseComponent(input, where) {
    const record = asRecord(input, where);
    const out = {
        ...(record['origin'] === undefined ? {} : { origin: (0, componentSources_1.parseComponentOrigin)(record['origin']) }),
        path: asString(record['path'], `${where}.path`),
        name: asString(record['name'], `${where}.name`),
        folder: asString(record['folder'], `${where}.folder`),
    };
    if (record['isLayout'] !== undefined) {
        if (record['isLayout'] !== true) {
            fail(where, 'isLayout: only true is ever written');
        }
        out['isLayout'] = true;
    }
    if (record['instances'] !== undefined) {
        if (!Number.isSafeInteger(record['instances']) || Number(record['instances']) < 0) {
            fail(where, 'instances: expected nonnegative integer');
        }
        out['instances'] = record['instances'];
    }
    if (record['schema'] !== undefined) {
        out['schema'] = parseSchemaArray(record['schema'], `${where}.schema`);
    }
    if (record['extendsTag'] !== undefined) {
        out['extendsTag'] = asString(record['extendsTag'], `${where}.extendsTag`);
    }
    if (record['renderTag'] !== undefined) {
        const renderTag = asRecord(record['renderTag'], `${where}.renderTag`);
        const tag = renderTag['tag'];
        if (tag !== undefined && typeof tag !== 'string') {
            fail(where, 'renderTag.tag: expected string');
        }
        const prop = renderTag['prop'];
        if (prop !== undefined && typeof prop !== 'string') {
            fail(where, 'renderTag.prop: expected string');
        }
        out['renderTag'] = { tag, prop };
    }
    if (record['slots'] !== undefined) {
        const slots = asArray(record['slots'], `${where}.slots`, limits_1.LIMITS.propOptionsMax);
        if (!slots.every((slot) => typeof slot === 'string')) {
            fail(where, 'slots: expected strings');
        }
        out['slots'] = slots;
    }
    if (record['slotText'] !== undefined) {
        if (typeof record['slotText'] !== 'boolean') {
            fail(where, 'slotText: expected boolean');
        }
        out['slotText'] = record['slotText'];
    }
    if (record['hasRest'] !== undefined) {
        if (typeof record['hasRest'] !== 'boolean') {
            fail(where, 'hasRest: expected boolean');
        }
        out['hasRest'] = record['hasRest'];
    }
    return out;
}
function parseScanResult(input) {
    const record = asRecord(input, 'root');
    const result = {
        pages: parseScanPages(record['pages']),
        pageFolders: asArray(record['pageFolders'], 'pageFolders', limits_1.LIMITS.scanFoldersMax).map((folder, index) => asString(folder, `pageFolders[${index}]`)),
        layouts: asArray(record['layouts'], 'layouts', limits_1.LIMITS.scanEntriesMax).map((entry, index) => parseComponent(entry, `layouts[${index}]`)),
        components: asArray(record['components'], 'components', limits_1.LIMITS.scanEntriesMax).map((entry, index) => parseComponent(entry, `components[${index}]`)),
    };
    if (record['trailingSlash'] !== undefined) {
        result['trailingSlash'] = asString(record['trailingSlash'], 'trailingSlash');
    }
    return result;
}
function parseScanPages(input) {
    return asArray(input, 'pages', limits_1.LIMITS.scanEntriesMax).map((entry, index) => parsePage(entry, `pages[${index}]`));
}
