"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREFLIGHT_RUN_LIMITS = void 0;
exports.parseOptions = parseOptions;
// `npm run check:linux`: the ways the Linux release job has failed, checked on
// a Mac before a tag spends a release build finding them. Run it before
// tagging (docs/releases.md); it prints one line per check, and each failure
// says how to fix it.
//
//   npm run check:linux                  every check, probes under slow motion
//   npm run check:linux -- --static      the file checks only (seconds)
//   npm run check:linux -- --repeat=3    the probes three times
//   npm run check:linux -- --only=style/ the probes whose name contains style/
//   npm run check:linux -- --jobs=1      the probes one at a time
//
// The probes are the suites that open an Electron window. They run as the gate
// runs them, from the existing build (run `npm test` first), with
// linuxSlowMotion.js preloaded into Electron so animation frames and
// transitions are as late as on the Linux runner. What stays remote is listed
// in docs/releases.md.
const assert = require("node:assert/strict");
const node_child_process_1 = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const testDiscovery_1 = require("../gate/testDiscovery");
const testPool_1 = require("../gate/testPool");
const repoRoot_1 = require("../lib/repoRoot");
const lockfileClosure_1 = require("./lockfileClosure");
const linuxInstaller_1 = require("./linuxInstaller");
const linuxPreflightChecks_1 = require("./linuxPreflightChecks");
const linuxSlowMotion_1 = require("./linuxSlowMotion");
// The runner's conditions. A 200 ms frame delay holds a popup in its opening
// phase past the sleeps the probes used before they waited for the motion; it
// reproduced v1.0.11's sourceMenu failure to the pixel (9.97998px for 8px). A
// quarter-speed timeline catches measurements taken mid-transition.
const LINUX_RUNNER_MOTION = { frameDelayMs: 200, animationRate: 0.25 };
exports.PREFLIGHT_RUN_LIMITS = {
    repeatMax: 5,
    jobsMax: 4,
    /** One pass over the probes; about a minute on an M-series Mac. */
    probePassMsMax: 10 * 60 * 1_000,
    /** Findings printed per check; the count says how many more there are. */
    findingsShownMax: 20,
    gitOutputBytesMax: 64 * 1024 * 1024,
};
const SOURCE_EXTENSIONS = /\.(?:[cm]?[jt]sx?|css|astro)$/;
const CONFIG_FILES = ['package.json', 'studio/package.json', 'packages/create-stacki/package.json'];
const LOCKFILES = ['package-lock.json', 'studio/package-lock.json'];
function parseOptions(argumentsList) {
    let staticOnly = false;
    let repeat = 1;
    let jobs = 2;
    let only;
    for (const argument of argumentsList) {
        const [flag, value] = argument.split('=', 2);
        if (flag === '--static' && value === undefined) {
            staticOnly = true;
        }
        else if (flag === '--repeat' && value !== undefined) {
            repeat = boundedInteger(flag, value, exports.PREFLIGHT_RUN_LIMITS.repeatMax);
        }
        else if (flag === '--jobs' && value !== undefined) {
            jobs = boundedInteger(flag, value, exports.PREFLIGHT_RUN_LIMITS.jobsMax);
        }
        else if (flag === '--only' && value !== undefined && value !== '') {
            only = value;
        }
        else {
            throw new Error(`Unknown argument ${argument} (supported: --static, --repeat=<1-5>, --jobs=<1-4>, --only=<name>)`);
        }
    }
    return { staticOnly, repeat, jobs, only };
}
function boundedInteger(flag, value, maximum) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
        throw new Error(`${flag} takes a whole number from 1 to ${maximum}, not ${value}`);
    }
    return parsed;
}
async function main() {
    const options = parseOptions(process.argv.slice(2));
    const root = (0, repoRoot_1.repositoryRoot)();
    const startedMs = Date.now();
    const entries = trackedEntries(root);
    const tree = (0, linuxPreflightChecks_1.trackedTree)(entries.map((entry) => entry.file));
    const suites = (0, testDiscovery_1.suitesFor)((0, testDiscovery_1.discoverTestFiles)(root));
    const probes = suites.filter((suite) => isProbe(root, suite));
    assert.ok(probes.length > 0, 'linuxPreflight: the probe suites are found by their BrowserWindow');
    const checks = [
        ['case', () => checkCase(root, tree)],
        ['config paths', () => checkConfigPaths(root, tree)],
        ['shebangs', () => checkShebangs(root, tree, entries)],
        ['ignored files', () => checkIgnoredFiles(root, entries)],
        ['lockfiles', () => checkLockfiles(root)],
        ['linux build', () => checkLinuxBuild(root, tree)],
        ['deb script', () => checkDebScript()],
        ['settle scan', () => checkSettleScan(root, probes)],
        ['probes', () => (options.staticOnly ? { kind: 'skip', summary: '--static' } : checkProbes(root, probes, options))],
    ];
    let failed = 0;
    for (const [name, run] of checks) {
        const result = await run();
        printResult(name, result);
        if (result.kind === 'fail') {
            failed += 1;
        }
    }
    const seconds = ((Date.now() - startedMs) / 1000).toFixed(1);
    if (failed === 0) {
        console.log(`\ncheck:linux passed in ${seconds}s.`);
        return 0;
    }
    console.error(`\ncheck:linux: ${failed} check(s) failed in ${seconds}s. Fix them before tagging; CI's Linux job fails the same way.`);
    return 1;
}
function printResult(name, result) {
    switch (result.kind) {
        case 'pass':
            console.log(`ok   ${name}: ${result.summary}`);
            return;
        case 'skip':
            console.log(`skip ${name}: ${result.summary}`);
            return;
        case 'fail':
        case 'warn': {
            console.log(`${result.kind === 'fail' ? 'FAIL' : 'warn'} ${name}: ${result.summary}`);
            for (const finding of result.findings.slice(0, exports.PREFLIGHT_RUN_LIMITS.findingsShownMax)) {
                const where = finding.line === 0 ? finding.file : `${finding.file}:${finding.line}`;
                console.log(`     ${where} ${finding.message}`);
            }
            const hidden = result.findings.length - exports.PREFLIGHT_RUN_LIMITS.findingsShownMax;
            if (hidden > 0) {
                console.log(`     … and ${hidden} more`);
            }
            return;
        }
        default: {
            const exhaustive = result;
            return exhaustive;
        }
    }
}
function verdict(findings, passSummary, failNoun) {
    if (findings.length === 0) {
        return { kind: 'pass', summary: passSummary };
    }
    return { kind: 'fail', summary: `${findings.length} ${failNoun}`, findings };
}
// ── The file checks ─────────────────────────────────────────────────────────
function checkCase(root, tree) {
    const findings = [...(0, linuxPreflightChecks_1.caseCollisions)(tree)];
    let scanned = 0;
    for (const file of tree.exact) {
        if (SOURCE_EXTENSIONS.test(file)) {
            const text = readSource(root, file);
            if (text !== undefined) {
                scanned += 1;
                findings.push(...(0, linuxPreflightChecks_1.caseMismatches)(tree, file, text));
            }
        }
    }
    return verdict(findings, `relative imports in ${scanned} files match their files' case`, 'path(s) resolve only on a case-insensitive disk');
}
function checkConfigPaths(root, tree) {
    const files = [...CONFIG_FILES, ...workflowFiles(tree)];
    const findings = files.flatMap((file) => {
        const text = readSource(root, file);
        return text === undefined ? [] : (0, linuxPreflightChecks_1.configPathMismatches)(tree, file, text);
    });
    return verdict(findings, `paths in ${files.length} package and workflow files match their files' case`, 'config path(s) differ in case');
}
function checkShebangs(root, tree, entries) {
    const workflows = workflowFiles(tree).map((file) => readSource(root, file) ?? '');
    const executed = new Set([
        ...[...tree.exact].filter((file) => file.startsWith('.githooks/') && file.split('/').length === 2),
        ...workflows.flatMap((text) => (0, linuxPreflightChecks_1.directlyExecutedPaths)(tree, text)),
    ]);
    const findings = (0, linuxPreflightChecks_1.shebangFindings)(entries, executed);
    const scripts = entries.filter((entry) => entry.head.startsWith('#!')).length;
    return verdict(findings, `${scripts} #! files and ${executed.size} directly run files are portable`, 'executable or shebang problem(s)');
}
function checkIgnoredFiles(root, entries) {
    const ignored = git(root, ['ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--', 'test'])
        .split('\0')
        .filter((file) => file !== '' && !file.includes('node_modules/'));
    if (ignored.length === 0) {
        return { kind: 'pass', summary: 'no ignored files under test/ to depend on' };
    }
    const findings = entries
        .filter((entry) => entry.file.startsWith('test/') && SOURCE_EXTENSIONS.test(entry.file))
        .flatMap((entry) => {
        const text = readSource(root, entry.file);
        return text === undefined ? [] : (0, linuxPreflightChecks_1.ignoredReferences)(ignored, entry.file, text);
    });
    return verdict(findings, `no test names one of the ${ignored.length} ignored files under test/`, 'reference(s) to files a clean checkout lacks');
}
function checkLockfiles(root) {
    const findings = LOCKFILES.flatMap((file) => {
        const input = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
        return (0, lockfileClosure_1.lockfileMissingDependencies)(input).map((edge) => ({
            file,
            line: 0,
            message: `${edge} is missing; \`npm ci\` on Linux refuses the lockfile. Run \`npm install\` and commit the lockfile.`,
        }));
    });
    return verdict(findings, `${LOCKFILES.length} lockfiles hold every platform's dependencies`, 'missing lockfile edge(s)');
}
function checkLinuxBuild(root, tree) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const build = typeof manifest === 'object' && manifest !== null ? Reflect.get(manifest, 'build') : undefined;
    const linux = typeof build === 'object' && build !== null ? Reflect.get(build, 'linux') : undefined;
    const icon = typeof linux === 'object' && linux !== null ? Reflect.get(linux, 'icon') : undefined;
    const iconHeader = typeof icon === 'string' && tree.exact.has(icon) ? readHead(path.join(root, icon), 24) : undefined;
    const findings = (0, linuxPreflightChecks_1.linuxBuildFindings)(build, tree, iconHeader);
    return verdict(findings, 'electron-builder Linux settings, icon and targets are valid', 'Linux packaging problem(s)');
}
function checkDebScript() {
    // The deb's maintainer script is generated from the builder's template; a
    // builder upgrade that changes it fails here instead of at packaging.
    let script;
    try {
        script = (0, linuxInstaller_1.linuxInstallerTemplate)(fs.readFileSync(require.resolve('app-builder-lib/templates/linux/after-install.tpl'), 'utf8'));
    }
    catch (error) {
        return { kind: 'fail', summary: 'the deb after-install script no longer renders', findings: [{ file: 'scripts/release/linuxInstaller.ts', line: 0, message: String(error) }] };
    }
    const syntax = (0, node_child_process_1.spawnSync)('sh', ['-n'], { input: script, encoding: 'utf8', timeout: 10_000 });
    if (syntax.status !== 0) {
        const message = `sh -n rejects the rendered script: ${syntax.stderr.trim()}`;
        return { kind: 'fail', summary: 'the deb after-install script is not valid shell', findings: [{ file: 'scripts/release/linuxInstaller.ts', line: 0, message }] };
    }
    return { kind: 'pass', summary: 'the deb after-install script renders and parses as shell' };
}
function checkSettleScan(root, probes) {
    // The scan reads text, not control flow, so it can flag a sleep that never
    // precedes the read. It warns; the slowed probe run below is what fails.
    const findings = probes.flatMap((suite) => (0, linuxPreflightChecks_1.unsettledMeasurements)(suite.file, readSource(root, suite.file) ?? ''));
    const summary = `${probes.length} probe suites wait for motion before they measure`;
    if (findings.length === 0) {
        return { kind: 'pass', summary };
    }
    return { kind: 'warn', summary: `${findings.length} measurement(s) after a fixed sleep; fragile on a slower runner even when the probes pass`, findings };
}
// ── The probes under slow motion ────────────────────────────────────────────
async function checkProbes(root, probes, options) {
    const only = options.only;
    const selected = only === undefined ? probes : probes.filter((suite) => suite.name.includes(only));
    if (selected.length === 0) {
        return { kind: 'fail', summary: `no probe suite matches --only=${only ?? ''}`, findings: [] };
    }
    if (!fs.existsSync(path.join(root, 'dist', 'electron'))) {
        return { kind: 'fail', summary: 'no build to run the probes from', findings: [{ file: 'dist/', line: 0, message: 'Run `npm test` (or `npm run build`) first.' }] };
    }
    const logDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'stacki-check-linux-'));
    try {
        const findings = [];
        let slowedSuites = 0;
        for (let pass = 1; pass <= options.repeat; pass += 1) {
            const outcomes = await probePass(root, selected, options.jobs, logDirectory);
            for (const [index, outcome] of outcomes.entries()) {
                const suite = selected[index];
                assert.ok(suite !== undefined, 'checkProbes: an outcome per selected suite');
                assert.equal(outcome.name, suite.name, 'checkProbes: outcomes come back in suite order');
                const slowed = slowedDocuments(path.join(logDirectory, logName(suite)));
                slowedSuites += slowed > 0 ? 1 : 0;
                if (!outcome.passed) {
                    findings.push({ file: suite.file, line: 0, message: probeFailure(pass, outcome) });
                }
            }
        }
        const runs = selected.length * options.repeat;
        const summary = `${runs - findings.length}/${runs} probe runs passed with frames delayed ${LINUX_RUNNER_MOTION.frameDelayMs} ms and motion at ${LINUX_RUNNER_MOTION.animationRate}× (${slowedSuites} slowed a window)`;
        if (findings.length > 0) {
            return { kind: 'fail', summary, findings };
        }
        // A pass that slowed nothing proves nothing: the preload never reached Electron.
        if (slowedSuites === 0) {
            return { kind: 'fail', summary: 'no probe window was slowed', findings: [{ file: 'scripts/release/linuxSlowMotion.ts', line: 0, message: 'The NODE_OPTIONS preload did not reach Electron.' }] };
        }
        return { kind: 'pass', summary };
    }
    finally {
        fs.rmSync(logDirectory, { recursive: true, force: true });
    }
}
async function probePass(root, suites, jobs, logDirectory) {
    const electronInput = require('electron');
    assert.ok(typeof electronInput === 'string', 'checkProbes: the electron package exports its binary path under Node');
    const hook = path.join(root, 'dist', 'scripts', 'release', 'linuxSlowMotion.js');
    assert.ok(fs.existsSync(hook), 'checkProbes: npm run check:linux builds the scripts first');
    // The pool has no per-command timeout; a hung probe stops the whole pass.
    const deadline = setTimeout(testPool_1.stopTestPool, exports.PREFLIGHT_RUN_LIMITS.probePassMsMax);
    try {
        // One environment per suite, so each counts its own slowed windows.
        const groups = chunk(suites, jobs);
        const results = await Promise.all(groups.map(async (group) => {
            const groupOutcomes = [];
            for (const suite of group) {
                const environment = probeEnvironment(hook, path.join(logDirectory, logName(suite)));
                const outcome = await (0, testPool_1.runTestCommand)(probeCommand(suite, electronInput), { jobs: 1, cwd: root, environment });
                printProbe(outcome);
                groupOutcomes.push(outcome);
            }
            return groupOutcomes;
        }));
        const byName = new Map(results.flat().map((outcome) => [outcome.name, outcome]));
        const outcomes = suites.map((suite) => byName.get(suite.name));
        assert.equal(byName.size, suites.length, 'probePass: every suite ran once');
        return outcomes.filter((outcome) => outcome !== undefined);
    }
    finally {
        clearTimeout(deadline);
    }
}
function probeCommand(suite, electronBinary) {
    // The same command the gate runs (scripts/gate/runTests.ts).
    if (suite.options.runner === 'electron') {
        return { name: suite.name, command: electronBinary, argumentsList: [suite.file] };
    }
    const nodeArguments = suite.options.nodeArguments ?? [];
    return { name: suite.name, command: process.execPath, argumentsList: [...nodeArguments, suite.file] };
}
function probeEnvironment(hook, logFile) {
    const environment = { ...process.env };
    // Electron run as plain Node has no BrowserWindow (CLAUDE.md).
    delete environment['ELECTRON_RUN_AS_NODE'];
    const inherited = environment['NODE_OPTIONS'] ?? '';
    environment['NODE_OPTIONS'] = `${inherited} --require ${JSON.stringify(hook)}`.trim();
    environment[linuxSlowMotion_1.SLOW_MOTION_ENVIRONMENT] = JSON.stringify(LINUX_RUNNER_MOTION);
    environment[linuxSlowMotion_1.SLOW_MOTION_LOG_ENVIRONMENT] = logFile;
    return environment;
}
function printProbe(outcome) {
    const seconds = (outcome.durationMs / 1000).toFixed(1);
    console.log(`     ${outcome.passed ? 'ok  ' : 'FAIL'} ${outcome.name} (${seconds}s)`);
}
function probeFailure(pass, outcome) {
    // The suites end with their failed checks; Chromium's own logging is noise.
    const lines = outcome.output
        .split('\n')
        .filter((line) => line.trim() !== '' && !line.startsWith('['))
        .slice(-8)
        .map((line) => `\n       ${line}`)
        .join('');
    return `failed under slow motion (pass ${pass}). It measures before a transition or frame it depends on; wait for that event, within a bound, instead of a fixed sleep.${lines}`;
}
function slowedDocuments(logFile) {
    if (!fs.existsSync(logFile)) {
        return 0;
    }
    return fs
        .readFileSync(logFile, 'utf8')
        .split('\n')
        .filter((line) => line.startsWith('slowed ')).length;
}
function logName(suite) {
    return `${suite.name.replaceAll('/', '_')}.log`;
}
/** `items` dealt round-robin into at most `count` groups. */
function chunk(items, count) {
    assert.ok(count >= 1, 'chunk: at least one group');
    const groups = Array.from({ length: Math.min(count, items.length) }, () => []);
    for (const [index, item] of items.entries()) {
        groups[index % groups.length]?.push(item);
    }
    return groups;
}
// ── Reading the repository ──────────────────────────────────────────────────
function isProbe(root, suite) {
    if (suite.options.runner === 'electron') {
        return true;
    }
    return (readSource(root, suite.file) ?? '').includes('BrowserWindow');
}
function trackedEntries(root) {
    // `-s` prints `<mode> <object> <stage>\t<path>`; -z keeps odd names intact.
    const records = git(root, ['ls-files', '-z', '-s']).split('\0');
    assert.ok(records.length <= linuxPreflightChecks_1.PREFLIGHT_LIMITS.trackedFilesMax, 'trackedEntries: tracked file count exceeds limit');
    const entries = [];
    for (const record of records) {
        if (record !== '') {
            const tab = record.indexOf('\t');
            assert.ok(tab > 0, `trackedEntries: unexpected ls-files record ${record}`);
            const file = record.slice(tab + 1);
            const mode = record.slice(0, record.indexOf(' '));
            // A tracked file deleted in the working copy has no head to read.
            const head = readHead(path.join(root, file), linuxPreflightChecks_1.PREFLIGHT_LIMITS.shebangBytesMax);
            if (mode !== '160000' && head !== undefined) {
                entries.push({ file, mode, head: head.toString('latin1') });
            }
        }
    }
    return entries;
}
function workflowFiles(tree) {
    return [...tree.exact].filter((file) => file.startsWith('.github/workflows/') && file.endsWith('.yml')).sort();
}
function readSource(root, file) {
    const target = path.join(root, file);
    if (!fs.existsSync(target)) {
        return undefined;
    }
    const stat = fs.statSync(target);
    if (!stat.isFile() || stat.size > linuxPreflightChecks_1.PREFLIGHT_LIMITS.sourceBytesMax) {
        return undefined;
    }
    return fs.readFileSync(target, 'utf8');
}
function readHead(file, sizeBytes) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        return undefined;
    }
    const head = Buffer.alloc(sizeBytes);
    const descriptor = fs.openSync(file, 'r');
    try {
        const read = fs.readSync(descriptor, head, 0, sizeBytes, 0);
        return head.subarray(0, read);
    }
    finally {
        fs.closeSync(descriptor);
    }
}
function git(root, argumentsList) {
    const result = (0, node_child_process_1.spawnSync)('git', [...argumentsList], { cwd: root, encoding: 'utf8', maxBuffer: exports.PREFLIGHT_RUN_LIMITS.gitOutputBytesMax });
    if (result.status !== 0) {
        throw new Error(`git ${argumentsList.join(' ')} failed: ${result.stderr}`);
    }
    return result.stdout;
}
if (require.main === module) {
    void main().then((code) => {
        process.exitCode = code;
    }, (error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
