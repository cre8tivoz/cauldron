"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStudioProgress = createStudioProgress;
const node_util_1 = require("node:util");
const studioProgress_1 = require("../../shared/ipc/studioProgress");
// One pending snapshot bounds IPC traffic and memory independently of npm output volume.
const PROGRESS_INTERVAL_MS = 150;
function createStudioProgress(identity, send) {
    let stage = 'release';
    let output = '';
    let timer;
    let closed = false;
    const flush = () => {
        clearTimeout(timer);
        timer = undefined;
        send((0, studioProgress_1.parseStudioInstallProgress)({ ...identity, stage, output }));
    };
    return {
        update(update) {
            if (closed) {
                return;
            }
            if (update.kind === 'stage') {
                stage = update.stage;
                flush();
            }
            else {
                // Treat output as text, never executable terminal control sequences or HTML.
                output = (output + (0, node_util_1.stripVTControlCharacters)(update.text)).slice(-studioProgress_1.STUDIO_LOG_CHARS_MAX);
                if (timer === undefined) {
                    timer = setTimeout(flush, PROGRESS_INTERVAL_MS);
                }
            }
        },
        close() {
            if (closed) {
                return;
            }
            closed = true;
            flush();
        },
    };
}
