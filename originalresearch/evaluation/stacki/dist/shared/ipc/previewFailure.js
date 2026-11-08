"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePreviewFailure = parsePreviewFailure;
// Failed frame navigations must identify a bounded local preview URL before
// crossing into the renderer. Hashes only select editor mode, not a different page.
const boundary_1 = require("../core/boundary");
function parsePreviewFailure(input) {
    const address = new URL((0, boundary_1.pathText)(input));
    if (address.protocol !== 'http:') {
        throw new Error('Preview failure must use local HTTP');
    }
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(address.hostname)) {
        throw new Error('Preview failure must identify a loopback host');
    }
    if (address.username || address.password) {
        throw new Error('Preview failure must not contain credentials');
    }
    address.hash = '';
    return address.href;
}
