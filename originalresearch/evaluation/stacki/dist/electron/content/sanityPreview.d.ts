import type { SanityPreview } from './sanitySchema';
/** The query projection that reads a list row's preview values. */
export declare function previewProjection(preview: SanityPreview | undefined): string;
/**
 * The query projection that reads each document's picture by its own type's
 * preview `media`, for a list that mixes types (a reference's choices). A type
 * whose preview shows no picture reads none.
 */
export declare function mediaProjection(types: readonly string[], mediaOf: (type: string) => string | undefined): string;
/** A row's title, subtitle and image from what the projection read. */
export declare function previewOf(row: unknown): {
    readonly title: string | undefined;
    readonly subtitle: string | undefined;
    readonly imageURL: string | undefined;
};
