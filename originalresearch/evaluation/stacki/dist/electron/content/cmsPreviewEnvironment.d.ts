import type { CmsConnectionStore } from './cmsConnectionStore';
export type PreviewEnvironment = Readonly<Record<string, string>>;
export declare function cmsPreviewEnvironment(store: CmsConnectionStore, projectRoot: string): PreviewEnvironment;
