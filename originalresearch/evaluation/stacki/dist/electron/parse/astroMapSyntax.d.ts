export interface MapSyntax {
    readonly form: 'markup' | 'conditional' | 'block' | 'general';
    readonly head: string;
    readonly parts: readonly string[];
    readonly markup: readonly {
        readonly start: number;
        readonly end: number;
    }[];
}
export declare function readMapSyntax(source: string): MapSyntax | undefined;
