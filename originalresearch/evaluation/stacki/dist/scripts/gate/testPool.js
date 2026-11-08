"use strict";
// A bounded pool for the gate's test commands. Each command runs in its own
// shell with its output captured, so parallel runs never interleave on the
// terminal: a finished command prints one line, and its full output only when
// it failed. Why not interleave: 150 commands writing at once is unreadable,
// and the failure is the part anyone needs.
Object.defineProperty(exports, "__esModule", { value: true });
exports.POOL_LIMITS = void 0;
exports.stopTestPool = stopTestPool;
exports.runTestPool = runTestPool;
exports.runTestCommand = runTestCommand;
exports.parseJobs = parseJobs;
const node_child_process_1 = require("node:child_process");
const node_perf_hooks_1 = require("node:perf_hooks");
exports.POOL_LIMITS = {
    /** More concurrent test processes than this only adds contention. */
    jobsMax: 16,
    /** Output kept per command; a failure's cause is almost always at the end. */
    outputBytesMax: 4 * 1024 * 1024,
};
const running = new Set();
/** Stop every command still running (the runner calls this on SIGINT). */
function stopTestPool() {
    for (const child of running) {
        child.kill('SIGTERM');
    }
}
/** Run `commands` with at most `options.jobs` at once. Outcomes come back in
 * input order; `onDone` hears each one as it finishes. */
async function runTestPool(commands, options, onDone) {
    assertJobs(options.jobs);
    const outcomes = commands.map(() => undefined);
    let next = 0;
    const worker = async () => {
        // Each pass claims one index; the loop ends when the list is exhausted.
        while (next < commands.length) {
            const index = next;
            next += 1;
            const command = commands[index];
            if (command === undefined) {
                throw new Error(`Test pool index ${index} is outside the command list`);
            }
            const outcome = await runTestCommand(command, options);
            outcomes[index] = outcome;
            onDone(outcome);
        }
    };
    const workers = Math.min(options.jobs, commands.length);
    await Promise.all(Array.from({ length: workers }, () => worker()));
    return outcomes.map((outcome, index) => {
        if (outcome === undefined) {
            throw new Error(`Test pool finished without an outcome for ${commands[index]?.name}`);
        }
        return outcome;
    });
}
function runTestCommand(command, options) {
    // A monotonic clock: the wall clock can step backwards (WSL2 resyncs it), and
    // a duration measured across the step came out negative.
    const startedMs = node_perf_hooks_1.performance.now();
    const output = createOutputTail(exports.POOL_LIMITS.outputBytesMax);
    return new Promise((resolve) => {
        const spawnOptions = {
            cwd: options.cwd,
            env: options.environment,
            stdio: ['ignore', 'pipe', 'pipe'],
        };
        // With a shell and no arguments, the command line runs as written.
        const child = command.argumentsList === undefined
            ? (0, node_child_process_1.spawn)(command.command, [], { ...spawnOptions, shell: true })
            : (0, node_child_process_1.spawn)(command.command, [...command.argumentsList], spawnOptions);
        running.add(child);
        child.stdout.on('data', (chunk) => output.push(chunk));
        child.stderr.on('data', (chunk) => output.push(chunk));
        const finish = (ending) => {
            running.delete(child);
            if (ending.note !== '') {
                output.push(Buffer.from(`\n${ending.note}\n`));
            }
            const durationMs = Math.round(node_perf_hooks_1.performance.now() - startedMs);
            const passed = ending.passed;
            resolve({ name: command.name, passed, durationMs, output: output.text() });
        };
        child.on('error', (error) => finish({ passed: false, note: error.message }));
        child.on('close', (code, signal) => {
            finish({ passed: code === 0, note: signal === null ? '' : `terminated by ${signal}` });
        });
    });
}
/** Parse a job count from `--jobs=<n>`; absent means one fewer than the CPUs. */
function parseJobs(flag, cpus) {
    if (flag === undefined) {
        return Math.max(1, Math.min(cpus - 1, exports.POOL_LIMITS.jobsMax));
    }
    const jobs = Number(flag);
    if (!Number.isSafeInteger(jobs)) {
        throw new Error(`--jobs expects a whole number, got ${JSON.stringify(flag)}`);
    }
    assertJobs(jobs);
    return jobs;
}
function assertJobs(jobs) {
    if (jobs < 1) {
        throw new Error(`--jobs must be at least 1, got ${jobs}`);
    }
    if (jobs > exports.POOL_LIMITS.jobsMax) {
        throw new Error(`--jobs must be at most ${exports.POOL_LIMITS.jobsMax}, got ${jobs}`);
    }
}
// Keeps the last `bytesMax` bytes of a stream and says how much it dropped.
function createOutputTail(bytesMax) {
    const chunks = [];
    let kept = 0;
    let dropped = 0;
    return {
        push(chunk) {
            chunks.push(chunk);
            kept += chunk.length;
            while (kept > bytesMax && chunks.length > 1) {
                const first = chunks.shift();
                if (first === undefined) {
                    break;
                }
                kept -= first.length;
                dropped += first.length;
            }
        },
        text() {
            const body = Buffer.concat(chunks).toString('utf8');
            return dropped > 0 ? `[… ${dropped} earlier bytes dropped …]\n${body}` : body;
        },
    };
}
