import ts from 'typescript';
import type { Result } from '../../shared/core/result';
export interface SpanEdit {
    readonly start: number;
    readonly end: number;
    readonly text: string;
}
export interface Located {
    readonly file: ts.SourceFile;
    /** The collection's entry in `collections`: its key node, and how it is written. */
    readonly entry: ts.ObjectLiteralElementLike;
    readonly call: ts.CallExpression | undefined;
    readonly object: ts.ObjectLiteralExpression | undefined;
}
export declare const CONFIG_CHARS_MAX = 2000000;
export declare const CHAIN_STEPS_MAX = 32;
export declare function propertyList(object: ts.ObjectLiteralExpression, file: ts.SourceFile, texts: readonly string[]): SpanEdit;
/** The collection a field's reference (or list of them) points at. */
export declare function referenceTarget(property: ts.ObjectLiteralElementLike): string | undefined;
export declare function locate(source: string, collection: string): Result<Located, string>;
export declare function collectionsObject(file: ts.SourceFile): ts.ObjectLiteralExpression | undefined;
export declare function defineCall(entry: ts.ObjectLiteralElementLike, file: ts.SourceFile): ts.CallExpression | undefined;
export declare function schemaProperty(call: ts.CallExpression | undefined): ts.PropertyAssignment | undefined;
export declare function schemaObject(call: ts.CallExpression | undefined): ts.ObjectLiteralExpression | undefined;
export declare function returned(block: ts.Block): ts.Expression | undefined;
export declare function propertyName(property: ts.ObjectLiteralElementLike): string | undefined;
export declare function keyText(name: string, style: {
    readonly quoted: boolean;
}): string;
export declare function quoteOf(literal: ts.StringLiteralLike, file: ts.SourceFile): string;
export declare function unwrap(node: ts.Expression | undefined): ts.Expression | undefined;
export declare function lineIndent(text: string, offset: number): string;
/** Applies span edits, the last first, so earlier offsets hold. */
export declare function applyEdits(source: string, edits: readonly SpanEdit[]): string;
