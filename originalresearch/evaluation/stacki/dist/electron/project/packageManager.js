"use strict";
// Which package manager a project uses. Kept apart from projectFiles so Studio's
// publishing services can share it without the project scan.
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
exports.PNPM_TOLERATE_IGNORED_BUILDS = void 0;
exports.installArguments = installArguments;
exports.detectPackageManager = detectPackageManager;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const mainHelpers_1 = require("../lib/mainHelpers");
const packageManager_1 = require("../../shared/properties/packageManager");
// By default `pnpm` blocks dependency build scripts and, since v11, exits with an error when it
// does, though everything else is installed. Keep them blocked; just don't fail the install.
exports.PNPM_TOLERATE_IGNORED_BUILDS = '--config.strict-dep-builds=false';
// Installs a project's dependencies with its own manager.
function installArguments(manager) {
    switch (manager) {
        case 'npm':
            return ['install', '--no-audit', '--no-fund'];
        case 'pnpm':
            return ['install', exports.PNPM_TOLERATE_IGNORED_BUILDS];
        case 'yarn':
        case 'bun':
            return ['install'];
        default: {
            const exhaustive = manager;
            return exhaustive;
        }
    }
}
// The packageManager field in package.json names it outright; otherwise the
// lockfile shows which one last installed; else npm.
function detectPackageManager(directory) {
    const declared = declaredPackageManager(directory);
    if (declared !== undefined) {
        return declared;
    }
    if (fs.existsSync(path.join(directory, 'pnpm-lock.yaml'))) {
        return 'pnpm';
    }
    if (fs.existsSync(path.join(directory, 'yarn.lock'))) {
        return 'yarn';
    }
    if (fs.existsSync(path.join(directory, 'bun.lockb')) || fs.existsSync(path.join(directory, 'bun.lock'))) {
        return 'bun';
    }
    return 'npm';
}
function declaredPackageManager(directory) {
    const manifest = path.join(directory, 'package.json');
    if (!fs.existsSync(manifest)) {
        return undefined;
    }
    try {
        return (0, packageManager_1.parsePackageManagerField)((0, mainHelpers_1.parseRecord)((0, mainHelpers_1.readJson)(manifest))['packageManager']);
    }
    catch {
        // An unreadable package.json falls back to the lockfile; the install reports it.
        return undefined;
    }
}
