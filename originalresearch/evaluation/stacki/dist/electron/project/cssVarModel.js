"use strict";
// The model the variables editor shows: one group per set of rules, blocks per
// comment section or prefix, rows and columns of cells (cssVars.ts).
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shortLabel = void 0;
exports.buildGroup = buildGroup;
exports.modesGroup = modesGroup;
exports.commentSections = commentSections;
exports.sectionBlocks = sectionBlocks;
exports.cellFor = cellFor;
exports.describeCell = describeCell;
exports.readVariables = readVariables;
const variableWorkspace_1 = require("./variableWorkspace");
const path_1 = __importDefault(require("path"));
const variableWorkspace_2 = require("./variableWorkspace");
const assert_1 = require("../../shared/core/assert");
const cssVarRead_1 = require("./cssVarRead");
const cssVarGroups_1 = require("./cssVarGroups");
const cssVarValues_1 = require("./cssVarValues");
function buildGroup(members, file) {
    (0, assert_1.assert)(members.length > 0, 'buildGroup: a group has at least one rule');
    const columns = members.map((rule, index) => ({
        id: `${index}`,
        label: (0, cssVarGroups_1.labelForRule)(rule),
        selector: rule.selector,
        context: rule.context,
        line: rule.line,
    }));
    const byName = members.map((rule) => {
        const map = new Map();
        for (const entry of rule.entries) {
            if (entry.kind === 'var') {
                map.set(entry.name, { ...entry, selector: rule.selector });
            }
        }
        return map;
    });
    if (members.length > 1) {
        return modesGroup(columns, byName, file);
    }
    // One rule: comments are headings, and the names inside each heading may form
    // tables of their own.
    const rule = members[0];
    if (!rule) {
        return { kind: 'single', label: '', columns, blocks: [] };
    }
    const blocks = commentSections(rule).flatMap((section) => sectionBlocks(section, rule, byName[0], file));
    return { kind: 'single', label: (0, cssVarGroups_1.labelForRule)(rule), columns, blocks };
}
// Several rules declaring the same names: the columns are the modes, so the names are the rows.
// Sub-sections come from shared prefixes.
function modesGroup(columns, byName, file) {
    const cellsFor = (name) => byName.map((map, index) => cellFor(map, name, file, columns[index]?.id ?? ''));
    const names = [];
    for (const map of byName) {
        for (const name of map.keys()) {
            if (!names.includes(name)) {
                names.push(name);
            }
        }
    }
    const blocks = [];
    const { loose, sections } = (0, cssVarGroups_1.prefixSections)(names);
    if (loose.length) {
        blocks.push({
            kind: 'rows',
            title: undefined,
            rows: loose.map((name) => ({ label: (0, exports.shortLabel)(name), name, cells: cellsFor(name) })),
        });
    }
    for (const [prefix, group] of sections) {
        blocks.push({
            kind: 'rows',
            title: prefix,
            rows: group.map((name) => ({
                label: (0, exports.shortLabel)(name, prefix),
                name,
                cells: cellsFor(name),
            })),
        });
    }
    const firstLabel = columns[0]?.label ?? '';
    return {
        kind: 'modes',
        label: (0, cssVarGroups_1.commonStem)(columns.map((column) => column.label)) || firstLabel,
        columns,
        blocks,
    };
}
function commentSections(rule) {
    const sections = [];
    let current = { title: undefined, names: [] };
    for (const entry of rule.entries) {
        if (entry.kind === 'comment') {
            // A heading with nothing under it is kept. It used to be dropped, which
            // was tidy right up until the panel grew a way to MAKE one: a new group
            // starts empty, and a group you cannot see is one you cannot fill.
            // (Untitled runs with no names are still nothing at all.)
            if (current.names.length || current.title !== undefined) {
                sections.push(current);
            }
            current = {
                title: entry.text,
                titleStart: entry.textStart,
                titleEnd: entry.textEnd,
                names: [],
            };
            continue;
        }
        current.names.push(entry.name);
    }
    if (current.names.length || current.title !== undefined) {
        sections.push(current);
    }
    return sections;
}
// One heading's blocks: a matrix per family its names form, then a list of whatever is left.
function sectionBlocks(section, rule, map, file) {
    const blocks = [];
    const { families, used } = (0, cssVarGroups_1.findFamilies)(section.names);
    const claimed = new Set();
    for (const family of families) {
        const rows = [];
        if (family.self) {
            rows.push({
                label: 'value',
                cells: family.prefixes.map((prefix) => cellFor(map, `--${prefix}`, file, '0')),
            });
            for (const prefix of family.prefixes) {
                claimed.add(`--${prefix}`);
            }
        }
        for (const suffix of family.rows) {
            rows.push({
                label: suffix,
                cells: family.prefixes.map((prefix) => cellFor(map, `--${prefix}-${suffix}`, file, '0')),
            });
            for (const prefix of family.prefixes) {
                claimed.add(`--${prefix}-${suffix}`);
            }
        }
        blocks.push({
            kind: 'matrix',
            title: section.title,
            columns: family.prefixes.map((prefix) => ({
                id: prefix,
                label: prefix,
                selector: rule.selector,
                context: rule.context,
                line: rule.line,
            })),
            rows: rows.filter((row) => row.cells.some(Boolean)),
            // The inner sections of a one-rule file carry their comment's span so
            // the heading can be renamed in place; a comment-less section has none.
            ...(section.titleStart !== undefined ? { titleStart: section.titleStart, titleEnd: section.titleEnd } : {}),
        });
    }
    const leftovers = section.names.filter((name) => !claimed.has(name) && !used.has(name));
    if (leftovers.length || (!families.length && section.title !== undefined)) {
        blocks.push({
            kind: 'rows',
            title: families.length ? undefined : section.title,
            rows: leftovers.map((name) => ({
                label: (0, exports.shortLabel)(name),
                name,
                cells: [cellFor(map, name, file, '0')],
            })),
            ...(families.length ? {} : { titleStart: section.titleStart, titleEnd: section.titleEnd }),
        });
    }
    return blocks;
}
function cellFor(map, name, file, column) {
    const entry = map?.get(name);
    if (!entry) {
        return undefined;
    }
    return {
        name,
        value: entry.value,
        file,
        selector: entry.selector,
        valueStart: entry.valueStart,
        valueEnd: entry.valueEnd,
        line: entry.line,
        column,
    };
}
// A cell's value said three ways: what the file holds, what it comes out as,
// and what colour to draw beside it (if any).
function describeCell(cell, map) {
    if (!cell) {
        return undefined;
    }
    const single = String(cell.value)
        .trim()
        .match(/^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/);
    const resolved = (0, cssVarValues_1.resolveValue)(cell.value, map);
    const ref = single?.[1];
    const color = (0, cssVarValues_1.colorOf)(resolved);
    return {
        ...cell,
        // A value that is nothing but another variable is shown as that variable's
        // name — which is what the author wrote, and what they would search for.
        ...(ref === undefined ? {} : { ref }),
        ...(resolved === cell.value ? {} : { resolved }),
        ...(color === undefined ? {} : { color }),
        unknownColor: (0, cssVarValues_1.isUncomputableColor)(resolved),
        kind: (0, cssVarValues_1.kindOf)(cell.value, resolved),
    };
}
const shortLabel = (name, prefix) => {
    const body = name.replace(/^--/, '');
    return prefix && body.startsWith(`${prefix}-`) ? body.slice(prefix.length + 1) : body;
};
exports.shortLabel = shortLabel;
/**
 * Every stylesheet in the project that declares custom properties, as groups of
 * tables. Files with none are left out — a variables panel is a place to find
 * variables, not a file browser.
 */
