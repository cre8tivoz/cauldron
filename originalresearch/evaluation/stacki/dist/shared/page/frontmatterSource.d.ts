import type { ImportMember, FrontmatterLayout } from './frontmatter';
export type { ImportMember, ImportSlot, FrontmatterLayout } from './frontmatter';
type SerializableImport = Omit<ImportMember, 'at'> & {
    readonly at?: number;
};
export interface FrontmatterModel<Import extends SerializableImport = ImportMember> {
    readonly imports: readonly Import[];
    readonly frontmatterLead: string;
    readonly extraFrontmatter: string;
    readonly extraFrontmatterSpaced: boolean;
    readonly frontmatterLayout?: FrontmatterLayout;
}
declare function readFrontmatter(source?: string): FrontmatterModel;
declare function writeFrontmatter<Import extends SerializableImport>(model: FrontmatterModel<Import>, specFor?: (imp: Import) => string): string;
export { readFrontmatter, writeFrontmatter };
export declare function mapModuleSpecifiers(source: string, map: (path: string) => string): string;
