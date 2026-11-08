import type { Suite } from './testDiscovery';
export type BuildStage = 'build:contracts' | 'build:electron' | 'build:scripts' | 'build:morph' | 'build:preload' | 'stage:runtime' | 'build:web';
export interface GatePlan {
    readonly kind: 'full' | 'targeted';
    readonly chain: readonly BuildStage[];
    readonly beside: readonly BuildStage[];
}
export declare function gatePlanFor(input: {
    readonly queries: readonly string[];
    readonly selected: readonly Suite[];
}): GatePlan;
/** The one line a targeted run prints, so a skipped check is never a surprise. */
export declare function targetedNotice(plan: GatePlan): string;
