"use strict";
// The test suites that need something unusual, keyed by repository path. Every
// other `*.test.js` and `*.test.ts` under test/ runs as `node <file>` in the
// shared pool (testDiscovery.ts finds them). A key that names no test file is
// an error, so this list cannot go stale; the move tool rewrites its keys when
// a test moves.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_SUITES = void 0;
// Node warns when it reads a typeless .ts module as ESM; the suites that load
// one through esbuild's output would print it on every run.
const QUIET_TYPELESS = ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON'];
exports.TEST_SUITES = {
    'test/electron/preload/hoverCost.test.js': {
        phase: 'alone',
        flaky: 'measures hover cost in milliseconds; a loaded machine can miss the budget',
    },
    'test/renderer/style/popoverDropdown.test.js': {
        phase: 'alone',
        flaky: 'drives a real window, whose focus another window can take',
    },
    // A stylesheet read that starts before an edit can land after it under load
    // and restore the old value; until that race is understood, it runs where
    // its timing assumptions hold.
    'test/renderer/style/selectorWell.test.js': { phase: 'alone' },
    'test/electron/project/thumbs.test.js': { phase: 'alone', runner: 'electron' },
    'test/scripts/build/buildLayout.test.ts': { build: 'renderer' },
    'test/renderer/app/viteModules.test.ts': { nodeArguments: ['--experimental-vm-modules'] },
    'test/renderer/content/contentFields.test.js': { nodeArguments: QUIET_TYPELESS },
    'test/renderer/variables/fluid.test.js': { nodeArguments: QUIET_TYPELESS },
};
