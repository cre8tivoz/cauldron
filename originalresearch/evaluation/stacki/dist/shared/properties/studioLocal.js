"use strict";
// Where Studio keeps what it writes into a project for itself: drafts and their
// history, uploads, publishing state, and its update backups. All of it lives
// under `.stacki/studio/`, which ignores its own contents (`*` in its
// `.gitignore`), so the rest of `.stacki/` — shared project settings — stays
// tracked. Older Studios wrote `.studio-state/` and `.stacki-studio/` at the
// project root; the move to here is studioLocalMove.ts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.STUDIO_LEGACY_DIRECTORIES = exports.STUDIO_UPDATES_DIRECTORY = exports.STUDIO_STATE_DIRECTORY = exports.STUDIO_LOCAL_DIRECTORY = void 0;
exports.isStudioLocalPath = isStudioLocalPath;
const assert_1 = require("../core/assert");
exports.STUDIO_LOCAL_DIRECTORY = '.stacki/studio';
/** Drafts, the draft workspace's history, uploads and publishing state. */
exports.STUDIO_STATE_DIRECTORY = '.stacki/studio/state';
/** The updater's staging, backups and lock. */
exports.STUDIO_UPDATES_DIRECTORY = '.stacki/studio/updates';
/** Where each lived before, by where it lives now: moved once, on start. */
exports.STUDIO_LEGACY_DIRECTORIES = {
    [exports.STUDIO_STATE_DIRECTORY]: '.studio-state',
    [exports.STUDIO_UPDATES_DIRECTORY]: '.stacki-studio',
};
/**
 * Whether a project-relative POSIX path is Studio's own local state — never
 * site content, so never copied, published or committed. Older layouts count.
 */
function isStudioLocalPath(file) {
    (0, assert_1.assert)(!file.includes('\\'), 'Studio paths are POSIX paths');
    if (file === exports.STUDIO_LOCAL_DIRECTORY || file.startsWith(exports.STUDIO_LOCAL_DIRECTORY + '/')) {
        return true;
    }
    const legacy = Object.values(exports.STUDIO_LEGACY_DIRECTORIES);
    (0, assert_1.assert)(legacy.length === 2, 'Two older Studio folders are recognised');
    return file.split('/').some((part) => legacy.includes(part));
}
