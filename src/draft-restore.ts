import { findTag, type EditOperation } from './main/edit';

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

/** Merges updated drafts by `key`, preserving unrelated existing drafts. */
export function mergeDraftsList<T extends { key: string }>(
  existing: ReadonlyArray<T>,
  incoming: ReadonlyArray<T>,
): T[] {
  const byKey = new Map(existing.map((draft) => [draft.key, draft]));
  for (const draft of incoming) {
    byKey.set(draft.key, draft);
  }
  return [...byKey.values()];
}

/** Removes only drafts whose `key` is in `keys`, preserving all others. */
export function removeDraftKeys<T extends { key: string }>(
  existing: ReadonlyArray<T>,
  keys: ReadonlyArray<string>,
): T[] {
  if (keys.length === 0) return [...existing];
  const drop = new Set(keys);
  return existing.filter((draft) => !drop.has(draft.key));
}

function offsetToLineCol(
  text: string,
  offset: number,
): { line: number; column: number } {
  const before = text.slice(0, offset);
  const lines = before.split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

/**
 * Orders element drafts sharing a `(file, baseHash)` snapshot from bottom to top
 * by their resolved opening-tag offset in that snapshot, and anchors each
 * draft's coordinates to its opening tag start so earlier restores never shift
 * later elements' locations.
 */
export function planBatchDraftRestores<
  T extends {
    file: string;
    line: number;
    column: number;
    name: string;
    baseHash?: string;
  },
>(
  queued: ReadonlyArray<T>,
  readSource: (file: string) => { text: string; hash: string } | null,
): T[] {
  const sourceCache = new Map<string, { text: string; hash: string } | null>();
  const getSource = (file: string) => {
    if (!sourceCache.has(file)) sourceCache.set(file, readSource(file));
    return sourceCache.get(file) ?? null;
  };

  type ElementItem = { draft: T; tagStart: number; index: number };
  const groups = new Map<string, ElementItem[]>();
  const passthrough: Array<{ draft: T; index: number }> = [];

  queued.forEach((draft, index) => {
    if (draft.name === 'content' || !draft.baseHash) {
      passthrough.push({ draft, index });
      return;
    }
    const source = getSource(draft.file);
    if (!source || source.hash !== draft.baseHash) {
      passthrough.push({ draft, index });
      return;
    }
    const tag = findTag(source.text, {
      file: draft.file,
      line: draft.line,
      column: draft.column,
      name: draft.name,
    });
    if (!tag) {
      passthrough.push({ draft, index });
      return;
    }
    const coords = offsetToLineCol(source.text, tag.start);
    const groupKey = `${draft.file}:${draft.baseHash}`;
    const list = groups.get(groupKey) ?? [];
    list.push({
      draft: { ...draft, line: coords.line, column: coords.column },
      tagStart: tag.start,
      index,
    });
    groups.set(groupKey, list);
  });

  const planned: Array<{ draft: T; base: number; offset: number }> =
    passthrough.map(({ draft, index }) => ({ draft, base: index, offset: 0 }));
  for (const items of groups.values()) {
    const firstIndex = items[0].index;
    const sorted = [...items].sort((a, b) => b.tagStart - a.tagStart);
    sorted.forEach((item, offset) => {
      planned.push({ draft: item.draft, base: firstIndex, offset });
    });
  }

  return planned
    .sort((a, b) => a.base - b.base || a.offset - b.offset)
    .map((item) => item.draft);
}
