export declare const parseStyleSource: import("../core/boundary").Parser<{
    readonly label: string;
} & {
    readonly path?: string;
}>;
export type StyleSource = ReturnType<typeof parseStyleSource>;
