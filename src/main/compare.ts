/**
 * What a run changed on the page (plan 2.2): a snapshot of every source
 * location before and after, compared without guessing.
 *
 * The comparison is deliberately plain data in, plain data out: the caller
 * captures the page and knows which files the run owns, and this module decides
 * what changed, what was removed, and what belongs to the person instead.
 */

export type PageElement = {
  /** Source file exactly as the page reports it (absolute or site-relative). */
  file: string;
  /** The element's location inside that file. */
  loc: string;
  tag: string;
  /** The element's own text, not its descendants'. */
  text: string;
  /** Every attribute except the source annotations, sorted for stability. */
  attributes: string;
  class: string;
  style: string;
};

export type RemovedElement = {
  file: string;
  loc: string;
  tag: string;
  label: string;
};

export type Comparison = {
  /** Elements to outline: text, attribute or style changes, and new elements. */
  changed: PageElement[];
  /** Elements that are no longer on the page, so there is no node to outline. */
  removed: RemovedElement[];
  /** How many changes were left alone because the run does not own their file. */
  excluded: number;
};

const clean = (file: string): string =>
  file.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');

/** The file as a person reads it: `src/pages/index.astro`, not the full path. */
export function sourceLabel(file: string): string {
  const cleanFile = clean(file);
  const marker = cleanFile.lastIndexOf('/src/');
  return marker === -1 ? cleanFile : cleanFile.slice(marker + 1);
}

/**
 * Ownership comes from the run's own file list (batch 1): a page attribute may
 * carry an absolute path while the run records site-relative ones, so a file
 * counts as owned when the two paths are equal or one ends with the other.
 */
function ownedBy(file: string, ownedFiles: string[]): boolean {
  const value = clean(file);
  return ownedFiles.some((owned) => {
    const other = clean(owned);
    return other !== '' && (value === other || value.endsWith(`/${other}`));
  });
}

const differs = (before: PageElement, after: PageElement): boolean =>
  before.text !== after.text ||
  before.attributes !== after.attributes ||
  before.class !== after.class ||
  before.style !== after.style;

/** What an element looked like, without where the file happens to place it. */
const signatureOf = (element: PageElement): string =>
  [
    element.tag,
    element.text,
    element.attributes,
    element.class,
    element.style,
  ].join('\u0000');

function byFile(elements: PageElement[]): Map<string, PageElement[]> {
  const files = new Map<string, PageElement[]>();
  for (const element of elements) {
    const list = files.get(element.file);
    if (list) list.push(element);
    else files.set(element.file, [element]);
  }
  return files;
}

/**
 * The elements that look the same in both versions, matched in page order.
 * A location is a line number, so adding or removing one line shifts every
 * element after it; matching on what the element looks like keeps an unrelated
 * shift from being reported as the whole page being rewritten.
 */
function align(
  before: PageElement[],
  after: PageElement[],
  shapeOf: (element: PageElement) => string = signatureOf,
): Array<[number, number]> {
  const rows = before.length;
  const columns = after.length;
  const lengths: number[][] = Array.from({ length: rows + 1 }, () =>
    new Array<number>(columns + 1).fill(0),
  );
  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let column = columns - 1; column >= 0; column -= 1) {
      lengths[row][column] =
        shapeOf(before[row]) === shapeOf(after[column])
          ? lengths[row + 1][column + 1] + 1
          : Math.max(lengths[row + 1][column], lengths[row][column + 1]);
    }
  }
  const pairs: Array<[number, number]> = [];
  let row = 0;
  let column = 0;
  while (row < rows && column < columns) {
    if (shapeOf(before[row]) === shapeOf(after[column])) {
      pairs.push([row, column]);
      row += 1;
      column += 1;
    } else if (lengths[row + 1][column] >= lengths[row][column + 1]) row += 1;
    else column += 1;
  }
  return pairs;
}

/**
 * Everything the run itself is responsible for, file by file. Elements the run
 * did not write are counted and left out, so the person's own edit during the
 * run is never shown as the run's work.
 */
export function compareSnapshots(
  before: PageElement[],
  after: PageElement[],
  ownedFiles: string[],
): Comparison {
  const was = byFile(before);
  const now = byFile(after);
  const changed: PageElement[] = [];
  const removed: RemovedElement[] = [];
  let excluded = 0;

  for (const file of new Set([...was.keys(), ...now.keys()])) {
    const previous = was.get(file) ?? [];
    const current = now.get(file) ?? [];
    if (!ownedBy(file, ownedFiles)) {
      excluded += Math.max(previous.length, current.length);
      continue;
    }

    const pairs = align(previous, current);
    let beforeIndex = 0;
    let afterIndex = 0;
    const settle = (endBefore: number, endAfter: number): void => {
      const gapBefore = previous.slice(beforeIndex, endBefore);
      const gapAfter = current.slice(afterIndex, endAfter);
      const matches = align(gapBefore, gapAfter, (element) => element.tag);
      let oldOffset = 0;
      let newOffset = 0;
      const addRemoved = (element: PageElement): void => {
        removed.push({
          file: element.file,
          loc: element.loc,
          tag: element.tag,
          label: `Removed: ${element.tag} at ${sourceLabel(element.file)}:${element.loc}`,
        });
      };
      for (const [oldIndex, newIndex] of [
        ...matches,
        [gapBefore.length, gapAfter.length],
      ]) {
        for (; oldOffset < oldIndex; oldOffset += 1)
          addRemoved(gapBefore[oldOffset]);
        for (; newOffset < newIndex; newOffset += 1)
          changed.push(gapAfter[newOffset]);
        const oldElement = gapBefore[oldIndex];
        const newElement = gapAfter[newIndex];
        if (oldElement && newElement && differs(oldElement, newElement))
          changed.push(newElement);
        oldOffset = oldIndex + 1;
        newOffset = newIndex + 1;
      }
    };

    for (const [row, column] of [...pairs, [previous.length, current.length]]) {
      settle(row, column);
      beforeIndex = row + 1;
      afterIndex = column + 1;
    }
  }

  return { changed, removed, excluded };
}

/**
 * Everything the run itself is responsible for. A source location can appear
 * more than once (a component used twice), so repeats are compared in order
 * rather than collapsed into one.
 */

/** One entry per part of the page a run changed, ready for the Before/After toggle. */
export type HighlightedPart = {
  file: string;
  loc: string;
  text: string;
  label: string;
  removed?: boolean;
};

export function highlightsFor(comparison: Comparison): HighlightedPart[] {
  return [
    ...comparison.changed.map((element) => ({
      file: element.file,
      loc: element.loc,
      text: element.text,
      label: `Changed: ${element.tag} at ${sourceLabel(element.file)}:${element.loc}`,
    })),
    ...comparison.removed.map((element) => ({
      file: element.file,
      loc: element.loc,
      text: '',
      label: element.label,
      removed: true,
    })),
  ];
}
