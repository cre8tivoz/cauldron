"use strict";
// The Sanity HTTP calls the sign-in makes, each with a deadline and each reply
// parsed before use. The login token these take is the person's own and never
// leaves the main process; it is used to create a project key and then logged
// out (sanityLogin.ts).
//
// Sources: Sanity's CLI login (sanity-io/cli, actions/auth), the Projects and
// Access HTTP references, and POST /auth/logout. The sign-in endpoints are the
// ones the CLI uses; they are not a documented public API (docs/contracts.md).
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanityRequestError = void 0;
exports.sanityLoginURL = sanityLoginURL;
exports.sanityTokenForSession = sanityTokenForSession;
exports.sanityProjects = sanityProjects;
exports.createSanityEditorKey = createSanityEditorKey;
exports.sanityLogout = sanityLogout;
const cmsConnections_1 = require("../../shared/properties/cmsConnections");
const assert_1 = require("../../shared/core/assert");
const API = 'https://api.sanity.io';
const AUTH_VERSION = 'v2025-09-23';
const MANAGE_VERSION = 'v2021-06-07';
const REQUEST_TIMEOUT_MS = 15_000;
// Dataset lists fetched at once while building the project list.
const DATASET_REQUESTS_PARALLEL = 5;
class SanityRequestError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
exports.SanityRequestError = SanityRequestError;
/**
 * Sanity's own login page, where the person picks Google, GitHub or email. It
 * returns to `origin` (a localhost address, which Sanity allows) with a one-time
 * session id, as Sanity's SDK does (sanity-io/sdk, AuthenticationGuide.md).
 */
function sanityLoginURL(origin) {
    (0, assert_1.assert)(/^http:\/\/localhost:\d+\//.test(origin), 'Sanity returns to a localhost address');
    const url = new URL('https://www.sanity.io/login');
    url.searchParams.set('origin', origin);
    url.searchParams.set('type', 'stampedToken');
    url.searchParams.set('withSid', 'true');
    return url.toString();
}
/** Exchanges the one-time session id for the person's login token. */
async function sanityTokenForSession(sid) {
    (0, assert_1.assert)(/^[\w-]{1,512}$/.test(sid), 'A Sanity session id is a short token');
    const body = await sanityJSON(`${API}/${AUTH_VERSION}/auth/fetch?sid=${sid}`, undefined);
    const token = typeof body === 'object' && body !== null ? Reflect.get(body, 'token') : undefined;
    if (typeof token !== 'string' || !/^[\w.-]{8,4096}$/.test(token)) {
        throw new Error('Sanity did not return a login token.');
    }
    return token;
}
/** The person's projects, each with its datasets, at most the list's limit. */
async function sanityProjects(token) {
    const body = await sanityJSON(`${API}/${MANAGE_VERSION}/projects`, token);
    if (!Array.isArray(body)) {
        throw new Error('Sanity returned an unexpected project list.');
    }
    const projects = body.slice(0, cmsConnections_1.CMS_CONNECTION_LIMITS.projectsMax).flatMap(projectSummary);
    const out = [];
    for (let at = 0; at < projects.length; at += DATASET_REQUESTS_PARALLEL) {
        const batch = projects.slice(at, at + DATASET_REQUESTS_PARALLEL);
        const datasets = await Promise.all(batch.map((project) => sanityDatasets(token, project.id)));
        batch.forEach((project, index) => out.push({ ...project, datasets: datasets[index] ?? [] }));
    }
    return out;
}
async function sanityDatasets(token, projectId) {
    const body = await sanityJSON(`${API}/${MANAGE_VERSION}/projects/${projectId}/datasets`, token);
    if (!Array.isArray(body)) {
        return [];
    }
    return body
        .slice(0, cmsConnections_1.CMS_CONNECTION_LIMITS.datasetsPerProjectMax)
        .map((entry) => (typeof entry === 'object' && entry !== null ? Reflect.get(entry, 'name') : undefined))
        .filter((name) => typeof name === 'string' && /^[a-z0-9][\w-]{0,63}$/.test(name));
}
function projectSummary(entry) {
    if (typeof entry !== 'object' || entry === null) {
        return [];
    }
    const id = Reflect.get(entry, 'id');
    const name = Reflect.get(entry, 'displayName');
    if (typeof id !== 'string' || !/^[a-z0-9]{1,64}$/.test(id)) {
        return [];
    }
    const label = typeof name === 'string' && name.trim() ? name.trim() : id;
    return [{ id, name: label.slice(0, cmsConnections_1.CMS_CONNECTION_LIMITS.labelCharsMax) }];
}
/**
 * A project key with the Editor role: what Stacki keeps instead of the login.
 * Editor reads drafts and writes them, and nothing about members or billing.
 */
async function createSanityEditorKey(token, projectId, label) {
    (0, assert_1.assert)(/^[a-z0-9]{1,64}$/.test(projectId), 'A Sanity project id is lower-case letters');
    const body = await sanityJSON(`${API}/${MANAGE_VERSION}/projects/${projectId}/tokens`, token, {
        label,
        roleName: 'editor',
    });
    const key = typeof body === 'object' && body !== null ? Reflect.get(body, 'key') : undefined;
    if (typeof key !== 'string' || !/^[\w.-]{8,4096}$/.test(key)) {
        throw new Error('Sanity did not return the new API key.');
    }
    return key;
}
/** Ends the login session; the token stops working everywhere. */
async function sanityLogout(token) {
    await sanityJSON(`${API}/${MANAGE_VERSION}/auth/logout`, token, {});
}
async function sanityJSON(url, token, body) {
    const response = await fetch(url, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        redirect: 'error',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await response.text();
    if (!response.ok) {
        throw new SanityRequestError(sanityErrorMessage(text, response.status), response.status);
    }
    if (!text) {
        return undefined;
    }
    const parsed = JSON.parse(text);
    return parsed;
}
function sanityErrorMessage(text, status) {
    try {
        const parsed = JSON.parse(text);
        const message = typeof parsed === 'object' && parsed !== null ? Reflect.get(parsed, 'message') : undefined;
        if (typeof message === 'string' && message.length > 0) {
            return message.slice(0, 300);
        }
    }
    catch {
        // Not JSON: the status says enough.
    }
    return `Sanity answered ${status}.`;
}
