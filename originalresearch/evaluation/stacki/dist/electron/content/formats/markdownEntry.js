"use strict";
// Markdown, MDX and Markdoc entries: YAML frontmatter over a body.
//
// The body is never touched. MDX bodies hold imports, JSX and the odd
// `export const`; Markdoc bodies hold {% tags %}; markdown bodies hold whatever
// the author typed. None of it survives a reformat, none of it is the editor's
// business, and all of it is preserved by only ever replacing the frontmatter
// span — or, when the body itself is edited, only the body span.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = exports.parseData = void 0;
exports.parse = parse;
exports.applyEdits = applyEdits;
const yaml = __importStar(require("./yaml"));
const FRONTMATTER = /^(---)([ \t]*\r?\n)([\s\S]*?)(\r?\n)(---)([ \t]*)(\r?\n?)/;
// An empty block, `---` straight over `---`: what a new entry starts as. The
// pattern above wants a line break before its closing fence, and the only one
// here belongs to the opening line, so it did not match: the empty block read
// as body, and the first field written grew a second frontmatter above it,
// leaving `---\n---` in the entry's body for good.
const EMPTY_FRONTMATTER = /^(---)([ \t]*\r?\n)(---)([ \t]*)(\r?\n?)/;
function frontmatterSpan(text) {
    const full = text.match(FRONTMATTER);
    if (full !== null) {
        const [whole, open = '', openBreak = '', block = '', separator = '', close = '', closeSpace = '', closeBreak = ''] = full;
        return { opening: open + openBreak, block, separator, closing: close + closeSpace + closeBreak, length: whole.length };
    }
    const empty = text.match(EMPTY_FRONTMATTER);
    if (empty !== null) {
        const [whole, open = '', openBreak = '', close = '', closeSpace = '', closeBreak = ''] = empty;
        return { opening: open + openBreak, block: '', separator: '', closing: close + closeSpace + closeBreak, length: whole.length };
    }
    return undefined;
}
/** { data, body, frontmatter } — data is undefined when the file has no frontmatter. */
function parse(text) {
    const span = frontmatterSpan(text);
    if (span === undefined) {
        return { data: undefined, frontmatter: undefined, body: text, offset: 0 };
    }
    return {
        data: span.block === '' ? {} : (yaml.parseData(span.block + '\n') ?? {}),
        frontmatter: span.block,
        body: text.slice(span.length),
        offset: span.length,
    };
}
const parseData = (text) => parse(text).data;
exports.parseData = parseData;
/**
 * Applies edits to the frontmatter, and replaces the body when `body` is given.
 * A file with no frontmatter grows one; a file whose body is not passed keeps
 * the bytes it had.
 */
function applyEdits(text, edits, { body } = {}) {
    const span = frontmatterSpan(text);
    if (span === undefined) {
        if (!edits.length) {
            return body === undefined ? text : body;
        }
        const written = yaml.applyEdits('', edits).replace(/\n?$/, '\n');
        return `---\n${written}---\n${body === undefined ? text : body}`;
    }
    // An empty block is written from empty YAML, as a file with none is: a lone
    // line break to start from would come back as a blank line in the block.
    const source = span.block === '' ? '' : span.block + '\n';
    const written = edits.length ? yaml.applyEdits(source, edits).replace(/\n$/, '') : span.block;
    // A block that was empty gets the line break its fences lacked, in the
    // file's own style (the opening line's).
    const lineBreak = span.opening.endsWith('\r\n') ? '\r\n' : '\n';
    const separator = written === '' ? '' : span.separator === '' ? lineBreak : span.separator;
    const head = `${span.opening}${written}${separator}${span.closing}`;
    return head + (body === undefined ? text.slice(span.length) : body);
}
exports.DELETE = yaml.DELETE;
