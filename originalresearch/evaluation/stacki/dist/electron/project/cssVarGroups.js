"use strict";
// How a stylesheet's custom properties are grouped for the editor: naming a
// rule, merging rules that are modes of one set, the families of columns inside
// one rule, and prefix sections (cssVars.ts).
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAMILIES_MAX = exports.MERGE_THRESHOLD = exports.overlap = exports.namesOf = exports.titleize = void 0;
exports.labelForRule = labelForRule;
exports.commonStem = commonStem;
exports.groupRules = groupRules;
exports.splits = splits;
exports.findFamilies = findFamilies;
exports.bestFamilySeed = bestFamilySeed;
exports.familyFrom = familyFrom;
exports.prefixSections = prefixSections;
const assert_1 = require("../../shared/core/assert");
const titleize = (text) => String(text)
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
exports.titleize = titleize;
// What to call a rule. A selector list usually leads with the generic one
// (`:root, .theme-light, …`) and the name people use for it is the specific
// one, so the first plain class wins over `:root`, `*` and anything nested.
function labelForRule(rule) {
    const candidates = rule.selectors.length ? rule.selectors : [rule.selector];
    const simpleClass = candidates.find((selector) => /^\.[a-z0-9_-]+$/i.test(selector.trim()));
    const chosen = simpleClass || candidates[0] || rule.selector;
    const cleaned = String(chosen).trim();
    if (cleaned === ':root') {
        return ':root';
    }
    if (/^\.[a-z0-9_-]+$/i.test(cleaned)) {
        return (0, exports.titleize)(cleaned.slice(1));
    }
    return cleaned;
}
// The stem shared by a set of labels, for naming a group of modes: "Theme
// light" + "Theme dark" + "Theme brand" → "Theme".
function commonStem(labels) {
    if (!labels.length) {
        return '';
    }
    const words = labels.map((label) => label.split(/\s+/));
    const stem = [];
    for (let i = 0; i < (words[0]?.length ?? 0); i++) {
        const word = words[0]?.[i];
        if (!word || !words.every((labelWords) => labelWords[i] === word)) {
            break;
        }
        stem.push(word);
    }
    return stem.join(' ');
}
// --- grouping --------------------------------------------------------------
const namesOf = (rule) => rule.entries.filter((entry) => entry.kind === 'var').map((entry) => entry.name);
exports.namesOf = namesOf;
const overlap = (left, right) => {
    const rightSet = new Set(right);
    const shared = left.filter((name) => rightSet.has(name)).length;
    return shared / Math.max(left.length, right.length);
};
exports.overlap = overlap;
// Rules that declare the same names are one thing in several modes — a light
// theme and a dark one, a size scale and its variants. They are shown as
// columns of a single table rather than as three tables nobody can compare.
exports.MERGE_THRESHOLD = 0.6;
function groupRules(rules) {
    const groups = [];
    const taken = new Set();
    rules.forEach((rule, index) => {
        if (taken.has(index)) {
            return;
        }
        const names = (0, exports.namesOf)(rule);
        const members = [rule];
        taken.add(index);
        for (let other = index + 1; other < rules.length; other++) {
            if (taken.has(other)) {
                continue;
            }
            const candidate = rules[other];
            if (!candidate || candidate.context.join('|') !== rule.context.join('|')) {
                continue;
            }
            const otherNames = (0, exports.namesOf)(candidate);
            const same = (0, exports.overlap)(names, otherNames);
            // One shared name is only a mode when it is the whole of both rules —
            // a page of utilities each setting `--_gap-size` is a scale, not a
            // coincidence.
            const enough = names.length > 1 ? same >= exports.MERGE_THRESHOLD : same === 1 && otherNames.length === names.length;
            if (enough) {
                members.push(candidate);
                taken.add(other);
            }
        }
        groups.push(members);
    });
    return groups;
}
// --- families (the columns inside one rule) --------------------------------
// Every way a name can be cut into a prefix and a suffix at a dash.
function splits(name) {
    const body = name.replace(/^--/, '');
    const parts = body.split('-');
    const out = [];
    for (let at = 1; at < parts.length; at++) {
        out.push({ prefix: parts.slice(0, at).join('-'), suffix: parts.slice(at).join('-') });
    }
    return out;
}
/**
 * The tables hiding in a list of names.
 *
 * A family is a set of prefixes that declare exactly the same variables:
 * {h1, h2, …} each having {line-height, margin-top, …} and nothing else. Exact,
 * not "most": a table is only worth reading when every column fills every row.
 * Prefixes that merely overlap — a few names in common and the rest their own —
 * made tables that were mostly dashes, so they stay lists. A name that is only
 * the prefix (`--h1`) is the family's own value, and is the first row; either
 * every prefix has one or none does.
 */
