"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installDocumentHost = installDocumentHost;
exports.documentHost = documentHost;
exports.writeProjectText = writeProjectText;
exports.createProjectText = createProjectText;
exports.describeWriteReport = describeWriteReport;
const atomicWrite_1 = require("./atomicWrite");
// The one document host of the main process, and the entry points every module
// uses to write project text (plan §3.3, §5.2: one writer per file). main.ts
// installs the host at startup with its telemetry log and the note that the app
// wrote a file (the canvas may need to hear of it); modules that are also
// loaded without main (tests, the CSS variable tools) get a quiet default
// host, so their writes still go through
// actors. The app loads main once. The test harness loads it several times in
// one process, so a later install replaces an earlier host — only while that
// host holds no intent: hosts run each intent to its outcome synchronously, so
// a replaced host has nothing in flight, and the lock file and the re-read
// under it (documentDisk.ts) still serialize any two actors of one file.
const assert_1 = require("../../shared/core/assert");
const documentActors_1 = require("./documentActors");
// The module's single piece of state: the process's host, set once.
let installed;
/** Install the process's document host (see the header on replacing one). */
function installDocumentHost(host) {
    if (installed !== undefined) {
        (0, assert_1.assert)(installed.documents.quiescent(), 'A document host is replaced only when idle');
    }
    installed = host;
}
function documentHost() {
    installed ??= {
        documents: (0, documentActors_1.createNodeDocumentActors)({ log: () => { }, schedule: (task) => setImmediate(task) }),
        noteWrite: () => { },
    };
    return installed;
}
/** Write project text that no edit named a base for, through its actor: the
 * diff from the file as it is now, witnessed by those bytes (never the whole
 * file); a missing file is created, and anything but `applied` throws like the
 * `fs.writeFileSync` it replaces did. */
function writeProjectText(file, text, expectedSource) {
    const host = documentHost();
    host.noteWrite(file);
    const report = expectedSource === undefined ? host.documents.writeCurrent(file, text) : host.documents.writeText(file, text, (0, atomicWrite_1.digestOf)(expectedSource));
    if (report.tag === 'applied') {
        return report.checksum;
    }
    throw new Error(describeWriteReport(file, report));
}
/** Create a new project file through its actor; never overwrites. */
function createProjectText(file, text) {
    const host = documentHost();
    host.noteWrite(file);
    const created = host.documents.create(file, text);
    if (created.ok) {
        return created.value;
    }
    throw new Error(created.error.message);
}
/** A user-facing sentence for a write that did not apply. */
function describeWriteReport(file, report) {
    switch (report.tag) {
        case 'rejected':
            return report.message === '' ? `Could not save ${file} (${report.reason}).` : report.message;
        case 'uncertain':
            return `${file} may not have been saved: ${report.message}`;
        case 'backpressured':
            return `${file} has too many saves waiting; the edit was kept, save again.`;
        default: {
            const exhaustive = report;
            return exhaustive;
        }
    }
}
