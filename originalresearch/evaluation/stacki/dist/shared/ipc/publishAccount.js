"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GITHUB_DEVICE_URL = exports.ACCOUNT_INSTALL_TIMEOUT_MS = exports.ACCOUNT_SIGN_IN_TIMEOUT_MS = void 0;
exports.parseAccountRequest = parseAccountRequest;
exports.parseAccountState = parseAccountState;
exports.accountSignInPending = accountSignInPending;
exports.parseCloudflareSignInURL = parseCloudflareSignInURL;
const boundary_1 = require("../core/boundary");
const assert_1 = require("../core/assert");
exports.ACCOUNT_SIGN_IN_TIMEOUT_MS = 5 * 60_000;
exports.ACCOUNT_INSTALL_TIMEOUT_MS = 10 * 60_000;
exports.GITHUB_DEVICE_URL = 'https://github.com/login/device';
function parseAccountRequest(input) {
    const value = (0, boundary_1.record)(input);
    const provider = value['provider'];
    if (provider !== undefined && provider !== 'github' && provider !== 'cloudflare') {
        throw new Error('Unknown sign-in provider.');
    }
    const action = value['action'];
    if (action !== 'start' && action !== 'status' && action !== 'cancel') {
        throw new Error('Unknown GitHub sign-in action.');
    }
    const id = (0, boundary_1.text)(value['id']);
    (0, assert_1.assert)(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id), 'Invalid GitHub sign-in session.');
    return { action, id, ...(provider === undefined ? {} : { provider }) };
}
function parseAccountState(input) {
    const value = (0, boundary_1.record)(input);
    switch (value['kind']) {
        case 'installing':
        case 'starting':
        case 'complete':
        case 'cancelled':
            return { kind: value['kind'] };
        case 'waiting': {
            const code = (0, boundary_1.text)(value['code']);
            (0, assert_1.assert)(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code), 'Invalid GitHub sign-in code.');
            return { kind: 'waiting', code };
        }
        case 'browser':
            return { kind: 'browser', url: parseCloudflareSignInURL(value['url']) };
        case 'failed': {
            const message = (0, boundary_1.text)(value['message']);
            if (message.length === 0 || message.length > 1000) {
                throw new Error('Invalid GitHub sign-in message.');
            }
            return { kind: 'failed', message };
        }
        default:
            throw new Error('Invalid GitHub sign-in state.');
    }
}
// Whether a sign-in process is still running: the renderer keeps polling it, and the
// service refuses a second sign-in until it ends. Adding a state must decide this here.
function accountSignInPending(state) {
    switch (state.kind) {
        case 'installing':
        case 'starting':
        case 'waiting':
        case 'browser':
            return true;
        case 'complete':
        case 'cancelled':
        case 'failed':
            return false;
        default: {
            const exhaustive = state;
            return exhaustive;
        }
    }
}
function parseCloudflareSignInURL(input) {
    const value = (0, boundary_1.text)(input);
    (0, assert_1.assert)(value.length <= 4096, 'Cloudflare sign-in URL stays bounded');
    const url = new URL(value);
    (0, assert_1.assert)(url.origin === 'https://dash.cloudflare.com', 'Cloudflare sign-in uses its dashboard');
    (0, assert_1.assert)(url.pathname === '/oauth2/auth', 'Cloudflare sign-in uses the OAuth authorization page');
    (0, assert_1.assert)(url.username === '', 'Cloudflare sign-in URL has no username');
    (0, assert_1.assert)(url.password === '', 'Cloudflare sign-in URL has no password');
    (0, assert_1.assert)(url.hash === '', 'Cloudflare sign-in URL has no fragment');
    return value;
}
