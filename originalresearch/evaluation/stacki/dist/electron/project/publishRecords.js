"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishRecords = exports.PUBLISH_RECORD_LIMITS = void 0;
exports.readPublishRecords = readPublishRecords;
const node_child_process_1 = require("node:child_process");
const assert_1 = require("../../shared/core/assert");
const result_1 = require("../../shared/core/result");
// Git listings are structured data, not logs. Bound records and queued chunks separately.
exports.PUBLISH_RECORD_LIMITS = {
    recordBytesMax: 16_384,
    chunkBytesMax: 1_048_576,
    chunksMax: 1_000_000,
    recordsMax: 100_000,
    timeoutMs: 600_000,
    diagnosticsBytesMax: 1_048_576,
};
class PublishRecords {
    pending = Buffer.alloc(0);
    count = 0;
    accept(input) {
        (0, assert_1.assert)(this.pending.length <= exports.PUBLISH_RECORD_LIMITS.recordBytesMax, 'Pending record is bounded');
        (0, assert_1.assert)(this.count <= exports.PUBLISH_RECORD_LIMITS.recordsMax, 'Accepted record count is bounded');
        if (!Buffer.isBuffer(input) || input.length > exports.PUBLISH_RECORD_LIMITS.chunkBytesMax) {
            return (0, result_1.err)({ code: 'git-output', message: 'Git returned an oversized or invalid chunk.' });
        }
        const bytes = Buffer.concat([this.pending, input]);
        const records = [];
        let start = 0;
        for (let index = 0; index < bytes.length; index++) {
            if (index - start > exports.PUBLISH_RECORD_LIMITS.recordBytesMax) {
                return (0, result_1.err)({ code: 'git-output', message: 'Git record exceeds the 16 KiB limit.' });
            }
            if (bytes[index] === 0) {
                if (this.count === exports.PUBLISH_RECORD_LIMITS.recordsMax) {
                    return (0, result_1.err)({
                        code: 'git-limit',
                        message: 'Git inspection exceeds the 100,000-file limit.',
                    });
                }
                const decoded = decodeRecord(bytes.subarray(start, index));
                if (!decoded.ok) {
                    return decoded;
                }
                records.push(decoded.value);
                this.count += 1;
                start = index + 1;
            }
        }
        if (bytes.length - start > exports.PUBLISH_RECORD_LIMITS.recordBytesMax) {
            return (0, result_1.err)({ code: 'git-output', message: 'Git record exceeds the 16 KiB limit.' });
        }
        // Copy the suffix so a short partial record cannot retain the entire input chunk.
        this.pending = Buffer.from(bytes.subarray(start));
        return (0, result_1.ok)(records);
    }
    finish() {
        return this.pending.length === 0 ? (0, result_1.ok)(undefined) : (0, result_1.err)({ code: 'git-output', message: 'Git returned an incomplete file listing.' });
    }
}
exports.PublishRecords = PublishRecords;
/** The host supplies PATH; await each visitor so filesystem work cannot build a queue. */
async function readPublishRecords(root, argumentsList, environment, visit) {
    const child = (0, node_child_process_1.spawn)('git', [...argumentsList], {
        cwd: root,
        env: environment,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    const monitor = monitorPublishRecords(child);
    const records = new PublishRecords();
    try {
        for await (const chunk of readPublishChunks(child.stdout)) {
            if (!chunk.ok) {
                return chunk;
            }
            const decoded = records.accept(chunk.value);
            if (!decoded.ok) {
                return decoded;
            }
            for (const record of decoded.value) {
                const failure = monitor.failure();
                if (!failure.ok) {
                    return failure;
                }
                const visited = await visit(record);
                if (!visited.ok) {
                    return visited;
                }
            }
        }
        const completed = await monitor.completion;
        const failure = monitor.failure();
        if (!failure.ok) {
            return failure;
        }
        return completed.ok ? records.finish() : completed;
    }
    finally {
        child.stdout.destroy();
        await monitor.dispose();
    }
}
function monitorPublishRecords(child) {
    let failure = (0, result_1.ok)(undefined);
    let diagnosticsBytes = 0;
    const stop = (message) => {
        if (failure.ok) {
            failure = (0, result_1.err)({ code: 'git-output', message });
        }
        child.kill('SIGKILL');
    };
    const completion = new Promise((resolve) => {
        child.once('error', () => resolve((0, result_1.err)({ code: 'git-start', message: 'Could not start Git.' })));
        child.once('close', (code) => resolve(code === 0 ? (0, result_1.ok)(undefined) : (0, result_1.err)({ code: 'git-exit', message: 'Git listing failed.' })));
    });
    child.stderr.on('data', (chunk) => {
        diagnosticsBytes += chunk.length;
        if (diagnosticsBytes > exports.PUBLISH_RECORD_LIMITS.diagnosticsBytesMax) {
            stop('Git diagnostics exceeded the 1 MiB limit.');
        }
    });
    const timer = setTimeout(() => stop('Git inspection exceeded the ten-minute limit.'), exports.PUBLISH_RECORD_LIMITS.timeoutMs);
    return {
        completion,
        failure: () => failure,
        dispose: async () => {
            child.kill('SIGKILL');
            await completion;
            clearTimeout(timer);
        },
    };
}
async function* readPublishChunks(stream) {
    const iterator = stream[Symbol.asyncIterator]();
    for (let count = 0; count < exports.PUBLISH_RECORD_LIMITS.chunksMax; count++) {
        // Catch only pipe I/O. Assertions and visitor errors never pass through this adapter.
        const next = await iterator.next().then(result_1.ok, () => (0, result_1.err)({ code: 'git-output', message: 'Could not read the Git file listing.' }));
        if (!next.ok) {
            yield next;
            return;
        }
        if (next.value.done) {
            return;
        }
        const value = next.value.value;
        yield (0, result_1.ok)(value);
    }
    yield (0, result_1.err)({ code: 'git-output', message: 'Git listing exceeded its chunk limit.' });
}
function decodeRecord(bytes) {
    if (bytes.length === 0) {
        return (0, result_1.err)({ code: 'git-output', message: 'Git returned an empty file record.' });
    }
    try {
        return (0, result_1.ok)(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    }
    catch {
        return (0, result_1.err)({ code: 'git-output', message: 'Git filename is not valid UTF-8.' });
    }
}
