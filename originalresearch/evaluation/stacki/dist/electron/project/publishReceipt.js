"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploymentConfiguration = deploymentConfiguration;
exports.parseDeploymentReceipt = parseDeploymentReceipt;
exports.readDeploymentReceipt = readDeploymentReceipt;
exports.recordDeployment = recordDeployment;
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const boundary_1 = require("../../shared/core/boundary");
const nodeTools_1 = require("../lib/nodeTools");
function deploymentConfiguration(config) {
    // Account selection affects GitHub authentication, not the deployed website.
    const { hosting, buildScript, beforePublish, afterPublish } = config;
    return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify({ hosting, buildScript, beforePublish, afterPublish })).digest('hex');
}
function parseDeploymentReceipt(input) {
    const value = (0, boundary_1.record)(input);
    if (value['version'] !== 1) {
        throw new Error('Unsupported deployment receipt version.');
    }
    const tree = (0, boundary_1.text)(value['tree']);
    const configuration = (0, boundary_1.text)(value['configuration']);
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(tree)) {
        throw new Error('Invalid deployment tree.');
    }
    if (!/^[a-f0-9]{64}$/.test(configuration)) {
        throw new Error('Invalid deployment configuration.');
    }
    return { version: 1, tree, configuration };
}
async function readDeploymentReceipt(root) {
    const file = await deploymentReceiptPath(root);
    const stats = await (0, promises_1.stat)(file).catch((error) => {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return undefined;
        }
        throw error;
    });
    if (stats === undefined) {
        return undefined;
    }
    if (stats.size > 1024) {
        throw new Error('Deployment receipt exceeds 1 KiB.');
    }
    const source = await (0, promises_1.readFile)(file, 'utf8');
    if (source.length > 1024) {
        throw new Error('Deployment receipt exceeds 1 KiB.');
    }
    const input = JSON.parse(source);
    return parseDeploymentReceipt(input);
}
async function recordDeployment(root, receipt) {
    const validated = parseDeploymentReceipt(receipt);
    const file = await deploymentReceiptPath(root);
    const temporary = `${file}.${(0, node_crypto_1.randomUUID)()}.tmp`;
    try {
        await (0, promises_1.writeFile)(temporary, JSON.stringify(validated), { flag: 'wx', mode: 0o600 });
        await (0, promises_1.rename)(temporary, file);
    }
    finally {
        await (0, promises_1.rm)(temporary, { force: true });
    }
}
async function deploymentReceiptPath(root) {
    // Git's private directory survives app restarts without dirtying the published project.
    const directory = (await (0, nodeTools_1.git)(root, ['rev-parse', '--absolute-git-dir'])).stdout.trim();
    if (!node_path_1.default.isAbsolute(directory)) {
        throw new Error('Git directory must be absolute.');
    }
    return node_path_1.default.join(directory, 'stacki-deployment.json');
}
