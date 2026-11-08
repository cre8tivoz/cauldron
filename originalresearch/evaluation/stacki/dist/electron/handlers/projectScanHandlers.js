"use strict";
// The project scan IPC: the pages, layouts and components a project holds with
// their prop schemas, and the classes its sources use.
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
exports.registerProjectScanHandlers = registerProjectScanHandlers;
const mainLimits_1 = require("../lib/mainLimits");
const platform_1 = require("../lib/platform");
const projectExclusions_1 = require("../lib/projectExclusions");
const atomicWrite_1 = require("../documents/atomicWrite");
const assert_1 = require("../../shared/core/assert");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const cmsRefs_1 = require("../content/cmsRefs");
const componentUsage_1 = require("../properties/componentUsage");
const mainHelpers_1 = require("../lib/mainHelpers");
const classNames_1 = require("../../shared/page/classNames");
const projectFiles_1 = require("../project/projectFiles");
const pageTitles_1 = require("../properties/pageTitles");
const propDefaults_1 = require("../properties/propDefaults");
const componentSources_1 = require("../lib/componentSources");
const installedPackages_1 = require("../lib/installedPackages");
function registerProjectScanHandlers(host) {
    registerProjectScanHandler(host);
    registerProjectClassesHandler(host);
}
function registerProjectScanHandler({ ipcMain, noteProjectRoot, readTrailingSlash, }) {
    ipcMain.handle('project:scan', async (_event, projectPath) => {
        // Also set here, not just in watch:start — the Assets panel can render
        // thumbnails before the watcher starts, and they'd be refused.
        noteProjectRoot(projectPath);
        (0, projectExclusions_1.ensureExcluded)(projectPath);
        const sourceDirectory = path.join(projectPath, 'src');
        const pagesDirectory = path.join(sourceDirectory, 'pages');
        const layoutsDirectory = path.join(sourceDirectory, 'layouts');
        const componentsDirectory = path.join(sourceDirectory, 'components');
        const pages = (0, projectFiles_1.listAstroFiles)(pagesDirectory).map((filePath) => ({
            path: filePath,
            name: (0, mainHelpers_1.toPosix)(path.relative(pagesDirectory, filePath)),
            route: (0, projectFiles_1.routeForPage)(projectPath, filePath),
        }));
        const pageFolders = listPageFolders(pagesDirectory);
        // `folder` groups these in the components panel. Layouts are relative to
        // src, so they read as the folder they're actually in ("layouts", or
        // "layouts/marketing"); components are relative to src/components, whose
        // own root is the ungrouped case.
        const layouts = (0, projectFiles_1.listAstroFiles)(layoutsDirectory).map((filePath) => ({
            path: filePath,
            name: path.basename(filePath, '.astro'),
            folder: (0, mainHelpers_1.toPosix)(path.relative(sourceDirectory, path.dirname(filePath))),
            instances: 0,
            isLayout: true,
            ...(0, propDefaults_1.safeSchema)(filePath, projectPath),
        }));
        const components = [...(0, projectFiles_1.listAstroFiles)(componentsDirectory), ...(0, componentSources_1.packageComponentFiles)(projectPath).map((file) => path.join(projectPath, file))].map((filePath) => ({
            path: filePath,
            name: path.basename(filePath, '.astro'),
            folder: (0, mainHelpers_1.toPosix)(path.relative(componentsDirectory, path.dirname(filePath))),
            instances: 0,
            ...(0, propDefaults_1.safeSchema)(filePath, projectPath),
            ...scanComponentOrigin(projectPath, filePath),
        }));
        // Instance counts: how often each component is used across every .astro
        // file in src (pages, layouts, and other components).
        const importAliases = (0, cmsRefs_1.aliasMap)(projectPath);
        const allSources = (0, projectFiles_1.listAstroFiles)(sourceDirectory).map((file) => scanCountSource(file, importAliases));
        // Layouts are counted too: they show up in the palette alongside
        // components, so the instance line has to mean the same thing for both.
        // Counted by the same function the "where is it used" list counts with —
        // when the number and the list disagree, nothing says which one is wrong.
        // That function counts under the name each FILE imports it as: a layout
        // imported as `Layout` is never written `<BaseLayout>`, and counting the
        // filename found none of them.
        for (const comp of [...components, ...layouts]) {
            comp.instances = allSources.reduce((count, { file, text, counts }) => count +
                ((0, platform_1.sameFilesystemPath)(file, comp.path)
                    ? 0 // a file is not one of its own users
                    : (0, componentUsage_1.instancesIn)(text, {
                        file,
                        targetPath: comp.path,
                        name: comp.name,
                        counts,
                    })), 0);
        }
        return {
            pages: (0, pageTitles_1.scanPageTitles)(pages, allSources, importAliases),
            layouts,
            components,
            pageFolders,
            trailingSlash: readTrailingSlash(projectPath),
        };
    });
}
function scanCountSource(file, aliases) {
    let text = '';
    try {
        text = (0, mainLimits_1.readSource)(file);
    }
    catch {
        // Unreadable files contribute no instances, matching the source scan above.
    }
    return { file, text, counts: (0, componentUsage_1.instanceCounts)(text, file, aliases) };
}
function scanComponentOrigin(root, file) {
    const importPath = (0, componentSources_1.packageComponentImport)(root, file);
    if (importPath === undefined) {
        return {};
    }
    const owner = (0, installedPackages_1.packageOf)(file);
    (0, assert_1.assert)(owner !== undefined, 'Package components have an installed owner');
    return { origin: { kind: 'package', package: owner, importPath } };
}
function registerProjectClassesHandler({ ipcMain }) {
    // Every CSS class name used anywhere under src/ and public/ — written in
    // markup, added or queried by scripts, styled by stylesheets and <style>
    // blocks — for the class field's suggestions in the props panel. public/
    // holds files served as they are: a stylesheet linked from the page, a
    // script, plain HTML, each with classes the page uses.
    ipcMain.handle('project:classes', async (_event, projectPath) => {
        const out = new Set();
        const exts = /\.(astro|css|scss|sass|less|html|jsx|tsx|js|mjs|cjs|ts|mts|cts|vue|svelte|mdx)$/i;
        const files = [];
        // One budget over both folders: together they are bounded as one walk.
        const checkDirectory = (0, mainLimits_1.directoryBudget)(projectPath);
        const walk = (folder, depth) => {
            let entries;
            try {
                entries = fs.readdirSync(folder, { withFileTypes: true });
            }
            catch {
                return;
            }
            checkDirectory(folder, entries.length);
            (0, assert_1.assert)(depth <= mainLimits_1.MAIN_LIMITS.directoryDepthMax, 'project:classes: the budget bounds depth');
            for (const entry of entries) {
                const full = path.join(folder, entry.name);
                if (entry.isDirectory()) {
                    walk(full, depth + 1);
                }
                else if (exts.test(entry.name)) {
                    files.push(full);
                }
            }
        };
        for (const folder of ['src', 'public']) {
            walk(path.join(projectPath, folder), 1);
        }
        // shared/page/classNames.ts reads each file: markup, scripts and stylesheets alike.
        for (const file of files) {
            const kind = (0, classNames_1.classSourceKind)(file);
            if (kind === undefined) {
                continue;
            }
            let content;
            try {
                content = (0, mainLimits_1.readSource)(file);
            }
            catch {
                continue;
            }
            for (const name of (0, classNames_1.classNamesIn)(content, kind)) {
                out.add(name);
            }
        }
        return [...out].sort();
    });
}
// Folders under src/pages (including empty ones) for the pages tree.
function listPageFolders(pagesDirectory) {
    const pageFolders = [];
    if (fs.existsSync(pagesDirectory)) {
        const checkDirectory = (0, mainLimits_1.directoryBudget)(pagesDirectory);
        const walkDirectories = (folder, depth) => {
            const entries = fs.readdirSync(folder, { withFileTypes: true });
            checkDirectory(folder, entries.length);
            (0, assert_1.assert)(depth <= mainLimits_1.MAIN_LIMITS.directoryDepthMax, 'project:scan: the budget bounds depth');
            for (const entry of entries) {
                if (!entry.isDirectory()) {
                    continue;
                }
                const full = path.join(folder, entry.name);
                // Internal save folders, including old staging, are never page folders.
                if (entry.name === '.stacki' || (0, atomicWrite_1.isAtomicTemporary)(full)) {
                    continue;
                }
                pageFolders.push((0, mainHelpers_1.toPosix)(path.relative(pagesDirectory, full)));
                walkDirectories(full, depth + 1);
            }
        };
        walkDirectories(pagesDirectory, 0);
    }
    return pageFolders;
}
