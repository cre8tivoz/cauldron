"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePageEditResult = parsePageEditResult;
exports.parsePageDiskRead = parsePageDiskRead;
// The page save contract (plan §11 step 0; since step 10 every page save is an
// edit). A page read carries the checksum of the exact bytes it returned; an
// edit names the checksum it was authored against, and main refuses it when
// it cannot be placed on the bytes the file holds now. That refusal is an
// expected operating failure, so it arrives as a Result value. A reply that
// breaks this shape is a programmer error and throws here.
const brand_1 = require("../core/brand");
const intent_1 = require("../engine/intent");
const limits_1 = require("../core/limits");
const pageNode_1 = require("../page/pageNode");
const record_1 = require("../core/record");
const result_1 = require("../core/result");
const span_1 = require("../core/span");
function parsePageEditResult(input) {
    const record = (0, record_1.toRecord)(input);
    if (record === undefined) {
        throw new Error('PageEditResult: expected object');
    }
    if (record['ok'] === true) {
        return (0, result_1.ok)({ ...parsePageDiskRead(input), inverse: parseInverse(record['inverse']) });
    }
    if (record['ok'] === false) {
        return (0, result_1.err)(parsePageEditError(record['error']));
    }
    throw new Error('PageEditResult.ok: expected boolean');
}
function parseInverse(input) {
    const hunks = (0, record_1.toArray)(input);
    if (hunks === undefined) {
        throw new Error('PageEdited.inverse: expected array');
    }
    if (hunks.length > limits_1.LIMITS.splicesPerIntentMax) {
        throw new Error('PageEdited.inverse: exceeds limit');
    }
    const parsed = hunks.map((hunk, index) => {
        const record = (0, record_1.toRecord)(hunk);
        if (record === undefined) {
            throw new Error(`PageEdited.inverse[${index}]: expected object`);
        }
        const text = record['text'];
        if (typeof text !== 'string') {
            throw new Error(`PageEdited.inverse[${index}].text: expected string`);
        }
        if (text.length > limits_1.LIMITS.intentPayloadBytesMax) {
            throw new Error(`PageEdited.inverse[${index}].text: exceeds limit`);
        }
        return { span: (0, span_1.parseByteSpan)(record['span'], `PageEdited.inverse[${index}].span`), text };
    });
    if (!(0, span_1.spansAscending)(parsed.map((hunk) => hunk.span))) {
        throw new Error('PageEdited.inverse: expected ascending disjoint spans');
    }
    return parsed;
}
function parsePageEditError(input) {
    const record = (0, record_1.toRecord)(input);
    if (record === undefined) {
        throw new Error('PageEditError: expected object');
    }
    if (record['code'] === 'rejected') {
        const message = record['message'];
        if (typeof message !== 'string' || message.length > limits_1.LIMITS.attrCharsMax) {
            throw new Error('PageEditError.message: expected bounded string');
        }
        const disk = record['diskChecksum'];
        return {
            code: 'rejected',
            reason: (0, intent_1.parseRejectionReason)(record['reason'], 'PageEditError.reason'),
            message,
            diskChecksum: disk === undefined ? undefined : checksumField(disk, 'PageEditError.diskChecksum'),
        };
    }
    return parsePageWriteFailure(input);
}
function parsePageDiskRead(input) {
    const page = (0, pageNode_1.parsePageReadResult)(input);
    const record = (0, record_1.toRecord)(input);
    if (record === undefined) {
        throw new Error('PageDiskRead: expected object');
    }
    return { ...page, checksum: checksumField(record['checksum'], 'PageDiskRead.checksum') };
}
function parsePageWriteFailure(input) {
    const record = (0, record_1.toRecord)(input);
    if (record === undefined) {
        throw new Error('PageWriteFailure: expected object');
    }
    const message = record['message'];
    if (typeof message !== 'string') {
        throw new Error('PageWriteFailure.message: expected string');
    }
    if (message.length > limits_1.LIMITS.attrCharsMax) {
        throw new Error('PageWriteFailure.message: exceeds limit');
    }
    const code = record['code'];
    switch (code) {
        case 'missing':
        case 'filesystem':
        case 'write-race':
        case 'uncertain':
        case 'backpressured':
            return { code, message };
        default:
            throw new Error('PageWriteFailure.code: unknown value');
    }
}
function checksumField(input, where) {
    if (typeof input !== 'string') {
        throw new Error(`${where}: expected string`);
    }
    try {
        return (0, brand_1.toDigest)(input);
    }
    catch (error) {
        throw new Error(`${where}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
