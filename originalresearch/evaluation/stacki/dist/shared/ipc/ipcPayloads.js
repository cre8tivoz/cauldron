"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTerminalAck = exports.parseTerminalInput = exports.IPC_PAYLOADS = exports.CLIPBOARD_BYTES_MAX = exports.TERMINAL_DIMENSION_MAX = void 0;
exports.sampleValueSource = sampleValueSource;
exports.parseIpcPayload = parseIpcPayload;
const mergeResolution_1 = require("./mergeResolution");
const publishAccount_1 = require("./publishAccount");
const cmsConnections_1 = require("../properties/cmsConnections");
const cmsRemote_1 = require("../properties/cmsRemote");
const linkPreview_1 = require("../properties/linkPreview");
const astroContent_1 = require("../properties/astroContent");
const publishRepository_1 = require("../ipc/publishRepository");
const defaultsCanvas_1 = require("../properties/defaultsCanvas");
const publishDiscovery_1 = require("../properties/publishDiscovery");
const publishConfig_1 = require("../properties/publishConfig");
const projectMetadata_1 = require("../properties/projectMetadata");
const selectorUsage_1 = require("../properties/selectorUsage");
const packageManager_1 = require("../properties/packageManager");
const assetConversion_1 = require("./assetConversion");
const githubRepository_1 = require("./githubRepository");
const gitCommitDiff_1 = require("./gitCommitDiff");
const preferences_1 = require("./preferences");
const studioSetup_1 = require("./studioSetup");
const studioProgress_1 = require("./studioProgress");
const propertyEditing_1 = require("../properties/propertyEditing");
const editRequest_1 = require("../engine/editRequest");
const previewToken_1 = require("../page/previewToken");
// Complete invoke-channel inventory. Every main-process listener receives the
// parsed shape below; payload field names retain the existing renderer protocol.
const boundary_1 = require("../core/boundary");
const record_1 = require("../core/record");
// Native terminal dimensions use positive signed 16-bit coordinates on Windows.
exports.TERMINAL_DIMENSION_MAX = 32_767;
function terminalDimension(input) {
    const value = (0, boundary_1.count)(input);
    if (value === 0) {
        throw new Error('Terminal dimension must be positive');
    }
    if (value > exports.TERMINAL_DIMENSION_MAX) {
        throw new Error('Terminal dimension exceeds native limit');
    }
    return value;
}
const nothing = (input) => {
    if (input !== undefined) {
        throw new Error('Expected no payload');
    }
    return undefined;
};
const maybeText = (0, boundary_1.optional)((0, boundary_1.nullable)(boundary_1.text));
// `cached` answers at once from what earlier searches of installed packages
// found; `search` reads the packages for anything not yet answered.
function packageSearch(input) {
    if (input === 'cached' || input === 'search') {
        return input;
    }
    throw new Error('Unknown package search mode');
}
// Undo writes a cleanup's `before` text back; redo writes its `after` again.
function restoreDirection(input) {
    if (input === 'before' || input === 'after') {
        return input;
    }
    throw new Error('Unknown restore direction');
}
function sampleValueSource(input) {
    const source = (0, boundary_1.record)(input);
    const kind = source['kind'];
    if (kind === 'call') {
        return { kind, spec: (0, boundary_1.pathText)(source['spec']), name: (0, boundary_1.text)(source['name']) };
    }
    if (kind === 'scope') {
        return { kind, sinceMs: (0, boundary_1.count)(source['sinceMs']) };
    }
    throw new Error('Unknown sample source');
}
const maybePath = (0, boundary_1.optional)((0, boundary_1.nullable)(boundary_1.pathText));
// The renderer sends no target as a missing field or as `null`.
const cssTarget = (input) => {
    if (input === undefined) {
        return undefined;
    }
    if (input === null) {
        return undefined;
    }
    return (0, boundary_1.text)(input);
};
const maybeFlag = (0, boundary_1.optional)(boundary_1.boolean);
const strings = (0, boundary_1.list)(boundary_1.text);
const project = { projectPath: boundary_1.pathText };
const relative = { ...project, rel: boundary_1.pathText };
const source = { ...project, fromFile: boundary_1.pathText, spec: boundary_1.text };
const named = { ...project, name: boundary_1.text };
const reference = { ...project, ref: boundary_1.text };
const branch = { ...project, branch: boundary_1.text };
const location = (input) => (typeof input === 'number' ? (0, boundary_1.count)(input) : (0, boundary_1.text)(input));
// ContentView sends a storage locator, not the full display entry.
const entry = (0, boundary_1.object)({ file: boundary_1.pathText, locator: (0, boundary_1.optional)((0, boundary_1.list)(location)) });
const edits = (0, boundary_1.list)((0, boundary_1.object)({ path: (0, boundary_1.list)(location), value: boundary_1.data, rename: (0, boundary_1.optional)(boundary_1.text) }));
const cssFile = { file: boundary_1.pathText, selector: boundary_1.text };
const cssRange = { file: boundary_1.pathText, start: boundary_1.count, end: boundary_1.count, expect: (0, boundary_1.optional)(boundary_1.text) };
const cssMove = (input) => {
    const section = (0, boundary_1.object)({ ...cssFile, names: (0, boundary_1.optional)(strings), target: cssTarget })(input);
    return section.names === undefined
        ? (0, boundary_1.object)({ ...cssFile, name: boundary_1.text, target: cssTarget, at: (0, boundary_1.optional)(boundary_1.count) })(input)
        : (0, boundary_1.object)({ ...cssFile, names: strings, target: cssTarget })(input);
};
// A clipboard image can legitimately exceed the general collection limit.
// Bound bytes separately and reject out-of-range values before Buffer coerces them.
exports.CLIPBOARD_BYTES_MAX = 20 * 1024 * 1024;
function imageBytes(input) {
    const values = input instanceof Uint8Array ? input : (0, record_1.toArray)(input);
    if (!values) {
        throw new Error('Expected image bytes');
    }
    if (values.length > exports.CLIPBOARD_BYTES_MAX) {
        throw new Error('Image exceeds byte limit');
    }
    return Array.from(values, (value) => {
        const byte = (0, boundary_1.count)(value);
        if (byte > 255) {
            throw new Error('Expected byte in range 0..255');
        }
        return byte;
    });
}
exports.IPC_PAYLOADS = {
    'project:metadata': (0, boundary_1.object)({ ...project, kind: projectMetadata_1.metadataKind }),
    'project:createDefaultsCanvas': (0, boundary_1.object)({ ...project, canvas: defaultsCanvas_1.parseCanvasCreate }),
    'project:removeDefaultsCanvas': (0, boundary_1.object)({ ...project, file: defaultsCanvas_1.defaultsCanvasFile }),
    'project:writeMetadata': (0, boundary_1.object)({ ...project, write: projectMetadata_1.parseMetadataWrite }),
    'studio:status': boundary_1.pathText,
    'studio:install': (0, boundary_1.object)({
        ...project,
        source: studioSetup_1.parseStudioSource,
        requestId: studioProgress_1.parseStudioRequestId,
    }),
    'assets:delete': (0, boundary_1.object)({ ...relative }),
    'assets:dimensions': (0, boundary_1.object)({ ...relative }),
    'assets:list': boundary_1.pathText,
    'assets:mkdir': (0, boundary_1.object)({ ...project, parentRel: boundary_1.pathText, name: boundary_1.text }),
    'assets:move': (0, boundary_1.object)({ ...project, fromRel: boundary_1.pathText, toDirRel: boundary_1.pathText }),
    'assets:pickUpload': (0, boundary_1.object)({ ...project, destRel: boundary_1.pathText }),
    'assets:readText': (0, boundary_1.object)({ ...relative }),
    'assets:convert': (0, boundary_1.object)({ ...project, rel: assetConversion_1.parseImagePath, format: assetConversion_1.parseImageFormat }),
    'assets:rename': (0, boundary_1.object)({ ...relative, newName: boundary_1.text }),
    'assets:upload': (0, boundary_1.object)({ ...project, destRel: boundary_1.pathText, filePaths: (0, boundary_1.optional)((0, boundary_1.list)(boundary_1.pathText)) }),
    'assets:writeText': (0, boundary_1.object)({ ...relative, text: boundary_1.text }),
    'cms:assetRef': (0, boundary_1.object)({ ...relative, assetRel: boundary_1.pathText }),
    'cms:create': (0, boundary_1.object)({ ...named }),
    'cms:delete': (0, boundary_1.object)({ ...relative }),
    'cms:list': boundary_1.pathText,
    'cms:meta': boundary_1.pathText,
    'cms:read': (0, boundary_1.object)({ ...relative }),
    'cms:setMeta': (0, boundary_1.object)({ ...relative, fields: (0, boundary_1.optional)((0, boundary_1.nullable)((0, boundary_1.dictionary)(boundary_1.data))) }),
    'cms:usage': (0, boundary_1.object)({ ...relative }),
    'cms:write': (0, boundary_1.object)({ ...relative, data: boundary_1.data }),
    'component:create': (0, boundary_1.object)({
        ...named,
        pagePath: boundary_1.pathText,
        nodes: (0, boundary_1.list)(boundary_1.data),
        imports: (0, boundary_1.optional)((0, boundary_1.list)((0, boundary_1.object)({ name: (0, boundary_1.optional)(boundary_1.text), path: (0, boundary_1.optional)(boundary_1.text) }))),
        props: (0, boundary_1.optional)((0, boundary_1.list)(boundary_1.data)),
    }),
    'component:discard': (0, boundary_1.object)({ ...project, path: boundary_1.pathText, checksum: boundary_1.digest, force: maybeFlag }),
    'component:properties': (0, boundary_1.object)({ ...project, file: boundary_1.pathText }),
    // Undo of a property batch (step 6): the token its edit returned. Main
    // holds the inverse batch; the renderer can apply only what an edit wrote.
    'component:revertProperties': (0, boundary_1.object)({ token: boundary_1.text }),
    'component:editProperties': (0, boundary_1.object)({
        ...project,
        file: boundary_1.pathText,
        source: propertyEditing_1.propertySource,
        change: propertyEditing_1.parsePropertyChange,
    }),
    'component:usage': (0, boundary_1.object)({ ...named, exclude: (0, boundary_1.optional)(boundary_1.text) }),
    'content:collections': boundary_1.pathText,
    'content:config': (0, boundary_1.object)({ ...project, force: maybeFlag }),
    'content:entries': (0, boundary_1.object)({ ...named }),
    'content:rename': (0, boundary_1.object)({ ...named, from: boundary_1.text, to: boundary_1.text }),
    // The CMS panel's reads and edits of content collections, as a connected CMS's (astroContent.ts).
    'content:remoteEdit': (0, boundary_1.object)({ ...project, request: astroContent_1.parseAstroRemoteEdit }),
    'content:remoteRead': (0, boundary_1.object)({ ...project, request: astroContent_1.parseAstroRemoteRead }),
    'content:renamePlan': (0, boundary_1.object)({ ...named, from: boundary_1.text, to: boundary_1.text }),
    // `index` is a position in getCollection's own order: the picker's entry pager
    // reads `stats[2]` as the page's code would.
    'content:sampleEntry': (0, boundary_1.object)({ devUrl: maybeText, name: boundary_1.text, id: maybeText, index: (0, boundary_1.optional)(boundary_1.count) }),
    'content:sampleValue': (0, boundary_1.object)({
        ...project,
        devUrl: maybeText,
        pagePath: boundary_1.pathText,
        source: sampleValueSource,
    }),
    'content:targets': (0, boundary_1.object)({ ...named }),
    'content:validate': (0, boundary_1.object)({ ...project, collection: boundary_1.text, data: boundary_1.data }),
    'content:writeEntry': (0, boundary_1.object)({
        ...project,
        entry,
        edits: (0, boundary_1.optional)(edits),
        body: (0, boundary_1.optional)(boundary_1.text),
        expected: (0, boundary_1.optional)((0, boundary_1.object)({ data: boundary_1.data, body: (0, boundary_1.optional)(boundary_1.text) })),
    }),
    'css:addSection': (0, boundary_1.object)({
        ...project,
        ...cssFile,
        title: (0, boundary_1.optional)(boundary_1.text),
        before: cssTarget,
        at: (0, boundary_1.optional)(boundary_1.count),
    }),
    'css:addVariables': (0, boundary_1.object)({
        ...project,
        adds: (0, boundary_1.optional)((0, boundary_1.list)((0, boundary_1.object)({ ...cssFile, name: boundary_1.text, value: (0, boundary_1.optional)(boundary_1.text), after: cssTarget }))),
    }),
    'css:moveHeading': (0, boundary_1.object)({ ...project, ...cssRange, selector: boundary_1.text, before: cssTarget }),
    'css:moveVariables': (0, boundary_1.object)({ ...project, moves: (0, boundary_1.optional)((0, boundary_1.list)(cssMove)) }),
    'css:removeSection': (0, boundary_1.object)({ ...project, ...cssRange }),
    'css:renameVariables': (0, boundary_1.object)({ ...project, renames: (0, boundary_1.list)((0, boundary_1.object)({ from: boundary_1.text, to: boundary_1.text })) }),
    'css:setSectionTitle': (0, boundary_1.object)({ ...project, ...cssRange, title: (0, boundary_1.optional)(boundary_1.text) }),
    'css:setVariable': (0, boundary_1.object)({
        ...project,
        file: boundary_1.pathText,
        valueStart: boundary_1.count,
        valueEnd: boundary_1.count,
        expect: (0, boundary_1.optional)(boundary_1.text),
        value: boundary_1.text,
    }),
    'css:variables': boundary_1.pathText,
    'dev:diagnose': boundary_1.pathText,
    'dev:probe': boundary_1.pathText,
    'dev:start': boundary_1.pathText,
    'dev:stop': nothing,
    'git:allFiles': (0, boundary_1.object)({ ...project }),
    'git:checkout': (0, boundary_1.object)({ ...branch, create: maybeFlag, parkFirst: maybeFlag }),
    'git:commit': (0, boundary_1.object)({ ...project, message: boundary_1.text, paths: (0, boundary_1.optional)((0, boundary_1.list)(boundary_1.pathText)) }),
    'git:commitDiff': gitCommitDiff_1.parseCommitDiffRequest,
    'git:deleteBranch': (0, boundary_1.object)({ ...branch, force: maybeFlag }),
    'git:ghStatus': boundary_1.pathText,
    'git:info': boundary_1.pathText,
    'git:init': boundary_1.pathText,
    'git:log': (0, boundary_1.object)({
        ...project,
        ref: (0, boundary_1.optional)(boundary_1.text),
        limit: (0, boundary_1.optional)(boundary_1.count),
        skip: (0, boundary_1.optional)(boundary_1.count),
        withFiles: (0, boundary_1.optional)(boundary_1.boolean),
    }),
    'git:merge': (0, boundary_1.object)({ ...branch }),
    'git:park': (0, boundary_1.object)({ ...project }),
    'git:repositories': nothing,
    'git:clone': (0, boundary_1.object)({ repository: githubRepository_1.parseGitHubRepository }),
    'git:connect': (0, boundary_1.object)({ ...project, repository: githubRepository_1.parseGitHubRepository }),
    'publish:start': (0, boundary_1.object)({
        ...project,
        target: publishConfig_1.parsePublishTarget,
        commitMessage: (0, boundary_1.optional)(publishConfig_1.parsePublishCommitMessage),
    }),
    'publish:state': boundary_1.pathText,
    'publish:availability': boundary_1.pathText,
    'publish:siteURL': boundary_1.pathText,
    'publish:repository': (0, boundary_1.object)({ ...project, request: publishRepository_1.parseRepositoryRequest }),
    'publish:discover': (0, boundary_1.object)({ ...project, request: publishDiscovery_1.parseDiscoveryRequest }),
    'publish:account': (0, boundary_1.object)({ ...project, request: publishAccount_1.parseAccountRequest }),
    'cmsConnections:list': (0, boundary_1.object)({ ...project }),
    'cmsConnections:save': (0, boundary_1.object)({ ...project, draft: cmsConnections_1.parseCmsConnectionDraft }),
    'cmsConnections:remove': (0, boundary_1.object)({ ...project, id: cmsConnections_1.parseConnectionId }),
    'cmsConnections:sanityLogin': (0, boundary_1.object)({ ...project, request: cmsConnections_1.parseSanityLoginRequest }),
    'cmsRemote:collections': (0, boundary_1.object)({ ...project, connectionId: cmsRemote_1.parseRemoteConnection }),
    'cmsRemote:documents': (0, boundary_1.object)({
        ...project,
        connectionId: cmsRemote_1.parseRemoteConnection,
        collection: cmsRemote_1.parseRemoteCollectionName,
        columns: (0, boundary_1.optional)(cmsRemote_1.parseRemoteColumns),
    }),
    'cmsRemote:template': (0, boundary_1.object)({
        ...project,
        connectionId: cmsRemote_1.parseRemoteConnection,
        collection: cmsRemote_1.parseRemoteCollectionName,
    }),
    'cmsRemote:document': (0, boundary_1.object)({
        ...project,
        connectionId: cmsRemote_1.parseRemoteConnection,
        id: cmsRemote_1.parseRemoteDocumentId,
    }),
    'cmsRemote:create': (0, boundary_1.object)({
        ...project,
        connectionId: cmsRemote_1.parseRemoteConnection,
        collection: cmsRemote_1.parseRemoteCollectionName,
    }),
    'cmsRemote:delete': (0, boundary_1.object)({
        ...project,
        connectionId: cmsRemote_1.parseRemoteConnection,
        ids: cmsRemote_1.parseRemoteIds,
    }),
    'cmsRemote:move': (0, boundary_1.object)({
        ...project,
        connectionId: cmsRemote_1.parseRemoteConnection,
        move: cmsRemote_1.parseRemoteMove,
    }),
    'cmsRemote:write': (0, boundary_1.object)({
        ...project,
        connectionId: cmsRemote_1.parseRemoteConnection,
        write: cmsRemote_1.parseRemoteWrite,
    }),
    'cmsRemote:act': (0, boundary_1.object)({
        ...project,
        connectionId: cmsRemote_1.parseRemoteConnection,
        id: cmsRemote_1.parseRemoteDocumentId,
        action: cmsRemote_1.parseRemoteDocumentAction,
    }),
    'cmsRemote:history': (0, boundary_1.object)({
        ...project,
        connectionId: cmsRemote_1.parseRemoteConnection,
        id: cmsRemote_1.parseRemoteDocumentId,
    }),
    'cmsRemote:restore': (0, boundary_1.object)({
        ...project,
        connectionId: cmsRemote_1.parseRemoteConnection,
        id: cmsRemote_1.parseRemoteDocumentId,
        revision: cmsRemote_1.parseRemoteRevisionId,
    }),
    'cmsRemote:references': (0, boundary_1.object)({
        ...project,
        connectionId: cmsRemote_1.parseRemoteConnection,
        types: cmsRemote_1.parseRemoteTypes,
    }),
    'cmsRemote:upload': (0, boundary_1.object)({
        ...project,
        connectionId: cmsRemote_1.parseRemoteConnection,
        kind: cmsRemote_1.parseRemoteAssetKind,
    }),
    'cmsRemote:linkPreview': (0, boundary_1.object)({ url: linkPreview_1.parseVideoLinkURL }),
    'git:publish': (0, boundary_1.object)({ ...project, repoName: boundary_1.text, isPrivate: boundary_1.boolean }),
    'git:push': (0, boundary_1.object)({ ...branch }),
    'git:pull': (0, boundary_1.object)({ ...branch }),
    'git:incoming': (0, boundary_1.object)({ ...branch }),
    'git:resolveMerge': (0, boundary_1.object)({ ...branch, choices: (0, boundary_1.optional)((0, boundary_1.dictionary)(mergeResolution_1.parseMergeResolution)) }),
    'git:restoreFile': (0, boundary_1.object)({ ...reference, path: boundary_1.pathText }),
    'git:restoreProject': (0, boundary_1.object)({ ...reference }),
    'git:status': (0, boundary_1.object)({ ...project }),
    'git:unpark': (0, boundary_1.object)({ ...project }),
    'git:worktrees': (0, boundary_1.object)({ ...project }),
    'native:copy': nothing,
    'native:paste': nothing,
    'native:redo': nothing,
    'native:undo': nothing,
    'page:create': (0, boundary_1.object)({
        ...named,
        layout: (0, boundary_1.optional)((0, boundary_1.nullable)((0, boundary_1.object)({ name: boundary_1.text, path: boundary_1.pathText }))),
    }),
    'page:delete': boundary_1.pathText,
    'page:dynamicPaths': (0, boundary_1.object)({ ...project, pagePath: boundary_1.pathText, devUrl: maybeText }),
    // A visual edit in the renderer's terms, authored against the checksum of
    // the page it shows; main turns it into an intent (step 6).
    'page:edit': editRequest_1.parseEditRequest,
    // Several edits of one gesture, planned in memory and written once.
    'page:editBatch': editRequest_1.parseEditBatchRequest,
    'page:importPathFor': (0, boundary_1.object)({
        pagePath: boundary_1.pathText,
        targetPath: boundary_1.pathText,
        projectPath: maybePath,
    }),
    'page:move': (0, boundary_1.object)({ ...project, from: boundary_1.pathText, to: boundary_1.pathText }),
    'page:parse': (0, boundary_1.object)({ pagePath: boundary_1.pathText, source: boundary_1.text }),
    // An edit request planned against `source` (the bytes at authoredChecksum)
    // and never written: reviewing an .astro page's unsaved gestures in code.
    'page:previewEdit': (0, boundary_1.object)({
        pagePath: boundary_1.pathText,
        authoredChecksum: boundary_1.digest,
        edit: editRequest_1.parseEdit,
        source: boundary_1.text,
    }),
    'page:read': boundary_1.pathText,
    'page:rebaseImport': (0, boundary_1.object)({ fromPagePath: maybePath, toPagePath: maybePath, spec: boundary_1.text }),
    'pagefolder:create': (0, boundary_1.object)({ ...project, dir: boundary_1.pathText }),
    'pagefolder:delete': (0, boundary_1.object)({ ...project, dir: boundary_1.pathText }),
    'pagefolder:rename': (0, boundary_1.object)({ ...project, from: boundary_1.pathText, to: boundary_1.pathText }),
    'preview:atCommit': (0, boundary_1.object)({ ...reference }),
    // A canvas rendering's manifest and token, checked against the disk (step 7).
    'preview:check': (0, boundary_1.object)({ ...project, render: previewToken_1.parsePreviewRender }),
    'preview:stop': (0, boundary_1.object)({ ...project }),
    'project:classes': boundary_1.pathText,
    'project:close': maybePath,
    'project:createAstro': (0, boundary_1.object)({
        parentPath: boundary_1.pathText,
        name: boundary_1.text,
        template: (0, boundary_1.optional)(boundary_1.text),
        install: maybeFlag,
        git: maybeFlag,
        ai: maybeFlag,
        packageManager: (0, boundary_1.optional)(packageManager_1.parseCreatePackageManager),
    }),
    'project:createStarter': (0, boundary_1.object)({
        starter: (0, boundary_1.optional)(boundary_1.text),
        parentPath: boundary_1.pathText,
        name: boundary_1.text,
        packageManager: (0, boundary_1.optional)(packageManager_1.parseCreatePackageManager),
    }),
    'project:injectedRoutes': (0, boundary_1.object)({ ...project }),
    'project:openDialog': nothing,
    'project:parentDialog': nothing,
    'project:pending': nothing,
    'project:resolveImport': (0, boundary_1.object)({ ...source }),
    'project:scan': boundary_1.pathText,
    'recents:add': boundary_1.pathText,
    'recents:list': nothing,
    'recents:refreshThumb': boundary_1.pathText,
    'recents:remove': boundary_1.pathText,
    'selection:copy': (0, boundary_1.object)({ ...project, keys: strings }),
    'settings:get': nothing,
    'settings:set': (0, boundary_1.object)({ setting: preferences_1.parsePreferenceName, enabled: boundary_1.boolean }),
    'shell:openExternal': boundary_1.pathText,
    'src:readSymbol': (0, boundary_1.object)({ ...source, name: boundary_1.text }),
    'src:readText': (0, boundary_1.object)({ ...relative }),
    'src:resolvePath': (0, boundary_1.object)({ ...source }),
    'src:writeText': (0, boundary_1.object)({ ...relative, text: boundary_1.text }),
    'style:listAstroStyles': boundary_1.pathText,
    'style:listFiles': boundary_1.pathText,
    'style:readFile': boundary_1.pathText,
    'style:writeFile': (0, boundary_1.object)({ filePath: boundary_1.pathText, css: boundary_1.text }),
    'style:selectorUsage': (0, boundary_1.object)({ ...project, packages: (0, boundary_1.optional)(packageSearch) }),
    'style:removeSelectors': (0, boundary_1.object)({ ...project, ids: selectorUsage_1.parseSelectorIds, files: selectorUsage_1.parseSelectorFileDigests }),
    'style:restoreSelectors': (0, boundary_1.object)({ ...project, changes: selectorUsage_1.parseSelectorFileChanges, to: restoreDirection }),
    'terminal:clipboardImage': (0, boundary_1.object)({ bytes: imageBytes, mime: boundary_1.text }),
    'terminal:close': (0, boundary_1.object)({ id: boundary_1.text }),
    'terminal:resize': (0, boundary_1.object)({ id: boundary_1.text, cols: terminalDimension, rows: terminalDimension }),
    'terminal:start': (0, boundary_1.object)({
        id: boundary_1.text,
        cwd: boundary_1.pathText,
        cols: terminalDimension,
        rows: terminalDimension,
        autoLaunch: (0, boundary_1.optional)(boundary_1.text),
    }),
    'watch:start': boundary_1.pathText,
};
function parseIpcPayload(channel, input) {
    // The channel indexes the same map used to derive IpcPayloads. Each parser
    // validates its own fields; this assertion preserves that key correlation.
    return exports.IPC_PAYLOADS[channel](input);
}
// One-way `send` channels. They need no reply, so they stay out of the invoke
// inventory above, but their payloads cross the same boundary: a keystroke is
// bounded text, and an acknowledgement is a count — never NaN or negative,
// which would switch the terminal's backpressure off for good.
exports.parseTerminalInput = (0, boundary_1.object)({ id: boundary_1.text, data: boundary_1.text });
exports.parseTerminalAck = (0, boundary_1.object)({ id: boundary_1.text, count: boundary_1.count });
