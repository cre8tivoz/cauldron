"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TELEMETRY_EVENT = void 0;
exports.createDocumentTelemetry = createDocumentTelemetry;
exports.hashPath = hashPath;
// Is the wall holding? (plan §9a.) One counter and one structured log line per
// terminal outcome, backpressured submission and leaked lock. The
// rejection distribution is the production signal for everything the
// simulator's corpus cannot cover; the counts are read from the log.
//
// Privacy: a line names the file only by a hash of its path — raw paths leak
// usernames — and never carries source bytes, disk error text or intent
// payloads. No pipeline, no dashboard, no dependency.
const node_crypto_1 = require("node:crypto");
const assert_1 = require("../../shared/core/assert");
const intent_1 = require("../../shared/engine/intent");
/** Hex characters of the path hash a line carries: enough to tell files apart
 * in one log, too few to be worth brute-forcing beyond a guessed path. */
const PATH_HASH_CHARS = 16;
/** The event name every line starts with, for grepping a log. */
exports.TELEMETRY_EVENT = 'stacki.document';
function createDocumentTelemetry(log) {
    // The one mutable state of this module: counts owned by this closure.
    const rejected = Object.fromEntries(intent_1.REJECTION_REASONS.map((reason) => [reason, 0]));
    const totals = { applied: 0, uncertain: 0, backpressured: 0, lockLeaked: 0 };
    return {
        record(file, event) {
            // Push the ifs up: every counter moves here, and the line reports its total.
            const { counter, ...fields } = tallyOf(event);
            let count;
            if (counter === 'rejected') {
                (0, assert_1.assert)(fields.reason !== undefined, 'A rejection names its reason');
                count = (rejected[fields.reason] ?? 0) + 1;
                rejected[fields.reason] = count;
            }
            else {
                count = totals[counter] + 1;
                totals[counter] = count;
            }
            (0, assert_1.assert)(Number.isSafeInteger(count), 'A counter is a count');
            const line = { ...fields, count };
            log(JSON.stringify({ event: exports.TELEMETRY_EVENT, file: hashPath(file), ...line }));
        },
        counts() {
            const copy = { ...rejected };
            return { ...totals, rejected: rejectionCounts(copy) };
        },
    };
}
function hashPath(file) {
    return (0, node_crypto_1.createHash)('sha256').update(file).digest('hex').slice(0, PATH_HASH_CHARS);
}
function tallyOf(event) {
    switch (event.tag) {
        case 'backpressured':
            return { counter: 'backpressured', outcome: 'backpressured' };
        case 'lock-leaked':
            return { counter: 'lockLeaked', outcome: 'lock-leaked' };
        case 'outcome':
            return outcomeTally(event.outcome);
        default: {
            const exhaustive = event;
            return exhaustive;
        }
    }
}
function outcomeTally(outcome) {
    const intent = outcome.intentId;
    switch (outcome.tag) {
        case 'applied':
            return { counter: 'applied', intent, outcome: 'applied' };
        case 'uncertain':
            return { counter: 'uncertain', intent, outcome: 'uncertain' };
        case 'rejected':
            return { counter: 'rejected', intent, outcome: 'rejected', reason: outcome.reason };
        default: {
            const exhaustive = outcome;
            return exhaustive;
        }
    }
}
// Written out, not built from the list: a new reason is a compile error here.
function rejectionCounts(input) {
    const count = (reason) => {
        const value = input[reason];
        (0, assert_1.assert)(value !== undefined, 'Every rejection reason has a counter');
        (0, assert_1.assert)(Number.isSafeInteger(value), 'A counter is a count');
        return value;
    };
    return {
        'anchor-moved': count('anchor-moved'),
        'anchor-ambiguous': count('anchor-ambiguous'),
        'region-externally-modified': count('region-externally-modified'),
        'source-invalid': count('source-invalid'),
        'unsupported-operation': count('unsupported-operation'),
        'resource-limit': count('resource-limit'),
        'write-failed': count('write-failed'),
        'write-race': count('write-race'),
        'merge-conflict': count('merge-conflict'),
    };
}
