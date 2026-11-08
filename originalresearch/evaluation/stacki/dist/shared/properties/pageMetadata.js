"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePageType = parsePageType;
exports.parsePageImage = parsePageImage;
// Rendered social metadata is the source of truth when layouts delegate their
// defaults to another component or to a CMS. Never evaluate project code here.
const boundary_1 = require("../core/boundary");
function parsePageType(input) {
    const value = (0, boundary_1.pathText)(input);
    if (!/^[a-z][a-z0-9._:-]{0,127}$/i.test(value)) {
        throw new Error('Invalid Open Graph type');
    }
    return value;
}
function parsePageImage(input) {
    const value = (0, boundary_1.pathText)(input);
    if (/^\/(?!\/)/.test(value)) {
        if (!value.includes('\\')) {
            return value;
        }
    }
    const url = new URL(value);
    if (url.protocol !== 'http:') {
        if (url.protocol !== 'https:') {
            throw new Error('Page image must use HTTP or HTTPS');
        }
    }
    if (url.username || url.password) {
        throw new Error('Page image must not contain credentials');
    }
    return url.href;
}
