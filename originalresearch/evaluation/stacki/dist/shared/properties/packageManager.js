"use strict";
// The package managers Stacki runs for a project, and how package.json names one
// in its packageManager field: "pnpm@9.12.0", optionally followed by "+sha512.…".
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREATE_PACKAGE_MANAGERS = exports.PACKAGE_MANAGERS = void 0;
exports.parseCreatePackageManager = parseCreatePackageManager;
exports.packageManagerLabel = packageManagerLabel;
exports.parsePackageManagerField = parsePackageManagerField;
exports.PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'];
// The managers a new site can be created with: those tested end to end so far. Yarn's newer
// versions skip node_modules by default, which the preview has not been checked against.
exports.CREATE_PACKAGE_MANAGERS = ['npm', 'pnpm'];
const FIELD_CHARS_MAX = 256;
function parseCreatePackageManager(input) {
    const manager = exports.CREATE_PACKAGE_MANAGERS.find((candidate) => candidate === input);
    if (manager === undefined) {
        throw new Error(`Package manager: expected ${exports.CREATE_PACKAGE_MANAGERS.join(' or ')}`);
    }
    return manager;
}
// The name people know each manager by, for messages.
function packageManagerLabel(manager) {
    switch (manager) {
        case 'npm':
            return 'npm';
        case 'pnpm':
            return 'pnpm';
        case 'yarn':
            return 'Yarn';
        case 'bun':
            return 'Bun';
        default: {
            const exhaustive = manager;
            return exhaustive;
        }
    }
}
// The manager the field names, or undefined when it is absent, malformed or names
// one Stacki does not run, so detection falls back to the project's lockfile.
function parsePackageManagerField(input) {
    if (typeof input !== 'string') {
        return undefined;
    }
    if (input.length > FIELD_CHARS_MAX) {
        return undefined;
    }
    const at = input.indexOf('@');
    const name = at === -1 ? input : input.slice(0, at);
    return exports.PACKAGE_MANAGERS.find((manager) => manager === name);
}
