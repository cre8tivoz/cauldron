import type { Alias } from '../content/cmsRefs';
/** Every file that can hold an instance: .astro anywhere, and markdown pages,
 *  which render components too. The same set the palette's own count walks. */
declare function astroFiles(directory: string): string[];
/**
 * The markup, without the frontmatter above it — where instances actually are.
 *
 * A component's own code talks about itself: Lumos's Card.astro carries three
 * `console.warn('[lumos] <Card variant="…">…')` lines, and counting the file's
 * text as a whole read those as three more cards on the page. The number in the
 * palette was the number of times the name appeared, which is not the same
 * thing as the number of times the component is used.
 */
declare function templateOf(source: unknown): string;
/** How many times `source` uses `<Name …>`. Closing tags and frontmatter code
 *  don't count. */
declare function countIn(source: unknown, name: unknown): number;
export interface FileImport {
    readonly names: readonly string[];
    readonly candidates: ReadonlySet<string>;
}
/**
 * What each import in a file brings in, as `{ names, candidates }`.
 *
 * A tag is a local binding, not a filename. Every page in a Lumos project says
 *
 *   import Layout from "@/layouts/BaseLayout.astro";
 *   <Layout> … </Layout>
 *
 * so counting `<BaseLayout` found nothing and the palette reported 0 instances
 * of a layout on every page in the project. The name to count is whatever THAT
 * file calls it.
 */
declare function importsOf(source: unknown, file: string, aliases: readonly Alias[]): FileImport[];
interface InstanceArgs {
    readonly file: string;
    readonly targetPath?: string | undefined;
    readonly name: string;
    readonly aliases?: readonly Alias[];
    readonly counts?: InstanceCounts;
}
type InstanceCounts = (target: Pick<InstanceArgs, 'targetPath' | 'name'>) => number;
/** Scan markup and imports once; all component queries then use bounded maps. */
export declare function instanceCounts(source: unknown, file: string, aliases: readonly Alias[]): InstanceCounts;
/**
 * How many instances of one component a file holds — counted under the name
 * that file imports it as. A file that doesn't import it falls back to the
 * component's own name: markdown pages and auto-import integrations render
 * components they never name in an import.
 */
declare function instancesIn(source: unknown, { file, targetPath, name, aliases, counts }: InstanceArgs): number;
export interface UsageFile {
    readonly rel: string;
    readonly path: string;
    readonly kind: 'page' | 'layout' | 'component' | 'file';
    readonly count: number;
}
/**
 * The files that hold instances of `name`, most-used first, each as
 * `{ rel, path, kind, count }`. `kind` is where the file lives — a page, a
 * layout, or another component — which is how the caller knows whether opening
 * it means going to a page or drilling into a component.
 *
 * The component's own file is left out: a file is not one of its own users, and
 * a recursive component would otherwise list itself above everything else.
 */
declare function componentUsage({ projectPath, name, exclude }: {
    readonly projectPath: string;
    readonly name: string;
    readonly exclude?: string;
}): {
    files: UsageFile[];
    total: number;
};
export { componentUsage, countIn, instancesIn, importsOf, templateOf, astroFiles };
