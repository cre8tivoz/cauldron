import type { SchemaField } from '../parse/astroParserTypes';
export declare function importedTypes(source: string, filePath: string, projectPath: string): string;
export declare function safeSchema(filePath: string, projectPath: string): {
    schema: SchemaField[];
    extendsTag: string | undefined;
    slots: string[];
    slotText: boolean;
    renderTag: import("../parse/astroParserTypes").RenderTag | undefined;
    hasRest: boolean;
};
export declare function literalValue(raw: string | undefined): string | number | boolean | undefined;
export declare function constLiteralIn(code: string, name: string): string | number | boolean | undefined;
export declare function findNamedImport(code: string, name: string): {
    orig: string;
    spec: string;
} | undefined;
export declare function resolveModuleFile(spec: string, fromFile: string, projectPath: string): string | undefined;
export declare function resolveIdentifierDefaults(schema: readonly SchemaField[], source: string, filePath: string, projectPath: string): SchemaField[];
export declare function constMemberLiteralIn(source: string, name: string, key: string): string | number | boolean | undefined;
export declare function defaultAssetIn(source: string, expression: string, filePath: string, projectPath: string): string | undefined;
