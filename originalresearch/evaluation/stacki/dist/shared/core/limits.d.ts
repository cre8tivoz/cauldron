export declare const LIMITS: {
    /** Nodes in one page tree. A 50k-line page is already a code-view page. */
    readonly treeNodesMax: 20000;
    /** Nesting depth of one page tree. Hand-written markup rarely exceeds 20. */
    readonly treeDepthMax: 64;
    /** Length of a tag or component name. */
    readonly tagNameCharsMax: 128;
    /** Length of a single attribute name or value. */
    readonly attrCharsMax: 8192;
    /** Attributes on one tag. */
    readonly attrsPerNodeMax: 256;
    /** Text/comment/raw payload of one node, in UTF-16 code units. */
    readonly nodeValueCharsMax: 1000000;
    /** Entries of each kind in a project scan (pages, layouts, components). */
    readonly scanEntriesMax: 10000;
    /** Folders listed by a project scan. */
    readonly scanFoldersMax: 2000;
    /** Props on one component schema. */
    readonly propSchemaFieldsMax: 512;
    /** Literal options on one union-typed prop. */
    readonly propOptionsMax: 256;
    /** Import declarations in one frontmatter block. */
    readonly importsMax: 256;
    /** Length of one IPC payload string field. */
    readonly ipcFieldCharsMax: 10000000;
    /** Length of one path crossing a boundary: Windows' extended-length limit. */
    readonly ipcPathCharsMax: 32768;
    /** Items in one array or keys in one object crossing a boundary. */
    readonly ipcItemsMax: 100000;
    /** Nesting depth of one structured value crossing a boundary. */
    readonly ipcDepthMax: 128;
    /** TextMate highlighting is synchronous CPU work after grammar startup. */
    readonly syntaxHighlightCharsMax: 1000000;
    /** Bytes of one source file. Merged up from electron/lib/mainLimits.ts so the
     * renderer, the actor and the disk readers answer to one number. */
    readonly sourceBytesMax: number;
    /** Intents accepted by one document actor and not yet terminal. Past this,
     * submission returns `backpressured`; the persistence layer holds the draft. */
    readonly intentsPendingMax: 64;
    /** UTF-8 bytes of every string an intent carries, summed. A code patch or a
     * `rewrite-text` may rewrite a whole file's content, so the bound is the file
     * bound itself. */
    readonly intentPayloadBytesMax: number;
    /** Splices one intent may plan, and sites one multi-span operation may name.
     * A loop rename in a generated page touches hundreds of sites, not millions. */
    readonly splicesPerIntentMax: 4096;
    /** Work units one diff may spend, and each span mapping through it: one unit
     * is one byte comparison or one frontier cell (shared/engine/diff.ts). A 10 MB file
     * with a small edit costs about 4·10⁷ — both directions scan it once — so the
     * bound admits the largest file and refuses quadratic blow-ups. Exhaustion is
     * a `resource-limit` rejection, never a silent fallback. */
    readonly diffWorkMax: 50000000;
    /** Edit distance (bytes deleted plus bytes inserted) one diff searches to.
     * The frontiers it keeps grow with its square: 2·(D + 1)² 32-bit cells, about
     * 34 MB at this bound. An external change larger than this, racing a pending
     * intent, rejects with `resource-limit`; the renderer re-authors against the
     * refreshed snapshot, where no diff is needed. */
    readonly diffDistanceMax: 2048;
    /** Document actors one host keeps (electron/documents/documentActors.ts). An actor
     * holds only its snapshot between intents, so the least recently used idle
     * one is dropped past this bound and re-reads the disk on its next intent. */
    readonly documentActorsMax: 512;
    /** Snapshot bytes all of one host's actors retain together. Without it, 512
     * actors could each hold a 10 MB file; past it, idle actors are dropped. */
    readonly documentBytesRetainedMax: number;
    /** Parses one actor may have in flight: the current read plus one newer. */
    readonly parseTasksInFlightMax: 2;
    /** Snapshots one actor retains: the committed one plus the candidate under
     * verification. Pending intents keep only their authored preconditions. */
    readonly snapshotsRetainedMax: 2;
    /** Earlier snapshots a host keeps per actor (step 6): the bytes the renderer
     * authored an edit against, once the actor's own writes or an outside one
     * replaced them. The renderer keeps authoring against the page it shows
     * until a save lands with nothing newer typed, so a run of saves under a
     * busy keyboard needs as many as the commit log holds. Past either bound,
     * such an edit is refused, never guessed, and the page asks to be reloaded. */
    readonly authoredSnapshotsMax: 16;
    /** Bytes of those earlier snapshots per actor, so sixteen copies of a 10 MB
     * page never pile up; the oldest go first. */
    readonly authoredBytesRetainedMax: number;
    /** Commits a host remembers per actor — the bytes before, the bytes after,
     * the splices between — so an edit authored before the actor's own recent
     * writes is rebased exactly, without a diff (shared/engine/rebase.ts). */
    readonly commitLogEntriesMax: 16;
    /** Undo entries one session keeps (the renderer's history; step 6 moves the
     * bound here from a literal in App.tsx, where it was already 100). */
    readonly undoEntriesMax: 100;
    /** Files one watcher tick may mark dirty. Events coalesce into a set, so the
     * bound caps a burst like `git checkout`, not the event count. */
    readonly watcherFilesPerTickMax: 1024;
    /** Source markers one preview render may carry — one per projected node. The
     * frame counts the stamps of one render against it too (every rendered copy
     * of a component stamps once), and the morph reloads past it (step 7). */
    readonly previewMarkersMax: 20000;
    /** Work one canvas patch may spend lining up the old and new renderings: one
     * unit per cell of the child-list matrices it builds (electron/previewClient/morphClient.ts)
     * — a list of 2 000 children changed in the middle is 4·10⁶ cells, 16 MB of
     * Int32. Past it the canvas reloads, and says why, instead of freezing the
     * editor on a page too big to diff (step 7). */
    readonly previewMorphWorkMax: 4000000;
    /** Distinct files one preview render's manifest may name: the page, its
     * layouts and every component that rendered (shared/page/previewToken.ts). A
     * render past it has no token, and its events are refused. */
    readonly previewManifestFilesMax: 512;
    /** UTF-16 units of one project-relative path in a preview stamp. */
    readonly previewStampPathCharsMax: 1024;
    /** Diagnostics one parse-error projection carries, and the length of each. */
    readonly diagnosticsMax: 64;
    readonly diagnosticCharsMax: 4096;
};
