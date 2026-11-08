"use strict";
// What a folder holds as an Astro project: its page, layout and component
// files, the route a page serves, and whether its dependencies are installed.
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
exports.listAstroFiles = listAstroFiles;
exports.routeForPage = routeForPage;
exports.isAstroProject = isAstroProject;
exports.hasDependencies = hasDependencies;
const mainLimits_1 = require("../lib/mainLimits");
const record_1 = require("../../shared/core/record");
const assert_1 = require("../../shared/core/assert");
const path = __importStar(require("path"));
const pageRequests_1 = require("../documents/pageRequests");
const fs = __importStar(require("fs"));
const mainHelpers_1 = require("../lib/mainHelpers");
function listAstroFiles(directory) {
    if (!fs.existsSync(directory)) {
        return [];
    }
    const out = [];
    const checkDirectory = (0, mainLimits_1.directoryBudget)(directory);
    const walk = (folder, depth) => {
        const entries = fs.readdirSync(folder, { withFileTypes: true });
        checkDirectory(folder, entries.length);
        (0, assert_1.assert)(depth <= mainLimits_1.MAIN_LIMITS.directoryDepthMax, 'listAstroFiles: the budget bounds depth');
        for (const entry of entries) {
            const full = path.join(folder, entry.name);
            if (entry.isDirectory()) {
                walk(full, depth + 1);
            }
            // Markdown only counts as a page. A .md under src/components isn't a
            // component, it's a README.
            else if (entry.name.endsWith('.astro') || (folder.includes(`${path.sep}pages`) && pageRequests_1.PAGE_MD_RE.test(entry.name))) {
                out.push(full);
            }
        }
    };
    walk(directory, 0);
    return out;
}
function routeForPage(projectPath, pagePath) {
    const pagesDirectory = path.join(projectPath, 'src', 'pages');
    let rel = (0, mainHelpers_1.toPosix)(path.relative(pagesDirectory, pagePath)).replace(/\.(astro|mdx?)$/i, '');
    if (rel === 'index') {
        return '/';
    }
    if (rel.endsWith('/index')) {
        rel = rel.slice(0, -'/index'.length);
    }
    return '/' + rel;
}
function isAstroProject(directory) {
    const pkgPath = path.join(directory, 'package.json');
    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = (0, mainHelpers_1.parseRecord)((0, mainHelpers_1.readJson)(pkgPath));
            const deps = { ...(0, record_1.toRecord)(pkg['dependencies']), ...(0, record_1.toRecord)(pkg['devDependencies']) };
            if ((0, mainHelpers_1.parseOptionalString)(deps['astro'])) {
                return true;
            }
        }
        catch {
            /* fall through */
        }
    }
    return ['astro.config.mjs', 'astro.config.ts', 'astro.config.js'].some((file) => fs.existsSync(path.join(directory, file)));
}
// Astro has to be installed for a page to be rendered at all; without it the
// card can only offer to open the project.
function hasDependencies(projectPath) {
    const binName = mainHelpers_1.isWin ? 'astro.cmd' : 'astro';
    return fs.existsSync(path.join(projectPath, 'node_modules', '.bin', binName));
}
