"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listenForPreviewFailures = listenForPreviewFailures;
// Chromium can finish a failed iframe navigation with an empty error document.
// Report that failure even when the dev server has recovered before the next probe.
const previewFailure_1 = require("../../shared/ipc/previewFailure");
function listenForPreviewFailures(contents, previewURL) {
    contents.on('did-fail-load', (_event, code, _description, address, mainFrame) => {
        // Aborted navigations are deliberate page switches, not failed previews.
        if (mainFrame || code === -3) {
            return;
        }
        const current = previewURL();
        if (!current) {
            return;
        }
        let failed;
        try {
            failed = (0, previewFailure_1.parsePreviewFailure)(address);
        }
        catch {
            return;
        }
        if (new URL(failed).origin === new URL(current).origin) {
            contents.send('dev:preview-failed', failed);
        }
    });
}
