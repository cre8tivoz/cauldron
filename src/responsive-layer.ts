/**
 * Two-layer responsive editing state (WDL-244).
 *
 * Editing layer is intentionally separate from preview viewport width:
 * changing the preview width (or toggling Compare widths) never switches the
 * active editing layer, so breakpoint overrides are always opt-in.
 */

export type ResponsiveBreakpoint = 'tablet' | 'phone';
export type EditingLayer = 'base' | ResponsiveBreakpoint;

export type EditingLayerSpec = {
  id: EditingLayer;
  label: string;
  shortLabel: string;
  mediaQuery: string | null;
  maxWidth: number | null;
};

export const EDITING_LAYERS: ReadonlyArray<EditingLayerSpec> = [
  {
    id: 'base',
    label: 'All widths',
    shortLabel: 'All',
    mediaQuery: null,
    maxWidth: null,
  },
  {
    id: 'tablet',
    label: 'Tablet ≤768px',
    shortLabel: '≤768px',
    mediaQuery: '(max-width: 768px)',
    maxWidth: 768,
  },
  {
    id: 'phone',
    label: 'Phone ≤375px',
    shortLabel: '≤375px',
    mediaQuery: '(max-width: 375px)',
    maxWidth: 375,
  },
];

export type ResponsiveStyleMap = {
  tablet: Record<string, string>;
  phone: Record<string, string>;
};

export const EMPTY_RESPONSIVE_STYLES: ResponsiveStyleMap = {
  tablet: {},
  phone: {},
};

/** Returns the active style map for the chosen editing layer. */
export function layerStylesFor(
  selection: {
    style: Record<string, string>;
    responsiveStyles?: ResponsiveStyleMap;
  },
  layer: EditingLayer,
): Record<string, string> {
  if (layer === 'base') return selection.style;
  return selection.responsiveStyles?.[layer] ?? {};
}
