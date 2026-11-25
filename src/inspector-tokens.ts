import type { CauldronDirectionSummary } from './cauldron-types';

export type TokenProperty =
  | 'color'
  | 'background-color'
  | 'font-family'
  | 'font-size'
  | 'padding'
  | 'margin'
  | 'gap'
  | 'border-radius';

export type TokenControlKind = 'swatch' | 'font' | 'scale';

export type TokenRowSpec = {
  property: TokenProperty;
  label: string;
  kind: TokenControlKind;
};

export type TokenGroupSpec = {
  heading: string;
  rows: ReadonlyArray<TokenRowSpec>;
};

export type TokenChoice = {
  label: string;
  shortLabel: string;
  value: string;
  title: string;
  swatch?: string;
};

/**
 * Plain-language token groups for the Element inspector (WDL-267).
 * Keeps Cauldron's taste-first token snapping while replacing raw CSS dropdowns
 * with visual colour swatches and segmented step strips.
 */
export const STYLE_TOKEN_GROUPS: ReadonlyArray<TokenGroupSpec> = [
  {
    heading: 'Colour',
    rows: [
      { property: 'color', label: 'Text', kind: 'swatch' },
      { property: 'background-color', label: 'Background', kind: 'swatch' },
    ],
  },
  {
    heading: 'Typography',
    rows: [
      { property: 'font-family', label: 'Font', kind: 'font' },
      { property: 'font-size', label: 'Size', kind: 'scale' },
    ],
  },
  {
    heading: 'Spacing & corners',
    rows: [
      { property: 'padding', label: 'Padding', kind: 'scale' },
      { property: 'margin', label: 'Margin', kind: 'scale' },
      { property: 'gap', label: 'Gap', kind: 'scale' },
      { property: 'border-radius', label: 'Radius', kind: 'scale' },
    ],
  },
];

export function tokenChoicesFor(
  property: TokenProperty,
  direction: CauldronDirectionSummary,
): TokenChoice[] {
  switch (property) {
    case 'color':
    case 'background-color':
      return Object.entries(direction.colours).map(([name, hex]) => ({
        label: name,
        shortLabel: name,
        value: `var(--cauldron-c-${name})`,
        title: `${name} · ${hex}`,
        swatch: hex,
      }));
    case 'font-family': {
      const choices: TokenChoice[] = [
        {
          label: 'Display',
          shortLabel: 'Display',
          value: 'var(--cauldron-font-display)',
          title: `Display — ${direction.fonts.display}`,
        },
        {
          label: 'Body',
          shortLabel: 'Body',
          value: 'var(--cauldron-font-body)',
          title: `Body — ${direction.fonts.body}`,
        },
      ];
      if (direction.fonts.detail) {
        choices.push({
          label: 'Detail',
          shortLabel: 'Detail',
          value: 'var(--cauldron-font-detail)',
          title: `Detail — ${direction.fonts.detail}`,
        });
      }
      return choices;
    }
    case 'font-size':
      return direction.typeScale.map((size, index) => ({
        label: `size-${index + 1}`,
        shortLabel: `${size}`,
        value: `var(--cauldron-size-${index + 1})`,
        title: `size-${index + 1} · ${size}px`,
      }));
    case 'padding':
    case 'margin':
    case 'gap':
      return direction.spacing.map((step, index) => ({
        label: `space-${index}`,
        shortLabel: `${step}`,
        value: `var(--cauldron-space-${index})`,
        title: `space-${index} · ${step}px`,
      }));
    case 'border-radius':
      return direction.radii.map((radius, index) => ({
        label: `radius-${index}`,
        shortLabel: radius >= 999 ? 'Pill' : `${radius}`,
        value: `var(--cauldron-radius-${index})`,
        title: `radius-${index} · ${radius}px`,
      }));
  }
}

export function isTokenSelected(
  currentValue: string | undefined,
  tokenValue: string,
): boolean {
  if (!currentValue) return false;
  return currentValue.trim().toLowerCase() === tokenValue.trim().toLowerCase();
}

/** Short label describing the currently applied inline value for a token row. */
export function describeTokenValue(
  property: TokenProperty,
  currentValue: string | undefined,
  direction: CauldronDirectionSummary,
): string | null {
  if (!currentValue || currentValue.trim() === '') return null;
  const match = tokenChoicesFor(property, direction).find((choice) =>
    isTokenSelected(currentValue, choice.value),
  );
  if (!match) return currentValue.trim();
  if (property === 'color' || property === 'background-color') {
    return match.label;
  }
  if (property === 'font-family') {
    return match.shortLabel;
  }
  if (property === 'border-radius' && match.shortLabel === 'Pill') {
    return 'Pill';
  }
  return `${match.shortLabel}px`;
}
