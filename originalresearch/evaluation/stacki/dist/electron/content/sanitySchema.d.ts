import { type RemoteFieldGroup } from '../../shared/properties/cmsRemote';
import { type RemoteReadOnly, type RemoteRule, type RemoteType } from '../../shared/properties/cmsRemoteSchema';
/** A field as the schema states it; a type the code does not settle is `undefined`. */
export interface SanitySchemaField {
    readonly name: string;
    readonly title: string;
    readonly description: string;
    readonly required: boolean;
    readonly rules: readonly RemoteRule[];
    readonly type: RemoteType | undefined;
    /** The groups its `group:` names, in order; none for an ungrouped or nested field. */
    readonly groups: readonly string[];
    readonly readOnly?: RemoteReadOnly;
}
/**
 * How a document is shown in a list, from its schema's `preview.select`: the
 * paths to its title, subtitle and image, and any other values the Studio's
 * `prepare` builds a subtitle from (which is code, so those values are shown
 * as they are). A path is plain field names with dots, as Sanity writes them.
 */
export interface SanityPreview {
    readonly title: string | undefined;
    readonly media: string | undefined;
    /** What the line under the title is made of, in the order the Studio puts it. */
    readonly parts: readonly {
        readonly key: string;
        readonly path: string;
    }[];
}
export interface SanityDocumentSchema {
    readonly preview: SanityPreview | undefined;
    readonly fields: readonly SanitySchemaField[];
    /** Fields the Studio hides, kept out of the panel even though documents hold them. */
    readonly hidden: ReadonlySet<string>;
    /** The tabs its fields are split into; absent when its schema names no groups. */
    readonly fieldGroups: readonly RemoteFieldGroup[] | undefined;
}
/** Every type the project's source defines, by name: the body of its `defineType({…})`. */
export declare function sanityNamedTypes(projectRoot: string): ReadonlyMap<string, string>;
/**
 * The Sanity icon each type's schema names (`icon: UserIcon`, imported from
 * `@sanity/icons`), as the icon's symbol (`user`). An icon from anywhere else
 * is the Studio's own drawing, so that type has none here.
 */
export declare function sanityTypeIcons(projectRoot: string): ReadonlyMap<string, string>;
/** The symbol of the `@sanity/icons` icon a type's `icon:` names, if it names one. */
export declare function iconSymbol(text: string, body: string): string | undefined;
/** The schema of document type `type`, or undefined when the project does not define it. */
export declare function sanityDocumentSchema(named: ReadonlyMap<string, string>, type: string, lists?: ReadonlyMap<string, readonly string[]>): SanityDocumentSchema | undefined;
/** Each `defineType({ name: … })` in this source text, as name and body. */
export declare function definedTypes(text: string): Array<readonly [string, string]>;
/**
 * The project's constant lists of text (`export const SERMON_SERVICES = ["…", …]`,
 * `as const` or not), by name: what a schema's choices may be built from.
 */
export declare function sanityConstantLists(projectRoot: string): ReadonlyMap<string, readonly string[]>;
