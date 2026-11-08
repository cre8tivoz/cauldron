export type SigningFixResult = 'already-patched' | 'not-installed' | 'patched';
export declare function patchSigningSource(source: string): string;
export declare function fixElectronBuilderSigning(projectDirectory?: string): SigningFixResult;