function readVariables(projectPath) {
    const files = [];
    for (const abs of (0, cssVarRead_1.findStylesheets)(projectPath)) {
        let text;
        try {
            if (variableWorkspace_1.variableFiles.statSync(abs).size > variableWorkspace_2.MAIN_LIMITS.cssVariableFileBytesMax) {
                continue;
            }
            text = variableWorkspace_1.variableFiles.readFileSync(abs, 'utf8');
        }
        catch {
            continue;
        }
        const rel = (0, cssVarRead_1.toPosix)(path_1.default.relative(projectPath, abs));
        let rules;
        try {
            rules = (0, cssVarRead_1.readDeclarations)(text);
        }
        catch (error) {
            files.push({
                rel,
                name: path_1.default.basename(abs),
                error: `Could not parse — ${error instanceof Error ? error.message : String(error)}`,
                groups: [],
            });
            continue;
        }
        if (!rules.length) {
            continue;
        }
        const groups = (0, cssVarGroups_1.groupRules)(rules).map((members) => buildGroup(members, rel));
        files.push({
            rel,
            name: path_1.default.basename(abs),
            groups,
            declarations: rules,
            count: rules.reduce((sum, rule) => sum + (0, cssVarGroups_1.namesOf)(rule).length, 0),
        });
    }
    // Values reference each other across files as freely as within one, so the
    // map every value is resolved against is the project's, not the file's.
    const map = new Map();
    for (const file of files) {
        for (const rule of file.declarations || []) {
            for (const entry of rule.entries) {
                if (entry.kind === 'var') {
                    map.set(entry.name, entry.value);
                }
            }
        }
    }
    const values = Object.fromEntries(map);
    const scopes = variableScopes(files);
    for (const file of files) {
        delete file.declarations;
        for (const group of file.groups) {
            for (const block of group.blocks) {
                for (const row of block.rows) {
                    row.cells = row.cells.map((cell) => describeCell(cell, cell === undefined ? map : scopes.mapFor(cell)));
                }
            }
        }
    }
    return { files, values };
}
// The map a cell resolves against: the base values, overlaid with what the
// cell's own rule (its selector, under its at-rules) declares. One flat map let
// the last theme in the project answer for every column, so a light row's
// `var(--surface)` was drawn in the dark theme's colour (issue #69). The base is
// what rules outside any at-rule declare first; a theme overrides it after.
function variableScopes(files) {
    const base = new Map();
    const fallback = new Map();
    const scopes = new Map();
    const scopeOfEntry = new Map();
    for (const file of files) {
        for (const rule of file.declarations || []) {
            const scope = `${rule.context.join('\n')}\n${rule.selector}`;
            const declared = scopes.get(scope) ?? new Map();
            scopes.set(scope, declared);
            for (const entry of rule.entries) {
                if (entry.kind !== 'var') {
                    continue;
                }
                declared.set(entry.name, entry.value);
                scopeOfEntry.set(`${file.rel}:${entry.valueStart}`, scope);
                if (!fallback.has(entry.name)) {
                    fallback.set(entry.name, entry.value);
                }
                if (rule.context.length === 0) {
                    if (!base.has(entry.name)) {
                        base.set(entry.name, entry.value);
                    }
                }
            }
        }
    }
    (0, assert_1.assert)(base.size <= fallback.size, 'Base values are a subset of every declared name');
    const merged = new Map();
    const mapFor = (cell) => {
        const scope = scopeOfEntry.get(`${cell.file}:${cell.valueStart}`);
        (0, assert_1.assert)(scope !== undefined, 'Every described cell was read from a rule');
        const known = merged.get(scope);
        if (known !== undefined) {
            return known;
        }
        const map = new Map([...fallback, ...base, ...(scopes.get(scope) ?? [])]);
        (0, assert_1.assert)(map.has(cell.name), 'A cell resolves in a scope that declares it');
        merged.set(scope, map);
        return map;
    };
    return { mapFor };
}
