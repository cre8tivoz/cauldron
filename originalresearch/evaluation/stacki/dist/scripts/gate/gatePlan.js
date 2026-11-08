"use strict";
// What one gate run builds and checks, decided before anything runs.
//
// `npm test` with no suite named is the full gate CI runs: a clean output
// tree, every build, every static check, every suite. Naming suites
// (`npm test -- panelField`) asks a narrower question — do these suites pass
// against the current sources? — so the run builds what the suites load and
// nothing else. The static checks (tsc, ESLint, Prettier, the policy scan, the
// adapter ratchet) answer for the whole tree, not for a suite: the stop hook
// and `npm run check:changed` run them on changed files, and the full gate and
// CI run them on everything. Before this split, naming one suite still cost
// every check over the whole repository (about three minutes) before the
// suite started.
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatePlanFor = gatePlanFor;
exports.targetedNotice = targetedNotice;
const CHAIN_FULL = ['build:contracts', 'build:electron', 'build:scripts', 'build:morph', 'build:preload', 'stage:runtime'];
// `npm test` builds the scripts before the runner starts (package.json), and a
// targeted run keeps the tree, so the scripts are already current.
const CHAIN_TARGETED = CHAIN_FULL.filter((stage) => stage !== 'build:scripts');
function gatePlanFor(input) {
    if (input.selected.length === 0) {
        throw new Error('gatePlanFor: no suite is selected');
    }
    if (input.queries.length === 0) {
        return { kind: 'full', chain: CHAIN_FULL, beside: ['build:web'] };
    }
    const renderer = input.selected.some((suite) => suite.options.build === 'renderer');
    const plan = {
        kind: 'targeted',
        chain: CHAIN_TARGETED,
        beside: renderer ? ['build:web'] : [],
    };
    if (plan.chain.includes('build:web')) {
        throw new Error('gatePlanFor: the renderer bundle never runs in the chain');
    }
    if (plan.chain.at(-1) !== 'stage:runtime') {
        throw new Error('gatePlanFor: staging copies beside compiled code, so it runs last');
    }
    return plan;
}
/** The one line a targeted run prints, so a skipped check is never a surprise. */
function targetedNotice(plan) {
    if (plan.kind !== 'targeted') {
        throw new Error('targetedNotice: only a targeted run skips anything');
    }
    const renderer = plan.beside.includes('build:web') ? '' : ', the renderer bundle';
    return (`[gate] Named suites only: skipping the clean, tsc, ESLint, Prettier, the policy ` +
        `scan, adapter-surface${renderer}. \`npm test\` with no suite runs the full gate.`);
}
