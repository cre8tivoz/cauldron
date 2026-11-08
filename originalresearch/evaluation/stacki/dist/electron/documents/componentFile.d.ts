import type { Digest } from '../../shared/core/brand';
interface ComponentImport {
    readonly name?: string;
    readonly path?: string;
}
interface ComponentFileArgs {
    readonly projectPath: string;
    readonly pagePath: string;
    readonly name: string;
    readonly nodes: readonly unknown[];
    readonly imports?: readonly ComponentImport[];
    readonly props?: readonly unknown[];
}
/**
 * The file to write for a new component, as `{ path, rel, text }`. Throws when
 * the name can't be used — nothing is written here; the caller does that, so
 * every write to the project stays in one place.
 */
declare function componentFile({ projectPath, pagePath, name, nodes, imports, props }: ComponentFileArgs): {
    path: string;
    rel: string;
    text: string;
};
interface NewPageLayout {
    readonly name: string;
    readonly path: string;
}
/** The text of a new, empty page: a frontmatter block, and the layout wrapper
 * when one is picked (imported relative to the page). */
declare function newPageText(input: {
    readonly pagePath: string;
    readonly layout: NewPageLayout | undefined;
    readonly eol: '\n' | '\r\n';
}): string;
/** What taking back a created component found: the file as it was written and
 *  now gone, a file someone changed since (kept unless forced), or no file. */
export type ComponentDiscard = 'deleted' | 'edited' | 'missing';
interface ComponentDiscardArgs {
    readonly projectPath: string;
    readonly path: string;
    /** The checksum the file was created with. */
    readonly checksum: Digest;
    /** Delete it even when it changed since: the person said so. */
    readonly force: boolean;
}
/**
 * Undo of "create component": the file goes only while it holds exactly what
 * was written, so an edit made to it since is never lost without a question.
 * Only a component file can go — the request crosses a process boundary, and a
 * path anywhere else is refused rather than deleted.
 */
declare function discardComponentFile({ projectPath, path: target, checksum, force }: ComponentDiscardArgs): ComponentDiscard;
export { componentFile, discardComponentFile, newPageText };
