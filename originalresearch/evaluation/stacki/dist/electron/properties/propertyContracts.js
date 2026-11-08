"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPropertyContracts = readPropertyContracts;
const typescript_1 = __importDefault(require("typescript"));
const assert_1 = require("../../shared/core/assert");
const propertyEditing_1 = require("../../shared/properties/propertyEditing");
const propertySyntax_1 = require("./propertySyntax");
// A common member must be the same declaration in both the public contract and
// the runtime assertion. Editing it then preserves every variant and runtime type.
function readPropertyContracts(document) {
    const declarations = new Map();
    for (const statement of document.syntax.statements) {
        if (typescript_1.default.isTypeAliasDeclaration(statement) || typescript_1.default.isInterfaceDeclaration(statement)) {
            if (declarations.has(statement.name.text)) {
                return unavailableContracts('Duplicate type declarations require editing in source.');
            }
            declarations.set(statement.name.text, statement);
        }
    }
    const assertions = (0, propertySyntax_1.syntaxNodes)(document.syntax)
        .filter(typescript_1.default.isAsExpression)
        .filter((node) => (0, propertySyntax_1.isAstroProps)(node.expression));
    const attributes = htmlAttributeImports(document.syntax);
    const imports = importedTypeNames(document.syntax);
    const publicContract = readContract(declarations.get('Props'), declarations, attributes, imports);
    const runtimeContracts = assertions.map((node) => readContract(node.type, declarations, attributes, imports));
    const contracts = [publicContract, ...runtimeContracts];
    const editable = new Map();
    const reasons = new Map();
    for (const [name, usages] of publicContract.members) {
        const member = usages[0]?.member;
        (0, assert_1.assert)(member !== undefined, 'Contract field has a declaration');
        const reason = commonMemberRestriction(name, publicContract, runtimeContracts);
        if (reason) {
            reasons.set(name, reason);
        }
        else {
            editable.set(name, member);
        }
    }
    (0, assert_1.assert)(editable.size <= propertyEditing_1.PROPERTY_LIMITS.fieldsMax, 'Editable contract fields are bounded');
    return {
        names: new Set(contracts.flatMap((contract) => [...contract.names])),
        editable,
        editing: (name) => editable.has(name)
            ? { kind: 'editable' }
            : inheritedAttributeCanOverride(name, contracts)
                ? {
                    kind: 'override',
                    reason: 'This HTML attribute will be declared locally when you save it.',
                }
                : {
                    kind: 'restricted',
                    reason: reasons.get(name) ?? 'This prop is inherited or imported. Edit its declaration in source.',
                },
        conditions: (name) => contractConditions(publicContract, name),
    };
}
function unavailableContracts(reason) {
    return {
        names: new Set(),
        editable: new Map(),
        editing: () => ({ kind: 'restricted', reason }),
        conditions: () => [],
    };
}
function inheritedAttributeCanOverride(name, contracts) {
    const publicContract = contracts[0];
    if (!publicContract?.inheritedAttributes) {
        return false;
    }
    return contracts.every((contract) => contract.inheritedAttributes && !contract.members.has(name));
}
function commonMemberRestriction(name, contract, runtimeContracts) {
    const usages = contract.members.get(name) ?? [];
    if (usages.some((usage) => usage.conditional)) {
        return 'This prop has variant rules. Edit its declaration in source to preserve those rules.';
    }
    if (new Set(usages.map((usage) => usage.member)).size !== 1) {
        return 'This prop combines multiple declarations. Edit those declarations in source.';
    }
    if (!contract.complete) {
        return 'This prop depends on a shared or computed type that must be edited in source.';
    }
    const member = usages[0]?.member;
    for (const runtime of runtimeContracts) {
        const matches = runtime.members.get(name) ?? [];
        if (!runtime.complete || matches.length === 0 || matches.some((match) => match.member !== member || match.conditional)) {
            return 'This prop has a separate runtime type. Edit both declarations together in source.';
        }
    }
    return undefined;
}
function readContract(root, declarations, attributes, imports) {
    const work = root ? [{ node: root, conditional: false, path: [] }] : [];
    const members = new Map();
    const names = new Set();
    const branches = [];
    let complete = root !== undefined;
    let inheritedAttributes = false;
    for (let count = 0; count < propertyEditing_1.PROPERTY_LIMITS.nodesMax && work.length > 0; count++) {
        const item = work.pop();
        (0, assert_1.assert)(item !== undefined, 'Contract traversal has a work item');
        inheritedAttributes ||= isInheritedAstroAttributes(item.node, declarations, attributes);
        if (typescript_1.default.isPropertySignature(item.node)) {
            const name = (0, propertySyntax_1.propertyKey)(item.node.name);
            if (name) {
                const usages = members.get(name) ?? [];
                (0, assert_1.assert)(usages.length < propertyEditing_1.PROPERTY_LIMITS.fieldsMax, 'Contract field usages are bounded');
                members.set(name, [...usages, { member: item.node, conditional: item.conditional }]);
            }
        }
        else {
            if (typescript_1.default.isTypeAliasDeclaration(item.node) || typescript_1.default.isInterfaceDeclaration(item.node)) {
                names.add(item.node.name.text);
            }
            if (typescript_1.default.isUnionTypeNode(item.node)) {
                branches.push(unionBranches(item.node));
            }
            const children = contractChildren(item, declarations, attributes, imports);
            if (children === undefined) {
                complete = false;
            }
            else {
                work.push(...children);
            }
        }
        (0, assert_1.assert)(work.length <= propertyEditing_1.PROPERTY_LIMITS.nodesMax, 'Contract traversal queue is bounded');
    }
    (0, assert_1.assert)(work.length === 0, 'Contract traversal completes within its budget');
    (0, assert_1.assert)(members.size <= propertyEditing_1.PROPERTY_LIMITS.fieldsMax, 'Contract field count is bounded');
    return { members, names, branches, complete, inheritedAttributes };
}
function isInheritedAstroAttributes(node, declarations, attributes) {
    if (!typescript_1.default.isTypeReferenceNode(node) && !typescript_1.default.isExpressionWithTypeArguments(node)) {
        return false;
    }
    const name = typescript_1.default.isTypeReferenceNode(node) ? node.typeName.getText() : node.expression.getText();
    return attributes.has(name) && !declarations.has(name);
}
function contractChildren(item, declarations, attributes, imports) {
    const { node } = item;
    if (typescript_1.default.isTypeAliasDeclaration(node) || typescript_1.default.isInterfaceDeclaration(node)) {
        if (node.typeParameters || item.path.includes(node.name.text) || item.path.length >= 64) {
            return undefined;
        }
        if (node.modifiers?.some((modifier) => modifier.kind === typescript_1.default.SyntaxKind.ExportKeyword)) {
            return undefined;
        }
        const next = { ...item, path: [...item.path, node.name.text] };
        if (typescript_1.default.isTypeAliasDeclaration(node)) {
            return [{ ...next, node: node.type }];
        }
        return [
            ...node.members.map((member) => ({ ...next, node: member })),
            ...(node.heritageClauses ?? []).flatMap((clause) => clause.types).map((type) => ({ ...next, node: type })),
        ];
    }
    if (typescript_1.default.isTypeLiteralNode(node)) {
        return node.members.map((member) => ({ ...item, node: member }));
    }
    if (typescript_1.default.isUnionTypeNode(node) || typescript_1.default.isIntersectionTypeNode(node)) {
        return node.types.map((type) => ({
            ...item,
            node: type,
            conditional: item.conditional || typescript_1.default.isUnionTypeNode(node),
        }));
    }
    if (typescript_1.default.isParenthesizedTypeNode(node)) {
        return [{ ...item, node: node.type }];
    }
    if (typescript_1.default.isTypeReferenceNode(node) || typescript_1.default.isExpressionWithTypeArguments(node)) {
        const name = typescript_1.default.isTypeReferenceNode(node) ? node.typeName.getText() : node.expression.getText();
        // DOM attributes are inherited, but locally authored members remain editable.
        if (attributes.has(name) && !declarations.has(name)) {
            return [];
        }
        // Omit only narrows known Astro attributes, so it cannot hide another local declaration.
        if (typescript_1.default.isTypeReferenceNode(node) && isOmittedAstroAttributes(node, declarations, attributes, imports)) {
            return [];
        }
        const declaration = declarations.get(name);
        return declaration && !node.typeArguments ? [{ ...item, node: declaration }] : undefined;
    }
    return undefined;
}
function isOmittedAstroAttributes(node, declarations, attributes, imports) {
    if (node.typeName.getText() !== 'Omit') {
        return false;
    }
    if (declarations.has('Omit')) {
        return false;
    }
    if (imports.has('Omit')) {
        return false;
    }
    const argumentsList = node.typeArguments;
    if (argumentsList?.length !== 2) {
        return false;
    }
    const inherited = argumentsList[0];
    if (!inherited || !typescript_1.default.isTypeReferenceNode(inherited)) {
        return false;
    }
    const inheritedName = inherited.typeName.getText();
    if (!attributes.has(inheritedName)) {
        return false;
    }
    return !declarations.has(inheritedName);
}
function htmlAttributeImports(syntax) {
    const names = new Set();
    for (const statement of syntax.statements) {
        if (typescript_1.default.isImportDeclaration(statement) && typescript_1.default.isStringLiteral(statement.moduleSpecifier)) {
            const bindings = statement.importClause?.namedBindings;
            if (statement.moduleSpecifier.text === 'astro/types' && bindings && typescript_1.default.isNamedImports(bindings)) {
                for (const specifier of bindings.elements) {
                    if ((specifier.propertyName ?? specifier.name).text === 'HTMLAttributes') {
                        names.add(specifier.name.text);
                    }
                }
            }
        }
    }
    return names;
}
function importedTypeNames(syntax) {
    const names = new Set();
    for (const statement of syntax.statements) {
        if (typescript_1.default.isImportDeclaration(statement)) {
            const clause = statement.importClause;
            if (clause?.name) {
                names.add(clause.name.text);
            }
            const bindings = clause?.namedBindings;
            if (bindings && typescript_1.default.isNamespaceImport(bindings)) {
                names.add(bindings.name.text);
            }
            else if (bindings) {
                for (const specifier of bindings.elements) {
                    names.add(specifier.name.text);
                }
            }
        }
    }
    return names;
}
function unionBranches(node) {
    const fields = node.types.map(branchFields);
    const discriminator = [...(fields[0]?.keys() ?? [])].find((name) => fields.every((branch) => literalBranchValue(branch.get(name)?.type) !== undefined));
    return fields.map((branch, index) => ({
        fields: branch,
        condition: discriminator ? `${discriminator} = ${literalBranchValue(branch.get(discriminator)?.type)}` : `Variant branch ${index + 1}`,
    }));
}
function branchFields(root) {
    const work = [root];
    const fields = new Map();
    for (let count = 0; count < propertyEditing_1.PROPERTY_LIMITS.nodesMax && work.length; count++) {
        const node = work.pop();
        (0, assert_1.assert)(node !== undefined, 'Variant branch work item exists');
        if (typescript_1.default.isTypeLiteralNode(node)) {
            for (const member of node.members) {
                if (typescript_1.default.isPropertySignature(member)) {
                    const name = (0, propertySyntax_1.propertyKey)(member.name);
                    if (name) {
                        fields.set(name, member);
                    }
                }
            }
        }
        else if (typescript_1.default.isIntersectionTypeNode(node)) {
            work.push(...node.types);
        }
        else if (typescript_1.default.isParenthesizedTypeNode(node)) {
            work.push(node.type);
        }
    }
    (0, assert_1.assert)(work.length === 0, 'Variant branch traversal is bounded');
    return fields;
}
function literalBranchValue(type) {
    if (!type) {
        return undefined;
    }
    const types = typescript_1.default.isUnionTypeNode(type) ? type.types : [type];
    return types.every((value) => typescript_1.default.isLiteralTypeNode(value)) ? type.getText() : undefined;
}
function contractConditions(contract, name) {
    const common = contract.members.get(name)?.find((usage) => !usage.conditional)?.member;
    const conditions = contract.branches
        .filter((branches) => branches.some((branch) => branch.fields.has(name)))
        .flatMap((branches) => branches.map((branch) => {
        const member = branch.fields.get(name) ?? common;
        const state = member
            ? member.type?.kind === typescript_1.default.SyntaxKind.NeverKeyword
                ? 'not allowed'
                : member.questionToken
                    ? 'optional'
                    : 'required'
            : 'not declared';
        return `${branch.condition}: ${state}`;
    }));
    (0, assert_1.assert)(conditions.length <= propertyEditing_1.PROPERTY_LIMITS.fieldsMax, 'Property variant conditions are bounded');
    return conditions;
}
