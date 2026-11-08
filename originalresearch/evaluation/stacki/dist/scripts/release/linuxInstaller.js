"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeLinuxInstaller = writeLinuxInstaller;
exports.linuxInstallerTemplate = linuxInstallerTemplate;
// `dpkg` requires a shell maintainer script. Generate that build artifact from the
// pinned builder template so command/link handling stays owned by the packager.
const assert = require("node:assert/strict");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
function writeLinuxInstaller(root) {
    const template = (0, node_fs_1.readFileSync)(require.resolve('app-builder-lib/templates/linux/after-install.tpl'), 'utf8');
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(root, 'dist/resources/linuxAfterInstall.tpl'), linuxInstallerTemplate(template));
}
function linuxInstallerTemplate(template) {
    // A root unshare probe cannot establish whether AppArmor lets desktop users
    // create namespaces. Always install the supported, root-owned setuid helper
    // instead of silently disabling Chromium's sandbox or changing host policy.
    const pattern = /# Check if user namespaces[^]*?\nfi\n/;
    assert.ok(template.length < 10000, 'Linux installer template exceeds limit');
    assert.ok(pattern.test(template), 'Builder sandbox template changed; review the Linux installer');
    const script = template.replace(pattern, [
        '# Configure the Chromium sandbox for unprivileged desktop users.',
        "chown root:root '/opt/${sanitizedProductName}/chrome-sandbox' || exit 1",
        "chmod 4755 '/opt/${sanitizedProductName}/chrome-sandbox' || exit 1",
        '',
    ].join('\n'));
    assert.ok(!script.includes('chmod 0755'), 'Installer must retain the setuid sandbox helper');
    return script;
}
