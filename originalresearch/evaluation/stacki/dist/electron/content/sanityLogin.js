"use strict";
// "Log in with Sanity": the browser sign-in Sanity's own CLI uses, ending in a
// project key rather than a login.
//
//   1. A one-shot server listens on localhost; the browser opens Sanity's
//      sign-in page with that server as the place to come back to.
//   2. Sanity redirects back with a one-time session id, exchanged for the
//      person's login token.
//   3. Their projects and datasets are listed; the one the site's own .env
//      names is suggested.
//   4. On their choice, a project key with the Editor role is created and kept
//      (encrypted, cmsConnectionStore.ts), and the login token is logged out.
//
// The login token can do anything the person can, across every project they
// belong to; the key can read and write documents in one project. Only the key
// is kept. The renderer polls this like the GitHub sign-in (publishAccount.ts):
// one session at a time, each request answered with the current state.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanityLogin = void 0;
const node_http_1 = __importDefault(require("node:http"));
const node_os_1 = __importDefault(require("node:os"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const cmsConnections_1 = require("../../shared/properties/cmsConnections");
const sanityApi_1 = require("./sanityApi");
const SUCCESS_PAGE = 'https://www.sanity.io/login/success';
// The .env lines read for a suggestion, and the longest file read for them.
const ENV_FILES = ['.env', '.env.local', '.env.development'];
const ENV_BYTES_MAX = 64 * 1024;
// One sign-in: its state, and what it holds while it runs. Ending it releases
// all of it and logs the login out — the key, when there is one, is what stays.
class Session {
    id;
    projectRoot;
    state = { kind: 'starting' };
    projects = [];
    server;
    token;
    timer;
    constructor(id, projectRoot) {
        this.id = id;
        this.projectRoot = projectRoot;
    }
    listen(server, onTimeout) {
        (0, assert_1.assert)(this.server === undefined, 'A sign-in listens once');
        this.server = server;
        this.timer = setTimeout(onTimeout, cmsConnections_1.SANITY_LOGIN_TIMEOUT_MS);
        this.timer.unref();
    }
    stopListening() {
        this.server?.close();
        this.server = undefined;
    }
    signedIn(token, projects) {
        this.token = token;
        this.projects = projects;
    }
    loginToken() {
        return this.token;
    }
    end(state) {
        (0, assert_1.assert)(state.kind !== 'browser', 'A sign-in ends in a final state');
        clearTimeout(this.timer);
        this.stopListening();
        const token = this.token;
        this.token = undefined;
        if (token) {
            void (0, sanityApi_1.sanityLogout)(token).catch(() => undefined);
        }
        this.state = state;
    }
}
class SanityLogin {
    store;
    session;
    constructor(store) {
        this.store = store;
    }
    request(projectRoot, request) {
        const current = this.session;
        if (request.action === 'start') {
            current?.end({ kind: 'cancelled' });
            return this.start(projectRoot, request.id);
        }
        if (!current || current.id !== request.id) {
            return { kind: 'failed', message: 'This Sanity sign-in is no longer running.' };
        }
        switch (request.action) {
            case 'status':
                return current.state;
            case 'cancel':
                current.end({ kind: 'cancelled' });
                return current.state;
            case 'choose':
                return this.choose(current, request.projectId, request.dataset);
            default: {
                const exhaustive = request;
                return exhaustive;
            }
        }
    }
    start(projectRoot, id) {
        const session = new Session(id, projectRoot);
        this.session = session;
        const server = node_http_1.default.createServer((request, response) => this.callback(session, request, response));
        session.listen(server, () => session.end({ kind: 'failed', message: 'Sanity sign-in timed out.' }));
        server.on('error', (error) => this.fail(session, error));
        // Bound to localhost, not 127.0.0.1: Sanity accepts any http://localhost:<port> origin.
        server.listen(0, 'localhost', () => {
            const address = server.address();
            if (typeof address !== 'object' || address === null) {
                this.fail(session, new Error('Could not start the sign-in listener.'));
                return;
            }
            const origin = `http://localhost:${address.port}/callback`;
            this.set(session, { kind: 'browser', url: (0, sanityApi_1.sanityLoginURL)(origin) });
        });
        return session.state;
    }
    // The browser's way back. Sanity may put the session id in the query, in a
    // `url` parameter (its CLI's form), or in the fragment — which a browser
    // never sends — so a request without one gets a page that reads the fragment
    // and comes back once with it in the query.
    callback(session, request, response) {
        const back = callbackOf(request.url);
        if (request.method !== 'GET' || back.kind === 'other') {
            response.writeHead(404).end();
            return;
        }
        if (back.kind === 'without-sid') {
            response
                .writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
                'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'",
            })
                .end(FRAGMENT_PAGE);
            return;
        }
        response.writeHead(303, { Location: SUCCESS_PAGE }).end();
        session.stopListening();
        if (session.state.kind !== 'browser') {
            return;
        }
        this.set(session, { kind: 'starting' });
        void this.signedIn(session, back.sid).catch((error) => this.fail(session, error));
    }
    async signedIn(session, sid) {
        const token = await (0, sanityApi_1.sanityTokenForSession)(sid);
        const projects = await (0, sanityApi_1.sanityProjects)(token);
        session.signedIn(token, projects);
        if (projects.length === 0) {
            throw new Error('This Sanity account is not a member of any project.');
        }
        this.set(session, {
            kind: 'choosing',
            projects,
            suggestion: siteSuggestion(session.projectRoot, projects),
        });
    }
    choose(session, projectId, dataset) {
        const project = session.projects.find((entry) => entry.id === projectId);
        const token = session.loginToken();
        if (session.state.kind !== 'choosing' || !project || !token) {
            return session.state;
        }
        if (!project.datasets.includes(dataset)) {
            return session.state;
        }
        this.set(session, { kind: 'creating' });
        // Sanity refuses two keys with one label, and a key outlives a sign-in that
        // was abandoned after creating it; the time keeps every label new.
        const created = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const label = `Stacki (${node_os_1.default.hostname().slice(0, 40)}) ${created} UTC`;
        void (0, sanityApi_1.createSanityEditorKey)(token, projectId, label)
            .then((key) => {
            const connection = this.store.save(session.projectRoot, {
                kind: 'sanity',
                label: `${project.name} · ${dataset}`,
                projectId,
                dataset,
                secret: key,
            });
            session.end({ kind: 'complete', connection });
        })
            .catch((error) => this.fail(session, error));
        return session.state;
    }
    fail(session, error) {
        session.end({ kind: 'failed', message: failureMessage(error) });
    }
    // Only the running sign-in moves on; a replaced one keeps its last state.
    set(session, state) {
        const current = this.session;
        if (current === session) {
            current.state = state;
        }
    }
}
exports.SanityLogin = SanityLogin;
// Reads `#sid=` (or `_context`'s sid) and returns once with it in the query; a
// page with no session id says so rather than looping.
const FRAGMENT_PAGE = `<!doctype html><meta charset="utf-8"><title>Stacki</title>
<p id="m">Finishing Sanity sign-in…</p>
<script>
const h = new URLSearchParams(location.hash.slice(1));
let sid = h.get('sid');
try { sid = sid || JSON.parse(new URLSearchParams(location.search).get('_context') || '{}').sid; }
catch (e) {}
if (sid && /^[\\w-]{1,512}$/.test(sid)) location.replace('/callback?sid=' + sid);
else document.getElementById('m').textContent =
  'Sanity did not return a sign-in. Close this tab and try again in Stacki.';
</script>`;
function callbackOf(requestURL) {
    if (!requestURL || requestURL.length > 8192) {
        return { kind: 'other' };
    }
    const own = new URL(requestURL, 'http://localhost');
    if (own.pathname !== '/callback') {
        return { kind: 'other' };
    }
    const sid = own.searchParams.get('sid') ?? sidOfURL(own.searchParams.get('url') ?? undefined);
    if (sid && /^[\w-]{1,512}$/.test(sid)) {
        return { kind: 'sid', sid };
    }
    return { kind: 'without-sid' };
}
function sidOfURL(back) {
    if (back === undefined) {
        return undefined;
    }
    try {
        return new URL(back).searchParams.get('sid') ?? undefined;
    }
    catch {
        return undefined;
    }
}
function failureMessage(error) {
    if (error instanceof sanityApi_1.SanityRequestError && (error.status === 401 || error.status === 403)) {
        return ('Your role in this Sanity project cannot create API keys (Administrator or ' +
            'Developer can). Ask an admin for one, then choose “Paste a Sanity key” ' +
            'from the arrow beside “Log in with Sanity”.');
    }
    const message = error instanceof Error ? error.message : String(error);
    return (message || 'Sanity sign-in failed.').slice(0, 900);
}
// The project and dataset the site itself reads, from its .env files, when one
// of the person's projects has them.
function siteSuggestion(projectRoot, projects) {
    const values = new Map();
    for (const name of ENV_FILES) {
        for (const [key, value] of envEntries(node_path_1.default.join(projectRoot, name))) {
            values.set(key, value);
        }
    }
    const pick = (suffix) => [...values].find(([key]) => /^(PUBLIC_|SANITY_STUDIO_|NEXT_PUBLIC_)?SANITY_/.test(key) && key.endsWith(suffix))?.[1];
    const projectId = pick('PROJECT_ID');
    const dataset = pick('DATASET') ?? 'production';
    const project = projects.find((entry) => entry.id === projectId);
    return project && project.datasets.includes(dataset) ? { projectId: project.id, dataset } : undefined;
}
function envEntries(file) {
    let text;
    try {
        if (node_fs_1.default.statSync(file).size > ENV_BYTES_MAX) {
            return [];
        }
        text = node_fs_1.default.readFileSync(file, 'utf8');
    }
    catch {
        return [];
    }
    const out = [];
    for (const line of text.split(/\r?\n/).slice(0, 2000)) {
        const match = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*["']?([^"'#\s]*)["']?/.exec(line);
        if (match?.[1] && match[2]) {
            out.push([match[1], match[2]]);
        }
    }
    return out;
}
