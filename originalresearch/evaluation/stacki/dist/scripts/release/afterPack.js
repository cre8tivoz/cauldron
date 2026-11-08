"use strict";
// electron-builder hook that restores node-pty's spawn-helper execute bit in
// the copied application, where packaging can otherwise remove it.
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = afterPack;
const fs = require("node:fs");
const path = require("node:path");
const builder_util_1 = require("builder-util");
const fixNodePtyPermissions_1 = require("../install/fixNodePtyPermissions");
const linuxNativeBinding_1 = require("./linuxNativeBinding");
const macNativeBindings_1 = require("./macNativeBindings");
function packageArchitecture(architecture) {
    if (architecture === builder_util_1.Arch.arm64) {
        return 'arm64';
    }
    if (architecture === builder_util_1.Arch.x64) {
        return 'x64';
    }
    throw new Error(`The package architecture ${architecture} is not supported.`);
}
function afterPack(context) {
    const appName = context.packager.appInfo.productFilename;
    const unpacked = context.electronPlatformName === 'darwin'
        ? path.join(context.appOutDir, `${appName}.app`, 'Contents', 'Resources', 'app.asar.unpacked')
        : path.join(context.appOutDir, 'resources', 'app.asar.unpacked');
    const nodePtyDirectory = path.join(unpacked, 'node_modules', 'node-pty');
    if (context.electronPlatformName === 'linux') {
        if (context.arch !== builder_util_1.Arch.x64) {
            throw new Error('The Linux release currently supports x64.');
        }
        (0, linuxNativeBinding_1.verifyLinuxNativeBinding)(nodePtyDirectory);
        console.log('  • afterPack: verified the Linux x64 node-pty native binding');
        return;
    }
    if (context.electronPlatformName === 'win32') {
        const architecture = packageArchitecture(context.arch);
        const nativeBinding = path.join(nodePtyDirectory, 'prebuilds', `win32-${architecture}`, 'pty.node');
        if (!fs.existsSync(nativeBinding)) {
            throw new Error(`The packaged Windows app is missing the ${architecture} node-pty binding.`);
        }
        console.log('  • afterPack: verified the Windows node-pty native binding');
        return;
    }
    const fixed = (0, fixNodePtyPermissions_1.fixNodePtyPermissions)(nodePtyDirectory);
    (0, macNativeBindings_1.verifyMacNativeBindings)(nodePtyDirectory, packageArchitecture(context.arch));
    console.log(fixed.length > 0
        ? `  • afterPack: restored exec bit on ${fixed.length} node-pty spawn-helper(s)`
        : '  • afterPack: node-pty spawn-helper already executable');
}
