import type { StyleFile } from '../lib/mainTypes';
export declare const CSS_SKIP_DIRECTORIES: Set<string>;
export declare const CSS_ROOT_DIRECTORIES: Set<string>;
export declare function listCssFiles(root: string): StyleFile[];
export declare const ASTRO_GLOBAL_STYLE: RegExp;
export declare const ASTRO_SCAN_LIMIT: number;
export declare function listAstroStyleFiles(root: string): StyleFile[];
