import { type PackageManager } from '../../shared/properties/packageManager';
export declare const PNPM_TOLERATE_IGNORED_BUILDS = "--config.strict-dep-builds=false";
export declare function installArguments(manager: PackageManager): readonly string[];
export declare function detectPackageManager(directory: string): PackageManager;
