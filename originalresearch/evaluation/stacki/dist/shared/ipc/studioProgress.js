"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STUDIO_LOG_CHARS_MAX = exports.STUDIO_INSTALL_STAGES = void 0;
exports.studioCompletedStages = studioCompletedStages;
exports.parseStudioRequestId = parseStudioRequestId;
exports.parseStudioInstallProgress = parseStudioInstallProgress;
const boundary_1 = require("../core/boundary");
const assert_1 = require("../core/assert");
exports.STUDIO_INSTALL_STAGES = ['release', 'files', 'dependencies', 'check', 'build', 'activate', 'complete'];
// Keep snapshots small even when npm emits extensive dependency diagnostics.
exports.STUDIO_LOG_CHARS_MAX = 24_000;
function studioCompletedStages(stage) {
    const completed = exports.STUDIO_INSTALL_STAGES.indexOf(stage);
    (0, assert_1.assert)(completed >= 0, 'Studio progress stage belongs to the installation sequence');
    (0, assert_1.assert)(completed < exports.STUDIO_INSTALL_STAGES.length, 'Studio progress stays within its stage count');
    return completed;
}
function parseStudioRequestId(input) {
    if (typeof input !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(input)) {
        throw new Error('Invalid Studio installation request ID');
    }
    return input;
}
function parseStudioInstallProgress(input) {
    const value = (0, boundary_1.record)(input);
    const stage = exports.STUDIO_INSTALL_STAGES.find((candidate) => candidate === value['stage']);
    if (stage === undefined) {
        throw new Error('Invalid Studio installation stage');
    }
    const output = (0, boundary_1.text)(value['output']);
    if (output.length > exports.STUDIO_LOG_CHARS_MAX) {
        throw new Error('Studio installation output exceeds limit');
    }
    return {
        projectPath: (0, boundary_1.pathText)(value['projectPath']),
        requestId: parseStudioRequestId(value['requestId']),
        stage,
        output,
    };
}
