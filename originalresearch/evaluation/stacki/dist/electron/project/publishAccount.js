"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishingAccount = void 0;
exports.wranglerInstallArguments = wranglerInstallArguments;
const node_child_process_1 = require("node:child_process");
const assert_1 = require("../../shared/core/assert");
const publishAccount_1 = require("../../shared/ipc/publishAccount");
const packageManager_1 = require("../../shared/properties/packageManager");
const nodeTools_1 = require("../lib/nodeTools");
const packageManager_2 = require("./packageManager");
const publishExecutable_1 = require("./publishExecutable");
const publishCommands_1 = require("./publishCommands");
const OUTPUT_CHARS_MAX = 8192;
const INSTALL_OUTPUT_CHARS_MAX = 1_048_576;
// One login can own the CLI credential store at a time. Raw output never leaves this service.
class PublishingAccount {
    launch;
    hasWrangler;
    packageManager;
    session;
    constructor(launch = launchAccountSignIn, hasWrangler = publishExecutable_1.projectHasWrangler, packageManager = packageManager_2.detectPackageManager) {
        this.launch = launch;
        this.hasWrangler = hasWrangler;
        this.packageManager = packageManager;
    }
    request(root, input) {
        const request = (0, publishAccount_1.parseAccountRequest)(input);
        const provider = request.provider ?? 'github';
        const session = this.session;
        if (session?.id === request.id && session.root === root && session.provider === provider) {
            if (request.action === 'cancel' && (0, publishAccount_1.accountSignInPending)(session.state)) {
                this.finish(session, { kind: 'cancelled' });
            }
            return session.state;
        }
        if (request.action !== 'start') {
            return { kind: 'failed', message: 'This sign-in session has ended. Please try again.' };
        }
        const busy = this.busy();
        if (busy !== undefined) {
            return busy;
        }
        const step = provider === 'cloudflare' && !this.hasWrangler(root) ? { kind: 'installing', packageManager: this.packageManager(root) } : { kind: 'starting' };
        return this.start(root, request.id, provider, step);
    }
    // A pending sign-in owns the CLI credentials, and a cancelled installation still
    // writing the site must finish before another one can start.
    busy() {
        const session = this.session;
        if (session === undefined) {
            return undefined;
        }
        if ((0, publishAccount_1.accountSignInPending)(session.state)) {
            return {
                kind: 'failed',
                message: 'Finish or cancel the account sign-in already in progress.',
            };
        }
        if (session.step.kind === 'installing' && running(session.process)) {
            return {
                kind: 'failed',
                message: 'Wrangler is still installing in the background. Try again in a moment.',
            };
        }
        return undefined;
    }
    start(root, id, provider, step) {
        let child;
        try {
            child = this.launch(root, provider, step);
        }
        catch {
            // On Windows a missing tool is found while resolving it, before any process starts.
            return { kind: 'failed', message: launchFailure(provider, step) };
        }
        const stop = () => {
            stopAccountSignIn(child, provider);
        };
        process.once('exit', stop);
        child.once('close', () => process.removeListener('exit', stop));
        const session = {
            id,
            root,
            provider,
            process: child,
            step,
            state: { kind: step.kind },
            output: '',
            outputChars: 0,
            timer: undefined,
        };
        this.session = session;
        session.timer = setTimeout(() => this.expire(session), step.kind === 'installing' ? publishAccount_1.ACCOUNT_INSTALL_TIMEOUT_MS : publishAccount_1.ACCOUNT_SIGN_IN_TIMEOUT_MS);
        session.timer.unref();
        this.watch(session);
        return session.state;
    }
    // A pending session fails at its timeout. A cancelled installation left to finish in
    // the background is stopped at the same timeout, so it stays bounded too.
    expire(session) {
        if ((0, publishAccount_1.accountSignInPending)(session.state)) {
            const label = session.provider === 'github' ? 'GitHub' : 'Cloudflare';
            this.finish(session, {
                kind: 'failed',
                message: session.step.kind === 'installing'
                    ? 'Wrangler installation timed out. Check your connection and try again.'
                    : `${label} sign-in expired. Please try again.`,
            });
            return;
        }
        if (running(session.process)) {
            stopAccountSignIn(session.process, session.provider);
        }
    }
    watch(session) {
        const child = session.process;
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (chunk) => this.read(session, chunk));
        child.stderr.on('data', (chunk) => this.read(session, chunk));
        child.on('error', () => this.finish(session, {
            kind: 'failed',
            message: launchFailure(session.provider, session.step),
        }));
        child.on('close', (code) => this.closed(session, code ?? undefined));
        // Piped input keeps gh in its device-code flow without an interactive shell or prompts.
        child.stdin.on('error', () => { });
        child.stdin.end();
    }
    closed(session, code) {
        if (this.session !== session) {
            return;
        }
        if (!(0, publishAccount_1.accountSignInPending)(session.state)) {
            // A cancelled installation that finished in the background needs no timeout now.
            clearTimeout(session.timer);
            return;
        }
        if (session.step.kind === 'installing') {
            if (code === 0) {
                clearTimeout(session.timer);
                // Session identity prevents late installer events from completing the subsequent login.
                const login = this.start(session.root, session.id, session.provider, { kind: 'starting' });
                if (this.session === session) {
                    // Login could not launch, so no new session replaced this one.
                    this.finish(session, login);
                }
            }
            else {
                this.finish(session, {
                    kind: 'failed',
                    message: 'Could not install Wrangler. Check your connection and project access, then retry.',
                });
            }
            return;
        }
        const label = session.provider === 'github' ? 'GitHub' : 'Cloudflare';
        this.finish(session, code === 0
            ? { kind: 'complete' }
            : {
                kind: 'failed',
                message: `${label} sign-in did not complete. Check CLI authentication and try again.`,
            });
    }
    read(expectedSession, chunk) {
        const session = this.session;
        if (session === undefined || session !== expectedSession) {
            return;
        }
        if (!(0, publishAccount_1.accountSignInPending)(session.state)) {
            return;
        }
        (0, assert_1.assert)(typeof chunk === 'string', 'Account sign-in streams use UTF-8 text');
        (0, assert_1.assert)(session.output.length <= OUTPUT_CHARS_MAX, 'Account sign-in output stays bounded');
        const installing = session.step.kind === 'installing';
        const label = installing ? 'Wrangler installation' : `${session.provider === 'github' ? 'GitHub' : 'Cloudflare'} sign-in`;
        const limit = installing ? INSTALL_OUTPUT_CHARS_MAX : OUTPUT_CHARS_MAX;
        if (chunk.length > limit - session.outputChars) {
            this.finish(session, {
                kind: 'failed',
                message: `${label} returned too much output.`,
            });
            return;
        }
        session.outputChars += chunk.length;
        // Installation logs can contain registry credentials; count them without retaining them.
        if (installing) {
            return;
        }
        session.output += chunk;
        if (session.provider === 'cloudflare') {
            const url = /https:\/\/dash\.cloudflare\.com\/oauth2\/auth\?[^\s]+(?=\s)/.exec(session.output)?.[0];
            if (url && url.length <= 4096 && !url.includes('#')) {
                session.state = { kind: 'browser', url: (0, publishAccount_1.parseCloudflareSignInURL)(url) };
            }
            return;
        }
        const code = /one-time code: ([A-Z0-9]{4}-[A-Z0-9]{4})/.exec(session.output)?.[1];
        if (code) {
            session.state = { kind: 'waiting', code };
        }
    }
    finish(expectedSession, state) {
        const session = this.session;
        if (session === undefined || session !== expectedSession) {
            return;
        }
        if (!(0, publishAccount_1.accountSignInPending)(session.state)) {
            return;
        }
        (0, assert_1.assert)(!(0, publishAccount_1.accountSignInPending)(state), 'Sign-in finishes with a terminal state');
        (0, assert_1.assert)(this.session === session, 'Only the current sign-in session can finish');
        session.state = state;
        session.output = '';
        if (session.step.kind === 'installing') {
            if (state.kind === 'cancelled') {
                // Stopping a package manager mid-install can leave node_modules half written, so
                // a cancelled installation finishes in the background, bounded by its timeout.
                return;
            }
        }
        clearTimeout(session.timer);
        session.timer = undefined;
        if (running(session.process)) {
            stopAccountSignIn(session.process, session.provider);
        }
    }
}
exports.PublishingAccount = PublishingAccount;
function running(child) {
    return child.exitCode === null && child.signalCode === null;
}
function launchFailure(provider, step) {
    if (step.kind === 'installing') {
        const label = (0, packageManager_1.packageManagerLabel)(step.packageManager);
        return `Could not run ${label} to install Wrangler. Install ${label}, then try again.`;
    }
    return provider === 'github'
        ? 'Could not start GitHub sign-in. Install gh and try again.'
        : 'Could not start Cloudflare sign-in. Install Wrangler and try again.';
}
// Adds the latest Wrangler as a development dependency with the site's manager.
function wranglerInstallArguments(manager) {
    switch (manager) {
        case 'npm':
            return ['install', '--save-dev', 'wrangler'];
        case 'pnpm':
            return ['add', '--save-dev', packageManager_2.PNPM_TOLERATE_IGNORED_BUILDS, 'wrangler'];
        case 'yarn':
        case 'bun':
            return ['add', '--dev', 'wrangler'];
        default: {
            const exhaustive = manager;
            return exhaustive;
        }
    }
}
function launchAccountSignIn(root, provider, step) {
    if (provider === 'cloudflare') {
        return launchCloudflareSignIn(root, step);
    }
    (0, nodeTools_1.ensureToolPath)();
    const environment = { ...process.env, NO_COLOR: '1', GH_PROMPT_DISABLED: '1' };
    // An inherited automation token would prevent gh from adding a locally stored account.
    delete environment['GH_TOKEN'];
    delete environment['GITHUB_TOKEN'];
    return (0, node_child_process_1.spawn)('gh', ['auth', 'login', '--hostname', 'github.com', '--web', '--git-protocol', 'https', '--skip-ssh-key'], {
        cwd: root,
        env: environment,
        stdio: 'pipe',
        shell: false,
        windowsHide: true,
    });
}
function launchCloudflareSignIn(root, step) {
    (0, nodeTools_1.ensureToolPath)();
    const command = (0, publishExecutable_1.resolvePublishExecutable)(root, step.kind === 'installing'
        ? {
            executable: step.packageManager,
            arguments: wranglerInstallArguments(step.packageManager),
            environment: {},
        }
        : { executable: 'wrangler', arguments: ['login', '--browser=false'], environment: {} });
    return (0, node_child_process_1.spawn)(command.executable, [...command.arguments], {
        cwd: root,
        env: { ...(0, publishCommands_1.publishEnvironment)(), NO_COLOR: '1', WRANGLER_SEND_METRICS: 'false' },
        detached: process.platform !== 'win32',
        stdio: 'pipe',
        shell: false,
        windowsHide: true,
    });
}
function stopAccountSignIn(child, provider) {
    if (provider === 'cloudflare') {
        // Wrangler's executable starts a child; closing only the launcher leaves OAuth listening.
        (0, publishCommands_1.stopPublishProcess)(child.pid);
    }
    child.kill('SIGKILL');
}
