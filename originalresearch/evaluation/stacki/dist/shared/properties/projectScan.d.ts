import { type ComponentOrigin } from './componentSources';
import { type PropField } from './propSchema';
export interface ScanPage {
    readonly path: string;
    /** POSIX path relative to src/pages — the route's file identity. */
    readonly name: string;
    readonly route: string;
    /** Literal layout title for display; name remains the route file identity. */
    readonly title?: string | undefined;
    /** Wrapper's literal title, used when a live page removes its own override. */
    readonly inheritedTitle?: string | undefined;
}
export interface RenderTag {
    readonly tag?: string;
    readonly prop?: string;
}
export interface ScanComponent {
    readonly origin?: ComponentOrigin;
    readonly path: string;
    readonly name: string;
    readonly folder: string;
    readonly isLayout?: boolean;
    readonly instances?: number;
    readonly schema?: readonly PropField[];
    readonly extendsTag?: string | undefined;
    readonly slots?: readonly string[];
    readonly slotText?: boolean;
    readonly renderTag?: RenderTag | undefined;
    readonly hasRest?: boolean;
}
export interface ScanResult {
    readonly pages: readonly ScanPage[];
    readonly pageFolders: readonly string[];
    readonly layouts: readonly ScanComponent[];
    readonly components: readonly ScanComponent[];
    readonly trailingSlash?: string;
}
export declare function parseScanResult(input: unknown): ScanResult;
export declare function parseScanPages(input: unknown): readonly ScanPage[];
