"use strict";
// Parsing a template into page nodes: tags, expressions, and the
// conditional and .map() markup inside them, recursing through the bounds
// astroParseState.ts holds.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTemplate = parseTemplate;
const htmlText_1 = require("../../shared/page/htmlText");
const assert_1 = require("../../shared/core/assert");
const limits_1 = require("../../shared/core/limits");
const astroAttrs_1 = require("./astroAttrs");
const astroScan_1 = require("./astroScan");
const astroParseState_1 = require("./astroParseState");
const astroSerialize_1 = require("./astroSerialize");
const astroTag_1 = require("./astroTag");
const astroMapSyntax_1 = require("./astroMapSyntax");
function tryParseMap(exprText, base = undefined) {
    const inner = exprText.slice(1, -1); // strip the outer { }
    const syntax = (0, astroMapSyntax_1.readMapSyntax)(inner);
    if (!syntax) {
        return undefined;
    }
    // The syntax tree chooses the callback form before the compact readers run.
    // Other forms preserve their code around independently editable markup roots.
    const inBase = base === undefined ? undefined : base + 1;
    return parseMapEmpty(syntax) || parseMapSimple(inner, syntax, inBase) || parseMapCallback(inner, syntax, inBase);
}
// A loop with nothing in it yet, as the serializer writes one: `.map((item) =>
// (null))`. It is an ordinary loop with no children, not hand-written code, so
// its settings stay editable; read as code, a just-inserted loop showed only
// its Code field.
function parseMapEmpty(syntax) {
    const [part] = syntax.parts;
    if (syntax.markup.length !== 0 || syntax.parts.length !== 1 || part === undefined) {
        return undefined;
    }
    if (!/^\(?\s*null\s*\)\s*\)\s*\}?\s*$/.test(part)) {
        return undefined;
    }
    return { id: (0, astroAttrs_1.makeId)(), kind: 'map', head: (0, astroScan_1.normalizeHead)(syntax.head), headSource: syntax.head, children: [] };
}
function parseMapSimple(inner, syntax, base) {
    switch (syntax.form) {
        case 'conditional':
            return tryParseConditionalMap(inner, base);
        case 'markup':
            return tryParseConciseMap(inner, base) || tryParseBareMap(inner, base);
        case 'block':
            return syntax.markup.length === 1 ? tryParseBlockMap(inner, base) : undefined;
        case 'general':
            return undefined;
        default: {
            const exhaustive = syntax.form;
            return exhaustive;
        }
    }
}
function parseMapCallback(inner, syntax, base) {
    const children = [];
    const count = astroParseState_1.parseState.nodes;
    const previousBail = astroParseState_1.parseState.lastBail;
    for (const span of syntax.markup) {
        const parsed = parseTemplate(inner.slice(span.start, span.end), base === undefined ? undefined : base + span.start);
        if (!parsed.clean || parsed.nodes.length !== 1) {
            astroParseState_1.parseState.nodes = count;
            astroParseState_1.parseState.lastBail = previousBail;
            return undefined;
        }
        children.push((0, astroAttrs_1.required)(parsed.nodes[0], 'A callback markup root parsed as one node'));
    }
    (0, assert_1.assert)(syntax.parts.length === children.length + 1, 'Callback code surrounds each markup root');
    return {
        id: (0, astroAttrs_1.makeId)(),
        kind: 'map',
        head: (0, astroScan_1.normalizeHead)(syntax.head),
        headSource: syntax.head,
        bodyParts: syntax.parts,
        children,
    };
}
// A map callback can return a conditional directly, with or without parens
// around the ternary. Parse the conditional before treating its JSX branches
// as unrelated template text, so both rendered alternatives remain editable.
function tryParseConditionalMap(inner, base = undefined) {
    const arrow = inner.match(/^([\s\S]*?\.map\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*)/);
    if (!arrow) {
        return undefined;
    }
    const headRaw = (0, astroAttrs_1.required)(arrow[1], 'Conditional loop header capture');
    const mapOpen = headRaw.lastIndexOf('.map(') + '.map'.length;
    const mapClose = (0, astroScan_1.findMatchingParen)(inner, mapOpen);
    if (mapClose === -1 || inner.slice(mapClose + 1).trim()) {
        return undefined;
    }
    // A comma after the callback is a legal trailing argument separator, not
    // part of the conditional expression returned by the callback.
    const body = inner.slice(headRaw.length, mapClose).replace(/,\s*$/, '');
    const child = conditionalMapBody(body, base === undefined ? undefined : base + headRaw.length);
    if (!child) {
        return undefined;
    }
    return {
        id: (0, astroAttrs_1.makeId)(),
        kind: 'map',
        head: (0, astroScan_1.normalizeHead)(headRaw + '('),
        children: [child],
    };
}
function conditionalMapBody(raw, base) {
    let text = raw.trim();
    let at = base === undefined ? undefined : base + (raw.length - raw.trimStart().length);
    while (text.startsWith('(') && (0, astroScan_1.findMatchingParen)(text, 0) === text.length - 1) {
        const inner = text.slice(1, -1);
        const trimmed = inner.trimStart();
        if (at !== undefined) {
            at += 1 + (inner.length - trimmed.length);
        }
        text = trimmed.trimEnd();
    }
    // Ordinary JSX callbacks belong to the existing concise-map parser. Avoid
    // parsing them speculatively, which would count their nodes twice.
    if (text.startsWith('<')) {
        return undefined;
    }
    const count = astroParseState_1.parseState.nodes;
    const previousBail = astroParseState_1.parseState.lastBail;
    const child = parseCondSource(text, at);
    if (!child) {
        astroParseState_1.parseState.nodes = count;
        astroParseState_1.parseState.lastBail = previousBail;
        return undefined;
    }
    if (at !== undefined) {
        child.start = at;
        child.end = at + text.length;
    }
    return child;
}
function tryParseConciseMap(inner, base = undefined) {
    // The callback's parameter list may be parenthesized — `(post)`, `(post, i)`,
    // `([k, v])` — or a bare name, which is how many people write a one-argument
    // arrow. Both are the same loop; only the first used to be recognized.
    const arrow = inner.match(/^([\s\S]*?\.map\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\()/);
    if (!arrow) {
        return undefined;
    }
    const headRaw = (0, astroAttrs_1.required)(arrow[1], 'Loop header capture');
    const openIndex = arrow[0].length - 1; // the arrow-body '('
    const closeIndex = (0, astroScan_1.findMatchingParen)(inner, openIndex);
    if (closeIndex === -1) {
        return undefined;
    }
    // After the body must come only the .map() close paren.
    if (!/^\s*\)\s*$/.test(inner.slice(closeIndex + 1))) {
        return undefined;
    }
    const body = inner.slice(openIndex + 1, closeIndex);
    if (!body.trimStart().startsWith('<')) {
        return undefined;
    }
    // `inner` starts one char into exprText, and body one char past the arrow '('.
    const parsed = parseTemplate(body, base === undefined ? undefined : base + openIndex + 1);
    if (!parsed.clean) {
        return undefined;
    }
    return {
        id: (0, astroAttrs_1.makeId)(),
        kind: 'map',
        head: (0, astroScan_1.normalizeHead)(headRaw), // e.g. "stats.map((stat) => ("
        // A chain written across several lines — `posts` / `.sort(…)` / `.map(…)` —
        // is one line once normalized, and writing that back would flatten how the
        // page was written. Keep the original layout to re-emit while the head
        // still says the same thing; see serializeNode's 'map' case.
        headSource: (0, astroScan_1.dedentHead)(headRaw),
        ...unwrappedLoopBody(body, parsed.nodes),
    };
}
// A loop body that is not one element is written inside `<>` or `<Fragment>`:
// text, an expression or several children side by side are not one JSX
// expression otherwise. The wrapper is how the body is written, not something
// the person placed, so it is unwrapped here and remembered in `fragment`,
// and the serializer writes it back. Read as a node, it stood between the loop
// and its contents in the Navigator, and what was dropped into the loop
// landed in a Fragment instead. A wrapper with attributes (`<Fragment set:html>`)
// does something, and stays a node.
function unwrappedLoopBody(body, nodes) {
    const significant = nodes.filter((node) => node.kind !== 'comment');
    const only = significant.length === 1 && nodes.length === 1 ? significant[0] : undefined;
    if (only === undefined || only.kind !== 'component' || only.name !== 'Fragment') {
        return { children: nodes };
    }
    if (Object.keys(only.props ?? {}).length > 0) {
        return { children: nodes };
    }
    const fragment = body.trimStart().startsWith('<>') ? '<>' : 'Fragment';
    const children = only.children ?? [];
    (0, assert_1.assert)(children !== nodes, 'unwrappedLoopBody: the children are the wrapper’s own');
    return { children, fragment };
}
// The same loop with no parentheses around its body — `.map((x) => <Tag/>)`,
// the shape an arrow function returning a single element is usually written in.
// The body runs to the `)` that closes `.map(`, so that paren is found rather
// than assumed. Normalized to the same node the parenthesized form produces,
// with `bare` remembering how it was written.
function tryParseBareMap(inner, base = undefined) {
    const arrow = inner.match(/^([\s\S]*?\.map\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*)</);
    if (!arrow) {
        return undefined;
    }
    const headRaw = (0, astroAttrs_1.required)(arrow[1], 'Loop header capture');
    const mapOpen = headRaw.lastIndexOf('.map(') + '.map'.length;
    const mapClose = (0, astroScan_1.findMatchingParen)(inner, mapOpen);
    if (mapClose === -1) {
        return undefined;
    }
    // After the body must come only the .map() close paren.
    if (inner.slice(mapClose + 1).trim()) {
        return undefined;
    }
    const bareBody = inner.slice(headRaw.length, mapClose);
    const parsed = parseTemplate(bareBody, base === undefined ? undefined : base + headRaw.length);
    if (!parsed.clean) {
        return undefined;
    }
    return {
        id: (0, astroAttrs_1.makeId)(),
        kind: 'map',
        head: (0, astroScan_1.normalizeHead)(headRaw + '('), // the Loop editor reads one shape
        bare: true,
        ...unwrappedLoopBody(bareBody, parsed.nodes),
    };
}
// The same loop, written with a statement body. Normalized to the same node
// the concise form produces — head ending in `=> (` so the Loop editor reads
// it unchanged — with the declarations parked in `body` for serializing back.
function tryParseBlockMap(inner, base = undefined) {
    const arrow = inner.match(/^([\s\S]*?\.map\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*)\{/);
    if (!arrow) {
        return undefined;
    }
    const headRaw = (0, astroAttrs_1.required)(arrow[1], 'Loop header capture');
    const openIndex = arrow[0].length - 1; // the arrow-body '{'
    const closeIndex = (0, astroScan_1.findMatchingBrace)(inner, openIndex);
    if (closeIndex === -1) {
        return undefined;
    }
    // After the block must come only the .map() close paren.
    if (!/^\s*\)\s*$/.test(inner.slice(closeIndex + 1))) {
        return undefined;
    }
    const split = (0, astroScan_1.splitBlockLoopBody)(inner.slice(openIndex + 1, closeIndex));
    if (!split) {
        return undefined;
    }
    const parsed = parseTemplate(split.markup, base === undefined ? undefined : base + openIndex + 1 + split.at);
    if (!parsed.clean) {
        return undefined;
    }
    return {
        id: (0, astroAttrs_1.makeId)(),
        kind: 'map',
        head: (0, astroScan_1.normalizeHead)(headRaw + '('),
        body: split.body,
        ...unwrappedLoopBody(split.markup, parsed.nodes),
    };
}
// One side of a conditional, as child nodes. `undefined` means "this isn't markup",
// which sends the whole expression back to being opaque code.
// `base` is where `raw` starts in the file, or undefined when nobody is asking for
// offsets. Trimming and peeling move that start, so it is advanced as they go —
// without it every node inside a conditional came back unplaced, and a
// component written as `{render && ( … )}` (which is most of them) could not
// turn a selection into a line range at all.
function branchNodes(raw, base = undefined) {
    const text = String(raw);
    let expression = text.trimStart();
    let at = base === undefined ? undefined : base + (text.length - expression.length);
    expression = expression.trimEnd();
    // Peel the wrapping parens the JSX convention adds: `? ( <img/> ) :`.
    while (expression.startsWith('(') && (0, astroScan_1.findMatchingParen)(expression, 0) === expression.length - 1) {
        const inner = expression.slice(1, -1);
        const trimmed = inner.trimStart();
        if (at !== undefined) {
            at += 1 + (inner.length - trimmed.length);
        }
        expression = trimmed.trimEnd();
    }
    // The ways of writing "render nothing here".
    if (expression === '' || /^(null|undefined|false|''|"")$/.test(expression)) {
        return [];
    }
    if (expression.startsWith('<')) {
        // A failed probe must not claim the page's bail message — the caller
        // falls back to an expression node and the page still parses.
        const saved = astroParseState_1.parseState.lastBail;
        const parsed = parseTemplate(expression, at);
        if (parsed.clean) {
            return parsed.nodes;
        }
        astroParseState_1.parseState.lastBail = saved;
        return undefined;
    }
    // `a ? (…) : b ? (…) : (…)` — an else-if chain, which reads as a condition
    // nested in the else branch.
    const nested = parseCondSource(expression, at);
    if (nested && at !== undefined) {
        nested.start = at;
        nested.end = at + expression.length;
    }
    return nested ? [nested] : undefined;
}
// `test ? ( … ) : ( … )` and `test && ( … )` as a structural node. Returns undefined
// for anything whose branches aren't markup (a ternary picking between two
// strings, say) — those stay code.
function parseCondSource(source, base = undefined) {
    if (astroParseState_1.parseState.conditions >= limits_1.LIMITS.treeDepthMax) {
        return undefined;
    }
    astroParseState_1.parseState.conditions++;
    try {
        return parseCondSourceBody(source, base);
    }
    finally {
        astroParseState_1.parseState.conditions--;
        (0, assert_1.assert)(astroParseState_1.parseState.conditions >= 0, 'Conditional recursion unwinds to its caller');
    }
}
function parseCondSourceBody(source, base) {
    const raw = String(source);
    const text = raw.trim();
    if (!text) {
        return undefined;
    }
    const from = base === undefined ? undefined : base + (raw.length - raw.trimStart().length);
    const ops = (0, astroScan_1.topLevelOps)(text);
    const ternary = ops.find((operator) => operator.op === '?');
    if (ternary) {
        const colon = ops.find((operator) => operator.op === ':' && operator.at > ternary.at);
        if (!colon) {
            return undefined;
        }
        const test = text.slice(0, ternary.at).trim();
        if (!test) {
            return undefined;
        }
        const thenRaw = text.slice(ternary.at + 1, colon.at);
        const elseRaw = text.slice(colon.at + 1);
        let thenKids = branchNodes(thenRaw, from === undefined ? undefined : from + ternary.at + 1);
        let elseKids = branchNodes(elseRaw, from === undefined ? undefined : from + colon.at + 1);
        // One side is markup and the other is a value — the common shape of "wrap
        // this in a link when there's somewhere to go". The value side becomes an
        // expression child rather than sending the whole conditional back to code.
        // Both sides being values (`a ? "x" : "y"`) is a value, not markup, and
        // stays as it was.
        if (thenKids && !elseKids && (0, astroParseState_1.branchIsMarkup)(thenKids)) {
            elseKids = (0, astroParseState_1.exprBranch)(elseRaw, from === undefined ? undefined : from + colon.at + 1);
        }
        else if (elseKids && !thenKids && (0, astroParseState_1.branchIsMarkup)(elseKids)) {
            thenKids = (0, astroParseState_1.exprBranch)(thenRaw, from === undefined ? undefined : from + ternary.at + 1);
        }
        if (!thenKids || !elseKids) {
            return undefined;
        }
        return {
            id: (0, astroAttrs_1.makeId)(),
            kind: 'cond',
            op: '?',
            test,
            children: [
                (0, astroParseState_1.makeBranch)('then', thenKids, thenRaw, from === undefined ? undefined : from + ternary.at + 1),
                (0, astroParseState_1.makeBranch)('else', elseKids, elseRaw, from === undefined ? undefined : from + colon.at + 1),
            ],
        };
    }
    // `a && b && (<x/>)`: everything up to the LAST && is the test.
    const ands = ops.filter((operator) => operator.op === '&&');
    const and = ands[ands.length - 1];
    if (!and) {
        return undefined;
    }
    const test = text.slice(0, and.at).trim();
    if (!test) {
        return undefined;
    }
    const thenRaw = text.slice(and.at + 2);
    const thenAt = from === undefined ? undefined : from + and.at + 2;
    const kids = branchNodes(thenRaw, thenAt);
    if (!kids || !kids.length) {
        return undefined;
    } // `x && null` is not worth a node
    return {
        id: (0, astroAttrs_1.makeId)(),
        kind: 'cond',
        op: '&&',
        test,
        children: [(0, astroParseState_1.makeBranch)('then', kids, thenRaw, thenAt)],
    };
}
// Recognizes conditional markup — {cond ? ( … ) : ( … )}, {cond && ( … )} —
// and turns it into a 'cond' node whose branches are parsed child trees, so
// each side is navigable and editable instead of a wall of code.
function tryParseMapWithSource(exprText, base = undefined) {
    const node = tryParseMap(exprText, base);
    if (node) {
        node.source = exprText;
    }
    return node;
}
function tryParseCond(exprText, base = undefined) {
    const node = parseCondSource(exprText.slice(1, -1), base === undefined ? undefined : base + 1);
    // The text it was written as. A condition that has not been edited is
    // written back exactly, rather than reflowed onto the shape this file would
    // choose — `{x && <p/>}` is not improved by becoming four lines.
    if (node) {
        node.source = exprText;
    }
    return node;
}
// Parses a template string into a node tree.
// Returns {nodes, clean}; clean=false means unrepresentable content was found.
//
// `base` is the offset of `template` within the file it was read from; pass a
// number and every node comes back tagged with `start`/`end` source offsets
// (what locateSelection turns into line numbers). The editor's own parse
// leaves it undefined on purpose: offsets describe the file as it was on disk and
// go stale the moment the model is mutated, so only a fresh parse may use them.
function parseTemplate(template, base = undefined) {
    if (typeof template !== 'string') {
        return (0, astroParseState_1.bail)([], '', 0, 'a non-string template');
    }
    if (template.length > limits_1.LIMITS.ipcFieldCharsMax) {
        return (0, astroParseState_1.bail)([], '', 0, 'a template exceeding the source limit');
    }
    if (astroParseState_1.parseState.depth > limits_1.LIMITS.treeDepthMax) {
        return (0, astroParseState_1.bail)([], template, 0, 'markup exceeding the nesting limit');
    }
    if (astroParseState_1.parseState.depth === 0) {
        astroParseState_1.parseState.nodes = 0;
    }
    astroParseState_1.parseState.depth++;
    try {
        const result = parseTemplateBody(template, base);
        if (astroParseState_1.parseState.depth === 1 && result.clean && !(0, astroParseState_1.parseTemplateWithinBounds)(result.nodes)) {
            return (0, astroParseState_1.bail)([], template, 0, 'markup exceeding the tree limits');
        }
        if (astroParseState_1.parseState.depth === 1) {
            (0, astroAttrs_1.assignPathIds)(result.nodes, '', 0); // A template on its own is a tree too.
        }
        return result;
    }
    finally {
        astroParseState_1.parseState.depth--;
        (0, assert_1.assert)(astroParseState_1.parseState.depth >= 0, 'Template recursion unwinds to its caller');
    }
}
function parseTemplateBody(template, base) {
    const nodes = [];
    let position = 0;
    // Blank lines between nodes are the author's paragraphing. They are not
    // nodes themselves — the whitespace they live in is dropped — so they are
    // counted here and carried on whatever comes next, to be written back out
    // in front of it. Without this a save closed up every gap in the file.
    let pendingBlank = 0;
    // Where whitespace-only text sat between two nodes. It carries no words, so
    // it is no node — except in an inline run, where the newline and indent
    // between `</a>` and `<span>` is the space the page shows between them. The
    // run's shape isn't known until every sibling is in, so the positions are
    // noted here and the spaces put back at the end.
    const gaps = [];
    const emit = (node) => {
        const placed = pendingBlank ? { ...node, blankBefore: pendingBlank } : node;
        pendingBlank = 0;
        nodes.push(placed);
        astroParseState_1.parseState.nodes++;
    };
    // Tags a node with its source range and returns it — a no-op when offsets
    // weren't asked for.
    const at = (node, from, to) => (0, astroParseState_1.parseTemplateAt)(node, base, from, to);
    // Searching afresh every iteration rescanned the same text once per tag
    // whenever the next brace was far away — quadratic in a brace-free region.
    let found = astroScan_1.NOT_YET_FOUND;
    while (position < template.length) {
        if (astroParseState_1.parseState.nodes >= limits_1.LIMITS.treeNodesMax) {
            return (0, astroParseState_1.bail)(nodes, template, position, 'markup exceeding the node limit');
        }
        found = (0, astroScan_1.nextDelimiters)(template, position, found);
        const { lt, br, next } = found;
        // Trailing / inter-tag text. Boundary whitespace collapses to a single
        // space rather than vanishing — "people <strong>" must keep its space
        // (HTML renders a newline+indent boundary as one space too).
        const textEnd = next === -1 ? template.length : next;
        const text = template.slice(position, textEnd);
        if (!text.trim() && text) {
            // Whitespace only: no node, but remember any blank line inside it.
            const breaks = (text.match(/\n/g) || []).length;
            if (breaks > 1) {
                pendingBlank = Math.max(pendingBlank, breaks - 1);
            }
            if (nodes.length) {
                gaps.push({ index: nodes.length, from: position, to: textEnd });
            }
        }
        if (text.trim()) {
            // `source` when the collapsed value isn't the whole truth: a slice that
            // spans lines (the serializer hands those lines back if nothing has
            // edited the node since), and one written with entities in it — `&copy;`
            // and `©` are the same character to a reader and not to a diff, and the
            // file's own spelling is the file's to keep.
            const node = { id: (0, astroAttrs_1.makeId)(), kind: 'text', value: (0, htmlText_1.textValue)(text) };
            if (text.includes('\n') || /&[#a-zA-Z]/.test(text)) {
                node.source = text;
            }
            emit(at(node, position, textEnd));
        }
        if (next === -1) {
            break;
        }
        // {expression} — a recognized .map() becomes a structural loop node and a
        // recognized ternary/&& becomes a condition; anything else is kept
        // verbatim as an opaque node (may contain JSX).
        if (next === br && (lt === -1 || br < lt)) {
            const close = (0, astroScan_1.findMatchingBrace)(template, br);
            if (close === -1) {
                return (0, astroParseState_1.bail)(nodes, template, br, 'an unclosed { … } expression');
            }
            const exprText = template.slice(br, close + 1);
            // `{/* … */}` is a comment that happens to be written the way markup
            // requires inside JSX. It is the same thing as `<!-- … -->` to everyone
            // reading the file — and to this app, where a comment above a node is
            // that node's note — so it is one here too, remembering which of the two
            // forms it was written in so it goes back the same way.
            const node = parseTemplateExpression(exprText, base === undefined ? undefined : base + br);
            emit(at(node, br, close + 1));
            position = close + 1;
            continue;
        }
        const tag = parseTemplateMarkup(template, lt, base);
        switch (tag.kind) {
            case 'bail':
                return (0, astroParseState_1.bail)(nodes, template, lt, tag.what);
            case 'child-bail':
                return { nodes, clean: false };
            case 'tag':
                emit(tag.node);
                position = tag.end;
                break;
        }
    }
    // The gaps that turned out to be inside an inline run become the single
    // space a browser renders them as. Without this, editing anything in
    // `<a>Docs</a> <span>/</span>` — which the serializer writes back as one
    // line — closed the words up into `Docs/`, on the page as well as in the
    // panel. A gap after the last node is the indent before the closing tag and
    // renders as nothing, so it is left out.
    parseTemplateGaps(nodes, gaps, base);
    return { nodes, clean: true, trailingBlank: pendingBlank };
}
function parseTemplateTag(template, lt, base) {
    const shorthand = template.startsWith('<>', lt);
    const match = shorthand ? { full: '<>', name: 'Fragment', attrs: '', selfClose: '' } : (0, astroTag_1.scanTag)(template, lt);
    if (!match) {
        return { kind: 'bail', what: 'a stray < or unclosed tag attribute' };
    }
    const { full, name, attrs, selfClose } = match;
    const isComponent = /^[A-Z]/.test(name);
    const kind = isComponent ? 'component' : 'element';
    const afterOpen = lt + full.length;
    if (selfClose === '/' || (!isComponent && astroAttrs_1.VOID_ELEMENTS.has(name.toLowerCase()))) {
        return {
            kind: 'tag',
            node: (0, astroParseState_1.parseTemplateAt)({
                id: (0, astroAttrs_1.makeId)(),
                kind,
                name,
                ...(0, astroAttrs_1.tagProps)(attrs, base === undefined ? undefined : base + lt + 1 + name.length),
                ...(attrs && attrs.includes('\n') ? { attrSource: attrs } : {}),
                // `<x/>` and `<x />` mean the same thing and are not the same text.
                ...(selfClose === '/' && !/\s\/>$/.test(full) ? { tightClose: true } : {}),
                children: undefined,
            }, base, lt, afterOpen),
            end: afterOpen,
        };
    }
    // <style>/<script>: capture inner verbatim, no parsing.
    if (!isComponent && astroAttrs_1.RAW_ELEMENTS.has(name.toLowerCase())) {
        const close = template.indexOf(`</${name}`, afterOpen);
        if (close === -1) {
            return { kind: 'bail', what: `an unclosed <${name}> block` };
        }
        const closeEnd = template.indexOf('>', close);
        if (closeEnd === -1) {
            return { kind: 'bail', what: `an unclosed <${name}> block` };
        }
        return {
            kind: 'tag',
            node: (0, astroParseState_1.parseTemplateAt)({
                id: (0, astroAttrs_1.makeId)(),
                kind: 'raw',
                name,
                ...(0, astroAttrs_1.tagProps)(attrs, base === undefined ? undefined : base + lt + 1 + name.length),
                ...(attrs && attrs.includes('\n') ? { attrSource: attrs } : {}),
                inner: template.slice(afterOpen, close),
            }, base, lt, closeEnd + 1),
            end: closeEnd + 1,
        };
    }
    return parseTemplateTagPaired({ template, lt, base, name, attrs, afterOpen, shorthand, kind });
}
function parseTemplateExpression(exprText, base) {
    const jsxComment = exprText.match(/^\{\s*\/\*([\s\S]*?)\*\/\s*\}$/);
    if (jsxComment) {
        return {
            id: (0, astroAttrs_1.makeId)(),
            kind: 'comment',
            value: (0, astroAttrs_1.required)(jsxComment[1], 'JSX comment capture'),
            jsx: true,
        };
    }
    const structural = tryParseMapWithSource(exprText, base) || tryParseCond(exprText, base);
    return structural || { id: (0, astroAttrs_1.makeId)(), kind: 'expr', value: exprText };
}
function parseTemplateMarkup(template, lt, base) {
    if (template.startsWith('<!--', lt)) {
        const end = template.indexOf('-->', lt + 4);
        if (end === -1) {
            return { kind: 'bail', what: 'an unclosed <!-- comment' };
        }
        return {
            kind: 'tag',
            end: end + 3,
            node: (0, astroParseState_1.parseTemplateAt)({
                id: (0, astroAttrs_1.makeId)(),
                kind: 'comment',
                value: template.slice(lt + 4, end),
            }, base, lt, end + 3),
        };
    }
    if (/^<!doctype/i.test(template.slice(lt))) {
        const end = template.indexOf('>', lt);
        if (end === -1) {
            return { kind: 'bail', what: 'an unclosed <!doctype>' };
        }
        return {
            kind: 'tag',
            end: end + 1,
            node: (0, astroParseState_1.parseTemplateAt)({
                id: (0, astroAttrs_1.makeId)(),
                kind: 'raw-line',
                value: template.slice(lt, end + 1),
            }, base, lt, end + 1),
        };
    }
    return parseTemplateTag(template, lt, base);
}
// Each gap keeps the whitespace it stands for as its source range, so a
// located parse places it like any other node.
function parseTemplateGaps(nodes, gaps, base) {
    if (gaps.length && (0, astroSerialize_1.isInlineRun)(nodes, 0)) {
        for (let i = gaps.length - 1; i >= 0; i--) {
            const gap = (0, astroAttrs_1.required)(gaps[i], 'Inline gap index is in bounds');
            if (gap.index >= nodes.length) {
                continue;
            }
            const space = { id: (0, astroAttrs_1.makeId)(), kind: 'text', value: ' ' };
            nodes.splice(gap.index, 0, (0, astroParseState_1.parseTemplateAt)(space, base, gap.from, gap.to));
        }
    }
}
function parseTemplateTagPaired(open) {
    const { template, lt, base, name, attrs, afterOpen, shorthand, kind } = open;
    const closeIndex = shorthand ? (0, astroScan_1.findMatchingFragmentClose)(template, afterOpen) : (0, astroScan_1.findMatchingClose)(template, afterOpen, name);
    if (closeIndex === -1) {
        return { kind: 'bail', what: `an unclosed <${shorthand ? '' : name}> tag` };
    }
    const inner = template.slice(afterOpen, closeIndex);
    const innerResult = parseTemplate(inner, base === undefined ? undefined : base + afterOpen);
    if (!innerResult.clean) {
        return { kind: 'child-bail' };
    } // the inner frame recorded the cause
    // A run written across several lines keeps its raw inner. The tree can't
    // hold it: whitespace-only text between the tags is dropped, so the break
    // before a closing tag exists nowhere else, and the serializer needs it to
    // put a hand-wrapped paragraph back the way it found it.
    const source = inner.includes('\n') && ((0, astroSerialize_1.isInlineRun)(innerResult.nodes, 0) || innerResult.nodes.length === 0) ? inner : undefined;
    const blankAfter = innerResult.trailingBlank || 0;
    // The close tag may contain whitespace: </Name >
    const closeEnd = template.indexOf('>', closeIndex) + 1;
    // Kept when it is written across lines — the style that hangs the bracket
    // on its own line, which several formatters produce and which is not this
    // file's to undo.
    const closeText = template.slice(closeIndex, closeEnd);
    return {
        kind: 'tag',
        node: (0, astroParseState_1.parseTemplateAt)({
            id: (0, astroAttrs_1.makeId)(),
            kind,
            name,
            ...(shorthand ? { shorthand: true } : {}),
            ...(source === undefined ? {} : { source }),
            ...(blankAfter ? { blankAfter } : {}),
            ...(0, astroAttrs_1.tagProps)(attrs, base === undefined || shorthand ? undefined : base + lt + 1 + name.length),
            ...(attrs && attrs.includes('\n') ? { attrSource: attrs } : {}),
            ...(closeText.includes('\n') ? { closeSource: closeText } : {}),
            children: innerResult.nodes,
        }, base, lt, closeEnd),
        end: closeEnd,
    };
}
