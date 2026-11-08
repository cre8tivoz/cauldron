"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readComponentProperties = readComponentProperties;
exports.editPropertyDefinition = editPropertyDefinition;
const propertyOrigins_1 = require("./propertyOrigins");
const propertyContracts_1 = require("./propertyContracts");
const propModelSchema_1 = require("../../shared/properties/propModelSchema");
const readPropModel_1 = require("../parse/propModel/readPropModel");
const propertyTypes_1 = require("./propertyTypes");
const propertyRename_1 = require("./propertyRename");
const typescript_1 = __importDefault(require("typescript"));
const assert_1 = require("../../shared/core/assert");
const propertyEditing_1 = require("../../shared/properties/propertyEditing");
const result_1 = require("../../shared/core/result");
const propertySyntax_1 = require("./propertySyntax");
const propertyMemberEdits_1 = require("./propertyMemberEdits");
function readComponentProperties(source) {
    const definitions = readDefinitions(source);
    const origins = (0, propertyOrigins_1.readPropertyOrigins)(definitions.document);
    const fields = readDefinitionFields(definitions);
    const contracts = (0, propertyContracts_1.readPropertyContracts)(definitions.document);
    return {
        source,
        properties: [...fields.values()].map((property) => sourcedProperty(property, definitions, origins, contracts)),
        frontmatter: definitions.document.frontmatter,
        advanced: definitions.advanced,
    };
}
function readDefinitionFields(definitions) {
    const fields = new Map();
    const names = new Set([
        ...definitions.members.map((member) => (0, propertySyntax_1.propertyKey)(member.name)),
        ...definitions.bindings.map((binding) => (0, propertySyntax_1.propertyKey)(binding.propertyName ?? binding.name)),
    ]);
    // The list starts from the prop model, the reader every panel shares, so a
    // prop the instance panel offers is one this panel lists. A simple
    // component's own members and bindings are what it edits; a prop the code
    // only reads (`Astro.props.label`, with no type and no destructure) is
    // listed too, so it can be given a type or a default here.
    const model = (0, readPropModel_1.readPropModel)(definitions.document.source);
    for (const field of (0, propModelSchema_1.schemaFieldsOf)(model)) {
        const prop = model.props.find((entry) => entry.name === field.name);
        (0, assert_1.assert)(prop !== undefined, 'Every schema field has its prop');
        if (!definitions.advanced && !names.has(field.name) && prop.declared) {
            continue;
        }
        fields.set(field.name, {
            name: field.name,
            type: schemaPropertyType(field),
            required: !field.optional,
            readonly: false,
            defaultValue: '',
            description: field.doc ?? '',
        });
    }
    for (const member of definitions.members) {
        const name = (0, propertySyntax_1.propertyKey)(member.name);
        if (!name) {
            continue;
        }
        fields.set(name, {
            name,
            type: member.type ? definitions.readType(member.type) : 'unknown',
            required: member.questionToken === undefined,
            readonly: member.modifiers?.some((modifier) => modifier.kind === typescript_1.default.SyntaxKind.ReadonlyKeyword) ?? false,
            defaultValue: '',
            description: readDescription(member, definitions.document.frontmatter),
        });
    }
    for (const binding of definitions.bindings) {
        const name = (0, propertySyntax_1.propertyKey)(binding.propertyName ?? binding.name);
        if (!name) {
            continue;
        }
        const previous = fields.get(name);
        fields.set(name, {
            name,
            type: previous?.type ?? 'unknown',
            required: previous?.required ?? false,
            readonly: previous?.readonly ?? false,
            description: previous?.description ?? '',
            defaultValue: binding.initializer?.getText() ?? '',
        });
    }
    (0, assert_1.assert)(fields.size <= propertyEditing_1.PROPERTY_LIMITS.fieldsMax, 'Component field count is bounded');
    (0, assert_1.assert)(new Set(fields.keys()).size === fields.size, 'Component property names are unique');
    return fields;
}
function schemaPropertyType(field) {
    if (field.type === 'enum' && field.options?.length) {
        return field.options.map((value) => (field.numeric ? value : JSON.stringify(value))).join(' | ');
    }
    return ['enum', 'other', 'code', 'attrs', 'slot', 'style'].includes(field.type) ? 'unknown' : field.type || 'unknown';
}
function sourcedProperty(property, definitions, origins, contracts) {
    const binding = definitions.bindings.find((item) => (0, propertySyntax_1.propertyKey)(item.propertyName ?? item.name) === property.name);
    const types = (origins.members.get(property.name) ?? [])
        .flatMap((member) => (member.type ? [definitions.readType(member.type)] : []))
        .filter((type) => type !== 'never');
    const member = contracts.editable.get(property.name);
    return {
        ...property,
        ...(member
            ? {
                required: member.questionToken === undefined,
                readonly: member.modifiers?.some((item) => item.kind === typescript_1.default.SyntaxKind.ReadonlyKeyword) ?? false,
                description: readDescription(member, definitions.document.frontmatter),
            }
            : {}),
        type: definitions.advanced && types.length ? [...new Set(types)].join(' | ') : property.type,
        origin: origins.origin(property.name, binding),
        editing: definitions.advanced
            ? contractEditing(definitions, contracts, property.name)
            : {
                kind: 'editable',
            },
        conditions: contracts.conditions(property.name),
    };
}
function contractEditing(definitions, contracts, name) {
    if (definitions.patterns.length > 1 || definitions.bindings.some((binding) => !typescript_1.default.isIdentifier(binding.name))) {
        return {
            kind: 'restricted',
            reason: 'This prop uses complex destructuring. Edit it in source.',
        };
    }
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
        return { kind: 'restricted', reason: 'This prop uses a quoted name. Edit it in source.' };
    }
    const editing = contracts.editing(name);
    if (editing.kind === 'override' && !definitions.container) {
        return {
            kind: 'restricted',
            reason: 'This inherited prop has no unambiguous local declaration to update.',
        };
    }
    return editing;
}
function editPropertyDefinition(source, change) {
    const definitions = readDefinitions(source);
    if (change.kind === 'source') {
        const error = (0, propertySyntax_1.syntaxError)(change.frontmatter);
        if (error) {
            return (0, result_1.err)({ code: 'syntax', message: error });
        }
        return (0, result_1.ok)((0, propertySyntax_1.replaceFrontmatter)(definitions.document, change.frontmatter.replace(/\s*$/, '\n')));
    }
    if (definitions.advanced) {
        return editCommonDefinition(definitions, change);
    }
    if (change.kind === 'order') {
        return reorderDefinitions(definitions, change.names);
    }
    if (change.kind === 'options') {
        return saveDefinitionOptions(definitions, change.name, change.type);
    }
    if (change.kind === 'remove') {
        return removeDefinition(definitions, change.name);
    }
    return saveDefinition(definitions, change.originalName, change.property);
}
function editCommonDefinition(definitions, change) {
    if (change.kind === 'order' || (change.kind === 'save' && !change.originalName)) {
        return (0, result_1.err)({
            code: 'advanced',
            message: 'Add or reorder declarations in this combined type in source.',
        });
    }
    const name = change.kind === 'save' ? change.originalName : change.name;
    // Renderer permissions are descriptive only; every write rechecks the current source.
    const contracts = (0, propertyContracts_1.readPropertyContracts)(definitions.document);
    const access = contractEditing(definitions, contracts, name);
    if (access.kind === 'restricted') {
        return (0, result_1.err)({ code: 'restricted', message: access.reason });
    }
    if (access.kind === 'override') {
        if (change.kind === 'remove') {
            return (0, result_1.err)({ code: 'inherited', message: 'Inherited HTML attributes cannot be deleted.' });
        }
        if (change.kind === 'save' && change.property.name !== name) {
            return (0, result_1.err)({ code: 'inherited', message: 'Inherited HTML attributes cannot be renamed.' });
        }
        return change.kind === 'options' ? saveDefinitionOptions(definitions, name, change.type) : saveDefinition(definitions, name, change.property);
    }
    const member = contracts.editable.get(name);
    (0, assert_1.assert)(member !== undefined, 'An editable common property has a declaration');
    (0, assert_1.assert)((0, propertySyntax_1.propertyKey)(member.name) === name, 'The edit targets the requested declaration');
    const common = { ...definitions, members: [member] };
    if (change.kind === 'remove') {
        return removeDefinition(common, name);
    }
    if (change.kind === 'options') {
        return saveDefinitionOptions(common, name, change.type);
    }
    return saveDefinition(common, name, change.property);
}
function readDefinitions(source) {
    const document = (0, propertySyntax_1.readPropertySyntax)(source);
    const declarations = document.syntax.statements.filter((statement) => (typescript_1.default.isInterfaceDeclaration(statement) || typescript_1.default.isTypeAliasDeclaration(statement)) && statement.name.text === 'Props');
    const declaration = declarations[0];
    // With no Props declaration, a destructure annotated inline
    // (`const { title }: { title: string } = Astro.props`) is the props' type.
    const container = definitionContainer(declaration) ?? (declarations.length === 0 ? annotationContainer(document.syntax) : undefined);
    const members = container?.members.filter(typescript_1.default.isPropertySignature) ?? [];
    const patterns = (0, propertySyntax_1.syntaxNodes)(document.syntax)
        .filter(typescript_1.default.isVariableDeclaration)
        .filter((node) => (0, propertySyntax_1.isAstroProps)(node.initializer))
        .map((node) => node.name)
        .filter(typescript_1.default.isObjectBindingPattern);
    const bindings = patterns.flatMap((pattern) => pattern.elements).filter((binding) => !binding.dotDotDotToken);
    const typedProps = (0, propertySyntax_1.syntaxNodes)(document.syntax).some((node) => typescript_1.default.isAsExpression(node) && (0, propertySyntax_1.isAstroProps)(node.expression) && node.type.getText() !== 'Props');
    const imported = document.syntax.statements.some((statement) => typescript_1.default.isImportDeclaration(statement) && statement.importClause?.getText().match(/\bProps\b/));
    const advanced = declarations.length > 1 ||
        imported ||
        typedProps ||
        (declaration !== undefined && typescript_1.default.isTypeAliasDeclaration(declaration) && declaration.typeParameters !== undefined) ||
        (declaration !== undefined && typescript_1.default.isTypeAliasDeclaration(declaration) && !typescript_1.default.isTypeLiteralNode(declaration.type)) ||
        (container !== undefined && container.members.length !== members.length) ||
        (container !== undefined && typescript_1.default.isInterfaceDeclaration(container) && container.typeParameters !== undefined) ||
        members.some((member) => !/^[A-Za-z_$][\w$]*$/.test((0, propertySyntax_1.propertyKey)(member.name) ?? '')) ||
        bindings.some((binding) => !typescript_1.default.isIdentifier(binding.name)) ||
        patterns.length > 1;
    return {
        document,
        readType: (0, propertyTypes_1.createPropertyTypeReader)(document.syntax),
        members,
        patterns,
        bindings,
        container,
        advanced,
    };
}
function annotationContainer(syntax) {
    const annotated = (0, propertySyntax_1.syntaxNodes)(syntax)
        .filter(typescript_1.default.isVariableDeclaration)
        .filter((node) => (0, propertySyntax_1.isAstroProps)(node.initializer) && typescript_1.default.isObjectBindingPattern(node.name));
    const type = annotated.length === 1 ? annotated[0]?.type : undefined;
    return type !== undefined && typescript_1.default.isTypeLiteralNode(type) ? type : undefined;
}
function definitionContainer(declaration) {
    if (!declaration || typescript_1.default.isInterfaceDeclaration(declaration)) {
        return declaration;
    }
    if (typescript_1.default.isTypeLiteralNode(declaration.type)) {
        return declaration.type;
    }
    if (!typescript_1.default.isIntersectionTypeNode(declaration.type)) {
        return undefined;
    }
    const literals = declaration.type.types.filter(typescript_1.default.isTypeLiteralNode);
    return literals.length === 1 ? literals[0] : undefined;
}
function readDescription(member, source) {
    return (0, propertyMemberEdits_1.memberComment)(source, member)?.description ?? '';
}
function renderDefinition(property) {
    const documentation = property.description.trim();
    const description = documentation ? `  /** ${documentation.replace(/\*\//g, '* /').replace(/\n/g, '\n   * ')} */\n` : '';
    return `\n${description}  ${property.readonly ? 'readonly ' : ''}${property.name}` + `${property.required ? '' : '?'}: ${property.type};`;
}
function saveDefinition(definitions, originalName, property) {
    const valid = (0, propertySyntax_1.validatePropertyCode)(property.type, property.defaultValue);
    if (!valid.ok) {
        return valid;
    }
    const snapshot = readComponentProperties(definitions.document.source);
    const previous = originalName ? snapshot.properties.find((field) => field.name === originalName) : undefined;
    if (originalName && previous === undefined) {
        return (0, result_1.err)({ code: 'missing', message: 'This property no longer exists. Reload the panel.' });
    }
    if (originalName !== property.name && snapshot.properties.some((field) => field.name === property.name)) {
        return (0, result_1.err)({ code: 'duplicate', message: `A property named ${property.name} already exists.` });
    }
    if (!originalName && snapshot.properties.length >= propertyEditing_1.PROPERTY_LIMITS.fieldsMax) {
        return (0, result_1.err)({ code: 'limit', message: 'The component property limit has been reached.' });
    }
    // A save that changes nothing writes nothing: the file is the author's.
    if (previous !== undefined && (0, propertyMemberEdits_1.sameProperty)(previous, property)) {
        return (0, result_1.ok)(definitions.document.source);
    }
    const declaration = declarationEdits(definitions, originalName, previous, property);
    if (!declaration.ok) {
        return declaration;
    }
    const binding = saveDefinitionBinding(definitions, originalName, previous, property);
    if (!binding.ok) {
        return binding;
    }
    const frontmatter = (0, propertySyntax_1.applySourceEdits)(definitions.document.frontmatter, [...declaration.value, ...binding.value]);
    const error = (0, propertySyntax_1.syntaxError)(frontmatter);
    if (error) {
        return (0, result_1.err)({ code: 'syntax', message: error });
    }
    const output = (0, propertySyntax_1.replaceFrontmatter)(definitions.document, frontmatter);
    (0, assert_1.assert)(output !== definitions.document.source || previous === undefined || !(0, propertyMemberEdits_1.sameProperty)(previous, property), 'A changed save writes its change');
    const defaultChanged = property.defaultValue.trim() !== (previous?.defaultValue.trim() ?? '');
    if (property.defaultValue.trim() && defaultChanged) {
        const local = definitions.bindings.find((item) => (0, propertySyntax_1.propertyKey)(item.propertyName ?? item.name) === originalName)?.name.getText() ?? property.name;
        return (0, propertyRename_1.bindComponentDefault)(output, originalName || property.name, local);
    }
    return (0, result_1.ok)(output);
}
// The type side of a save: the member's own text edited in place, a member
// appended to the type the file already has, or (for a component with no
// types at all) a new `interface Props`. A component that types its props
// another way, or forwards attributes through an untyped `...rest`, is never
// given an interface: one would contradict its types or reject the attributes.
function declarationEdits(definitions, originalName, previous, property) {
    const member = definitions.members.find((item) => (0, propertySyntax_1.propertyKey)(item.name) === originalName);
    if (member) {
        (0, assert_1.assert)(previous !== undefined, 'A declared member was read before its save');
        return (0, result_1.ok)((0, propertyMemberEdits_1.memberEdits)(definitions.document.frontmatter, member, previous, property));
    }
    if (previous !== undefined && (0, propertyMemberEdits_1.sameDeclaration)(previous, property)) {
        return (0, result_1.ok)([]);
    }
    if (definitions.container) {
        return (0, result_1.ok)([{ start: definitions.container.end - 1, end: definitions.container.end - 1, text: renderDefinition(property) + '\n' }]);
    }
    if (previous === undefined && LOOSE_TYPES.has(property.type.trim()) && !property.description.trim() && !property.required && !property.readonly) {
        // A new prop that states nothing a type would carry needs only its destructure entry.
        return (0, result_1.ok)([]);
    }
    const reason = untypedReason(definitions);
    if (reason !== undefined) {
        return (0, result_1.err)({ code: 'untyped', message: reason });
    }
    const snapshot = readComponentProperties(definitions.document.source);
    // The new interface lists the props in the order the panel shows them, the saved one in its place.
    const fields = previous === undefined ? [...snapshot.properties, property] : snapshot.properties.map((field) => (field.name === originalName ? property : field));
    return (0, result_1.ok)([{ start: 0, end: 0, text: `interface Props {${fields.map(renderDefinition).join('')}\n}\n` }]);
}
const LOOSE_TYPES = new Set(['', 'unknown']);
// Why a component without a Props declaration cannot be given one, if it cannot.
function untypedReason(definitions) {
    const annotated = (0, propertySyntax_1.syntaxNodes)(definitions.document.syntax)
        .filter(typescript_1.default.isVariableDeclaration)
        .find((node) => (0, propertySyntax_1.isAstroProps)(node.initializer) && node.type !== undefined);
    if (annotated?.type !== undefined) {
        return `This component types its props as ${annotated.type.getText()}. Change the prop's type there.`;
    }
    if (definitions.patterns.some((pattern) => pattern.elements.some((element) => element.dotDotDotToken !== undefined))) {
        return 'This component passes other attributes on with ...rest and has no Props type; a Props type would have to list every attribute it forwards. Set this prop in source.';
    }
    return undefined;
}
function saveDefinitionOptions(definitions, name, type) {
    const property = readComponentProperties(definitions.document.source).properties.find((field) => field.name === name);
    if (!property) {
        return (0, result_1.err)({ code: 'missing', message: 'This property no longer exists. Reload the panel.' });
    }
    (0, assert_1.assert)(property.name === name, 'Option reorder targets the requested property');
    (0, assert_1.assert)(type.length <= propertyEditing_1.PROPERTY_LIMITS.textCharsMax, 'Option type is bounded');
    return saveDefinition(definitions, name, { ...property, type });
}
function saveDefinitionBinding(definitions, originalName, previous, property) {
    const binding = definitions.bindings.find((item) => (0, propertySyntax_1.propertyKey)(item.propertyName ?? item.name) === originalName);
    if (binding) {
        (0, assert_1.assert)(previous !== undefined, 'A destructured prop was read before its save');
        // Keep the lexical binding: aliases prevent accidental edits to shadowed locals in templates.
        return (0, result_1.ok)((0, propertyMemberEdits_1.bindingEdits)(binding, previous, property));
    }
    const fallback = property.defaultValue.trim() ? ` = ${(0, propertySyntax_1.defaultExpression)(property.defaultValue.trim())}` : '';
    if (!fallback && originalName) {
        return (0, result_1.ok)([]);
    }
    const locals = (0, propertySyntax_1.syntaxNodes)(definitions.document.syntax).filter(typescript_1.default.isIdentifier);
    if (locals.some((node) => node.text === property.name && !typescript_1.default.isPropertySignature(node.parent))) {
        return (0, result_1.err)({
            code: 'binding',
            message: `The name ${property.name} is already in scope. ` + 'Add an aliased default in TypeScript source.',
        });
    }
    const pattern = definitions.patterns[0];
    if (pattern) {
        const first = pattern.elements[0];
        const position = first?.getStart() ?? pattern.end - 1;
        return (0, result_1.ok)([{ start: position, end: position, text: `${property.name}${fallback}${first ? ', ' : ''}` }]);
    }
    const position = definitions.document.frontmatter.length;
    return (0, result_1.ok)([
        {
            start: position,
            end: position,
            text: `\nconst { ${property.name}${fallback} } = Astro.props;\n`,
        },
    ]);
}
function reorderDefinitions(definitions, names) {
    const fields = readComponentProperties(definitions.document.source).properties;
    if (new Set(names).size !== names.length || names.length !== fields.length || names.some((name) => !fields.some((field) => field.name === name))) {
        return (0, result_1.err)({
            code: 'order',
            message: 'Reorder must include every declared property exactly once.',
        });
    }
    const chunks = new Map(fields.map((field) => [field.name, renderDefinition(field)]));
    for (const member of definitions.members) {
        const name = (0, propertySyntax_1.propertyKey)(member.name);
        (0, assert_1.assert)(name !== undefined, 'Editable property has a name');
        chunks.set(name, definitions.document.frontmatter.slice(member.getFullStart(), member.end));
    }
    const text = names
        .map((name) => {
        const chunk = chunks.get(name);
        (0, assert_1.assert)(chunk !== undefined, 'Every reordered property has source');
        return chunk;
    })
        .join('');
    const container = definitions.container;
    if (!container) {
        const reason = untypedReason(definitions);
        if (reason !== undefined) {
            return (0, result_1.err)({ code: 'untyped', message: reason });
        }
        return (0, result_1.ok)((0, propertySyntax_1.replaceFrontmatter)(definitions.document, `interface Props {${text}\n}\n${definitions.document.frontmatter}`));
    }
    const first = definitions.members[0];
    const last = definitions.members.at(-1);
    return (0, result_1.ok)((0, propertySyntax_1.replaceFrontmatter)(definitions.document, (0, propertySyntax_1.applySourceEdits)(definitions.document.frontmatter, [
        {
            start: first?.getFullStart() ?? container.end - 1,
            end: last?.end ?? container.end - 1,
            text,
        },
    ])));
}
function removeDefinition(definitions, name) {
    const member = definitions.members.find((item) => (0, propertySyntax_1.propertyKey)(item.name) === name);
    const binding = definitions.bindings.find((item) => (0, propertySyntax_1.propertyKey)(item.propertyName ?? item.name) === name);
    if (!member && !binding) {
        return (0, result_1.err)({ code: 'missing', message: 'Property not found.' });
    }
    const edits = member ? [{ start: member.getFullStart(), end: member.end, text: '' }] : [];
    if (binding) {
        const pattern = definitions.patterns.find((item) => item.elements.includes(binding));
        (0, assert_1.assert)(pattern !== undefined, 'A prop binding belongs to an Astro.props pattern');
        const index = pattern.elements.indexOf(binding);
        const next = pattern.elements[index + 1];
        const previous = pattern.elements[index - 1];
        edits.push({
            start: next ? binding.getStart() : (previous?.end ?? binding.getStart()),
            end: next?.getStart() ?? binding.end,
            text: '',
        });
    }
    const frontmatter = (0, propertySyntax_1.applySourceEdits)(definitions.document.frontmatter, edits);
    const output = (0, propertySyntax_1.replaceFrontmatter)(definitions.document, frontmatter);
    const local = binding?.name.getText() ?? name;
    // Conservative mention detection is deliberate: removing a live lexical binding
    // breaks rendering, while a false positive can still be resolved in source.
    const escaped = local.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^\\w$])${escaped}([^\\w$]|$)`).test(output)) {
        return (0, result_1.err)({
            code: 'in-use',
            message: 'This property is still referenced. Remove its component usages before deleting it.',
        });
    }
    return (0, result_1.ok)(output);
}
