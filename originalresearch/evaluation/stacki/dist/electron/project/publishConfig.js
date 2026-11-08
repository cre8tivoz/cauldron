"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPublishConfig = readPublishConfig;
const projectMetadata_1 = require("./projectMetadata");
const publishConfig_1 = require("../../shared/properties/publishConfig");
function readPublishConfig(root) {
    const metadata = (0, projectMetadata_1.readProjectMetadata)(root, 'publish');
    if (!metadata.ok) {
        throw new Error(metadata.error.message);
    }
    return (0, publishConfig_1.parsePublishSource)(metadata.value.source);
}
