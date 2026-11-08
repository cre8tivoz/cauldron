"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STUDIO_LAUNCH_COMMAND = void 0;
exports.parseStudioSource = parseStudioSource;
exports.parseStudioStatus = parseStudioStatus;
exports.parseStudioInstallResult = parseStudioInstallResult;
// Desktop setup reports disk state separately from deployment, which requires
// account authorization outside the local installer.
const boundary_1 = require("../core/boundary");
// Run from the website root so copied commands and automatic startup agree.
exports.STUDIO_LAUNCH_COMMAND = 'npm run dev -- --config node_modules/.avb/astro.config.mjs';
function parseStudioSource(input) {
    if (input === 'published' || input === 'file') {
        return input;
    }
    throw new Error('Expected a published or local Studio release');
}
function parseStudioStatus(input) {
    const value = (0, boundary_1.record)(input);
    const desktopVersion = (0, boundary_1.text)(value['desktopVersion']);
    switch (value['kind']) {
        case 'missing':
            return { kind: 'missing', desktopVersion };
        case 'installed':
            return { kind: 'installed', desktopVersion, version: (0, boundary_1.text)(value['version']) };
        case 'blocked':
            return { kind: 'blocked', desktopVersion, message: (0, boundary_1.text)(value['message']) };
        default:
            throw new Error('Invalid Studio setup status');
    }
}
function parseStudioInstallResult(input) {
    const value = (0, boundary_1.record)(input);
    switch (value['kind']) {
        case 'installed':
            return { kind: 'installed', version: (0, boundary_1.text)(value['version']) };
        case 'canceled':
            return { kind: 'canceled' };
        case 'error':
            return { kind: 'error', message: (0, boundary_1.text)(value['message']) };
        default:
            throw new Error('Invalid Studio installation result');
    }
}
