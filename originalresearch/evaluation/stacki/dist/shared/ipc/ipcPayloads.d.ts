import { parseCommitDiffRequest } from './gitCommitDiff';
import { parseEditBatchRequest, parseEditRequest } from '../engine/editRequest';
import { pathText } from '../core/boundary';
import type { Parsed } from '../core/boundary';
export declare const TERMINAL_DIMENSION_MAX = 32767;
export type SampleValueSource = {
    readonly kind: 'call';
    readonly spec: string;
    readonly name: string;
} | {
    readonly kind: 'scope';
    readonly sinceMs: number;
};
export declare function sampleValueSource(input: unknown): SampleValueSource;
export declare const CLIPBOARD_BYTES_MAX: number;
export declare const IPC_PAYLOADS: {
    readonly 'project:metadata': import("../core/boundary").Parser<{
        readonly kind: "pages" | "publish" | "components" | "componentSources" | "guide" | "styles";
        readonly projectPath: string;
    } & {}>;
    readonly 'project:createDefaultsCanvas': import("../core/boundary").Parser<{
        readonly canvas: {
            readonly file: string;
            readonly source: string;
        } & {};
        readonly projectPath: string;
    } & {}>;
    readonly 'project:removeDefaultsCanvas': import("../core/boundary").Parser<{
        readonly file: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'project:writeMetadata': import("../core/boundary").Parser<{
        readonly write: {
            readonly kind: "pages" | "publish" | "components" | "componentSources" | "guide" | "styles";
            readonly source: string;
        } & {
            readonly base?: string;
        };
        readonly projectPath: string;
    } & {}>;
    readonly 'studio:status': typeof pathText;
    readonly 'studio:install': import("../core/boundary").Parser<{
        readonly source: "file" | "published";
        readonly requestId: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'assets:delete': import("../core/boundary").Parser<{
        readonly rel: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'assets:dimensions': import("../core/boundary").Parser<{
        readonly rel: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'assets:list': typeof pathText;
    readonly 'assets:mkdir': import("../core/boundary").Parser<{
        readonly parentRel: string;
        readonly name: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'assets:move': import("../core/boundary").Parser<{
        readonly fromRel: string;
        readonly toDirRel: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'assets:pickUpload': import("../core/boundary").Parser<{
        readonly destRel: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'assets:readText': import("../core/boundary").Parser<{
        readonly rel: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'assets:convert': import("../core/boundary").Parser<{
        readonly rel: string;
        readonly format: import("./assetConversion").ImageFormat;
        readonly projectPath: string;
    } & {}>;
    readonly 'assets:rename': import("../core/boundary").Parser<{
        readonly newName: string;
        readonly rel: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'assets:upload': import("../core/boundary").Parser<{
        readonly destRel: string;
        readonly projectPath: string;
    } & {
        readonly filePaths?: string[];
    }>;
    readonly 'assets:writeText': import("../core/boundary").Parser<{
        readonly text: string;
        readonly rel: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'cms:assetRef': import("../core/boundary").Parser<{
        readonly assetRel: string;
        readonly rel: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'cms:create': import("../core/boundary").Parser<{
        readonly name: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'cms:delete': import("../core/boundary").Parser<{
        readonly rel: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'cms:list': typeof pathText;
    readonly 'cms:meta': typeof pathText;
    readonly 'cms:read': import("../core/boundary").Parser<{
        readonly rel: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'cms:setMeta': import("../core/boundary").Parser<{
        readonly rel: string;
        readonly projectPath: string;
    } & {
        readonly fields?: Record<string, import("../core/boundary").Data> | null;
    }>;
    readonly 'cms:usage': import("../core/boundary").Parser<{
        readonly rel: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'cms:write': import("../core/boundary").Parser<{
        readonly rel: string;
        readonly projectPath: string;
    } & {
        readonly data?: string | number | boolean | import("../core/boundary").Data[] | import("../core/boundary").DataRecord | null;
    }>;
    readonly 'component:create': import("../core/boundary").Parser<{
        readonly pagePath: string;
        readonly nodes: import("../core/boundary").Data[];
        readonly name: string;
        readonly projectPath: string;
    } & {
        readonly imports?: ({} & {
            readonly name?: string;
            readonly path?: string;
        })[];
        readonly props?: import("../core/boundary").Data[];
    }>;
    readonly 'component:discard': import("../core/boundary").Parser<{
        readonly path: string;
        readonly checksum: import("../core/brand").Digest;
        readonly projectPath: string;
    } & {
        readonly force?: boolean;
    }>;
    readonly 'component:properties': import("../core/boundary").Parser<{
        readonly file: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'component:revertProperties': import("../core/boundary").Parser<{
        readonly token: string;
    } & {}>;
    readonly 'component:editProperties': import("../core/boundary").Parser<{
        readonly file: string;
        readonly source: string;
        readonly change: import("../properties/propertyEditing").PropertyChange;
        readonly projectPath: string;
    } & {}>;
    readonly 'component:usage': import("../core/boundary").Parser<{
        readonly name: string;
        readonly projectPath: string;
    } & {
        readonly exclude?: string;
    }>;
    readonly 'content:collections': typeof pathText;
    readonly 'content:config': import("../core/boundary").Parser<{
        readonly projectPath: string;
    } & {
        readonly force?: boolean;
    }>;
    readonly 'content:entries': import("../core/boundary").Parser<{
        readonly name: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'content:rename': import("../core/boundary").Parser<{
        readonly from: string;
        readonly to: string;
        readonly name: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'content:remoteEdit': import("../core/boundary").Parser<{
        readonly request: import("../properties/astroContent").AstroRemoteEdit;
        readonly projectPath: string;
    } & {}>;
    readonly 'content:remoteRead': import("../core/boundary").Parser<{
        readonly request: import("../properties/astroContent").AstroRemoteRead;
        readonly projectPath: string;
    } & {}>;
    readonly 'content:renamePlan': import("../core/boundary").Parser<{
        readonly from: string;
        readonly to: string;
        readonly name: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'content:sampleEntry': import("../core/boundary").Parser<{
        readonly name: string;
    } & {
        readonly devUrl?: string | null;
        readonly id?: string | null;
        readonly index?: number;
    }>;
    readonly 'content:sampleValue': import("../core/boundary").Parser<{
        readonly pagePath: string;
        readonly source: SampleValueSource;
        readonly projectPath: string;
    } & {
        readonly devUrl?: string | null;
    }>;
    readonly 'content:targets': import("../core/boundary").Parser<{
        readonly name: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'content:validate': import("../core/boundary").Parser<{
        readonly collection: string;
        readonly projectPath: string;
    } & {
        readonly data?: string | number | boolean | import("../core/boundary").Data[] | import("../core/boundary").DataRecord | null;
    }>;
    readonly 'content:writeEntry': import("../core/boundary").Parser<{
        readonly entry: {
            readonly file: string;
        } & {
            readonly locator?: (string | number)[];
        };
        readonly projectPath: string;
    } & {
        readonly edits?: ({
            readonly path: (string | number)[];
        } & {
            readonly value?: string | number | boolean | import("../core/boundary").Data[] | import("../core/boundary").DataRecord | null;
            readonly rename?: string;
        })[];
        readonly body?: string;
        readonly expected?: {} & {
            readonly data?: string | number | boolean | import("../core/boundary").Data[] | import("../core/boundary").DataRecord | null;
            readonly body?: string;
        };
    }>;
    readonly 'css:addSection': import("../core/boundary").Parser<{
        readonly file: string;
        readonly selector: string;
        readonly projectPath: string;
    } & {
        readonly title?: string;
        readonly before?: string;
        readonly at?: number;
    }>;
    readonly 'css:addVariables': import("../core/boundary").Parser<{
        readonly projectPath: string;
    } & {
        readonly adds?: ({
            readonly name: string;
            readonly file: string;
            readonly selector: string;
        } & {
            readonly value?: string;
            readonly after?: string;
        })[];
    }>;
    readonly 'css:moveHeading': import("../core/boundary").Parser<{
        readonly selector: string;
        readonly file: string;
        readonly start: number;
        readonly end: number;
        readonly projectPath: string;
    } & {
        readonly before?: string;
        readonly expect?: string;
    }>;
    readonly 'css:moveVariables': import("../core/boundary").Parser<{
        readonly projectPath: string;
    } & {
        readonly moves?: (({
            readonly name: string;
            readonly file: string;
            readonly selector: string;
        } & {
            readonly target?: string;
            readonly at?: number;
        }) | ({
            readonly names: string[];
            readonly file: string;
            readonly selector: string;
        } & {
            readonly target?: string;
        }))[];
    }>;
    readonly 'css:removeSection': import("../core/boundary").Parser<{
        readonly file: string;
        readonly start: number;
        readonly end: number;
        readonly projectPath: string;
    } & {
        readonly expect?: string;
    }>;
    readonly 'css:renameVariables': import("../core/boundary").Parser<{
        readonly renames: ({
            readonly from: string;
            readonly to: string;
        } & {})[];
        readonly projectPath: string;
    } & {}>;
    readonly 'css:setSectionTitle': import("../core/boundary").Parser<{
        readonly file: string;
        readonly start: number;
        readonly end: number;
        readonly projectPath: string;
    } & {
        readonly title?: string;
        readonly expect?: string;
    }>;
    readonly 'css:setVariable': import("../core/boundary").Parser<{
        readonly file: string;
        readonly valueStart: number;
        readonly valueEnd: number;
        readonly value: string;
        readonly projectPath: string;
    } & {
        readonly expect?: string;
    }>;
    readonly 'css:variables': typeof pathText;
    readonly 'dev:diagnose': typeof pathText;
    readonly 'dev:probe': typeof pathText;
    readonly 'dev:start': typeof pathText;
    readonly 'dev:stop': (input: unknown) => undefined;
    readonly 'git:allFiles': import("../core/boundary").Parser<{
        readonly projectPath: string;
    } & {}>;
    readonly 'git:checkout': import("../core/boundary").Parser<{
        readonly branch: string;
        readonly projectPath: string;
    } & {
        readonly create?: boolean;
        readonly parkFirst?: boolean;
    }>;
    readonly 'git:commit': import("../core/boundary").Parser<{
        readonly message: string;
        readonly projectPath: string;
    } & {
        readonly paths?: string[];
    }>;
    readonly 'git:commitDiff': typeof parseCommitDiffRequest;
    readonly 'git:deleteBranch': import("../core/boundary").Parser<{
        readonly branch: string;
        readonly projectPath: string;
    } & {
        readonly force?: boolean;
    }>;
    readonly 'git:ghStatus': typeof pathText;
    readonly 'git:info': typeof pathText;
    readonly 'git:init': typeof pathText;
    readonly 'git:log': import("../core/boundary").Parser<{
        readonly projectPath: string;
    } & {
        readonly ref?: string;
        readonly limit?: number;
        readonly skip?: number;
        readonly withFiles?: boolean;
    }>;
    readonly 'git:merge': import("../core/boundary").Parser<{
        readonly branch: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'git:park': import("../core/boundary").Parser<{
        readonly projectPath: string;
    } & {}>;
    readonly 'git:repositories': (input: unknown) => undefined;
    readonly 'git:clone': import("../core/boundary").Parser<{
        readonly repository: string;
    } & {}>;
    readonly 'git:connect': import("../core/boundary").Parser<{
        readonly repository: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'publish:start': import("../core/boundary").Parser<{
        readonly target: import("../properties/publishConfig").PublishTarget;
        readonly projectPath: string;
    } & {
        readonly commitMessage?: string;
    }>;
    readonly 'publish:state': typeof pathText;
    readonly 'publish:availability': typeof pathText;
    readonly 'publish:siteURL': typeof pathText;
    readonly 'publish:repository': import("../core/boundary").Parser<{
        readonly request: import("../ipc/publishRepository").RepositoryRequest;
        readonly projectPath: string;
    } & {}>;
    readonly 'publish:discover': import("../core/boundary").Parser<{
        readonly request: import("../properties/publishDiscovery").DiscoveryRequest;
        readonly projectPath: string;
    } & {}>;
    readonly 'publish:account': import("../core/boundary").Parser<{
        readonly request: import("./publishAccount").AccountRequest;
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsConnections:list': import("../core/boundary").Parser<{
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsConnections:save': import("../core/boundary").Parser<{
        readonly draft: import("../properties/cmsConnections").CmsConnectionDraft;
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsConnections:remove': import("../core/boundary").Parser<{
        readonly id: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsConnections:sanityLogin': import("../core/boundary").Parser<{
        readonly request: import("../properties/cmsConnections").SanityLoginRequest;
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsRemote:collections': import("../core/boundary").Parser<{
        readonly connectionId: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsRemote:documents': import("../core/boundary").Parser<{
        readonly connectionId: string;
        readonly collection: string;
        readonly projectPath: string;
    } & {
        readonly columns?: readonly string[];
    }>;
    readonly 'cmsRemote:template': import("../core/boundary").Parser<{
        readonly connectionId: string;
        readonly collection: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsRemote:document': import("../core/boundary").Parser<{
        readonly connectionId: string;
        readonly id: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsRemote:create': import("../core/boundary").Parser<{
        readonly connectionId: string;
        readonly collection: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsRemote:delete': import("../core/boundary").Parser<{
        readonly connectionId: string;
        readonly ids: readonly string[];
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsRemote:move': import("../core/boundary").Parser<{
        readonly connectionId: string;
        readonly move: import("../properties/cmsRemote").RemoteMove;
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsRemote:write': import("../core/boundary").Parser<{
        readonly connectionId: string;
        readonly write: import("../properties/cmsRemote").RemoteWrite;
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsRemote:act': import("../core/boundary").Parser<{
        readonly connectionId: string;
        readonly id: string;
        readonly action: import("../properties/cmsRemote").RemoteDocumentAction;
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsRemote:history': import("../core/boundary").Parser<{
        readonly connectionId: string;
        readonly id: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsRemote:restore': import("../core/boundary").Parser<{
        readonly connectionId: string;
        readonly id: string;
        readonly revision: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsRemote:references': import("../core/boundary").Parser<{
        readonly connectionId: string;
        readonly types: readonly string[];
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsRemote:upload': import("../core/boundary").Parser<{
        readonly connectionId: string;
        readonly kind: import("../properties/cmsRemote").RemoteAssetKind;
        readonly projectPath: string;
    } & {}>;
    readonly 'cmsRemote:linkPreview': import("../core/boundary").Parser<{
        readonly url: string;
    } & {}>;
    readonly 'git:publish': import("../core/boundary").Parser<{
        readonly repoName: string;
        readonly isPrivate: boolean;
        readonly projectPath: string;
    } & {}>;
    readonly 'git:push': import("../core/boundary").Parser<{
        readonly branch: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'git:pull': import("../core/boundary").Parser<{
        readonly branch: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'git:incoming': import("../core/boundary").Parser<{
        readonly branch: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'git:resolveMerge': import("../core/boundary").Parser<{
        readonly branch: string;
        readonly projectPath: string;
    } & {
        readonly choices?: Record<string, import("./mergeResolution").MergeResolution>;
    }>;
    readonly 'git:restoreFile': import("../core/boundary").Parser<{
        readonly path: string;
        readonly ref: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'git:restoreProject': import("../core/boundary").Parser<{
        readonly ref: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'git:status': import("../core/boundary").Parser<{
        readonly projectPath: string;
    } & {}>;
    readonly 'git:unpark': import("../core/boundary").Parser<{
        readonly projectPath: string;
    } & {}>;
    readonly 'git:worktrees': import("../core/boundary").Parser<{
        readonly projectPath: string;
    } & {}>;
    readonly 'native:copy': (input: unknown) => undefined;
    readonly 'native:paste': (input: unknown) => undefined;
    readonly 'native:redo': (input: unknown) => undefined;
    readonly 'native:undo': (input: unknown) => undefined;
    readonly 'page:create': import("../core/boundary").Parser<{
        readonly name: string;
        readonly projectPath: string;
    } & {
        readonly layout?: ({
            readonly name: string;
            readonly path: string;
        } & {}) | null;
    }>;
    readonly 'page:delete': typeof pathText;
    readonly 'page:dynamicPaths': import("../core/boundary").Parser<{
        readonly pagePath: string;
        readonly projectPath: string;
    } & {
        readonly devUrl?: string | null;
    }>;
    readonly 'page:edit': typeof parseEditRequest;
    readonly 'page:editBatch': typeof parseEditBatchRequest;
    readonly 'page:importPathFor': import("../core/boundary").Parser<{
        readonly pagePath: string;
        readonly targetPath: string;
    } & {
        readonly projectPath?: string | null;
    }>;
    readonly 'page:move': import("../core/boundary").Parser<{
        readonly from: string;
        readonly to: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'page:parse': import("../core/boundary").Parser<{
        readonly pagePath: string;
        readonly source: string;
    } & {}>;
    readonly 'page:previewEdit': import("../core/boundary").Parser<{
        readonly pagePath: string;
        readonly authoredChecksum: import("../core/brand").Digest;
        readonly edit: import("../engine/editRequest").Edit;
        readonly source: string;
    } & {}>;
    readonly 'page:read': typeof pathText;
    readonly 'page:rebaseImport': import("../core/boundary").Parser<{
        readonly spec: string;
    } & {
        readonly fromPagePath?: string | null;
        readonly toPagePath?: string | null;
    }>;
    readonly 'pagefolder:create': import("../core/boundary").Parser<{
        readonly dir: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'pagefolder:delete': import("../core/boundary").Parser<{
        readonly dir: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'pagefolder:rename': import("../core/boundary").Parser<{
        readonly from: string;
        readonly to: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'preview:atCommit': import("../core/boundary").Parser<{
        readonly ref: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'preview:check': import("../core/boundary").Parser<{
        readonly render: import("../page/previewToken").PreviewRender;
        readonly projectPath: string;
    } & {}>;
    readonly 'preview:stop': import("../core/boundary").Parser<{
        readonly projectPath: string;
    } & {}>;
    readonly 'project:classes': typeof pathText;
    readonly 'project:close': import("../core/boundary").Parser<string | null | undefined>;
    readonly 'project:createAstro': import("../core/boundary").Parser<{
        readonly parentPath: string;
        readonly name: string;
    } & {
        readonly template?: string;
        readonly install?: boolean;
        readonly git?: boolean;
        readonly ai?: boolean;
        readonly packageManager?: "npm" | "pnpm";
    }>;
    readonly 'project:createStarter': import("../core/boundary").Parser<{
        readonly parentPath: string;
        readonly name: string;
    } & {
        readonly starter?: string;
        readonly packageManager?: "npm" | "pnpm";
    }>;
    readonly 'project:injectedRoutes': import("../core/boundary").Parser<{
        readonly projectPath: string;
    } & {}>;
    readonly 'project:openDialog': (input: unknown) => undefined;
    readonly 'project:parentDialog': (input: unknown) => undefined;
    readonly 'project:pending': (input: unknown) => undefined;
    readonly 'project:resolveImport': import("../core/boundary").Parser<{
        readonly fromFile: string;
        readonly spec: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'project:scan': typeof pathText;
    readonly 'recents:add': typeof pathText;
    readonly 'recents:list': (input: unknown) => undefined;
    readonly 'recents:refreshThumb': typeof pathText;
    readonly 'recents:remove': typeof pathText;
    readonly 'selection:copy': import("../core/boundary").Parser<{
        readonly keys: string[];
        readonly projectPath: string;
    } & {}>;
    readonly 'settings:get': (input: unknown) => undefined;
    readonly 'settings:set': import("../core/boundary").Parser<{
        readonly setting: "sound" | "usageCountsEnabled";
        readonly enabled: boolean;
    } & {}>;
    readonly 'shell:openExternal': typeof pathText;
    readonly 'src:readSymbol': import("../core/boundary").Parser<{
        readonly name: string;
        readonly fromFile: string;
        readonly spec: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'src:readText': import("../core/boundary").Parser<{
        readonly rel: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'src:resolvePath': import("../core/boundary").Parser<{
        readonly fromFile: string;
        readonly spec: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'src:writeText': import("../core/boundary").Parser<{
        readonly text: string;
        readonly rel: string;
        readonly projectPath: string;
    } & {}>;
    readonly 'style:listAstroStyles': typeof pathText;
    readonly 'style:listFiles': typeof pathText;
    readonly 'style:readFile': typeof pathText;
    readonly 'style:writeFile': import("../core/boundary").Parser<{
        readonly filePath: string;
        readonly css: string;
    } & {}>;
    readonly 'style:selectorUsage': import("../core/boundary").Parser<{
        readonly projectPath: string;
    } & {
        readonly packages?: "search" | "cached";
    }>;
    readonly 'style:removeSelectors': import("../core/boundary").Parser<{
        readonly ids: readonly string[];
        readonly files: readonly import("../properties/selectorUsage").SelectorFileDigest[];
        readonly projectPath: string;
    } & {}>;
    readonly 'style:restoreSelectors': import("../core/boundary").Parser<{
        readonly changes: readonly import("../properties/selectorUsage").SelectorFileChange[];
        readonly to: "before" | "after";
        readonly projectPath: string;
    } & {}>;
    readonly 'terminal:clipboardImage': import("../core/boundary").Parser<{
        readonly bytes: number[];
        readonly mime: string;
    } & {}>;
    readonly 'terminal:close': import("../core/boundary").Parser<{
        readonly id: string;
    } & {}>;
    readonly 'terminal:resize': import("../core/boundary").Parser<{
        readonly id: string;
        readonly cols: number;
        readonly rows: number;
    } & {}>;
    readonly 'terminal:start': import("../core/boundary").Parser<{
        readonly id: string;
        readonly cwd: string;
        readonly cols: number;
        readonly rows: number;
    } & {
        readonly autoLaunch?: string;
    }>;
    readonly 'watch:start': typeof pathText;
};
export type IpcChannel = keyof typeof IPC_PAYLOADS;
export type IpcPayloads = {
    readonly [K in IpcChannel]: Parsed<(typeof IPC_PAYLOADS)[K]>;
};
export declare function parseIpcPayload<K extends IpcChannel>(channel: K, input: unknown): IpcPayloads[K];
export declare const parseTerminalInput: import("../core/boundary").Parser<{
    readonly id: string;
    readonly data: string;
} & {}>;
export declare const parseTerminalAck: import("../core/boundary").Parser<{
    readonly id: string;
    readonly count: number;
} & {}>;
export type TerminalInput = Parsed<typeof parseTerminalInput>;
export type TerminalAck = Parsed<typeof parseTerminalAck>;
