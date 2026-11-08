export interface CanvasTextTarget {
    readonly kind: 'element' | 'component';
    readonly key: string;
    readonly path: string;
    readonly parent: string;
    readonly value: string;
    readonly label: string;
    readonly nested: boolean;
    readonly tag: string;
    readonly siblings: readonly string[];
    /**
     * The page instance this text belongs to, for text inside a component: only
     * a click inside that copy edits it, so two copies showing the same words
     * never edit each other's prop.
     */
    readonly scope?: string;
    /**
     * Text a page hands to a component instance: `slot` for the instance's own
     * content (`<Slider>Words</Slider>`), `prop` for one of its props
     * (`<Slider heading="Words" />`). The canvas marks it with a dashed outline
     * while that instance — not something inside it — is selected, so it reads
     * as editable. Like any text, a double click types in it; a single click
     * selects.
     */
    readonly from?: 'slot' | 'prop';
    /**
     * For a prop the component renders as HTML (`set:html`): which text node,
     * in document order, inside the element at `parent`. Markup from a prop
     * carries no canvas paths, so its runs are told apart by position.
     */
    readonly segment?: number;
}
export interface CanvasTextCatalog {
    readonly type: 'avb:text-catalog';
    readonly session: string;
    readonly file: string;
    readonly checksum: string;
    readonly targets: readonly CanvasTextTarget[];
}
export type CanvasTextEvent = {
    readonly type: 'avb:text-save' | 'avb:text-draft';
    readonly session: string;
    readonly key: string;
    readonly value: string;
} | {
    readonly type: 'avb:text-refused';
    readonly message: string;
};
export declare const CANVAS_TEXT_LIMIT = 10000;
export declare const CANVAS_TARGET_LIMIT = 2000;
export declare function canvasTextValue(input: unknown): string;
export declare function parseCanvasTextCatalog(input: unknown): CanvasTextCatalog;
export declare function parseCanvasTextEvent(input: unknown): CanvasTextEvent | undefined;
/** How many shown characters precede `offset` in `text`. */
export declare function canvasTextFolded(text: string, offset: number): number;
/**
 * The offset in `text` where `folded` shown characters have gone by: for a
 * start, at the next shown character; for an end, right after the last one.
 * Undefined when the text shows fewer characters than that.
 */
export declare function canvasTextUnfolded(text: string, folded: number, edge: 'start' | 'end'): number | undefined;
