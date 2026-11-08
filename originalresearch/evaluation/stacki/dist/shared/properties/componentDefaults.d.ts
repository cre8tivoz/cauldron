import { type Result } from '../core/result';
export declare const COMPONENT_DEFAULTS_FILE = ".stacki/components.json";
export declare const DEFAULT_LIMITS: {
    readonly componentsMax: 512;
    readonly childrenMax: 32;
    readonly depthMax: 12;
    readonly nodesMax: 256;
    readonly propsMax: 64;
    readonly textCharsMax: 16384;
    readonly sourceCharsMax: 262144;
    readonly storedNodesMax: 4096;
};
export type DefaultValue = string | number | boolean;
export interface ComponentRecipe {
    readonly props?: Readonly<Record<string, DefaultValue>>;
    readonly text?: string;
    readonly children?: readonly RecipeChild[];
}
export interface ComponentChild extends ComponentRecipe {
    readonly component: string;
    readonly inherit?: false;
}
export interface ElementChild extends ComponentRecipe {
    readonly element: string;
}
export type RecipeChild = ComponentChild | ElementChild | {
    readonly literal: string;
};
export interface ComponentDefaults {
    readonly version: 1;
    readonly components: Readonly<Record<string, ComponentRecipe>>;
}
export interface DefaultComponent {
    readonly importPath?: string;
    readonly file: string;
    readonly name: string;
    readonly props: readonly string[];
    readonly slots: readonly string[];
    readonly slotText: boolean;
}
export interface DefaultsSnapshot {
    readonly source?: string;
    readonly config: ComponentDefaults;
    readonly catalog: readonly DefaultComponent[];
}
export declare function componentFile(input: unknown): string;
export declare function parseComponentDefaults(input: unknown): ComponentDefaults;
export declare function parseDefaultsSource(source: string): Result<ComponentDefaults>;
export declare const parseDefaultComponent: import("../core/boundary").Parser<{
    readonly file: string;
    readonly name: string;
    readonly props: string[];
    readonly slots: string[];
    readonly slotText: boolean;
} & {
    readonly importPath?: string;
}>;
export declare const parseDefaultsSnapshot: import("../core/boundary").Parser<{
    readonly config: ComponentDefaults;
    readonly catalog: ({
        readonly file: string;
        readonly name: string;
        readonly props: string[];
        readonly slots: string[];
        readonly slotText: boolean;
    } & {
        readonly importPath?: string;
    })[];
} & {
    readonly source?: string;
}>;
export declare const parseDefaultsSave: import("../core/boundary").Parser<{
    readonly config: ComponentDefaults;
} & {
    readonly source?: string;
}>;
export declare function defaultValue(input: unknown): DefaultValue;
export interface ResolvedContent {
    readonly props: Readonly<Record<string, DefaultValue>>;
    readonly content: {
        readonly kind: 'empty';
    } | {
        readonly kind: 'text';
        readonly text: string;
    } | {
        readonly kind: 'children';
        readonly children: readonly ResolvedNode[];
    };
}
export interface ResolvedRecipe extends ResolvedContent {
    readonly component: string;
}
export type ResolvedNode = ResolvedRecipe | (ResolvedContent & {
    readonly element: string;
}) | {
    readonly literal: string;
};
export declare function resolveComponentRecipe(file: string, config: ComponentDefaults, catalog: readonly DefaultComponent[]): Result<ResolvedRecipe>;
export declare function defaultsIssues(config: ComponentDefaults, catalog: readonly DefaultComponent[]): readonly string[];
/** Relinking after a move updates owners and every nested child reference together. */
export declare function relinkDefaults(config: ComponentDefaults, from: string, to: string): Result<ComponentDefaults>;
