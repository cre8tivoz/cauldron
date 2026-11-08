"use strict";
// What the app's windows may open, load and be granted. Kept apart from
// main.ts, which wires these rules to electron, so each one is tested alone.
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBrowserLink = isBrowserLink;
exports.isAppPage = isAppPage;
exports.isPrivatePermission = isPrivatePermission;
const BROWSER_PROTOCOLS = new Set(['http:', 'https:']);
// A link the user's browser may open. Any other scheme (file:, javascript:, an
// app's own link) would let a page choose what the operating system launches.
function isBrowserLink(url) {
    if (!URL.canParse(url)) {
        return false;
    }
    return BROWSER_PROTOCOLS.has(new URL(url).protocol);
}
// Whether a navigation of the app's window stays on Stacki's own page: the same
// file in a packaged build, the same origin as the dev server in development.
function isAppPage(url, appUrl) {
    if (!URL.canParse(url) || !URL.canParse(appUrl)) {
        return false;
    }
    const target = new URL(url);
    const app = new URL(appUrl);
    if (app.protocol === 'file:') {
        return target.protocol === 'file:' && target.pathname === app.pathname;
    }
    return target.origin === app.origin;
}
// Permissions that reveal the user or reach their devices. Electron grants every
// request by default, and a previewed site may run scripts the user never read;
// Stacki itself uses none of these, so they are refused for every page.
const PRIVATE_PERMISSIONS = new Set([
    'clipboard-read',
    'deprecated-sync-clipboard-read',
    'display-capture',
    'geolocation',
    'geolocation-approximate',
    'hid',
    'idle-detection',
    'media',
    'serial',
    'usb',
]);
function isPrivatePermission(permission) {
    return PRIVATE_PERMISSIONS.has(permission);
}
