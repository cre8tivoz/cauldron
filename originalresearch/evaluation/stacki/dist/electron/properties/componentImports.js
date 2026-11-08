"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.componentSpecifier = componentSpecifier;
// Verify an alias against its first existing target before emitting it. Merely
// having @/* in tsconfig does not prove it resolves to this component.
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const cmsRefs_1 = require("../content/cmsRefs");
const componentSources_1 = require("../lib/componentSources");
function componentSpecifier(root, file) {
    const installed = (0, componentSources_1.packageComponentImport)(root, file);
    if (installed !== undefined) {
        return installed;
    }
    const absolute = node_path_1.default.resolve(root, file);
    const aliases = (0, cmsRefs_1.aliasMap)(root);
    for (const alias of aliases) {
        if (!alias.wildcard) {
            continue;
        }
        for (const target of alias.targets) {
            const relative = node_path_1.default.relative(target, absolute).split(node_path_1.default.sep).join('/');
            if (relative.startsWith('../') || node_path_1.default.isAbsolute(relative)) {
                continue;
            }
            const specifier = alias.prefix + relative;
            const effective = aliases.find((entry) => (entry.wildcard ? specifier.startsWith(entry.prefix) : specifier === entry.prefix));
            const resolved = effective?.targets
                .map((directory) => node_path_1.default.resolve(directory, specifier.slice(effective.prefix.length)))
                .find((candidate) => node_fs_1.default.existsSync(candidate));
            if (resolved !== undefined && node_fs_1.default.realpathSync(resolved) === node_fs_1.default.realpathSync(absolute)) {
                return specifier;
            }
        }
    }
    return undefined;
}
