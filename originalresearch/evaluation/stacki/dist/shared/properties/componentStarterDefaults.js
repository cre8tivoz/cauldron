"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSTANCE_PARAGRAPH = exports.INSTANCE_HEADING = void 0;
exports.starterDefaults = starterDefaults;
const assert_1 = require("../core/assert");
const componentDefaults_1 = require("./componentDefaults");
exports.INSTANCE_HEADING = 'Lorem ipsum dolor sit amet elit';
exports.INSTANCE_PARAGRAPH = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ' +
    'ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco ' +
    'laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in ' +
    'voluptate velit esse cillum dolore eu fugiat nulla pariatur.';
function starterDefaults(catalog) {
    (0, assert_1.assert)(catalog.length <= componentDefaults_1.DEFAULT_LIMITS.componentsMax, 'Starter catalog fits recipe storage');
    (0, assert_1.assert)(new Set(catalog.map((item) => item.file)).size === catalog.length, 'Starter component paths are unique');
    // Ambiguous names are never guessed; project recipes use full relative paths.
    const unique = (name) => {
        const matches = catalog.filter((item) => item.name === name);
        return matches.length === 1 ? matches[0] : undefined;
    };
    const text = {
        Heading: exports.INSTANCE_HEADING,
        Paragraph: exports.INSTANCE_PARAGRAPH,
        Button: 'Button Text',
    };
    const children = {
        ButtonWrapper: ['Button'],
        ContentWrapper: ['Heading', 'Paragraph', 'ButtonWrapper'],
        Grid: ['Card', 'Card', 'Card'],
        Slider: ['Card', 'Card'],
    };
    const props = {
        Grid: { small: 2, medium: 3 },
        Slider: { small: 1.4 },
        Card: { heading: exports.INSTANCE_HEADING, text: exports.INSTANCE_PARAGRAPH },
    };
    return {
        version: 1,
        components: Object.fromEntries(catalog.flatMap((component) => {
            const recipe = {
                props: Object.fromEntries(Object.entries(props[component.name] ?? {}).filter(([name]) => component.props.includes(name))),
                ...(component.slots.includes('default') ? starterContent(component, text, children, unique) : {}),
            };
            return Object.keys(recipe.props ?? {}).length > 0 || recipe.text !== undefined || recipe.children !== undefined ? [[component.file, recipe]] : [];
        })),
    };
}
function starterContent(component, text, children, unique) {
    const names = children[component.name];
    if (names) {
        return {
            children: names.flatMap((name) => {
                const child = unique(name);
                return child ? [{ component: child.file }] : [];
            }),
        };
    }
    const value = text[component.name] ?? (component.slotText ? 'Text' : undefined);
    return value === undefined ? {} : { text: value };
}
