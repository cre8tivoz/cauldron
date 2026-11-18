export type PreviewViewport = 'desktop' | 'tablet' | 'phone';

export const PREVIEW_VIEWPORTS: ReadonlyArray<{
  id: PreviewViewport;
  label: string;
  width: number | null;
}> = [
  { id: 'desktop', label: 'Desktop', width: null },
  { id: 'tablet', label: 'Tablet 768px', width: 768 },
  { id: 'phone', label: 'Phone 375px', width: 375 },
];

export function computePreviewBounds(
  rect: { left: number; top: number; width: number; height: number },
  viewport: PreviewViewport,
): { x: number; y: number; width: number; height: number } {
  const stageWidth = Math.max(0, Math.round(rect.width));
  const stageHeight = Math.max(0, Math.round(rect.height));
  const preset =
    PREVIEW_VIEWPORTS.find((entry) => entry.id === viewport)?.width ?? null;
  const width = preset === null ? stageWidth : Math.min(preset, stageWidth);
  const x = Math.round(rect.left + Math.max(0, (rect.width - width) / 2));
  return {
    x,
    y: Math.round(rect.top),
    width,
    height: stageHeight,
  };
}
