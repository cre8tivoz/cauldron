/** What a file is, as far as where its classes are written. */
export type ClassSourceKind = 'stylesheet' | 'markup' | 'script';
/** A file's text past this many characters is not read for suggestions. */
export declare const CLASS_SOURCE_CHARS_MAX = 2000000;
/** One file names at most this many classes for suggestions. */
export declare const CLASS_NAMES_PER_SOURCE_MAX = 10000;
/** The kind of a file by its extension, or undefined for one that holds no classes. */
export declare function classSourceKind(file: string): ClassSourceKind | undefined;
/** Every class name `text` uses, once each, in the order first seen. */
export declare function classNamesIn(text: string, kind: ClassSourceKind): readonly string[];
