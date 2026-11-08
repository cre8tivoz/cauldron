"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPageHandlers = registerPageHandlers;
const importPaths_1 = require("../properties/importPaths");
const pageRenameDesktop_1 = require("../project/pageRenameDesktop");
const pageRename_1 = require("../../shared/properties/pageRename");
const pageRenamePlan_1 = require("../project/pageRenamePlan");
const pageRenameWrite_1 = require("../project/pageRenameWrite");
// The page IPC: reading, parsing and editing a page through its document
// actor, and creating, moving and deleting pages, folders and dynamic routes.
const editRequests_1 = require("../documents/editRequests");
const editPreview_1 = require("../documents/editPreview");
const documentWrites_1 = require("../documents/documentWrites");
const platform_1 = require("../lib/platform");
const assert_1 = require("../../shared/core/assert");
const intent_1 = require("../../shared/engine/intent");
const span_1 = require("../../shared/core/span");
const mainValidation_1 = require("../app/mainValidation");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const injectedRoutes_1 = require("../preview/injectedRoutes");
const componentFile_1 = require("../documents/componentFile");
const mainHelpers_1 = require("../lib/mainHelpers");
const projectFiles_1 = require("../project/projectFiles");
const pageRequests_1 = require("../documents/pageRequests");
function registerPageHandlers(host) {
    registerPageReadHandlers(host);
    registerPageMoveHandlers(host);
    registerProjectInjectedRoutesHandlers(host);
}
function registerPageReadHandlers({ ipcMain, documents, noteAppWrite }) {
    // Read through the page's actor (step 6): the bytes the renderer is shown are
    // the bytes its edits will name, so the host must hold them — as its current
    // snapshot, and retained once an outside write replaces them — or an edit
    // authored against them could only be refused.
    ipcMain.handle('page:read', async (_event, pagePath) => {
        const snapshot = readThroughActor({ documents }, pagePath);
        // Markdown builds the same tree from a different syntax, so everything
        // downstream — navigator, props, text editing, undo — is unchanged. Only
        // the writer has to know which one it is; model.format carries that.
        return { ...(0, pageRequests_1.parsePageSource)(pagePath, snapshot.text), checksum: snapshot.checksum };
    });
    ipcMain.handle('page:parse', async (_event, { pagePath, source }) => {
        return (0, pageRequests_1.parsePageSource)(pagePath, source);
    });
    // A visual edit (plan §11 step 6): the renderer states it against the page it
    // shows; editRequests.ts makes it an intent against that snapshot, and the
    // page's actor plans and writes it — splices, never a reprint of the file.
    // The reply is the page as written plus the inverse Undo will submit.
    //
    // The code editor's saves arrive here too (step 8): a code patch is bytes, not
    // nodes, so it applies to a page that does not parse — before or after.
    // Markdown and MDX pages take every edit since step 10 (markdownEdits.ts).
    ipcMain.handle('page:edit', async (_event, { pagePath, authoredChecksum, edit }) => {
        const code = edit.tag === 'code-patch';
        const gone = code ? 'merge-conflict' : 'anchor-moved';
        const stated = { authoredChecksum, gone };
        const report = documents.submitEdit(pagePath, stated, (base) => (0, editRequests_1.buildEdit)(edit, base));
        if (report.tag !== 'applied') {
            return { ok: false, error: (0, pageRequests_1.pageEditError)(pagePath, report) };
        }
        const decoded = (0, span_1.decodeUtf8)(report.bytes);
        (0, assert_1.assert)(decoded.ok, 'The actor wrote UTF-8');
        const text = decoded.value;
        // A <style> edit reaches the canvas fresh on this one write: the preview
        // config compiles the file before Vite announces the new stylesheet
        // (avbRecompile in the generated avb-morph plugin).
        noteAppWrite();
        const reply = { ...(0, pageRequests_1.parsePageSource)(pagePath, text), checksum: report.checksum };
        return { ok: true, ...reply, inverse: report.inverse };
    });
    // Several edits of one gesture, written once: a loop and the query it reads,
    // sent apart, gave the dev server a page between them whose loop read a
    // query not yet declared. They are planned in memory against the bytes the
    // renderer read (editPreview.ts), each held to what its own write would be
    // held to, and the result is written as one rewrite of those bytes. A page
    // that changed since is refused untouched: the renderer then sends the edits
    // one at a time, which rebase through outside writes.
    ipcMain.handle('page:editBatch', async (_event, { pagePath, authoredChecksum, edits }) => {
        const refused = (reason, diskChecksum) => ({
            ok: false,
            error: (0, pageRequests_1.pageEditError)(pagePath, { tag: 'rejected', reason, message: (0, intent_1.describeRejection)(reason), diskChecksum }),
        });
        const disk = documents.current(pagePath);
        if (!disk.ok) {
            return refused('write-failed', undefined);
        }
        if (disk.value.checksum !== authoredChecksum) {
            return refused('anchor-moved', disk.value.checksum);
        }
        const planned = (0, editPreview_1.previewEdits)(pagePath, disk.value.bytes, authoredChecksum, edits);
        if (!planned.ok) {
            return refused(planned.error, authoredChecksum);
        }
        const decoded = (0, span_1.decodeUtf8)(planned.value.bytes);
        (0, assert_1.assert)(decoded.ok, 'A plan of UTF-8 text is UTF-8');
        const text = decoded.value;
        const report = documents.writeText(pagePath, text, authoredChecksum);
        if (report.tag !== 'applied') {
            return { ok: false, error: (0, pageRequests_1.pageEditError)(pagePath, report) };
        }
        (0, assert_1.assert)(report.checksum === planned.value.checksum, 'The batch wrote the bytes it planned');
        noteAppWrite();
        const reply = { ...(0, pageRequests_1.parsePageSource)(pagePath, text), checksum: report.checksum };
        return { ok: true, ...reply, inverse: report.inverse };
    });
    // A visual edit planned against the bytes the renderer sends and never
    // written (electron/documents/editPreview.ts): reviewing a conflicted page in code
    // shows its unsaved gestures as the splices they are. The reply has page:edit's
    // shape, so the renderer states the next request against it as it would
    // against a write.
    ipcMain.handle('page:previewEdit', async (_event, { pagePath, authoredChecksum, edit, source }) => {
        const refused = (reason) => {
            const error = { code: 'rejected', reason, message: (0, intent_1.describeRejection)(reason) };
            return { ok: false, error: { ...error, diskChecksum: undefined } };
        };
        const planned = (0, editPreview_1.previewEdit)(pagePath, (0, span_1.encodeUtf8)(source), authoredChecksum, edit);
        if (!planned.ok) {
            return refused(planned.error);
        }
        const decoded = (0, span_1.decodeUtf8)(planned.value.bytes);
        (0, assert_1.assert)(decoded.ok, 'A plan of UTF-8 text is UTF-8');
        const reply = {
            ...(0, pageRequests_1.parsePageSource)(pagePath, decoded.value),
            checksum: planned.value.checksum,
        };
        return { ok: true, ...reply, inverse: planned.value.inverse };
    });
    ipcMain.handle('page:create', async (_event, { projectPath, name, layout }) => {
        const pagesDirectory = path.join(projectPath, 'src', 'pages');
        let fileName = name.trim().replace(/\.astro$/i, '');
        fileName = fileName.replace(/[^a-zA-Z0-9/_-]+/g, '-');
        if (!fileName) {
            throw new Error('Invalid page name');
        }
        const pagePath = path.join(pagesDirectory, fileName + '.astro');
        if (fs.existsSync(pagePath)) {
            throw new Error('A page with that name already exists.');
        }
        fs.mkdirSync(path.dirname(pagePath), { recursive: true });
        const eol = process.platform === 'win32' ? '\r\n' : '\n';
        const created = (0, componentFile_1.newPageText)({ pagePath, layout: layout ?? undefined, eol });
        (0, documentWrites_1.createProjectText)(pagePath, created);
        return { pagePath };
    });
    ipcMain.handle('page:delete', async (_event, pagePath) => {
        noteAppWrite();
        fs.rmSync(pagePath);
        return { ok: true };
    });
}
function registerPageMoveHandlers({ ipcMain, noteAppWrite }) {
    // Moves/renames a page within src/pages. `to` is the new path relative to
    // the pages dir (with extension). When the folder changes, relative imports
    // in the file's frontmatter are rewritten so they keep resolving.
    ipcMain.handle('page:move', async (_event, { projectPath, from, to }) => {
        const pagesDirectory = path.join(projectPath, 'src', 'pages');
        const change = (0, pageRename_1.parsePageRename)({
            kind: 'page',
            from: (0, mainHelpers_1.toPosix)(path.relative(pagesDirectory, from)),
            to,
        });
        renameProjectPages(projectPath, change);
        noteAppWrite();
        return { newPath: path.join(pagesDirectory, change.to) };
    });
    ipcMain.handle('pagefolder:create', async (_event, { projectPath, dir: directory }) => {
        fs.mkdirSync((0, pageRequests_1.resolvePagesDirectory)(projectPath, directory), { recursive: true });
        return { ok: true };
    });
    ipcMain.handle('pagefolder:rename', async (_event, { projectPath, from, to }) => {
        renameProjectPages(projectPath, (0, pageRename_1.parsePageRename)({ kind: 'folder', from, to }));
        noteAppWrite();
        return { ok: true };
    });
    ipcMain.handle('pagefolder:delete', async (_event, { projectPath, dir: directory }) => {
        const full = (0, pageRequests_1.resolvePagesDirectory)(projectPath, directory);
        const pagesDirectory = path.join(projectPath, 'src', 'pages');
        if ((0, platform_1.sameFilesystemPath)(full, pagesDirectory)) {
            throw new Error('Invalid folder.');
        }
        fs.rmSync(full, { recursive: true, force: true });
        return { ok: true };
    });
}
function registerProjectInjectedRoutesHandlers({ ipcMain }) {
    // Routes the project serves that are NOT files under src/pages — pages an
    // integration injected (issue #7). The site's own repo may have none of its
    // own at all, in which case these are the only pages there are. Preview only:
    // their source lives inside a dependency, so nothing here is editable, and
    // they are deliberately kept out of the page list the editor writes through.
    ipcMain.handle('project:injectedRoutes', async (_event, { projectPath }) => ({
        routes: (0, injectedRoutes_1.readInjectedRoutes)(projectPath),
    }));
    // The concrete URLs a dynamic page stands for, by asking the dev server to run
    // its getStaticPaths. Returns [] for a static page, and for any failure — a
    // page that can't answer is previewed at its own pattern, exactly as before.
    ipcMain.handle('page:dynamicPaths', async (_event, { projectPath, pagePath, devUrl }) => {
        const pattern = (0, projectFiles_1.routeForPage)(projectPath, pagePath);
        if (!pattern.includes('[') || !devUrl) {
            return { entries: [] };
        }
        const rel = (0, mainHelpers_1.toPosix)(path.relative(projectPath, pagePath));
        try {
            const response = await fetch(`${devUrl}/__avb/paths?p=${encodeURIComponent(rel)}`);
            if (!response.ok) {
                return { entries: [], error: `Dev server returned ${response.status}` };
            }
            const input = await response.json();
            const data = (0, mainValidation_1.parseDynamicPaths)(input);
            const entries = (data.entries || []).map((entry) => {
                // A dev server started before this app was updated still answers with
                // bare params objects — read both shapes rather than break its preview.
                const params = entry.params;
                return {
                    params,
                    props: (entry && entry.props) || undefined,
                    route: (0, pageRequests_1.fillRoute)(pattern, params),
                    // The values themselves read better in a picker than "slug=hello-world".
                    label: Object.values(params).map(String).join(' / ') || pattern,
                };
            });
            return { entries, error: data.error || undefined };
        }
        catch (error) {
            return { entries: [], error: (0, mainHelpers_1.errorMessage)(error) };
        }
    });
}
function readThroughActor({ documents }, pagePath) {
    const current = documents.current(pagePath);
    if (!current.ok) {
        throw new Error(current.error.message);
    }
    const decoded = (0, span_1.decodeUtf8)(current.value.bytes);
    if (!decoded.ok) {
        throw new Error(`${path.basename(pagePath)} is not valid UTF-8`);
    }
    return { text: decoded.value, checksum: current.value.checksum };
}
function renameProjectPages(projectPath, change) {
    const planned = (0, pageRenamePlan_1.planPageRename)(projectPath, change, (0, importPaths_1.projectAliases)(projectPath));
    if (!planned.ok) {
        throw new Error(planned.error.message);
    }
    const saved = (0, pageRenameWrite_1.applyPageRename)(planned.value, (0, pageRenameDesktop_1.desktopRenameWriter)());
    if (!saved.ok) {
        throw new Error(saved.error.message);
    }
}
