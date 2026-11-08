export declare const parsePageText: import("../core/boundary").Parser<{} & {
    readonly title?: string;
    readonly description?: string;
}>;
export type PageText = Readonly<ReturnType<typeof parsePageText>>;
