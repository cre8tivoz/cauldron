#!/usr/bin/env node
"use strict";
// The gate: builds, static checks, then every test suite under test/.
//
//   npm test                         everything: the full gate CI runs
//   npm test -- hoverCost electron/  suites by name, or every suite under a folder
//   npm test -- --list               the suites, without running them
//   npm test -- --jobs=4             at most four suites at once
//
// Naming suites builds what they load over the existing tree and skips the
// clean and the whole-tree static checks (gatePlan.ts says why); the stop hook
// and `npm run check:changed` check changed files.
//
// Suites are found by name (testDiscovery.ts); the few that need a different
// runner, Node flags, the renderer bundle or to run alone say so in
// testSuites.ts. Each runs as a direct spawn with an argument list, never a
// shell line.
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("node:os");
const path = require("node:path");
const gatePlan_1 = require("./gatePlan");
const testPool_1 = require("./testPool");
const repoRoot_1 = require("../lib/repoRoot");
const testDiscovery_1 = require("./testDiscovery");
const root = (0, repoRoot_1.repositoryRoot)();
const flags = process.argv.slice(2).filter((argument) => argument.startsWith('--'));
const unknownFlags = flags.filter((flag) => !flag.startsWith('--jobs=') && flag !== '--list');
if (unknownFlags.length > 0) {
    console.error(`Unknown flag: ${unknownFlags.join(', ')} (supported: --jobs=<n>, --list)`);
    process.exit(1);
}
const jobs = (0, testPool_1.parseJobs)(flags.find((flag) => flag.startsWith('--jobs='))?.slice('--jobs='.length), os.availableParallelism());
const queries = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
const { selected, unmatched } = (0, testDiscovery_1.selectSuites)((0, testDiscovery_1.suitesFor)((0, testDiscovery_1.discoverTestFiles)(root)), queries);
if (selected.length === 0 || unmatched.length > 0) {
    console.error(`No test suite matches: ${unmatched.join(', ')} (npm test -- --list)`);
    process.exit(1);
}
if (flags.includes('--list')) {
    console.log(selected.map((suite) => `${suite.name}  (${suite.file})`).join('\n'));
    process.exit(0);
}
const startedMs = Date.now();
const failed = [];
const pathValue = process.env['PATH'] ?? '';
const environment = {
    ...process.env,
    PATH: `${path.join(root, 'node_modules', '.bin')}${path.delimiter}${pathValue}`,
};
const node = process.execPath;
const typeScript = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
const plan = (0, gatePlan_1.gatePlanFor)({ queries, selected });
// Node >= 22.18 strips types itself (package.json engines).
const cleanCommand = {
    name: 'build:clean',
    command: node,
    argumentsList: [path.join(root, 'scripts/build/cleanBuild.mts')],
};
const buildArguments = {
    'build:contracts': [typeScript, '-p', path.join('shared', 'tsconfig.json')],
    'build:electron': [typeScript, '-p', path.join('electron', 'tsconfig.json')],
    'build:scripts': [typeScript, '-p', path.join('scripts', 'tsconfig.build.json')],
    // The two runtime scripts are type-checked here and bundled after (BUNDLED).
    'build:morph': [typeScript, '-p', path.join('electron', 'tsconfig.morph.json'), '--noEmit'],
    'build:preload': [typeScript, '-p', path.join('electron', 'tsconfig.preload.json'), '--noEmit'],
    'stage:runtime': [path.join(root, 'dist/scripts/build/stageRuntime.js')],
    'build:web': [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'],
};
// A targeted run keeps the tree, so its TypeScript emits are incremental. The
// build info lives inside dist/, beside the outputs it describes: anything
// that deletes the outputs (build:clean, every packaging path) deletes it too,
// so tsc can never skip an emit whose output is gone. The full gate starts
// clean and stays cold, as CI is.
const INCREMENTAL_STAGES = new Set(['build:contracts', 'build:electron', 'build:morph', 'build:preload']);
// The stages whose output esbuild writes, each into one file the runtime loads
// whole (scripts/build/bundleClients.ts), after tsc has type-checked it.
const BUNDLED = new Map([
    ['build:morph', 'morph'],
    ['build:preload', 'preload'],
]);
// A stage's commands, run in order; the stage fails at the first that fails.
const buildCommands = (stage) => {
    const client = BUNDLED.get(stage);
    if (client === undefined) {
        return [buildCommand(stage)];
    }
    const bundler = path.join(root, 'dist/scripts/build/bundleClients.js');
    return [buildCommand(stage), { name: `${stage} (bundle)`, command: node, argumentsList: [bundler, client] }];
};
const buildCommand = (stage) => {
    const argumentsList = buildArguments[stage];
    if (plan.kind === 'targeted' && INCREMENTAL_STAGES.has(stage)) {
        const buildInfo = path.join(root, 'dist', '.tsbuildinfo', `${stage.slice('build:'.length)}.tsbuildinfo`);
        const incremental = ['--incremental', '--tsBuildInfoFile', buildInfo];
        return { name: stage, command: node, argumentsList: [...argumentsList, ...incremental] };
    }
    return { name: stage, command: node, argumentsList };
};
// The type checks keep what they learned between runs, outside dist/ so a
// clean keeps it. tsc re-checks every file whose own text or dependencies
// changed, so a warm run reaches the verdict a cold one does. `tsc --noEmit`
// shares check:changed's file (scripts/policy/checks.mts): one program, one
// cache, so each warms the other.
const typeCheckCache = path.join(root, 'node_modules', '.cache', 'tsc');
// Prettier formats each file alone, so a file whose content and options are
// unchanged keeps its verdict. Only the content strategy is safe here: a
// checkout rewrites modification times without changing a byte.
const prettierCache = path.join(root, 'node_modules', '.cache', 'prettier', 'gate.json');
// The checks only read what the builds produced, so they run side by side.
const staticChecks = [
    {
        name: 'studio verify',
        command: node,
        argumentsList: [path.join(root, 'scripts/policy/studioChecks.mts'), '--full'],
    },
    {
        name: 'tsc --noEmit',
        command: node,
        argumentsList: [typeScript, '--noEmit', '--incremental', '--tsBuildInfoFile', path.join(typeCheckCache, 'root.tsbuildinfo')],
    },
    {
        // The scripts emit CommonJS, so their build config cannot hold
        // verbatimModuleSyntax; this check-only program holds the full flag set.
        name: 'tsc scripts',
        command: node,
        argumentsList: [
            typeScript,
            '-p',
            path.join('scripts', 'tsconfig.json'),
            '--incremental',
            '--tsBuildInfoFile',
            path.join(typeCheckCache, 'scripts.tsbuildinfo'),
        ],
    },
    {
        name: 'eslint',
        command: node,
        argumentsList: [path.join(root, 'node_modules', 'eslint', 'bin', 'eslint.js'), '--max-warnings', '0', '.'],
    },
    {
        // Line width, shell scripts, test headers, the dependency record, one
        // lockfile, agent instructions, assertion density (docs/enforcement.md).
        name: 'policy scan',
        command: node,
        argumentsList: [path.join(root, 'scripts/policy/scan.mts')],
    },
    {
        name: 'prettier',
        command: node,
        argumentsList: [
            path.join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs'),
            '--check',
            '--cache',
            '--cache-strategy',
            'content',
            '--cache-location',
            prettierCache,
            '--log-level',
            'warn',
            '.',
        ],
    },
    {
        name: 'adapter-surface',
        command: node,
        argumentsList: [path.join(root, 'dist/scripts/gate/adapterSurface.js')],
    },
];
// Two phases: the shared pool, then the suites that run alone (they measure
// timing or drive a real window) one at a time with nothing else running.
// The Electron binary's path is what the electron package exports.
const electronInput = require('electron');
const electronBinary = typeof electronInput === 'string' ? electronInput : 'electron';
const toCommand = (suite) => {
    if (suite.options.runner === 'electron') {
        return { name: suite.name, command: electronBinary, argumentsList: [suite.file] };
    }
    const nodeArguments = suite.options.nodeArguments ?? [];
    return { name: suite.name, command: node, argumentsList: [...nodeArguments, suite.file] };
};
const phases = [
    selected.filter((suite) => suite.options.phase !== 'alone').map(toCommand),
    selected.filter((suite) => suite.options.phase === 'alone').map(toCommand),
];
const names = selected.map((suite) => suite.name);
process.on('SIGINT', () => {
    (0, testPool_1.stopTestPool)();
    process.exit(130);
});
let testsStartedMs = Date.now();
let finished = 0;
const report = (outcome) => {
    finished += 1;
    const seconds = (outcome.durationMs / 1000).toFixed(1);
    const verdict = outcome.passed ? 'ok  ' : 'FAIL';
    console.log(`[${finished}/${names.length}] ${verdict} ${outcome.name} (${seconds}s)`);
    if (!outcome.passed) {
        failed.push(outcome.name);
        console.log(outcome.output);
    }
};
// Every check's output is shown (lint warnings included); any failure stops the
// gate before the tests, as a failed build does.
async function runStaticChecks() {
    const options = { cwd: root, environment, jobs: Math.min(jobs, staticChecks.length) };
    const outcomes = await (0, testPool_1.runTestPool)(staticChecks, options, (outcome) => {
        const seconds = (outcome.durationMs / 1000).toFixed(1);
        console.log(`\n[gate] ${outcome.name} ${outcome.passed ? 'done' : 'FAILED'} in ${seconds}s`);
        console.log(outcome.output);
    });
    const failures = outcomes.filter((outcome) => !outcome.passed);
    if (failures.length > 0) {
        console.error(`\nStatic gate failed: ${failures.map((outcome) => outcome.name).join(', ')}`);
        process.exit(1);
    }
}
// A build's output is shown when it finishes, so the chain and the builds
// beside it never interleave on the terminal.
function reportBuild(outcome) {
    const seconds = (outcome.durationMs / 1000).toFixed(1);
    console.log(`\n[gate] ${outcome.name} ${outcome.passed ? 'done' : 'FAILED'} in ${seconds}s`);
    const output = outcome.output.trimEnd();
    if (output !== '') {
        console.log(output);
    }
}
// The chain stops at its first failure: each stage reads what the one before
// it wrote.
async function runChain(stages) {
    const options = { cwd: root, environment, jobs: 1 };
    const outcomes = [];
    for (const command of stages.flatMap(buildCommands)) {
        const outcome = await (0, testPool_1.runTestCommand)(command, options);
        reportBuild(outcome);
        outcomes.push(outcome);
        if (!outcome.passed) {
            break;
        }
    }
    return outcomes;
}
// Any failed build stops the gate before the checks and the suites.
async function runBuilds() {
    if (plan.kind === 'full') {
        const clean = await (0, testPool_1.runTestCommand)(cleanCommand, { cwd: root, environment, jobs: 1 });
        reportBuild(clean);
        if (!clean.passed) {
            console.error('\nStatic gate failed: build:clean');
            process.exit(1);
        }
    }
    else {
        console.log((0, gatePlan_1.targetedNotice)(plan));
    }
    const besideJobs = Math.min(Math.max(plan.beside.length, 1), testPool_1.POOL_LIMITS.jobsMax);
    const besideOptions = { cwd: root, environment, jobs: besideJobs };
    const [chain, beside] = await Promise.all([runChain(plan.chain), (0, testPool_1.runTestPool)(plan.beside.flatMap(buildCommands), besideOptions, reportBuild)]);
    const failures = [...chain, ...beside].filter((outcome) => !outcome.passed);
    if (failures.length > 0) {
        console.error(`\nStatic gate failed: ${failures.map((outcome) => outcome.name).join(', ')}`);
        process.exit(1);
    }
}
async function runPhases() {
    const buildsStartedMs = Date.now();
    await runBuilds();
    console.log(`\n[gate] builds done in ${((Date.now() - buildsStartedMs) / 1000).toFixed(1)}s`);
    if (plan.kind === 'full') {
        await runStaticChecks();
    }
    testsStartedMs = Date.now();
    console.log(`\n[gate] ${names.length} test suites, ${jobs} at a time`);
    const outcomes = [];
    for (const [index, phase] of phases.entries()) {
        const phaseJobs = index === 0 ? jobs : 1;
        const options = { cwd: root, environment, jobs: phaseJobs };
        outcomes.push(...(await (0, testPool_1.runTestPool)(phase, options, report)));
    }
    return outcomes;
}
function summarize(outcomes) {
    const slowest = [...outcomes].sort((left, right) => right.durationMs - left.durationMs);
    const named = slowest.slice(0, 5).map((outcome) => `${outcome.name} ${(outcome.durationMs / 1000).toFixed(1)}s`);
    const testSeconds = ((Date.now() - testsStartedMs) / 1000).toFixed(1);
    console.log(`\nTest suites took ${testSeconds}s. Slowest: ${named.join(', ')}`);
    const quarantined = [];
    const flaky = selected.filter((suite) => suite.options.flaky !== undefined).map((suite) => suite.name);
    const durationSeconds = ((Date.now() - startedMs) / 1000).toFixed(1);
    const passed = names.length - failed.length;
    console.log(`\n${passed}/${names.length} test suites passed in ${durationSeconds}s.`);
    if (failed.length > 0) {
        console.error(`Failed: ${failed.join(', ')}`);
    }
    const tolerated = [...quarantined, ...flaky];
    const unexpected = failed.filter((name) => !tolerated.includes(name));
    const healed = quarantined.filter((name) => !failed.includes(name) && names.includes(name));
    if (healed.length > 0) {
        console.error(`\nQuarantined tests now pass — remove them: ${healed.join(', ')}`);
    }
    process.exitCode = unexpected.length > 0 || healed.length > 0 ? 1 : 0;
}
runPhases().then(summarize, (error) => {
    console.error(error);
    process.exit(1);
});
