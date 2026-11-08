"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planPropertyChanges = planPropertyChanges;
// Stacki's source-preserving planner. Studio owns validation, commits and undo.
const propertyConsumers_1 = require("./propertyConsumers");
const node_path_1 = __importDefault(require("node:path"));
const assert_1 = require("../../shared/core/assert");
const result_1 = require("../../shared/core/result");
const propertyOptions_1 = require("../../shared/properties/propertyOptions");
const platform_1 = require("../lib/platform");
const propertyDefinitions_1 = require("./propertyDefinitions");
const propertyRename_1 = require("./propertyRename");
function planPropertyChanges(request, source) {
    const change = request.change;
    const first = { file: request.file, before: request.source, after: source };
    if (change.kind === 'remove') {
        return planPropertyRemoval(request, first, change.name);
    }
    const propertyRename = propertyRenameForChange(change);
    const optionRenames = change.kind === 'save' ? (change.optionRenames ?? []) : [];
    if (!propertyRename && optionRenames.length === 0) {
        return (0, result_1.ok)([first]);
    }
    if (change.kind !== 'save' || !change.originalName) {
        return (0, result_1.err)({
            code: 'option',
            message: 'Only an existing property can rename options.',
        });
    }
    const valid = validateOptionRenames(request.source, source, change, optionRenames);
    if (!valid.ok) {
        return valid;
    }
    const consumers = (0, propertyConsumers_1.readPropertyConsumers)(request);
    if (!consumers.ok) {
        return consumers;
    }
    const changes = [];
    for (const consumer of consumers.value) {
        const { file, names } = consumer;
        const own = (0, platform_1.sameFilesystemPath)(file, request.file);
        const original = own ? source : consumer.source;
        const owner = own ? 'definition' : 'consumer';
        const changed = planConsumerChange(original, names, change, propertyRename, optionRenames, owner);
        if (!changed.ok) {
            return (0, result_1.err)({
                code: changed.error.code,
                message: `${node_path_1.default.relative(request.projectPath, file)}: ${changed.error.message}`,
            });
        }
        if (own || changed.value !== original) {
            changes.push({
                file,
                before: own ? request.source : original,
                after: changed.value,
            });
        }
    }
    (0, assert_1.assert)(changes.some((entry) => (0, platform_1.sameFilesystemPath)(entry.file, request.file)), 'Rename plan includes the definition');
    return (0, result_1.ok)(changes);
}
function propertyRenameForChange(change) {
    if (change.kind !== 'save' || !change.originalName) {
        return undefined;
    }
    return change.originalName === change.property.name ? undefined : { from: change.originalName, to: change.property.name };
}
function planConsumerChange(source, names, change, propertyRename, optionRenames, owner) {
    const renamed = propertyRename ? (0, propertyRename_1.renameComponentReferences)(source, names, propertyRename, owner) : (0, result_1.ok)(source);
    if (!renamed.ok || optionRenames.length === 0) {
        return renamed;
    }
    return (0, propertyRename_1.renameComponentOptionValues)(renamed.value, names, change.property.name, optionRenames);
}
function validateOptionRenames(beforeSource, afterSource, change, renames) {
    if (renames.length === 0) {
        return (0, result_1.ok)(undefined);
    }
    const before = (0, propertyDefinitions_1.readComponentProperties)(beforeSource).properties.find((property) => property.name === change.originalName);
    const after = (0, propertyDefinitions_1.readComponentProperties)(afterSource).properties.find((property) => property.name === change.property.name);
    const beforeOptions = before ? (0, propertyOptions_1.literalOptions)(before.type) : undefined;
    const afterOptions = after ? (0, propertyOptions_1.literalOptions)(after.type) : undefined;
    if (!beforeOptions || !afterOptions) {
        return (0, result_1.err)({
            code: 'option',
            message: 'Option renames require an editable literal union.',
        });
    }
    for (const rename of renames) {
        if (!beforeOptions.includes(rename.from) || !afterOptions.includes(rename.to)) {
            return (0, result_1.err)({
                code: 'option',
                message: 'An option rename does not match the saved union.',
            });
        }
    }
    return (0, result_1.ok)(undefined);
}
function planPropertyRemoval(request, change, name) {
    const consumers = (0, propertyConsumers_1.readPropertyConsumers)(request);
    if (!consumers.ok) {
        return consumers;
    }
    for (const consumer of consumers.value) {
        const result = (0, propertyRename_1.renameComponentReferences)(consumer.source, consumer.names, { from: name, to: '_stackiDeletedProperty' }, 'consumer');
        if (!result.ok) {
            return result;
        }
        if (result.value !== consumer.source) {
            return (0, result_1.err)({
                code: 'in-use',
                message: `${consumer.file} still passes ${name}. ` + 'Remove that instance value before deleting the prop.',
            });
        }
    }
    return (0, result_1.ok)([change]);
}
