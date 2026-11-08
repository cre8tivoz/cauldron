export declare const PAGE_ORDER_LIMITS: {
    readonly entriesMax: 20000;
    readonly pathCharsMax: 1024;
};
export interface PageOrder {
    readonly version: 1;
    readonly entries: readonly string[];
}
export declare const EMPTY_PAGE_ORDER: PageOrder;
export type PageDropPosition = 'before' | 'after';
export declare function pageOrderKey(input: unknown): string | undefined;
export declare function parsePageOrder(input: unknown): PageOrder;
export declare function pageOrderParent(key: string): string;
export declare function reorderPageEntries(order: PageOrder, siblings: readonly string[], move: {
    readonly source: string;
    readonly target: string;
    readonly position: PageDropPosition;
}): PageOrder;
