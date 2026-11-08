import { type PackageComponentSource } from '../../shared/properties/componentSources';
export declare function readComponentSources(root: string): readonly PackageComponentSource[];
export declare function packageComponentFiles(root: string): readonly string[];
export declare function readPackageSource(root: string, file: string): string;
export declare function readPackagePreviews(root: string): {
    file: string;
    importPath: string;
    source: string;
}[];
export declare function packageSourcePath(root: string, file: string): string;
export declare function packageComponentImport(root: string, file: string): string | undefined;
