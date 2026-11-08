export declare const PACKAGE_MANAGERS: readonly ["npm", "pnpm", "yarn", "bun"];
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];
export declare const CREATE_PACKAGE_MANAGERS: readonly ["npm", "pnpm"];
export type CreatePackageManager = (typeof CREATE_PACKAGE_MANAGERS)[number];
export declare function parseCreatePackageManager(input: unknown): CreatePackageManager;
export declare function packageManagerLabel(manager: PackageManager): string;
export declare function parsePackageManagerField(input: unknown): PackageManager | undefined;