// Families one stylesheet is read into: a stylesheet, not a database.
exports.FAMILIES_MAX = 25;
function findFamilies(names) {
    const bySuffix = new Map(); // suffix -> Set(prefix)
    const byPrefix = new Map(); // prefix -> suffixes, in source order
    for (const name of names) {
        for (const { prefix, suffix } of splits(name)) {
            const owners = bySuffix.get(suffix);
            if (owners) {
                owners.add(prefix);
            }
            else {
                bySuffix.set(suffix, new Set([prefix]));
            }
            const suffixes = byPrefix.get(prefix);
            if (suffixes) {
                suffixes.push(suffix);
            }
            else {
                byPrefix.set(prefix, [suffix]);
            }
        }
    }
    const nameSet = new Set(names);
    const families = [];
    const used = new Set();
    while (families.length < exports.FAMILIES_MAX) {
        const best = bestFamilySeed(bySuffix, byPrefix, nameSet, used);
        if (best === undefined) {
            break;
        }
        const family = familyFrom(best, names, nameSet);
        (0, assert_1.assert)(family.prefixes.length >= 2, 'findFamilies: a family has at least two columns');
        const sizeBefore = used.size;
        // `--h1` itself, if it exists: the value the family is named for.
        if (family.self) {
            for (const prefix of family.prefixes) {
                used.add(`--${prefix}`);
            }
        }
        for (const suffix of family.rows) {
            for (const prefix of family.prefixes) {
                used.add(`--${prefix}-${suffix}`);
            }
        }
        // Every family claims names nobody had, so the search ends before the bound in practice.
        (0, assert_1.assert)(used.size > sizeBefore, 'findFamilies: a family claims new names');
        families.push(family);
    }
    return { families, used };
}
// Every suffix is a candidate seed: the prefixes that share it might be a
// family. Among them, only prefixes with the same signature — the same
// unclaimed suffixes, and the same answer to "is the prefix a variable too" —
// can be columns of one table. Which seed is picked matters — `--h1-margin-top`
// and `--h1-trim-top` both end in `top`, so "top" seeds candidates of
// `*-margin`/`*-trim` prefixes that would eat two rows out of the real table.
// The family that accounts for the most declarations wins, which is the deep
// one: seven headings by thirteen properties.
function bestFamilySeed(bySuffix, byPrefix, nameSet, used) {
    let best = undefined;
    for (const [suffix, prefixes] of bySuffix) {
        const seed = [...prefixes].filter((prefix) => !used.has(`--${prefix}-${suffix}`));
        if (seed.length < 2) {
            continue;
        }
        for (const candidate of signatureGroups(seed, byPrefix, nameSet, used)) {
            if (candidate.prefixes.length < 2) {
                continue;
            }
            // A one-row table is a list turned sideways.
            const height = candidate.rows.length + (candidate.self ? 1 : 0);
            if (height < 2) {
                continue;
            }
            const score = candidate.prefixes.length * height;
            if (!best || score > best.score) {
                best = { score, prefixes: candidate.prefixes, rows: candidate.rows };
            }
        }
    }
    return best;
}
// The seed's prefixes, split by exactly what each declares that is not
// claimed yet. Prefixes in one group have identical rows, so a table of them
// has no empty cells.
function signatureGroups(seed, byPrefix, nameSet, used) {
    (0, assert_1.assert)(seed.length >= 2, 'signatureGroups: a seed has at least two prefixes');
    const groups = new Map();
    for (const prefix of seed) {
        const rows = [...new Set(byPrefix.get(prefix) ?? [])].filter((suffix) => !used.has(`--${prefix}-${suffix}`));
        (0, assert_1.assert)(rows.length > 0, 'signatureGroups: a seed prefix declares its seed suffix');
        const self = nameSet.has(`--${prefix}`) && !used.has(`--${prefix}`);
        // Suffixes are names without the prefix, so a newline cannot occur in one.
        const key = `${self ? 'self' : 'none'}\n${[...rows].sort().join('\n')}`;
        const group = groups.get(key);
        if (group) {
            group.prefixes.push(prefix);
        }
        else {
            groups.set(key, { prefixes: [prefix], rows, self });
        }
    }
    return [...groups.values()];
}
// The family a seed describes, with its rows and columns in source order: the order the author
// chose, rather than anything alphabetical.
function familyFrom(best, names, nameSet) {
    const { prefixes } = best;
    const order = new Map();
    names.forEach((name, index) => {
        for (const { prefix, suffix } of splits(name)) {
            if (prefixes.includes(prefix) && !order.has(suffix)) {
                order.set(suffix, index);
            }
        }
    });
    const rows = [...best.rows].sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
    const columnOrder = new Map();
    names.forEach((name, index) => {
        const body = name.replace(/^--/, '');
        for (const prefix of prefixes) {
            if ((body === prefix || body.startsWith(`${prefix}-`)) && !columnOrder.has(prefix)) {
                columnOrder.set(prefix, index);
            }
        }
    });
    const columns = [...prefixes].sort((left, right) => (columnOrder.get(left) ?? 0) - (columnOrder.get(right) ?? 0));
    const self = columns.some((prefix) => nameSet.has(`--${prefix}`));
    return { prefixes: columns, rows, self };
}
// --- sections --------------------------------------------------------------
// Names sharing a leading part, where that part is not itself a variable:
// `--selection-background` and `--selection-text` belong to the selection,
// while `--background` and `--background-2` do not belong to a background —
// there is one, and it is a variable in its own right.
//
// The longest shared start wins, so `--button-2-*` is its own thing rather than
// six more rows of `--button-*`.
function prefixSections(names) {
    const nameSet = new Set(names);
    const counts = new Map();
    for (const name of names) {
        const body = name.replace(/^--/, '');
        const parts = body.split('-');
        for (let at = 1; at < parts.length; at++) {
            const prefix = parts.slice(0, at).join('-');
            if (nameSet.has(`--${prefix}`)) {
                continue;
            }
            counts.set(prefix, (counts.get(prefix) || 0) + 1);
        }
    }
    const qualifies = (prefix) => (counts.get(prefix) || 0) >= 2;
    const assigned = new Map(); // prefix -> [names]
    const loose = [];
    for (const name of names) {
        const body = name.replace(/^--/, '');
        const parts = body.split('-');
        let chosen = undefined;
        for (let at = 1; at < parts.length; at++) {
            const prefix = parts.slice(0, at).join('-');
            if (qualifies(prefix)) {
                chosen = prefix;
            }
        }
        if (!chosen) {
            loose.push(name);
            continue;
        }
        const group = assigned.get(chosen);
        if (group) {
            group.push(name);
        }
        else {
            assigned.set(chosen, [name]);
        }
    }
    // A section of one is not a section — those names go back in the main list,
    // in the place they were declared.
    const sections = new Map();
    const orphans = new Set();
    for (const [prefix, group] of assigned) {
        if (group.length >= 2) {
            sections.set(prefix, group);
        }
        else {
            group.forEach((name) => orphans.add(name));
        }
    }
    const mainList = names.filter((name) => loose.includes(name) || orphans.has(name));
    return { loose: mainList, sections };
}
