import type { EditOperation } from './main/edit';

/**
 * Turns a saved recovery field back into the edit it came from. Attribute and
 * style buffers are not text: restoring one as text would replace the element's
 * content with a setting or style value.
 */
export function draftEditOperation(
  field: string,
  value: string,
): EditOperation | null {
  if (field.startsWith('attribute:')) {
    const name = field.slice('attribute:'.length);
    return name ? { kind: 'attribute', name, value } : null;
  }
  if (field.startsWith('style:')) {
    const property = field.slice('style:'.length);
    return property
      ? { kind: 'style', properties: { [property]: value } }
      : null;
  }
  if (field === 'text') return { kind: 'text', value };
  // Content drafts use their own checked write path and never reach this point.
  return null;
}
