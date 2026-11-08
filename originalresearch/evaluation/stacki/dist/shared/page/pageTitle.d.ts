import type { Attr } from './pageNode';
interface TitleNode {
    readonly id?: string;
    readonly kind: string;
    readonly props?: Readonly<Record<string, Attr>> | undefined;
}
export declare function layoutPageTitle(nodes: readonly TitleNode[], inheritedTitle?: string): string | undefined;
export {};
