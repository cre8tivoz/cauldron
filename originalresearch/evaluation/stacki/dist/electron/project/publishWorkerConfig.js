"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withWorkerAccount = withWorkerAccount;
exports.workerConfigParse = workerConfigParse;
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const smol_toml_1 = require("smol-toml");
const typescript_1 = require("typescript");
const boundary_1 = require("../../shared/core/boundary");
const assert_1 = require("../../shared/core/assert");
const CONFIG_BYTES_MAX = 65_536;
/** A sibling config preserves asset paths while overriding Wrangler's account precedence. */
async function withWorkerAccount(root, accountId, deploy) {
    (0, assert_1.assert)(accountId.length > 0, 'Worker deployment has a selected account');
    (0, assert_1.assert)(accountId.length <= 100, 'Worker account identifier stays bounded');
    const filename = await workerConfigPath(root);
    const source = await workerConfigSource(root, filename);
    if (source === undefined) {
        throw new Error('Configure this project for Cloudflare Workers before publishing.');
    }
    const value = workerConfigParse(filename, source);
    const temporary = node_path_1.default.join(node_path_1.default.dirname(filename), `.stacki-worker-${(0, node_crypto_1.randomUUID)()}.json`);
    // Never rewrite the authored or generated config; deploy's temporary sibling is always removed.
    await (0, promises_1.writeFile)(temporary, JSON.stringify({ ...value, account_id: accountId }), {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
    });
    try {
        await deploy(temporary);
    }
    finally {
        await (0, promises_1.rm)(temporary, { force: true });
    }
}
async function workerConfigPath(root) {
    const redirect = node_path_1.default.join(root, '.wrangler/deploy/config.json');
    const source = await workerConfigSource(root, redirect);
    if (source !== undefined) {
        const value = workerConfigParse(redirect, source);
        const relative = (0, boundary_1.text)(value['configPath']);
        if (relative.length === 0 || relative.length > 4096) {
            throw new Error('Invalid generated Wrangler configuration path.');
        }
        return node_path_1.default.resolve(node_path_1.default.dirname(redirect), relative);
    }
    for (const name of ['wrangler.json', 'wrangler.jsonc', 'wrangler.toml']) {
        const filename = node_path_1.default.join(root, name);
        if ((await workerConfigSource(root, filename)) !== undefined) {
            return filename;
        }
    }
    throw new Error('Configure this project for Cloudflare Workers before publishing.');
}
async function workerConfigSource(root, filename) {
    let canonical;
    try {
        canonical = await (0, promises_1.realpath)(filename);
    }
    catch (failure) {
        if (failure instanceof Error && 'code' in failure && failure.code === 'ENOENT') {
            return undefined;
        }
        throw failure;
    }
    const relative = node_path_1.default.relative(await (0, promises_1.realpath)(root), canonical);
    if (node_path_1.default.isAbsolute(relative) || relative.split(node_path_1.default.sep).includes('..')) {
        throw new Error('Wrangler configuration must stay inside the publish snapshot.');
    }
    const metadata = await (0, promises_1.stat)(canonical);
    if (metadata.size > CONFIG_BYTES_MAX) {
        throw new Error('Wrangler configuration exceeds 64 KiB.');
    }
    const source = await (0, promises_1.readFile)(canonical, 'utf8');
    if (Buffer.byteLength(source, 'utf8') > CONFIG_BYTES_MAX) {
        throw new Error('Wrangler configuration exceeds 64 KiB.');
    }
    return source;
}
function workerConfigParse(filename, source) {
    if (filename.endsWith('.toml')) {
        return (0, boundary_1.record)((0, smol_toml_1.parse)(source));
    }
    // TypeScript diagnostics require slash-normalized paths, including on Windows.
    const parsed = (0, typescript_1.parseConfigFileTextToJson)(filename.replaceAll('\\', '/'), source);
    if (parsed.error) {
        throw new Error('Cannot read Wrangler configuration.');
    }
    return (0, boundary_1.record)(parsed.config);
}
