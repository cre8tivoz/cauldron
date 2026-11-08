import ts from 'typescript';
import { type Result } from '../../shared/core/result';
import { isAstroProps, syntaxNodes } from '../parse/astroSyntax';
export interface SourceEdit {
    readonly start: number;
    readonly end: number;
    readonly text: string;
}
export interface PropertySyntax {
    readonly source: string;
    readonly start: number;
    readonly end: number;
    readonly frontmatter: string;
    readonly syntax: ts.SourceFile;
}
export declare function readPropertySyntax(source: string): PropertySyntax;
export declare function replaceFrontmatter(document: PropertySyntax, frontmatter: string): string;
export declare function applySourceEdits(source: string, edits: readonly SourceEdit[]): string;
export declare function syntaxError(source: string): string | undefined;
export declare function validatePropertyCode(type: string, expression: string): Result<void>;
export { isAstroProps, syntaxNodes };
export declare function propertyKey(node: ts.PropertyName | ts.BindingName | undefined): string | undefined;
export declare function defaultExpression(source: string): string;
