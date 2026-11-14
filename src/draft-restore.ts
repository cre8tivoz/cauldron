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

/**
 * Returns `null` when an edited content value matches the saved entry on disk,
 * so reverting a field back to its original value clears its draft.
 */
export function contentDraftValue(
  saved: { text: string; values: Record<string, string> },
  field: string,
  value: string | null,
): string | null {
  if (value === null) return null;
  const original = field === 'text' ? saved.text : (saved.values[field] ?? '');
  return value === original ? null : value;
}

/**
 * Returns `null` when an edited element field matches the selected element's
 * saved value on disk, so reverting a change clears its draft.
 */
export function selectionDraftValue(
  selection: {
    text: string;
    style: Record<string, string>;
    attributes: Array<{ name: string; value: string }>;
  },
  field: string,
  value: string,
): string | null {
  if (field === 'text') return value === selection.text ? null : value;
  if (field.startsWith('style:')) {
    const property = field.slice('style:'.length);
    return value === (selection.style[property] ?? '') ? null : value;
  }
  if (field.startsWith('attribute:')) {
    const name = field.slice('attribute:'.length);
    const original =
      selection.attributes.find((attribute) => attribute.name === name)
        ?.value ?? '';
    return value === original ? null : value;
  }
  return value;
}

/**
 * Produces honest, grammatical banner copy that only says "from last time" for
 * recovery drafts that already existed when the site opened.
 */
export function describeDraftBanner(
  drafts: ReadonlyArray<{ key: string }>,
  recoveryKeys: ReadonlySet<string>,
): { heading: string; detail: string; hasRecovery: boolean } {
  const total = drafts.length;
  const recovered = drafts.filter((draft) =>
    recoveryKeys.has(draft.key),
  ).length;
  if (total === 0) {
    return { heading: '', detail: '', hasRecovery: false };
  }
  if (recovered === total) {
    return {
      heading: 'Unsaved edits from last time.',
      detail: `${total} ${total === 1 ? 'change was' : 'changes were'} being typed when Cauldron last stopped.`,
      hasRecovery: true,
    };
  }
  if (recovered === 0) {
    return {
      heading: 'Unsaved edits.',
      detail: `${total} ${total === 1 ? 'change has' : 'changes have'} not been saved to the site yet.`,
      hasRecovery: false,
    };
  }
  return {
    heading: 'Unsaved edits.',
    detail: `${total} changes have not been saved yet (${recovered} from last time).`,
    hasRecovery: true,
  };
}
