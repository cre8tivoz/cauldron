import type { PreviewServer } from '../lib/mainTypes';
export declare const previewServers: Map<string, PreviewServer>;
export declare function stopPreview(projectPath: string): Promise<void>;
export declare function stopAllPreviews(): void;
