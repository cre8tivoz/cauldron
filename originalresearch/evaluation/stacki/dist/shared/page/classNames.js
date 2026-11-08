"use strict";
// The class names a source file uses, for the class field's suggestions: the
// classes written in markup, the ones code adds or looks for, and the ones a
// stylesheet styles. A class only applied by markup or a script (a state like
// `is-open`, a hook a script queries) is still a class the project uses, and
// was missing from the list while only styled classes were.
//
// Reading is by pattern, not by parsing: a file that does not parse still
// names its classes, and a suggestion that is not quite right costs nothing.
// Every name is checked to be a class name, and the work is bounded by the
// text's length and a cap on names.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLASS_NAMES_PER_SOURCE_MAX = exports.CLASS_SOURCE_CHARS_MAX = void 0;
exports.classSourceKind = classSourceKind;
exports.classNamesIn = classNamesIn;
const assert_1 = require("../core/assert");
/** A file's text past this many characters is not read for suggestions. */
exports.CLASS_SOURCE_CHARS_MAX = 2_000_000;
/** One file names at most this many classes for suggestions. */
exports.CLASS_NAMES_PER_SOURCE_MAX = 10_000;
const CLASS_NAME = /^-?[A-Za-z_][\w-]*$/;
/** The kind of a file by its extension, or undefined for one that holds no classes. */
function classSourceKind(file) {
    (0, assert_1.assert)(file.length > 0, 'A class source is a named file');
    if (/\.(css|scss|sass|less)$/i.test(file)) {
        return 'stylesheet';
    }
    if (/\.(astro|html|vue|svelte|mdx|jsx|tsx)$/i.test(file)) {
        return 'markup';
    }
    return /\.(js|mjs|cjs|ts|mts|cts)$/i.test(file) ? 'script' : undefined;
}
/** Every class name `text` uses, once each, in the order first seen. */
function classNamesIn(text, kind) {
    const source = text.length > exports.CLASS_SOURCE_CHARS_MAX ? text.slice(0, exports.CLASS_SOURCE_CHARS_MAX) : text;
    const out = new Set();
    const add = (name) => {
        if (out.size < exports.CLASS_NAMES_PER_SOURCE_MAX && CLASS_NAME.test(name)) {
            out.add(name);
        }
    };
    if (kind === 'stylesheet') {
        selectorClasses(source, add);
    }
    else {
        markupClasses(source, add);
        scriptClasses(source, add);
        // A <style> block, and a selector string inside a script (`.faq_item`).
        for (const match of source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
            selectorClasses(match[1] ?? '', add);
        }
    }
    (0, assert_1.assert)(out.size <= exports.CLASS_NAMES_PER_SOURCE_MAX, 'A file names a bounded number of classes');
    return [...out];
}
// `.name` where a selector can start one: after a combinator, a comma, a
// brace, a paren (`:is(.a)`), another simple selector (`summary.faq_summary`),
// or a line start. Comments, strings and `url(…)` go first: `image.png` and
// `1.5rem` hold dots that are not classes.
function selectorClasses(text, add) {
    const css = text
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/url\([^)]*\)/gi, ' ')
        .replace(/(["'])(?:(?!\1)[^\\]|\\.)*\1/g, ' ');
    // Every removal is replaced by one space: the text never grows.
    (0, assert_1.assert)(css.length <= text.length, 'Stripped CSS is no longer than its text');
    for (const match of css.matchAll(/(?:^|[\s,{>~+()\]*:a-zA-Z0-9_-])\.(-?[A-Za-z_][\w-]*)/gm)) {
        add(match[1] ?? '');
    }
}
// `class="a b"`, `className='a'`, and the strings inside an expression a
// class attribute holds: `class={`a ${b}`}`, `class={open ? "a" : "b"}`, and
// Astro's `class:list={['a', { b: on }]}`, whose object keys are classes too.
function markupClasses(text, add) {
    for (const match of text.matchAll(/\bclass(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
        words(match[1] ?? match[2] ?? '', add);
    }
    for (const match of text.matchAll(/\bclass(?::list|Name)?\s*=\s*\{/g)) {
        const start = (match.index ?? 0) + match[0].length;
        const end = braceEnd(text, start);
        (0, assert_1.assert)(end >= start, 'An expression ends after it starts');
        const expression = text.slice(start, end);
        // A template's text around its holes, then every quoted string, those
        // inside the holes (`${on ? "a" : ""}`) included.
        for (const template of expression.matchAll(/`((?:[^`\\]|\\.)*)`/g)) {
            words(template[1] ?? '', add);
        }
        for (const literal of expression.matchAll(/(["'])((?:(?!\1)[^\\]|\\.)*)\1/g)) {
            words(literal[2] ?? '', add);
        }
        // Object keys of class:list: `{ active: isOpen }`, `{ 'is-open': x }`.
        for (const key of expression.matchAll(/[{,]\s*(?:(["'])([^"']+)\1|([A-Za-z_$][\w$-]*))\s*:/g)) {
            add(key[2] ?? key[3] ?? '');
        }
    }
}
// Classes code adds, removes or looks for: `classList.add('a', "b")`,
// `.toggle('open')`, `className = 'a b'`, and the `.name` in a selector
// passed to querySelector, querySelectorAll, closest or matches.
function scriptClasses(text, add) {
    for (const match of text.matchAll(/\bclassList\s*\.\s*(?:add|remove|toggle|replace|contains)\s*\(([^)]*)\)/g)) {
        for (const literal of (match[1] ?? '').matchAll(/(["'`])([^"'`]*)\1/g)) {
            words(literal[2] ?? '', add);
        }
    }
    for (const match of text.matchAll(/\.className\s*\+?=\s*(["'`])([^"'`]*)\1/g)) {
        words(match[2] ?? '', add);
    }
    for (const match of text.matchAll(/\b(?:querySelector(?:All)?|closest|matches)\s*\(\s*(["'`])([^"'`]*)\1/g)) {
        selectorClasses(match[2] ?? '', add);
    }
}
// Whitespace-separated words; template holes (`${…}`) are not classes.
function words(text, add) {
    (0, assert_1.assert)(text.length <= exports.CLASS_SOURCE_CHARS_MAX, 'A class list is read from bounded text');
    for (const word of text.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/)) {
        add(word);
    }
}
// Where the `{…}` opened just before `start` closes, counting nested braces;
// the text's end when it never does.
function braceEnd(text, start) {
    (0, assert_1.assert)(start >= 0, 'An expression starts inside its text');
    (0, assert_1.assert)(start <= text.length, 'An expression starts inside its text');
    let depth = 1;
    const end = Math.min(text.length, start + exports.CLASS_SOURCE_CHARS_MAX);
    for (let index = start; index < end; index++) {
        const char = text[index];
        if (char === '{') {
            depth++;
        }
        else if (char === '}') {
            depth--;
            if (depth === 0) {
                return index;
            }
        }
    }
    return end;
}
