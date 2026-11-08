"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseImportSlots = parseImportSlots;
exports.parseImportSlot = parseImportSlot;
exports.parseImportMember = parseImportMember;
// Source slots cross IPC with the page model. Keep their validated contract
// independent of Electron so the renderer and source writer share one shape.
const limits_1 = require("../core/limits");
const record_1 = require("../core/record");
function parseImportSlots(input) {
    const slots = (0, record_1.toArray)(input);
    if (!slots) {
        throw new Error('ImportSlots: expected array');
    }
    if (slots.length > limits_1.LIMITS.importsMax) {
        throw new Error('ImportSlots: exceeds limit');
    }
    return slots.map(parseImportSlot);
}
function parseImportSlot(input) {
    const slot = (0, record_1.toRecord)(input);
    if (!slot) {
        throw new Error('ImportSlot: expected object');
    }
    const members = (0, record_1.toArray)(slot['members']);
    if (!members) {
        throw new Error('ImportSlot.members: expected array');
    }
    if (members.length > limits_1.LIMITS.importsMax) {
        throw new Error('ImportSlot.members: exceeds limit');
    }
    return {
        at: parseOffset(slot['at'], 'ImportSlot.at'),
        offset: parseOffset(slot['offset'], 'ImportSlot.offset'),
        source: parseText(slot['source'], 'ImportSlot.source'),
        suffix: parseText(slot['suffix'], 'ImportSlot.suffix'),
        tail: parseText(slot['tail'], 'ImportSlot.tail'),
        members: members.map(parseImportMember),
    };
}
function parseImportMember(input) {
    const member = (0, record_1.toRecord)(input);
    if (!member) {
        throw new Error('ImportMember: expected object');
    }
    const named = member['named'];
    const typeOnly = member['typeOnly'];
    for (const flag of [named, typeOnly]) {
        if (flag !== undefined && typeof flag !== 'boolean') {
            throw new Error('ImportMember: expected boolean flag');
        }
    }
    return {
        name: parseText(member['name'], 'ImportMember.name'),
        path: parseText(member['path'], 'ImportMember.path'),
        quote: parseText(member['quote'], 'ImportMember.quote'),
        at: parseOffset(member['at'], 'ImportMember.at'),
        ...(typeof named === 'boolean' ? { named } : {}),
        ...(typeof typeOnly === 'boolean' ? { typeOnly } : {}),
        ...(member['imported'] === undefined
            ? {}
            : {
                imported: parseText(member['imported'], 'ImportMember.imported'),
            }),
    };
}
function parseText(input, field) {
    if (typeof input !== 'string') {
        throw new Error(`${field}: expected string`);
    }
    if (input.length > limits_1.LIMITS.nodeValueCharsMax) {
        throw new Error(`${field}: exceeds limit`);
    }
    return input;
}
function parseOffset(input, field) {
    if (typeof input !== 'number') {
        throw new Error(`${field}: expected integer`);
    }
    if (!Number.isSafeInteger(input)) {
        throw new Error(`${field}: expected integer`);
    }
    if (input < 0 || input > limits_1.LIMITS.ipcFieldCharsMax) {
        throw new Error(`${field}: outside source bounds`);
    }
    return input;
}
