export interface InjectedRoute {
    readonly route: string;
    readonly entrypoint: string | undefined;
    readonly from: string | undefined;
    readonly params: readonly unknown[];
}
/**
 * Routes this project serves that it has no file for.
 *
 * `origin` is Astro's: 'project' is a file under src/pages (the editor already
 * knows those), 'internal' is Astro's own (a 404 page and friends), and what's
 * left came from an integration. An unreadable or missing list means none —
 * no server has run yet, or this Astro is too old to report them, and either
 * way the app carries on with the pages it can see.
 */
declare function readInjectedRoutes(projectPath: string): InjectedRoute[];
export { readInjectedRoutes };
