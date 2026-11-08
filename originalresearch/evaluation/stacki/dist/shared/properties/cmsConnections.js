"use strict";
// CMS connections: which hosted CMS a project's content comes from, and the key
// Stacki writes drafts with. The key itself never crosses to the renderer — it
// is sent once, when a connection is saved, and from then on only the main
// process holds it (encrypted at rest). Everything else here is what the
// Settings section shows and what the sign-in steps report.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SANITY_LOGIN_TIMEOUT_MS = exports.CMS_CONNECTION_LIMITS = void 0;
exports.parseConnectionId = parseConnectionId;
exports.parseSanityProjectId = parseSanityProjectId;
exports.parseSanityDataset = parseSanityDataset;
exports.parseCmsURL = parseCmsURL;
exports.parseCmsSecret = parseCmsSecret;
exports.parseCmsConnection = parseCmsConnection;
exports.parseCmsConnectionDraft = parseCmsConnectionDraft;
exports.parseCmsConnectionList = parseCmsConnectionList;
exports.parseCmsSaveResult = parseCmsSaveResult;
exports.parseSanityLoginRequest = parseSanityLoginRequest;
exports.parseSanityLoginState = parseSanityLoginState;
exports.parseSanityLoginURL = parseSanityLoginURL;
const boundary_1 = require("../core/boundary");
const assert_1 = require("../core/assert");
exports.CMS_CONNECTION_LIMITS = {
    connectionsPerProjectMax: 16,
    datasetsPerProjectMax: 100,
    labelCharsMax: 80,
    messageCharsMax: 1000,
    projectsMax: 200,
    secretCharsMax: 4096,
    urlCharsMax: 2048,
};
exports.SANITY_LOGIN_TIMEOUT_MS = 5 * 60_000;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function parseConnectionId(input) {
    const id = (0, boundary_1.text)(input);
    if (!UUID.test(id)) {
        throw new Error('Invalid CMS connection id.');
    }
    (0, assert_1.assert)(id.length === 36, 'A connection id is a UUID');
    return id;
}
function parseSanityProjectId(input) {
    const id = (0, boundary_1.text)(input);
    if (!/^[a-z0-9]{1,64}$/.test(id)) {
        throw new Error('Invalid Sanity project id.');
    }
    return id;
}
function parseSanityDataset(input) {
    const dataset = (0, boundary_1.text)(input);
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(dataset)) {
        throw new Error('Invalid Sanity dataset name.');
    }
    return dataset;
}
/** A CMS server address: https, or http on this machine for a local server. */
function parseCmsURL(input) {
    const raw = (0, boundary_1.text)(input);
    if (raw.length === 0 || raw.length > exports.CMS_CONNECTION_LIMITS.urlCharsMax) {
        throw new Error('Enter the CMS address.');
    }
    let url;
    try {
        url = new URL(raw);
    }
    catch {
        throw new Error('The CMS address is not a URL.');
    }
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
        throw new Error('The CMS address must use https (http only for localhost).');
    }
    if (url.username || url.password || url.hash) {
        throw new Error('The CMS address cannot hold a login or a fragment.');
    }
    const parsed = url.toString().replace(/\/$/, '');
    (0, assert_1.assert)(parsed.length <= exports.CMS_CONNECTION_LIMITS.urlCharsMax + 1, 'A parsed address stays bounded');
    (0, assert_1.assert)(!parsed.endsWith('/'), 'A parsed address has no trailing slash');
    return parsed;
}
function parseLabel(input) {
    const label = (0, boundary_1.text)(input).trim();
    if (label.length === 0 || label.length > exports.CMS_CONNECTION_LIMITS.labelCharsMax) {
        throw new Error(`A connection name is 1–${exports.CMS_CONNECTION_LIMITS.labelCharsMax} characters.`);
    }
    return label;
}
function parseSlug(input, what) {
    const slug = (0, boundary_1.text)(input);
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(slug)) {
        throw new Error(`Invalid ${what}.`);
    }
    return slug;
}
/** A key: printable ASCII on one line, as every CMS issues them. */
function parseCmsSecret(input) {
    const secret = (0, boundary_1.text)(input).trim();
    if (secret.length === 0 || secret.length > exports.CMS_CONNECTION_LIMITS.secretCharsMax) {
        throw new Error('Paste the API key.');
    }
    if (!/^[\x20-\x7e]+$/.test(secret)) {
        throw new Error('An API key is printable characters on one line.');
    }
    (0, assert_1.assert)(!/[\r\n]/.test(secret), 'A key never holds a line break');
    return secret;
}
function parseCmsConnection(input) {
    const value = (0, boundary_1.record)(input);
    const id = parseConnectionId(value['id']);
    const fields = parseConnectionFields(value);
    (0, assert_1.assert)(!('secret' in fields), 'A public connection never carries its key');
    return { ...fields, id };
}
function parseCmsConnectionDraft(input) {
    const value = (0, boundary_1.record)(input);
    return { ...parseConnectionFields(value), secret: parseCmsSecret(value['secret']) };
}
function parseConnectionFields(value) {
    const label = parseLabel(value['label']);
    switch (value['kind']) {
        case 'sanity':
            return {
                kind: 'sanity',
                label,
                projectId: parseSanityProjectId(value['projectId']),
                dataset: parseSanityDataset(value['dataset']),
            };
        case 'payload':
            return {
                kind: 'payload',
                label,
                baseUrl: parseCmsURL(value['baseUrl']),
                collection: parseSlug(value['collection'], 'Payload auth collection'),
            };
        case 'custom':
            return {
                kind: 'custom',
                label,
                baseUrl: parseCmsURL(value['baseUrl']),
                header: parseSlug(value['header'], 'header name'),
            };
        default:
            throw new Error('Unknown CMS kind.');
    }
}
function parseCmsConnectionList(input) {
    const value = (0, boundary_1.record)(input);
    const encryption = value['encryption'];
    if (encryption !== 'available' && encryption !== 'unavailable') {
        throw new Error('Invalid encryption state.');
    }
    const connections = value['connections'];
    if (!Array.isArray(connections)) {
        throw new Error('Expected a list of CMS connections.');
    }
    if (connections.length > exports.CMS_CONNECTION_LIMITS.connectionsPerProjectMax) {
        throw new Error('Too many CMS connections.');
    }
    const parsed = connections.map(parseCmsConnection);
    (0, assert_1.assert)(parsed.length === connections.length, 'Every listed connection parses');
    return { encryption, connections: parsed };
}
function parseCmsSaveResult(input) {
    const value = (0, boundary_1.record)(input);
    if (value['ok'] === true) {
        return { ok: true, list: parseCmsConnectionList(value['list']) };
    }
    return { ok: false, message: parseMessage(value['message']) };
}
function parseSanityLoginRequest(input) {
    const value = (0, boundary_1.record)(input);
    const id = parseConnectionId(value['id']);
    switch (value['action']) {
        case 'start':
        case 'status':
        case 'cancel':
            return { action: value['action'], id };
        case 'choose':
            return {
                action: 'choose',
                id,
                projectId: parseSanityProjectId(value['projectId']),
                dataset: parseSanityDataset(value['dataset']),
            };
        default:
            throw new Error('Unknown Sanity sign-in action.');
    }
}
function parseSanityLoginState(input) {
    const value = (0, boundary_1.record)(input);
    switch (value['kind']) {
        case 'starting':
        case 'creating':
        case 'cancelled':
            return { kind: value['kind'] };
        case 'browser':
            return { kind: 'browser', url: parseSanityLoginURL(value['url']) };
        case 'choosing':
            return {
                kind: 'choosing',
                projects: parseProjectChoices(value['projects']),
                suggestion: parseSuggestion(value['suggestion']),
            };
        case 'complete':
            return { kind: 'complete', connection: parseCmsConnection(value['connection']) };
        case 'failed':
            return { kind: 'failed', message: parseMessage(value['message']) };
        default:
            throw new Error('Unknown Sanity sign-in state.');
    }
}
/** The page Sanity signs in on: its own login site, over https, nothing else. */
function parseSanityLoginURL(input) {
    const raw = (0, boundary_1.text)(input);
    (0, assert_1.assert)(raw.length <= exports.CMS_CONNECTION_LIMITS.urlCharsMax, 'Sanity sign-in URL is too long.');
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.hostname !== 'www.sanity.io') {
        throw new Error('Unexpected Sanity sign-in address.');
    }
    if (url.username || url.password) {
        throw new Error('Unexpected Sanity sign-in address.');
    }
    (0, assert_1.assert)(url.protocol === 'https:', 'Sanity sign-in is over https');
    return url.toString();
}
function parseProjectChoices(input) {
    if (!Array.isArray(input) || input.length > exports.CMS_CONNECTION_LIMITS.projectsMax) {
        throw new Error('Invalid Sanity project list.');
    }
    return input.map((entry) => {
        const value = (0, boundary_1.record)(entry);
        const datasets = value['datasets'];
        if (!Array.isArray(datasets) || datasets.length > exports.CMS_CONNECTION_LIMITS.datasetsPerProjectMax) {
            throw new Error('Invalid Sanity dataset list.');
        }
        return {
            id: parseSanityProjectId(value['id']),
            name: parseLabelText(value['name']),
            datasets: datasets.map(parseSanityDataset),
        };
    });
}
function parseLabelText(input) {
    const name = (0, boundary_1.text)(input);
    return name.length > exports.CMS_CONNECTION_LIMITS.labelCharsMax ? name.slice(0, exports.CMS_CONNECTION_LIMITS.labelCharsMax) : name;
}
function parseSuggestion(input) {
    if (input === undefined) {
        return undefined;
    }
    const value = (0, boundary_1.record)(input);
    return {
        projectId: parseSanityProjectId(value['projectId']),
        dataset: parseSanityDataset(value['dataset']),
    };
}
function parseMessage(input) {
    const message = (0, boundary_1.text)(input);
    if (message.length === 0 || message.length > exports.CMS_CONNECTION_LIMITS.messageCharsMax) {
        throw new Error('Invalid CMS message.');
    }
    return message;
}
