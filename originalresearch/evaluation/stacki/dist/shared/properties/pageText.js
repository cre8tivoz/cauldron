"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePageText = void 0;
// Layouts can delegate metadata to components or a CMS. The rendered values
// cross the iframe boundary as bounded text, never as executable expressions.
const boundary_1 = require("../core/boundary");
exports.parsePageText = (0, boundary_1.object)({ title: (0, boundary_1.optional)(boundary_1.text), description: (0, boundary_1.optional)(boundary_1.text) });
