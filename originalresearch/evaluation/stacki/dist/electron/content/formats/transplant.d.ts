/**
 * `original` with the difference between `before` and `after` applied to it.
 * `before` must be what the serializer produces from the unedited document and
 * `after` what it produces from the edited one. Falls back to `after` when the
 * edit cannot be placed, which is the same file the serializer would have
 * written anyway.
 */
declare function transplant(original: string, before: string, after: string): string;
export { transplant };
