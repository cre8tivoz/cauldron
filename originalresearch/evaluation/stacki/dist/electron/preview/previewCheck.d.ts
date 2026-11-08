import { type Digest } from '../../shared/core/brand';
import { type PreviewRender, type PreviewVerdict } from '../../shared/page/previewToken';
/** Judge `render` against the files under `projectPath` now. */
export declare function checkPreviewRender(projectPath: string, render: PreviewRender): PreviewVerdict;
/** The token of a canonical manifest: SHA-256 of its UTF-8 bytes. */
export declare function sha256Text(text: string): Digest;
