"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewWarmupIntegration = previewWarmupIntegration;
exports.previewWarmupURL = previewWarmupURL;
exports.previewWarmupFiles = previewWarmupFiles;
exports.previewWarmupAfterPage = previewWarmupAfterPage;
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const PAGE_TEMPLATES_MAX = 2;
const ROUTES_INSPECTED_MAX = 10000;
const PREVIEW_REQUEST_TIMEOUT_MS = 60_000;
function previewWarmupIntegration(project) {
    let files = [];
    let config = {};
    return {
        name: 'stacki-preview-warmup',
        hooks: {
            'astro:config:done': ({ config: done }) => {
                config = done;
            },
            'astro:routes:resolved': ({ routes }) => {
                files = previewWarmupFiles(routes).map((file) => node_path_1.default.resolve(project, file));
            },
            'astro:server:setup': ({ server, logger }) => {
                previewWarmupAfterPage(server, {
                    files: () => files,
                    previewURL: () => previewWarmupURL(server.httpServer?.address?.(), config),
                    request: previewWarmupRequest,
                }, (error) => logger.warn(String(error)));
            },
        },
    };
}
/** The component preview route on this server, honouring the project's base and slash policy. */
function previewWarmupURL(input, config) {
    const address = tcpAddress(input);
    if (address === undefined) {
        return undefined;
    }
    (0, assert_1.assert)(Number.isSafeInteger(address.port), 'A listening server has an integer port');
    const wildcard = address.address === '::' || address.address === '0.0.0.0';
    const host = wildcard ? 'localhost' : address.family === 'IPv6' ? `[${address.address}]` : address.address;
    const base = (config.base ?? '/').replace(/\/+$/, '');
    // Astro returns a 404 when an injected page violates the project's slash policy.
    const route = config.trailingSlash === 'always' ? '/__avb/preview/' : '/__avb/preview';
    const url = `http://${host}:${address.port}${base}${route}`;
    (0, assert_1.assert)(url.includes('/__avb/preview'), 'Warmup requests the preview route');
    return url;
}
function tcpAddress(input) {
    if (typeof input !== 'object' || input === null) {
        return undefined;
    }
    if (!('address' in input) || !('family' in input) || !('port' in input)) {
        return undefined;
    }
    const { address, family, port } = input;
    if (typeof address !== 'string' || typeof family !== 'string' || typeof port !== 'number') {
        return undefined;
    }
    return { address, family, port };
}
async function previewWarmupRequest(url) {
    const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(PREVIEW_REQUEST_TIMEOUT_MS) });
    // Read the body so the render completes before warmup reports success.
    await response.arrayBuffer();
    if (response.status !== 200) {
        throw new Error(`Component preview warmup returned HTTP ${response.status}`);
    }
}
function previewWarmupFiles(routes) {
    const files = new Set();
    for (const route of routes.slice(0, ROUTES_INSPECTED_MAX)) {
        const file = route.entrypoint;
        if (route.origin !== 'project' || !file || !/\.(astro|md|mdx)$/.test(file)) {
            continue;
        }
        // The homepage is already compiled by the request that starts this warmup.
        if (/(?:^|[/\\])pages[/\\](index|404|500)\.(astro|md|mdx)$/.test(file)) {
            continue;
        }
        files.add(file);
    }
    (0, assert_1.assert)(files.size <= ROUTES_INSPECTED_MAX, 'Warmup candidates must remain bounded');
    // Dynamic templates commonly share the site's largest layout. Prefer broad
    // routes before narrow ones, so one compilation benefits many destinations.
    const selected = [...files]
        .sort((left, right) => Number(right.includes('[')) - Number(left.includes('[')) || left.length - right.length || left.localeCompare(right))
        .slice(0, PAGE_TEMPLATES_MAX);
    (0, assert_1.assert)(selected.length <= PAGE_TEMPLATES_MAX, 'Warmup must not compile the entire site');
    return selected;
}
function previewWarmupAfterPage(server, plan, report) {
    let state = 'waiting';
    let timer;
    server.httpServer?.once('close', () => {
        state = 'closed';
        clearTimeout(timer);
    });
    server.middlewares.use((request, response, next) => {
        if (state === 'waiting' && request.method === 'GET') {
            response.once('finish', () => {
                const contentType = response.getHeader('content-type');
                if (state !== 'waiting' || typeof contentType !== 'string') {
                    return;
                }
                if (!contentType.startsWith('text/html') || response.statusCode !== 200) {
                    return;
                }
                state = 'scheduled';
                // Let the initial page and its browser assets go first, then use idle time.
                timer = setTimeout(() => {
                    void previewWarmupRun(server, plan, () => state === 'closed').catch(report);
                }, 500);
                timer.unref();
            });
        }
        next();
    });
}
async function previewWarmupRun(server, plan, closed) {
    await previewWarmupModules(server, plan.files(), closed);
    const url = plan.previewURL();
    if (closed() || url === undefined) {
        return;
    }
    await plan.request(url);
}
async function previewWarmupModules(server, files, closed) {
    for (const file of files.slice(0, PAGE_TEMPLATES_MAX)) {
        if (closed()) {
            return;
        }
        // Astro 6+ renders through the SSR environment; older Vite uses ssrLoadModule.
        const runner = server.environments?.['ssr']?.runner;
        if (runner) {
            await runner.import(file);
        }
        else {
            await server.ssrLoadModule(file);
        }
    }
}
