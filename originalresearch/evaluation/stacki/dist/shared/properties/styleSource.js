"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStyleSource = void 0;
// Preview provenance is descriptive until its path matches the current source tree.
// Both processes share the parser so page scripts cannot forge unchecked metadata.
const boundary_1 = require("../core/boundary");
exports.parseStyleSource = (0, boundary_1.object)({ label: boundary_1.text, path: (0, boundary_1.optional)(boundary_1.pathText) });
