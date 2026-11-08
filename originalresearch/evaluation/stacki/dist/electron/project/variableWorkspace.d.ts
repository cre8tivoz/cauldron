import fs from 'node:fs';
export { writeProjectText } from '../documents/documentWrites';
export { MAIN_LIMITS } from '../lib/mainLimits';
export declare const variableFiles: {
    readFileSync: (file: string, encoding: "utf8") => string;
    readdirSync: (directory: string, options: {
        readonly withFileTypes: true;
    }) => fs.Dirent<string>[];
    statSync: (file: string) => fs.Stats;
};
