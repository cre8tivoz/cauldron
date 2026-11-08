"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDefaultsSave = exports.parseDefaultsSnapshot = exports.parseDefaultComponent = exports.DEFAULT_LIMITS = exports.COMPONENT_DEFAULTS_FILE = void 0;
exports.componentFile = componentFile;
exports.parseComponentDefaults = parseComponentDefaults;
exports.parseDefaultsSource = parseDefaultsSource;
exports.defaultValue = defaultValue;
exports.resolveComponentRecipe = resolveComponentRecipe;
exports.defaultsIssues = defaultsIssues;
exports.relinkDefaults = relinkDefaults;
// Insertion recipes are project data, independent of either editor's page model.
const assert_1 = require("../core/assert");
const boundary_1 = require("../core/boundary");
const result_1 = require("../core/result");
exports.COMPONENT_DEFAULTS_FILE = '.stacki/components.json';
exports.DEFAULT_LIMITS = {
    componentsMax: 512,
    childrenMax: 32,
    depthMax: 12,
    nodesMax: 256,
    propsMax: 64,
    textCharsMax: 16_384,
    sourceCharsMax: 262_144,
    storedNodesMax: 4096,
};
function componentFile(input) {
    const value = (0, boundary_1.text)(input);
    if (value.length > 500 || !/^(src\/|node_modules\/(?:@[\w.-]+\/)?[\w.-]+\/)[\w./ -]+\.astro$/.test(value)) {
        throw new Error('Component defaults: expected a project-relative component .astro path');
    }
    if (value.split('/').some((part) => part.startsWith('.') || part === '')) {
        throw new Error('Component defaults: invalid path segment');
    }
    return value;
}
function parseComponentDefaults(input) {
    const value = (0, boundary_1.record)(input);
    if (value['version'] !== 1) {
        throw new Error('Component defaults: unsupported version');
    }
    const entries = Object.entries((0, boundary_1.record)(value['components']));
    if (entries.length > exports.DEFAULT_LIMITS.componentsMax) {
        throw new Error('Component defaults: too many components');
    }
    let nodes = 0;
    const takeNode = () => {
        nodes += 1;
        if (nodes > exports.DEFAULT_LIMITS.storedNodesMax) {
            throw new Error('Component defaults exceed the stored node limit');
        }
    };
    const components = Object.fromEntries(entries.map(([file, recipe]) => [componentFile(file), parseRecipe(recipe, 0, takeNode)]));
    (0, assert_1.assert)(Object.keys(components).length === entries.length, 'Recipe parsing preserves every owner');
    (0, assert_1.assert)(nodes <= exports.DEFAULT_LIMITS.storedNodesMax, 'Parsed recipes fit the total node budget');
    return { version: 1, components };
}
function parseDefaultsSource(source) {
    if (source.length > exports.DEFAULT_LIMITS.sourceCharsMax) {
        return (0, result_1.err)({ code: 'invalid-defaults', message: 'Component defaults file exceeds 256 KiB.' });
    }
    try {
        const input = JSON.parse(source);
        return (0, result_1.ok)(parseComponentDefaults(input));
    }
    catch (error) {
        return (0, result_1.err)({
            code: 'invalid-defaults',
            message: error instanceof Error ? error.message : 'Invalid component defaults',
        });
    }
}
exports.parseDefaultComponent = (0, boundary_1.object)({
    importPath: (0, boundary_1.optional)(boundary_1.text),
    file: componentFile,
    name: boundary_1.text,
    props: (0, boundary_1.list)(boundary_1.text),
    slots: (0, boundary_1.list)(boundary_1.text),
    slotText: boundary_1.boolean,
});
exports.parseDefaultsSnapshot = (0, boundary_1.object)({
    source: (0, boundary_1.optional)(boundary_1.text),
    config: parseComponentDefaults,
    catalog: (0, boundary_1.list)(exports.parseDefaultComponent),
});
exports.parseDefaultsSave = (0, boundary_1.object)({
    source: (0, boundary_1.optional)(boundary_1.text),
    config: parseComponentDefaults,
});
function defaultValue(input) {
    if (typeof input === 'boolean') {
        return input;
    }
    if (typeof input === 'number') {
        if (!Number.isFinite(input)) {
            throw new Error('Default number must be finite');
        }
        return input;
    }
    const value = (0, boundary_1.text)(input);
    if (value.length > exports.DEFAULT_LIMITS.textCharsMax) {
        throw new Error('Default text exceeds 16 KiB');
    }
    return value;
}
function parseRecipe(input, depth, takeNode) {
    takeNode();
    if (depth > exports.DEFAULT_LIMITS.depthMax) {
        throw new Error('Component defaults exceed the nesting limit');
    }
    const value = (0, boundary_1.record)(input);
    const props = value['props'];
    const content = value['text'];
    const children = value['children'];
    if (content !== undefined && children !== undefined) {
        throw new Error('Choose text or children for a recipe, not both');
    }
    return {
        ...(props === undefined ? {} : { props: parseRecipeProps(props) }),
        ...(content === undefined ? {} : { text: parseRecipeText(content) }),
        ...(children === undefined ? {} : { children: parseRecipeChildren(children, depth, takeNode) }),
    };
}
function parseRecipeText(input) {
    const value = defaultValue(input);
    if (typeof value !== 'string') {
        throw new Error('Default text must be a string');
    }
    return value;
}
function parseRecipeProps(input) {
    const entries = Object.entries((0, boundary_1.record)(input));
    if (entries.length > exports.DEFAULT_LIMITS.propsMax) {
        throw new Error('Too many default props');
    }
    return Object.fromEntries(entries.map(([name, value]) => {
        if (!/^[A-Za-z_][\w:-]{0,99}$/.test(name)) {
            throw new Error('Invalid default prop name');
        }
        return [name, defaultValue(value)];
    }));
}
function parseRecipeChildren(input, depth, takeNode) {
    const values = (0, boundary_1.list)(boundary_1.record)(input);
    if (values.length > exports.DEFAULT_LIMITS.childrenMax) {
        throw new Error('Too many default children');
    }
    return values.map((value) => {
        if (depth + 1 > exports.DEFAULT_LIMITS.depthMax) {
            throw new Error('Default children exceed the depth limit');
        }
        const kinds = ['literal', 'element', 'component'].filter((key) => value[key] !== undefined);
        if (kinds.length !== 1) {
            throw new Error('A default child must name exactly one component, element, or literal');
        }
        if (value['literal'] !== undefined) {
            takeNode();
            return { literal: parseRecipeText(value['literal']) };
        }
        const recipe = parseRecipe(value, depth + 1, takeNode);
        if (value['element'] !== undefined) {
            const element = (0, boundary_1.text)(value['element']);
            if (!/^[a-z][a-z0-9-]{0,99}$/.test(element)) {
                throw new Error('Invalid default HTML element');
            }
            return { element, ...recipe };
        }
        if (value['inherit'] !== undefined && value['inherit'] !== false) {
            throw new Error('Captured child defaults use inherit: false');
        }
        return {
            component: componentFile(value['component']),
            ...recipe,
            ...(value['inherit'] === false ? { inherit: false } : {}),
        };
    });
}
function resolveComponentRecipe(file, config, catalog) {
    assertRecipeCatalog(config, catalog);
    // Each insertion owns its budget; expansion cannot grow exponentially without a cap.
    let remaining = exports.DEFAULT_LIMITS.nodesMax;
    const resolveChild = (child, ancestors, depth) => {
        if ('component' in child) {
            return resolve(child.component, child, ancestors, depth);
        }
        if (depth > exports.DEFAULT_LIMITS.depthMax || remaining-- <= 0) {
            return (0, result_1.err)({ code: 'recipe-limit', message: 'Default children exceed the insertion limit.' });
        }
        if ('literal' in child) {
            return (0, result_1.ok)(child);
        }
        return resolveElement(child, (nested) => resolveChild(nested, ancestors, depth + 1));
    };
    const resolve = (target, override, ancestors, depth) => {
        if (depth > exports.DEFAULT_LIMITS.depthMax || remaining-- <= 0) {
            return (0, result_1.err)({ code: 'recipe-limit', message: 'Default children exceed the insertion limit.' });
        }
        if (override.inherit !== false && ancestors.includes(target) && override.children === undefined && override.text === undefined) {
            return (0, result_1.err)({ code: 'recipe-cycle', message: `Default children form a cycle at ${target}.` });
        }
        const component = catalog.find((item) => item.file === target);
        if (!component) {
            return (0, result_1.err)({ code: 'missing-component', message: `Component defaults reference ${target}.` });
        }
        const base = override.inherit === false ? {} : (config.components[target] ?? {});
        const recipe = recipeOverride(base, override);
        const props = recipe.props ?? {};
        if (recipe.text !== undefined) {
            if (!component.slots.includes('default')) {
                return (0, result_1.err)({ code: 'missing-slot', message: `${target} has no default slot for text.` });
            }
            return (0, result_1.ok)({ component: target, props, content: { kind: 'text', text: recipe.text } });
        }
        if (recipe.children === undefined) {
            return (0, result_1.ok)({ component: target, props, content: { kind: 'empty' } });
        }
        return resolveComponentChildren(target, props, recipe.children, component.slots, (child) => resolveChild(child, [...ancestors, target], depth + 1));
    };
    return resolve(file, {}, [], 0);
}
function assertRecipeCatalog(config, catalog) {
    (0, assert_1.assert)(catalog.length <= 10_000, 'Component catalog is bounded');
    (0, assert_1.assert)(config.version === 1, 'Resolver supports recipe version 1');
    (0, assert_1.assert)(new Set(catalog.map((item) => item.file)).size === catalog.length, 'Each component path has one catalog entry');
    (0, assert_1.assert)(Object.keys(config.components).length <= exports.DEFAULT_LIMITS.componentsMax, 'Parsed recipes have bounded owners');
}
function resolveComponentChildren(target, props, recipes, slots, resolve) {
    const children = [];
    for (const child of recipes) {
        const resolved = resolve(child);
        if (!resolved.ok) {
            return resolved;
        }
        const slot = 'literal' in resolved.value ? 'default' : (resolved.value.props['slot'] ?? 'default');
        if (typeof slot !== 'string' || !slots.includes(slot)) {
            return (0, result_1.err)({ code: 'missing-slot', message: `${target} has no slot "${String(slot)}".` });
        }
        children.push(resolved.value);
    }
    (0, assert_1.assert)(children.length === recipes.length, 'Every requested child was resolved');
    (0, assert_1.assert)(children.length <= exports.DEFAULT_LIMITS.childrenMax, 'Resolved children respect the recipe cap');
    return (0, result_1.ok)({ component: target, props, content: { kind: 'children', children } });
}
function resolveElement(recipe, resolve) {
    const base = { element: recipe.element, props: recipe.props ?? {} };
    if (recipe.text !== undefined) {
        return (0, result_1.ok)({ ...base, content: { kind: 'text', text: recipe.text } });
    }
    if (recipe.children === undefined) {
        return (0, result_1.ok)({ ...base, content: { kind: 'empty' } });
    }
    const children = [];
    for (const child of recipe.children) {
        const result = resolve(child);
        if (!result.ok) {
            return result;
        }
        children.push(result.value);
    }
    (0, assert_1.assert)(children.length === recipe.children.length, 'Every element child resolves');
    (0, assert_1.assert)(children.length <= exports.DEFAULT_LIMITS.childrenMax, 'Element children are bounded');
    return (0, result_1.ok)({ ...base, content: { kind: 'children', children } });
}
function recipeOverride(base, override) {
    const props = { ...base.props, ...override.props };
    if (override.text !== undefined) {
        return { props, text: override.text };
    }
    if (override.children !== undefined) {
        return { props, children: override.children };
    }
    return { ...base, props };
}
function defaultsIssues(config, catalog) {
    (0, assert_1.assert)(config.version === 1, 'Diagnostics use the current recipe version');
    (0, assert_1.assert)(Object.keys(config.components).length <= exports.DEFAULT_LIMITS.componentsMax, 'Diagnostics have bounded work');
    return Object.keys(config.components).flatMap((file) => {
        const result = resolveComponentRecipe(file, config, catalog);
        return result.ok ? [] : [result.error.message];
    });
}
/** Relinking after a move updates owners and every nested child reference together. */
function relinkDefaults(config, from, to) {
    (0, assert_1.assert)(config.version === 1, 'Relink only changes the current recipe format');
    (0, assert_1.assert)(Object.keys(config.components).length <= exports.DEFAULT_LIMITS.componentsMax, 'Relink starts from bounded parsed configuration');
    if (from !== to && config.components[to] !== undefined) {
        return (0, result_1.err)({
            code: 'duplicate-defaults',
            message: 'The target already has component defaults.',
        });
    }
    const rename = (recipe, depth) => {
        (0, assert_1.assert)(depth <= exports.DEFAULT_LIMITS.depthMax, 'Relink depth is bounded by the recipe parser');
        return {
            ...recipe,
            ...(recipe.children === undefined
                ? {}
                : {
                    children: recipe.children.map((child) => ({
                        ...('literal' in child
                            ? child
                            : {
                                ...rename(child, depth + 1),
                                ...('component' in child ? { component: child.component === from ? to : child.component } : { element: child.element }),
                            }),
                    })),
                }),
        };
    };
    return (0, result_1.ok)({
        version: 1,
        components: Object.fromEntries(Object.entries(config.components).map(([file, recipe]) => [file === from ? to : file, rename(recipe, 0)])),
    });
}
