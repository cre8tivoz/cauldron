"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMetadataWrite = exports.parseMetadataFile = exports.METADATA_FILES = void 0;
exports.metadataKind = metadataKind;
exports.metadataSource = metadataSource;
exports.parseMetadataResult = parseMetadataResult;
exports.validateMetadata = validateMetadata;
const pageOrder_1 = require("./pageOrder");
const componentSources_1 = require("./componentSources");
const guidePreferences_1 = require("./guidePreferences");
const publishConfig_1 = require("../properties/publishConfig");
// Only these reviewed project files are exposed through the metadata transport.
const boundary_1 = require("../core/boundary");
const componentDefaults_1 = require("./componentDefaults");
const styleKeepList_1 = require("./styleKeepList");
exports.METADATA_FILES = {
    componentSources: componentSources_1.COMPONENT_SOURCE_FILE,
    components: '.stacki/components.json',
    guide: '.stacki/guide.json',
    pages: '.stacki/pages.json',
    publish: '.stacki/publish.json',
    styles: '.stacki/styles.json',
};
function metadataKind(input) {
    if (input === 'componentSources') {
        return input;
    }
    if (input === 'components' || input === 'guide' || input === 'publish' || input === 'pages' || input === 'styles') {
        return input;
    }
    throw new Error('Unknown project metadata file');
}
function metadataSource(input) {
    const source = (0, boundary_1.text)(input);
    if (source.length > componentDefaults_1.DEFAULT_LIMITS.sourceCharsMax) {
        throw new Error('Project metadata exceeds 256 KiB');
    }
    return source;
}
exports.parseMetadataFile = (0, boundary_1.object)({ source: (0, boundary_1.optional)(metadataSource) });
exports.parseMetadataWrite = (0, boundary_1.object)({
    kind: metadataKind,
    source: metadataSource,
    base: (0, boundary_1.optional)(metadataSource),
});
function parseMetadataResult(input) {
    const value = (0, boundary_1.record)(input);
    if ((0, boundary_1.boolean)(value['ok'])) {
        return { ok: true, value: (0, exports.parseMetadataFile)(value['value']) };
    }
    const error = (0, boundary_1.object)({ code: boundary_1.text, message: boundary_1.text })(value['error']);
    return { ok: false, error };
}
function validateMetadata(kind, source) {
    metadataSource(source);
    if (kind === 'publish') {
        (0, publishConfig_1.parsePublishSource)(source);
        return;
    }
    const input = JSON.parse(source);
    if (kind === 'componentSources') {
        (0, componentSources_1.parseComponentSources)(input);
        return;
    }
    if (kind === 'pages') {
        (0, pageOrder_1.parsePageOrder)(input);
        return;
    }
    if (kind === 'styles') {
        (0, styleKeepList_1.parseStyleKeepList)(input);
        return;
    }
    if (kind === 'components') {
        (0, componentDefaults_1.parseComponentDefaults)(input);
    }
    else {
        const value = (0, boundary_1.record)(input);
        if (value['version'] !== 1) {
            throw new Error('Unsupported guide settings version');
        }
        (0, guidePreferences_1.validateGuidePreferences)(value['settings']);
    }
}
