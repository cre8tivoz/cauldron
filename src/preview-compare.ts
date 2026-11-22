/**
 * Side-by-side preview geometry (WDL-244, first step).
 *
 * The preview itself is a native `WebContentsView` laid over the stage, so a
 * "compare" layout is not CSS: each column is a real child view, positioned in
 * window coordinates and scaled with the page zoom factor. Keeping the page's
 * CSS width at the breakpoint is the whole point — media queries have to fire
 * at their real width — so the view is scaled *down* to fit the column rather
 * than being squeezed.
 *
 * Pure so the arithmetic can be tested without Electron.
 */

/**
 * Chromium refuses to scale a page below a quarter of its size, so a column
 * narrower than this fraction of its breakpoint cannot show the true width. The
 * columns are sized in proportion to their breakpoints (see `.stage-compare`
 * in the stylesheet), which keeps every frame at the same zoom.
 */
export const MIN_ZOOM = 0.25;

/** The three widths worth seeing together. */
export const COMPARE_WIDTHS = [
  { id: 'phone', label: 'Phone', width: 375 },
  { id: 'tablet', label: 'Tablet', width: 768 },
  { id: 'desktop', label: 'Desktop', width: 1280 },
] as const;

/** Gap between columns; matches `.stage-compare` in the stylesheet. */
export const COMPARE_GAP = 12;

/**
 * The narrowest stage that can show all three widths truthfully.
 *
 * Chromium will not scale a page below `MIN_ZOOM`, so this is a hard floor, not
 * a target: below it the native views would be wider than their columns and
 * would spill over the editor panels, because CSS cannot clip a child
 * `WebContentsView`. The stage says there is not enough room instead of drawing
 * a comparison that isn't one.
 */
export function minimumStageWidth(): number {
  return (
    COMPARE_WIDTHS.reduce((sum, width) => sum + width.width * MIN_ZOOM, 0) +
    COMPARE_GAP * (COMPARE_WIDTHS.length - 1)
  );
}

export type CompareWidth = (typeof COMPARE_WIDTHS)[number];
export type CompareFrameId = CompareWidth['id'];

export type SlotRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type CompareFrame = {
  id: CompareFrameId;
  /** Page CSS width, i.e. what media queries see. Never scaled. */
  cssWidth: number;
  x: number;
  y: number;
  /** Window-space width of the view: cssWidth × zoom. */
  width: number;
  height: number;
  zoom: number;
};

/**
 * One column's frame. A column wider than the breakpoint shows the page at 1:1
 * (no upscaling — a 375px phone blown up to 900px would lie about type size),
 * a narrower column scales the whole page down by the same factor the media
 * queries were designed for.
 */
export function frameForSlot(
  slot: SlotRect,
  id: CompareFrameId,
  cssWidth: number,
): CompareFrame {
  const columnWidth = Math.max(0, Math.round(slot.width));
  const height = Math.max(0, Math.round(slot.height));
  const zoom =
    columnWidth > 0
      ? Math.min(1, Math.max(MIN_ZOOM, columnWidth / cssWidth))
      : 0;
  const width = Math.round(cssWidth * zoom);
  // Centre the scaled page in its column; the remainder is the gutter.
  const x = Math.round(slot.left + (columnWidth - width) / 2);
  return {
    id,
    cssWidth,
    x,
    y: Math.round(slot.top),
    width,
    height,
    zoom: Math.round(zoom * 1000) / 1000,
  };
}

/** All three frames, in the order they appear on screen. */
export function computeCompareFrames(
  slots: readonly (SlotRect | null)[],
): CompareFrame[] {
  return COMPARE_WIDTHS.map((preset, index) =>
    frameForSlot(
      slots[index] ?? { left: 0, top: 0, width: 0, height: 0 },
      preset.id,
      preset.width,
    ),
  ).filter((frame) => frame.width > 0 && frame.height > 0);
}
