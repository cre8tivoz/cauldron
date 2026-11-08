import type { ScanPage } from '../../shared/properties/projectScan';
import { type Alias } from '../content/cmsRefs';
export type PageTitleSource = {
    readonly specifier: string | undefined;
} & ({
    readonly kind: 'inherit';
} | {
    readonly kind: 'override';
    readonly title: string | undefined;
});
export declare function scanPageTitles(pages: readonly ScanPage[], sources: readonly {
    readonly file: string;
    readonly text: string;
}[], aliases?: readonly Alias[]): readonly ScanPage[];
export declare function resolvePageTitles(pages: readonly ScanPage[], aliases: readonly Alias[], read: (file: string) => PageTitleSource | undefined): readonly ScanPage[];
export declare function scanPageTitleSource(text: string): PageTitleSource | undefined;
