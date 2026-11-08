import ts from 'typescript';
export declare function createPropertyTypeReader(document: ts.SourceFile): (type: ts.TypeNode) => string;
