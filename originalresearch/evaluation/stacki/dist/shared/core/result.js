"use strict";
// Expected failures are values (AGENTS.md §3); programmer errors assert and
// crash (assert.ts). The channels never mix: do not catch an assertion into a
// Result, and do not return err for a violated invariant.
Object.defineProperty(exports, "__esModule", { value: true });
exports.err = exports.ok = void 0;
const ok = (value) => ({ ok: true, value });
exports.ok = ok;
const err = (error) => ({ ok: false, error });
exports.err = err;
