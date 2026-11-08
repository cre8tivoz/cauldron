export interface ImportMember {
    readonly name: string;
    readonly path: string;
    readonly quote: string;
    readonly at: number;
    readonly named?: boolean;
    readonly imported?: string;
    readonly typeOnly?: boolean;
}
export interface ImportSlot {
    readonly at: number;
    readonly offset: number;
    readonly source: string;
    readonly suffix: string;
    readonly tail: string;
    readonly members: readonly ImportMember[];
}
export interface FrontmatterLayout {
    readonly extra: string;
    readonly slots: readonly ImportSlot[];
}
export declare function parseImportSlots(input: unknown): readonly ImportSlot[];
export declare function parseImportSlot(input: unknown): ImportSlot;
export declare function parseImportMember(input: unknown): ImportMember;
