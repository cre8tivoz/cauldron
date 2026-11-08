"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMacNativeBindings = verifyMacNativeBindings;
// Each Mac package must carry working terminal binaries for its own CPU.
// Checking the target, rather than the build host, also covers cross-packaging.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
function verifyMacNativeBindings(directory, architecture) {
    const cpuType = architecture === 'x64' ? 0x01000007 : 0x0100000c;
    // Two known binaries bound this check regardless of other package contents.
    for (const name of ['pty.node', 'spawn-helper']) {
        const file = path.join(directory, 'prebuilds', `darwin-${architecture}`, name);
        verifyMacNativeHeader(file, cpuType);
        if (name === 'spawn-helper') {
            assert.equal(fs.statSync(file).mode & 0o111, 0o111, 'Mac spawn-helper must be executable');
        }
    }
}
function verifyMacNativeHeader(file, cpuType) {
    assert.ok(fs.existsSync(file), `Missing Mac node-pty binary: ${file}`);
    const header = Buffer.alloc(8);
    const descriptor = fs.openSync(file, 'r');
    try {
        assert.equal(fs.readSync(descriptor, header, 0, header.length, 0), header.length);
    }
    finally {
        fs.closeSync(descriptor);
    }
    assert.equal(header.readUInt32LE(0), 0xfeedfacf, 'Mac node-pty must be a 64-bit Mach-O binary');
    assert.equal(header.readUInt32LE(4), cpuType, 'Mac node-pty must match its prebuild directory');
}
