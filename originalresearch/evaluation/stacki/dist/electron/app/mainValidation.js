"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseValidationResult = exports.parseRecents = exports.parseOptionalString = exports.parseString = exports.parseRecord = exports.parseData = void 0;
exports.parseSettings = parseSettings;
exports.parseContentConfig = parseContentConfig;
exports.parseDynamicPaths = parseDynamicPaths;
exports.parseSampleEntry = parseSampleEntry;
exports.parseSampleValue = parseSampleValue;
// Disk and dev-server data are untrusted, even when a previous app run wrote
// them. Keep bounds and parsing separate from handlers so failures are testable.
const boundary_1 = require("../../shared/core/boundary");
// The generic parsers live in lib, where every area may reach them.
var mainHelpers_1 = require("../lib/mainHelpers");
Object.defineProperty(exports, "parseData", { enumerable: true, get: function () { return mainHelpers_1.parseData; } });
Object.defineProperty(exports, "parseRecord", { enumerable: true, get: function () { return mainHelpers_1.parseRecord; } });
Object.defineProperty(exports, "parseString", { enumerable: true, get: function () { return mainHelpers_1.parseString; } });
Object.defineProperty(exports, "parseOptionalString", { enumerable: true, get: function () { return mainHelpers_1.parseOptionalString; } });
function parseSettings(input) {
    const value = (0, boundary_1.object)({
        sound: boundary_1.boolean,
        usageCountsEnabled: (0, boundary_1.optional)(boundary_1.boolean),
        usageNoticeVersion: (0, boundary_1.optional)(boundary_1.count),
        usageLastAttemptDay: (0, boundary_1.optional)(boundary_1.text),
    })(input);
    if (value.usageNoticeVersion !== undefined && value.usageNoticeVersion > 10) {
        throw new Error('Settings: invalid usage notice version');
    }
    if (value.usageLastAttemptDay !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(value.usageLastAttemptDay)) {
        throw new Error('Settings: invalid usage day');
    }
    return {
        sound: value.sound,
        usageCountsEnabled: value.usageCountsEnabled ?? true,
        usageNoticeVersion: value.usageNoticeVersion ?? 0,
        ...(value.usageLastAttemptDay === undefined ? {} : { usageLastAttemptDay: value.usageLastAttemptDay }),
    };
}
exports.parseRecents = (0, boundary_1.list)((0, boundary_1.object)({ path: boundary_1.pathText, name: boundary_1.text, openedAt: boundary_1.count }));
function parseContentConfig(input) {
    const source = (0, boundary_1.record)(input);
    const collections = (0, boundary_1.list)(parseCollection)(source['collections']);
    const configPath = (0, boundary_1.optional)(boundary_1.text)(source['configPath']);
    const error = (0, boundary_1.optional)(boundary_1.text)(source['error']);
    return {
        collections,
        ...(source['missing'] === true ? { missing: true } : {}),
        ...(configPath === undefined ? {} : { configPath }),
        ...(error === undefined ? {} : { error }),
    };
}
function parseCollection(input) {
    // Preserve extension metadata after bounding its JSON shape. Known fields
    // receive their own parsers because renderer panels rely on their types.
    const source = (0, boundary_1.record)((0, boundary_1.data)(input));
    const metadata = (0, boundary_1.object)({
        name: boundary_1.text,
        editable: (0, boundary_1.optional)(boundary_1.boolean),
        freeform: (0, boundary_1.optional)(boundary_1.boolean),
        error: (0, boundary_1.optional)(boundary_1.text),
        extensions: (0, boundary_1.optional)((0, boundary_1.list)(boundary_1.text)),
        hasBody: (0, boundary_1.optional)(boundary_1.boolean),
        idFromFile: (0, boundary_1.optional)(boundary_1.boolean),
        crossFieldChecks: (0, boundary_1.optional)(boundary_1.boolean),
        schema: boundary_1.data,
    })(source);
    const loader = source['loader'] === undefined ? undefined : parseLoader(source['loader']);
    return { ...source, ...metadata, ...(loader === undefined ? {} : { loader }) };
}
function parseLoader(input) {
    const source = (0, boundary_1.record)((0, boundary_1.data)(input));
    const parsed = (0, boundary_1.object)({
        kind: boundary_1.text,
        base: (0, boundary_1.optional)(boundary_1.text),
        file: (0, boundary_1.optional)(boundary_1.text),
        pattern: (0, boundary_1.optional)((value) => (typeof value === 'string' ? (0, boundary_1.text)(value) : (0, boundary_1.list)(boundary_1.text)(value))),
        generateId: (0, boundary_1.optional)(boundary_1.boolean),
        parser: (0, boundary_1.optional)(boundary_1.boolean),
        name: (0, boundary_1.optional)((0, boundary_1.nullable)(boundary_1.text)),
    })(source);
    return { ...source, ...parsed };
}
function parseDynamicPaths(input) {
    const source = (0, boundary_1.record)(input);
    // The dev server's JSON writes `null` for no error; absence is `undefined` here.
    return {
        entries: (0, boundary_1.list)(parseDynamicEntry)(source['entries'] ?? []),
        error: (0, boundary_1.optional)((0, boundary_1.nullable)(boundary_1.text))(source['error']) ?? undefined,
    };
}
function parseDynamicEntry(input) {
    const source = (0, boundary_1.record)(input);
    // Older marker servers returned bare params. Preserve that supported wire shape.
    return {
        params: (0, boundary_1.dictionary)(boundary_1.data)(source['params'] ?? source),
        props: (0, boundary_1.data)(source['props']),
    };
}
function parseSampleEntry(input) {
    const source = (0, boundary_1.record)(input);
    // The dev server's JSON writes `null` for no error; absence is `undefined` here.
    const error = (0, boundary_1.optional)((0, boundary_1.nullable)(boundary_1.text))(source['error']) ?? undefined;
    return { entry: (0, boundary_1.data)(source['entry']), ...(error === undefined ? {} : { error }) };
}
function parseSampleValue(input) {
    const source = (0, boundary_1.record)(input);
    // The dev server's JSON writes `null` for no error; absence is `undefined` here.
    const error = (0, boundary_1.optional)((0, boundary_1.nullable)(boundary_1.text))(source['error']) ?? undefined;
    return { value: (0, boundary_1.data)(source['value']), ...(error === undefined ? {} : { error }) };
}
exports.parseValidationResult = (0, boundary_1.object)({
    issues: (0, boundary_1.list)((0, boundary_1.object)({
        path: (0, boundary_1.list)((input) => (typeof input === 'number' ? (0, boundary_1.count)(input) : (0, boundary_1.text)(input))),
        message: boundary_1.text,
        code: boundary_1.text,
    })),
    unchecked: (0, boundary_1.optional)(boundary_1.boolean),
    error: (0, boundary_1.optional)(boundary_1.text),
});
