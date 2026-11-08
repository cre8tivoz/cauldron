"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.desktopRenameWriter = desktopRenameWriter;
const limits_1 = require("../../shared/core/limits");
const result_1 = require("../../shared/core/result");
const span_1 = require("../../shared/core/span");
const atomicWrite_1 = require("../documents/atomicWrite");
const documentWrites_1 = require("../documents/documentWrites");
/** Desktop uses the same witnessed actors as normal editor saves. */
function desktopRenameWriter() {
    const { documents, noteWrite } = (0, documentWrites_1.documentHost)();
    return {
        lease: (texts, run) => {
            if (texts.length > limits_1.LIMITS.documentActorsMax) {
                return (0, result_1.err)({
                    code: 'limit',
                    message: 'Too many linked files for one rename. Split the refactor.',
                });
            }
            const leased = documents.withLeases(texts, run);
            return leased.ok ? leased.value : (0, result_1.err)({ code: 'filesystem', message: leased.error });
        },
        current: (file) => {
            const current = documents.current(file);
            if (!current.ok) {
                return current;
            }
            const decoded = (0, span_1.decodeUtf8)(current.value.bytes);
            return decoded.ok ? (0, result_1.ok)(decoded.value) : (0, result_1.err)({ code: 'encoding', message: `${file} is not UTF-8.` });
        },
        write: (entry) => {
            noteWrite(entry.file);
            const report = documents.writeText(entry.file, entry.after, (0, atomicWrite_1.digestOf)(entry.before));
            return report.tag === 'applied' ? (0, result_1.ok)(undefined) : (0, result_1.err)({ code: 'write', message: (0, documentWrites_1.describeWriteReport)(entry.file, report) });
        },
    };
}
