import ts from 'typescript';
import type { FieldSettings, SettingsFieldKind } from '../../shared/properties/collectionSettings';
export interface ChainStep {
    readonly name: string;
    readonly text: string;
    readonly args: readonly ts.Expression[];
}
export interface Chain {
    readonly base: string;
    readonly baseNode: ts.Expression;
    readonly kind: SettingsFieldKind;
    readonly steps: readonly ChainStep[];
}
export type ChainSettings = FieldSettings;
/** A chain's settings: what its methods state, whatever else it holds. */
export declare function readChain(chain: Chain): ChainSettings;
/**
 * The chain with only what `settings` change from what it states rewritten. A
 * changed check replaces its own method and keeps that method's other
 * arguments (a message, a pattern's flags); a new one goes in among the
 * checks, before any transform or refine; a cleared one is removed. Every
 * other step — a transform, a refine, a method the settings do not own, an
 * argument they cannot read — stays as written and where it was, so a schema
 * written by hand comes back as it was apart from what the form changed.
 */
export declare function writeChain(chain: Chain, settings: FieldSettings): string;
