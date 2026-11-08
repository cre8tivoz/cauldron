"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TAG_NAME_RE = exports.REJECTION_REASONS = exports.PLACEMENTS = void 0;
exports.describeRejection = describeRejection;
exports.parseRejectionReason = parseRejectionReason;
exports.intentPayloadBytes = intentPayloadBytes;
exports.toIntent = toIntent;
exports.parseIntent = parseIntent;
exports.parseSubmissionResult = parseSubmissionResult;
exports.parseOutcome = parseOutcome;
// Intents, submission and outcomes (plan §3.3, §3.5). An intent is an immutable
// command authored against one version of one file: it names that version by
// checksum, the place by an anchor, and the change by a closed operation union.
// Submission and terminal results are separate types, because backpressure is
// not a rejection: a backpressured intent was never accepted and still belongs
// to the persistence layer.
const assert_1 = require("../core/assert");
const brand_1 = require("../core/brand");
const boundary_1 = require("../core/boundary");
const limits_1 = require("../core/limits");
const record_1 = require("../core/record");
const ref_1 = require("../page/ref");
const span_1 = require("../core/span");
exports.PLACEMENTS = ['before', 'after', 'first-child', 'last-child'];
exports.REJECTION_REASONS = [
    'anchor-moved',
    'anchor-ambiguous',
    'region-externally-modified',
    'source-invalid',
    'unsupported-operation',
    'resource-limit',
    'write-failed',
    'write-race',
    'merge-conflict',
];
const ATTRIBUTE_NAME_RE = /^[\w@:.-]+$/;
const IDENTIFIER_RE = /^[A-Za-z_$][\w$]*$/;
/** A tag or component name as the parser reads one: a letter, then name
 * characters — `div`, `my-card`, `Card`, `Icons.Arrow`, `svg:path`. */
exports.TAG_NAME_RE = /^[A-Za-z][\w.:-]*$/;
const STYLE_PROPERTY_RE = /^(?:--[\w-]+|-?[a-z][a-z-]*)$/;
/** The notice text for a rejection (plan §7): names the reason, never blames
 * the user, and never implies their input is gone. */
function describeRejection(reason) {
    switch (reason) {
        case 'anchor-moved':
            return 'The element you edited is no longer where it was.';
        case 'anchor-ambiguous':
            return 'The file changed and several elements now match the one you edited.';
        case 'region-externally-modified':
            return 'That part of the file was changed outside Stacki.';
        case 'source-invalid':
            return 'The page contains a syntax error that Stacki needs resolved before saving this edit.';
        case 'unsupported-operation':
            return 'Stacki encountered an editor error while applying the change.';
        case 'resource-limit':
            return 'The change exceeds a size limit.';
        case 'write-failed':
            return 'The file could not be written.';
        case 'write-race':
            return 'Another program wrote the file at the same moment.';
        case 'merge-conflict':
            return 'Your code edit overlaps another change to the file, so it was not merged.';
        default: {
            const exhaustive = reason;
            return exhaustive;
        }
    }
}
function parseRejectionReason(input, where) {
    for (const reason of exports.REJECTION_REASONS) {
        if (reason === input) {
            return reason;
        }
    }
    throw new Error(`${where}: unknown rejection reason ${JSON.stringify(input)}`);
}
/** UTF-8 bytes of every string the intent carries, summed (LIMITS.intentPayloadBytesMax). */
function intentPayloadBytes(operation) {
    return operationTexts(operation).reduce((total, text) => total + (0, span_1.utf8ByteLength)(text), 0);
}
function operationTexts(operation) {
    switch (operation.tag) {
        case 'set-attribute':
            return operation.value.type === 'bare' ? [operation.name] : [operation.name, operation.value.value];
        case 'remove-attribute':
            return [operation.name];
        case 'insert-node':
        case 'append-body':
        case 'insert-frontmatter':
            return [operation.source];
        case 'remove-node':
        case 'move-node':
            return [];
        case 'rename-binding':
        case 'rename-tag':
        case 'rename-attribute':
            return [operation.from, operation.to];
        case 'set-inline-style':
            return operation.declaration.tag === 'set' ? [operation.property, operation.declaration.value] : [operation.property];
        case 'apply-code-patch':
        case 'revert-splices':
        case 'rewrite-node':
        case 'rewrite-text':
            return operation.hunks.map((hunk) => hunk.text);
        case 'edit-frontmatter-slot':
            return [operation.text];
        case 'wrap-nodes':
            return [operation.open, operation.close];
        default: {
            const exhaustive = operation;
            return exhaustive;
        }
    }
}
/** The validated constructor: every cross-field rule between the anchor and the
 * operation is checked here, so a parsed Intent is one the planner may trust. */
