"use strict";
// The one producer of a component's prop model (docs/plans/prop-controls.md
// §2.2, Phase 1): the syntactic tier, on the TypeScript compiler's syntax tree
// of the frontmatter plus the declarations its imports bring (`prelude`, read
// by the caller, which has file access). Every panel derives from what this
// returns, through shared/properties/propModelSchema.ts.
//
// What a prop is, in order of trust: its declared type (aliases, interfaces,
// unions and `as const` lists followed), then how the code reads it (a
// destructure default, a `?? literal` fallback, an `Astro.props.x` read), then
// what its doc comment states. The result is parsed by parsePropModel before
// it is returned, so a producer bug is a loud crash here, not a wrong control
// in a panel.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPropModel = readPropModel;
const typescript_1 = __importDefault(require("typescript"));
const assert_1 = require("../../../shared/core/assert");
const propModel_1 = require("../../../shared/properties/propModel");
const propTags_1 = require("../../../shared/properties/propTags");
const propDeclarations_1 = require("./propDeclarations");
const propProse_1 = require("./propProse");
const propReads_1 = require("./propReads");
const propTypes_1 = require("./propTypes");
/** The prop model of a component's source; `prelude` holds the type declarations it imports. */
function readPropModel(source, prelude = '') {
    const { frontmatter, template } = splitComponent(source);
    const frontmatterFile = typescript_1.default.createSourceFile('component.ts', frontmatter, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TS);
    const preludeFile = typescript_1.default.createSourceFile('prelude.ts', prelude, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TS);
    const scope = (0, propTypes_1.typeScope)([frontmatterFile, preludeFile]);
    const reads = (0, propReads_1.readProps)(frontmatterFile, template);
    const type = (0, propDeclarations_1.readPropsType)(frontmatterFile, preludeFile, scope, reads.patterns);
    const shared = (0, propProse_1.sharedDocumentation)(type.unions.flatMap((union) => union.branches.map((branch) => branch.docs)));
    const drafts = declaredDrafts(type.blocks, scope, shared);
    for (const entry of reads.entries) {
        const draft = drafts.get(entry.name) ?? undeclaredDraft(entry.name);
        drafts.set(entry.name, withEntryFallback(draft, entry.fallback));
    }
    // A component with no Props type at all may still read `Astro.props.label`;
    // with one, the declared type is the whole list.
    if (type.declaration === 'none') {
        for (const name of reads.direct) {
            if (!drafts.has(name) && drafts.size < propModel_1.PROP_MODEL_LIMITS.propsMax) {
                drafts.set(name, undeclaredDraft(name));
            }
        }
    }
    const split = (0, propDeclarations_1.splitFallbacks)(type.unions);
    const nullish = (0, propReads_1.nullishFallbacks)(frontmatterFile);
    const readNames = new Set([...reads.entries.map((entry) => entry.name), ...reads.direct]);
    const props = [...drafts.values()].slice(0, propModel_1.PROP_MODEL_LIMITS.propsMax).map((draft) => {
        const fallback = draft.fallback.kind === 'none' ? statedFallback(draft, nullish, split) : { draft, fallback: draft.fallback };
        const usage = readNames.has(draft.name) ? 'read' : reads.escapes ? 'unknown' : 'unread';
        return finishedProp(fallback.draft, fallback.fallback, usage);
    });
    const model = (0, propModel_1.parsePropModel)({ declaration: type.declaration, props, unions: type.unions });
    (0, assert_1.assert)(model.props.length === props.length, 'readPropModel: the model keeps every prop it read');
    (0, assert_1.assert)(model.props.every((prop) => prop.declared || prop.usage === 'read'), 'readPropModel: an undeclared prop is one the code reads');
    return model;
}
function undeclaredDraft(name) {
    return {
        name,
        declared: false,
        typeText: '',
        control: { kind: 'code', reason: 'untyped' },
        presence: 'optional',
        nullable: false,
        documentation: '',
        fallback: { kind: 'none' },
        recognition: { source: 'fallback' },
    };
}
// The component's source split at its frontmatter fences; no fences is all template.
function splitComponent(source) {
    const match = /^(?:﻿)?---[^\S\r\n]*\r?\n([\s\S]*?)\r?\n---/.exec(source) ?? undefined;
    if (match === undefined) {
        return { frontmatter: '', template: source };
    }
    const frontmatter = match[1] ?? '';
    (0, assert_1.assert)(frontmatter.length < source.length, 'splitComponent: the frontmatter is part of the source');
    return { frontmatter, template: source.slice(match[0].length) };
}
// Each member of every block, gathered by name across blocks, so a prop split
// over a discriminated union is the union of what it can be — `"responsive"`
// here and `"fixed"` there is one two-option choice, not two one-option ones.
function declaredDrafts(blocks, scope, shared) {
    const gathered = new Map();
    for (const signature of blocks.flat()) {
        const name = (0, propTypes_1.memberKey)(signature.member.name);
        if (name === undefined) {
            continue;
        }
        const previous = gathered.get(name) ?? { name, parts: [], texts: [], optional: false, hasNull: false, hasUndefined: false, noted: '' };
        const entry = accumulateMember(previous, signature, scope);
        gathered.set(name, entry.noted === '' ? { ...entry, noted: (0, propDeclarations_1.memberDocumentation)(signature).slice(0, propModel_1.PROP_MODEL_LIMITS.docCharsMax) } : entry);
    }
    const drafts = new Map();
    for (const entry of gathered.values()) {
        const documentation = shared.get(entry.name) ?? entry.noted;
        const presence = entry.optional ? 'optional' : 'required';
        drafts.set(entry.name, {
            name: entry.name,
            declared: true,
            typeText: (0, propTypes_1.boundedText)(entry.texts.join(' | ')),
            control: documentedControl((0, propTypes_1.controlOfParts)(entry.parts, scope, propTypes_1.TOP_WALK), entry.noted, documentation),
            presence,
            nullable: entry.hasNull || (presence === 'required' && entry.hasUndefined),
            documentation,
            fallback: { kind: 'none' },
            recognition: { source: 'type' },
        });
    }
    (0, assert_1.assert)(drafts.size === gathered.size, 'declaredDrafts: one draft per declared name');
    return drafts;
}
// A member's type, as its parts. A member typed by a local alias reads as
// what the alias says (`tone?: Tone` is Tone's options); one typed by a local
// interface keeps the reference, which reads as the interface's group.
function accumulateMember(entry, signature, scope) {
    const { member, file } = signature;
    const type = member.type;
    // `src?: never` says where src belongs in a branch that forbids it; it
    // makes the prop no more optional than the branches that do take it.
    const optional = entry.optional || (member.questionToken !== undefined && type?.kind !== typescript_1.default.SyntaxKind.NeverKeyword);
    if (type === undefined) {
        return { ...entry, optional };
    }
    const declaration = (0, propTypes_1.referencedDeclaration)(type, scope);
    const read = declaration?.kind === 'interface'
        ? [{ part: { kind: 'type', node: type, file, aliases: [] }, text: interfaceBody(declaration.node, declaration.file) }]
        : (0, propTypes_1.flattenParts)(declaration?.kind === 'alias' ? declaration.node.type : type, declaration?.file ?? file, scope).map((part) => ({
            part,
            text: (0, propTypes_1.partText)(part),
        }));
    const parts = [...entry.parts];
    const texts = [...entry.texts];
    for (const { part, text } of read) {
        // `never` is how a union branch says "not in this shape": it describes the
        // branch, not the prop, so it adds no type (but the prop keeps its place).
        if (!(0, propTypes_1.isNever)(part) && !texts.includes(text)) {
            parts.push(part);
            texts.push(text);
        }
    }
    (0, assert_1.assert)(parts.length === texts.length, 'accumulateMember: every part has its text');
    return {
        ...entry,
        parts,
        texts,
        optional,
        hasNull: entry.hasNull || read.some(({ part }) => (0, propTypes_1.isNull)(part)),
        hasUndefined: entry.hasUndefined || read.some(({ part }) => part.kind === 'type' && part.node.kind === typescript_1.default.SyntaxKind.UndefinedKeyword),
    };
}
function interfaceBody(declaration, file) {
    const text = declaration.getText(file);
    const open = text.indexOf('{');
    return open === -1 ? text : text.slice(open);
}
// The settings a doc's tags and prose give a number or a switch. `noted` is
// the member's own doc, which states its range; `documentation` is the doc the
// field shows, which a union's branches may share.
function documentedControl(control, noted, documentation) {
    if (control.kind === 'number') {
        const rules = (0, propProse_1.numberRules)(noted);
        const tags = (0, propTags_1.readPropTags)(noted);
        return {
            kind: 'number',
            min: rules.min,
            max: rules.max,
            minExclusive: rules.minExclusive ?? false,
            maxExclusive: rules.maxExclusive ?? false,
            step: rules.step,
            decimals: tags.decimals,
        };
    }
    if (control.kind === 'switch') {
        const tags = (0, propTags_1.readPropTags)(documentation);
        return { kind: 'switch', onLabel: tags.onLabel, offLabel: tags.offLabel };
    }
    return control;
}
// ---------------------------------------------------------------------------
// What the code adds
// ---------------------------------------------------------------------------
// A prop whose type says nothing a control can use (none, or a name the
// syntax cannot settle) takes its kind from its value, as written.
function refinable(control) {
    return control.kind === 'code' && (control.reason === 'untyped' || control.reason === 'unrecognized');
}
function literalControl(value) {
    if (typeof value === 'string') {
        return { kind: 'text' };
    }
    if (typeof value === 'boolean') {
        return { kind: 'switch', onLabel: undefined, offLabel: undefined };
    }
    return { kind: 'number', min: undefined, max: undefined, minExclusive: false, maxExclusive: false, step: undefined, decimals: undefined };
}
function withEntryFallback(draft, entry) {
    if (entry.kind === 'none') {
        return draft;
    }
    if (entry.kind === 'literal') {
        const fallback = boundedLiteral(entry.value, 'destructure');
        if (!refinable(draft.control) || fallback.kind === 'none') {
            return { ...draft, fallback };
        }
        return { ...draft, fallback, control: literalControl(entry.value), recognition: { source: 'usage', evidence: 'its default value' } };
    }
    if (entry.code.length > propModel_1.PROP_MODEL_LIMITS.textCharsMax) {
        return draft;
    }
    const fallback = { kind: 'expression', code: entry.code };
    if (!refinable(draft.control)) {
        return { ...draft, fallback };
    }
    const evidence = { source: 'usage', evidence: 'its default value' };
    switch (entry.shape) {
        case 'array':
            return { ...draft, fallback, control: { kind: 'list', item: { kind: 'code', reason: 'untyped' } }, recognition: evidence };
        case 'object':
            return { ...draft, fallback, control: { kind: 'attributes', tag: undefined }, recognition: evidence };
        case 'function':
            return { ...draft, fallback, control: { kind: 'callback', signature: '' }, recognition: evidence };
        case 'other':
            return { ...draft, fallback };
        default: {
            const exhaustive = entry.shape;
            return exhaustive;
        }
    }
}
function boundedLiteral(value, source) {
    if (typeof value === 'string' && value.length > propModel_1.PROP_MODEL_LIMITS.textCharsMax) {
        return { kind: 'none' };
    }
    return { kind: 'literal', value, source };
}
// A prop's fallback isn't always a destructure default. Two more places state
// it plainly: a renamed prop's `const alt = altProp ?? ""`, and the doc comment
// ("Defaults to `webp`"). Only literal values are taken; a fallback that is a
// behaviour ("it is inferred") is a hint, never a value, so nothing may treat
// it as one.
function statedFallback(draft, nullishes, split) {
    const nullish = nullishes.get(draft.name);
    if (nullish !== undefined) {
        const fallback = boundedLiteral(nullish, 'nullish');
        if (refinable(draft.control) && fallback.kind !== 'none') {
            return { draft: { ...draft, control: literalControl(nullish), recognition: { source: 'usage', evidence: 'its ?? fallback' } }, fallback };
        }
        return { draft, fallback };
    }
    // A prop whose branches each promise their own fallback has no one answer.
    if (split.has(draft.name)) {
        return { draft, fallback: { kind: 'none' } };
    }
    const said = (0, propProse_1.statedDefault)(draft.documentation);
    if (said.value !== undefined) {
        // "Defaults to true." on a switch is the boolean, not the word.
        const value = draft.control.kind === 'switch' && (said.value === 'true' || said.value === 'false') ? said.value === 'true' : said.value;
        return { draft, fallback: boundedLiteral(value, 'doc') };
    }
    if (said.hint) {
        return { draft, fallback: { kind: 'hint', hint: said.hint.slice(0, propModel_1.PROP_MODEL_LIMITS.textCharsMax) } };
    }
    const phrase = draft.documentation.match(/\b(?:is|are)\s+(inferred|automatic|calculated)\b|\b(inferred|automatic)\s+from\b|\b([A-Z][\w ]{0,24}?picks[\w ]{0,20}?)\s+by default\b|\bdefaults?\s*(?:to|:)\s*([^.]+)/i);
    if (phrase) {
        // To the end of the sentence, not a fixed number of word characters —
        // "the image service's own default" reads like a value cut short.
        const text = (phrase[1] || phrase[2] || phrase[3] || phrase[4] || '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
        if (text && text.length <= HINT_CHARS_MAX) {
            return { draft, fallback: { kind: 'hint', hint: text } };
        }
    }
    return { draft, fallback: { kind: 'none' } };
}
// A behaviour hint is a short phrase; a longer one is prose that belongs in the tooltip.
const HINT_CHARS_MAX = 48;
function finishedProp(draft, fallback, usage) {
    const tags = (0, propTags_1.readPropTags)(draft.documentation);
    return {
        name: draft.name,
        typeText: draft.typeText,
        control: draft.control,
        presence: draft.presence,
        nullable: draft.nullable,
        fallback,
        documentation: draft.documentation,
        tooltip: tags.tooltip,
        group: tags.group,
        deprecated: tags.deprecated,
        format: tags.format,
        recognition: draft.recognition,
        usage,
        declared: draft.declared,
    };
}
