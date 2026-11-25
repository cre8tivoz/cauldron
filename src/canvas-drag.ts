/**
 * Pure single-axis vertical drag-and-drop reorder geometry (WDL-244).
 * Uses layout midpoints rather than pointer target hit-testing so drop spots
 * stay deterministic even over borders, gaps, or scrolling containers.
 */

export type ItemRect = {
  top: number;
  height: number;
};

export type DropTarget = {
  /** Insertion slot index in 0..rects.length (for positioning the drop line). */
  insertSlot: number;
  /** Resulting array index after removing `fromIndex` and inserting. */
  toIndex: number;
};

/**
 * Returns the insertion slot (0..rects.length) before the first sibling whose
 * vertical midpoint sits below `pointerY`, or at the end if none does.
 */
export function computeInsertSlot(
  pointerY: number,
  rects: ReadonlyArray<ItemRect>,
): number {
  for (let i = 0; i < rects.length; i += 1) {
    const midpoint = rects[i].top + rects[i].height / 2;
    if (pointerY < midpoint) return i;
  }
  return rects.length;
}

/**
 * Resolves the drop target for dragging `fromIndex` to `pointerY`.
 * Returns `null` for a no-op drop back into the item's own slot.
 */
export function computeDropTarget(
  pointerY: number,
  rects: ReadonlyArray<ItemRect>,
  fromIndex: number,
): DropTarget | null {
  if (fromIndex < 0 || fromIndex >= rects.length || rects.length < 2) {
    return null;
  }
  const insertSlot = computeInsertSlot(pointerY, rects);
  // Inserting directly before or after the dragged item leaves order unchanged.
  if (insertSlot === fromIndex || insertSlot === fromIndex + 1) {
    return null;
  }
  const toIndex = insertSlot > fromIndex ? insertSlot - 1 : insertSlot;
  if (toIndex < 0 || toIndex >= rects.length || toIndex === fromIndex) {
    return null;
  }
  return { insertSlot, toIndex };
}

/**
 * Computes the viewport Y coordinate for the fixed drop-marker line centered
 * in the gap between adjacent siblings (or at the top/bottom edge).
 */
export function computeDropMarkerY(
  insertSlot: number,
  rects: ReadonlyArray<ItemRect>,
): number {
  if (rects.length === 0) return 0;
  if (insertSlot <= 0) return Math.round(rects[0].top);
  if (insertSlot >= rects.length) {
    const last = rects[rects.length - 1];
    return Math.round(last.top + last.height);
  }
  const prev = rects[insertSlot - 1];
  const next = rects[insertSlot];
  const prevBottom = prev.top + prev.height;
  return Math.round((prevBottom + next.top) / 2);
}