function toIntent(input) {
    checkOperationAnchor(input.operation, input.anchor);
    const payloadBytes = intentPayloadBytes(input.operation);
    if (payloadBytes > limits_1.LIMITS.intentPayloadBytesMax) {
        throw new Error(`Intent: payload exceeds ${limits_1.LIMITS.intentPayloadBytesMax} bytes`);
    }
    (0, assert_1.assert)(payloadBytes >= 0, 'Payload size is a count');
    return input;
}
function checkOperationAnchor(operation, anchor) {
    const kind = anchor.expectedKind;
    switch (operation.tag) {
        case 'set-attribute':
        case 'remove-attribute':
        case 'set-inline-style':
        case 'rename-attribute':
            requireKind(operation.tag, { allowed: isAttributeHost(kind) });
            return;
        case 'rename-tag':
            // A `<style>` or `<script>` is raw text by its name: renaming one
            // changes how everything inside it parses, which is code, not a tag.
            requireKind(operation.tag, { allowed: kind === 'element' || kind === 'component' });
            requireNewName(operation.tag, operation.from, operation.to);
            return;
        case 'rewrite-node':
            requireKind(operation.tag, { allowed: (0, ref_1.isNodeKind)(kind) });
            requireSites(operation.tag, anchor.span, operation.hunks.map((hunk) => hunk.span));
            return;
        case 'insert-node':
        case 'remove-node':
            requireKind(operation.tag, { allowed: (0, ref_1.isNodeKind)(kind) });
            return;
        case 'move-node':
            requireKind(operation.tag, { allowed: (0, ref_1.isNodeKind)(kind) });
            requireKind(operation.tag, { allowed: (0, ref_1.isNodeKind)(operation.destination.expectedKind) });
            return;
        case 'wrap-nodes':
            requireKind(operation.tag, { allowed: (0, ref_1.isNodeKind)(kind) });
            requireKind(operation.tag, { allowed: (0, ref_1.isNodeKind)(operation.last.expectedKind) });
            return;
        case 'rename-binding':
            requireKind(operation.tag, { allowed: kind === 'map' });
            requireSites(operation.tag, anchor.span, operation.sites);
            return;
        case 'apply-code-patch':
        case 'revert-splices':
        case 'rewrite-text':
            requireKind(operation.tag, { allowed: kind === 'document' });
            requireSites(operation.tag, anchor.span, operation.hunks.map((hunk) => hunk.span));
            return;
        case 'edit-frontmatter-slot':
            requireKind(operation.tag, { allowed: kind === 'frontmatter' });
            requireSites(operation.tag, anchor.span, [operation.slot]);
            return;
        case 'append-body':
        case 'insert-frontmatter':
            requireKind(operation.tag, { allowed: kind === 'document' });
            return;
        default: {
            const exhaustive = operation;
            throw new Error(`Intent: unknown operation ${JSON.stringify(exhaustive)}`);
        }
    }
}
// Tags carry attributes: elements, component invocations, and <style>/<script>.
function isAttributeHost(kind) {
    switch (kind) {
        case 'element':
        case 'component':
        case 'raw':
            return true;
        case 'text':
        case 'expr':
        case 'raw-line':
        case 'comment':
        case 'map':
        case 'cond':
        case 'branch':
        case 'chunk-group':
        case 'frontmatter':
        case 'document':
            return false;
        default: {
            const exhaustive = kind;
            return exhaustive;
        }
    }
}
function requireNewName(tag, from, to) {
    if (from === to) {
        throw new Error(`Intent: ${tag} must change the name`);
    }
}
function requireKind(tag, check) {
    if (!check.allowed) {
        throw new Error(`Intent: ${tag} cannot target this anchor kind`);
    }
}
// Sites of a multi-span operation lie inside the anchor, in ascending order,
// pairwise disjoint: overlapping sites would make the splice order a guess.
function requireSites(tag, anchor, sites) {
    if (sites.length === 0) {
        throw new Error(`Intent: ${tag} needs at least one site`);
    }
    if (sites.length > limits_1.LIMITS.splicesPerIntentMax) {
        throw new Error(`Intent: ${tag} exceeds ${limits_1.LIMITS.splicesPerIntentMax} sites`);
    }
    if (!(0, span_1.spansAscending)(sites)) {
        throw new Error(`Intent: ${tag} sites must ascend without overlapping`);
    }
    for (const site of sites) {
        if (!(0, span_1.spanContains)(anchor, site)) {
            throw new Error(`Intent: ${tag} site lies outside its anchor`);
        }
    }
}
// --- Wire parsers ----------------------------------------------------------
function parseIntent(input) {
    const record = requireRecord(input, 'Intent');
    const id = record['id'];
    if (typeof id !== 'string') {
        throw new Error('Intent.id: expected string');
    }
    return toIntent({
        id: (0, brand_1.toIntentId)(id),
        file: (0, brand_1.toFilePath)((0, boundary_1.pathText)(record['file'])),
        authoredChecksum: (0, boundary_1.digest)(record['authoredChecksum']),
        anchor: (0, ref_1.parseAnchorRef)(record['anchor'], 'Intent.anchor'),
        operation: parseOperation(record['operation']),
    });
}
function parseOperation(input) {
    const record = requireRecord(input, 'Operation');
    const tag = record['tag'];
    switch (tag) {
        case 'set-attribute':
            return {
                tag,
                name: attributeName(record['name'], 'Operation.name'),
                value: parseAttributeValue(record['value']),
            };
        case 'remove-attribute':
            return { tag, name: attributeName(record['name'], 'Operation.name') };
        case 'insert-node':
            return {
                tag,
                placement: parsePlacement(record['placement']),
                source: payloadText(record['source'], 'Operation.source'),
            };
        case 'remove-node':
            return { tag };
        case 'move-node':
            return {
                tag,
                destination: (0, ref_1.parseAnchorRef)(record['destination'], 'Operation.destination'),
                placement: parsePlacement(record['placement']),
            };
        case 'rename-binding':
            return parseRenameBinding(record);
        case 'set-inline-style':
            return parseSetInlineStyle(record);
        case 'apply-code-patch':
        case 'revert-splices':
        case 'rewrite-node':
        case 'rewrite-text':
            return { tag, hunks: parseHunks(record['hunks']) };
        case 'rename-tag':
            return {
                tag,
                from: tagName(record['from'], 'Operation.from'),
                to: tagName(record['to'], 'Operation.to'),
            };
        case 'append-body':
        case 'insert-frontmatter':
            return { tag, source: payloadText(record['source'], 'Operation.source') };
        case 'wrap-nodes':
            return {
                tag,
                last: (0, ref_1.parseAnchorRef)(record['last'], 'Operation.last'),
                open: payloadText(record['open'], 'Operation.open'),
                close: payloadText(record['close'], 'Operation.close'),
            };
        case 'rename-attribute': {
            const from = attributeName(record['from'], 'Operation.from');
            const to = attributeName(record['to'], 'Operation.to');
            if (from === to) {
                throw new Error('Operation.to: a rename must change the name');
            }
            return { tag, from, to };
        }
        case 'edit-frontmatter-slot':
            return {
                tag,
                slot: (0, span_1.parseByteSpan)(record['slot'], 'Operation.slot'),
                text: payloadText(record['text'], 'Operation.text'),
            };
        default:
            throw new Error(`Operation.tag: unknown operation ${JSON.stringify(tag)}`);
    }
}
function parseRenameBinding(record) {
    const from = identifier(record['from'], 'Operation.from');
    const to = identifier(record['to'], 'Operation.to');
    if (from === to) {
        throw new Error('Operation.to: a rename must change the name');
    }
    const sites = boundedArray(record['sites'], 'Operation.sites', limits_1.LIMITS.splicesPerIntentMax);
    return {
        tag: 'rename-binding',
        from,
        to,
        sites: sites.map((site, index) => (0, span_1.parseByteSpan)(site, `Operation.sites[${index}]`)),
    };
}
function parseSetInlineStyle(record) {
    const property = record['property'];
    if (typeof property !== 'string') {
        throw new Error('Operation.property: expected string');
    }
    if (property.length > limits_1.LIMITS.attrCharsMax) {
        throw new Error(`Operation.property: exceeds ${limits_1.LIMITS.attrCharsMax} chars`);
    }
    if (!STYLE_PROPERTY_RE.test(property)) {
        throw new Error('Operation.property: expected a CSS property name');
    }
    const declaration = requireRecord(record['declaration'], 'Operation.declaration');
    const tag = declaration['tag'];
    if (tag === 'remove') {
        return { tag: 'set-inline-style', property, declaration: { tag } };
    }
    if (tag === 'set') {
        const value = boundedText(declaration['value'], 'Operation.declaration.value', limits_1.LIMITS.attrCharsMax);
        return { tag: 'set-inline-style', property, declaration: { tag, value } };
    }
    throw new Error(`Operation.declaration.tag: unknown value ${JSON.stringify(tag)}`);
}
function parseHunks(input) {
    const hunks = boundedArray(input, 'Operation.hunks', limits_1.LIMITS.splicesPerIntentMax);
    return hunks.map((hunk, index) => {
        const record = requireRecord(hunk, `Operation.hunks[${index}]`);
        return {
            span: (0, span_1.parseByteSpan)(record['span'], `Operation.hunks[${index}].span`),
            text: payloadText(record['text'], `Operation.hunks[${index}].text`),
        };
    });
}
function parseAttributeValue(input) {
    const record = requireRecord(input, 'Operation.value');
    const type = record['type'];
    if (type === 'bare') {
        return { type };
    }
    if (type === 'string' || type === 'expr') {
        return {
            type,
            value: boundedText(record['value'], 'Operation.value.value', limits_1.LIMITS.attrCharsMax),
        };
    }
    throw new Error(`Operation.value.type: unknown value ${JSON.stringify(type)}`);
}
function parsePlacement(input) {
    for (const placement of exports.PLACEMENTS) {
        if (placement === input) {
            return placement;
        }
    }
    throw new Error(`Operation.placement: unknown value ${JSON.stringify(input)}`);
}
function parseSubmissionResult(input) {
    const record = requireRecord(input, 'SubmissionResult');
    const tag = record['tag'];
    if (tag === 'backpressured') {
        return { tag };
    }
    if (tag === 'accepted') {
        return { tag, intentId: parseIntentId(record['intentId'], 'SubmissionResult.intentId') };
    }
    throw new Error(`SubmissionResult.tag: unknown value ${JSON.stringify(tag)}`);
}
function parseOutcome(input) {
    const record = requireRecord(input, 'Outcome');
    const intentId = parseIntentId(record['intentId'], 'Outcome.intentId');
    const tag = record['tag'];
    switch (tag) {
        case 'applied': {
            const ranges = boundedArray(record['changedRanges'], 'Outcome.changedRanges', limits_1.LIMITS.splicesPerIntentMax);
            const changedRanges = ranges.map((range, index) => (0, span_1.parseByteSpan)(range, `Outcome.changedRanges[${index}]`));
            if (!(0, span_1.spansAscending)(changedRanges)) {
                throw new Error('Outcome.changedRanges: expected ascending disjoint ranges');
            }
            return { tag, intentId, changedRanges, checksum: (0, boundary_1.digest)(record['checksum']) };
        }
        case 'rejected':
            return { tag, intentId, reason: parseRejectionReason(record['reason'], 'Outcome.reason') };
        case 'uncertain': {
            const candidate = record['candidateChecksum'];
            return {
                tag,
                intentId,
                candidateChecksum: candidate === undefined ? undefined : (0, boundary_1.digest)(candidate),
            };
        }
        default:
            throw new Error(`Outcome.tag: unknown value ${JSON.stringify(tag)}`);
    }
}
function parseIntentId(input, where) {
    if (typeof input !== 'string') {
        throw new Error(`${where}: expected string`);
    }
    return (0, brand_1.toIntentId)(input);
}
function requireRecord(input, where) {
    const record = (0, record_1.toRecord)(input);
    if (record === undefined) {
        throw new Error(`${where}: expected object`);
    }
    return record;
}
function boundedArray(input, where, itemsMax) {
    const items = (0, record_1.toArray)(input);
    if (items === undefined) {
        throw new Error(`${where}: expected array`);
    }
    if (items.length > itemsMax) {
        throw new Error(`${where}: exceeds ${itemsMax} items`);
    }
    return items;
}
function boundedText(input, where, charsMax) {
    if (typeof input !== 'string') {
        throw new Error(`${where}: expected string`);
    }
    if (input.length > charsMax) {
        throw new Error(`${where}: exceeds ${charsMax} chars`);
    }
    return input;
}
// A payload string may be as long as a whole file; toIntent then bounds the sum.
function payloadText(input, where) {
    return boundedText(input, where, limits_1.LIMITS.intentPayloadBytesMax);
}
function attributeName(input, where) {
    const name = boundedText(input, where, limits_1.LIMITS.attrCharsMax);
    if (!ATTRIBUTE_NAME_RE.test(name)) {
        throw new Error(`${where}: expected an attribute name`);
    }
    return name;
}
function tagName(input, where) {
    const name = boundedText(input, where, limits_1.LIMITS.tagNameCharsMax);
    if (!exports.TAG_NAME_RE.test(name)) {
        throw new Error(`${where}: expected a tag name`);
    }
    return name;
}
function identifier(input, where) {
    const name = boundedText(input, where, limits_1.LIMITS.tagNameCharsMax);
    if (!IDENTIFIER_RE.test(name)) {
        throw new Error(`${where}: expected an identifier`);
    }
    return name;
}
