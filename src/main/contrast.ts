/**
 * The contrast measurements the quality report uses (plan 4.4 and the approved
 * taste tests). The threshold, not just the presence of a colour change, decides
 * whether text, buttons and the keyboard focus ring pass.
 */

export type Rgba = { r: number; g: number; b: number; a: number };

/** Approved thresholds from design/camillo/taste-tests.md. */
export const TEXT_CONTRAST = 4.5;
export const LARGE_TEXT_CONTRAST = 3;
export const BUTTON_CONTRAST = 4.5;
export const FOCUS_CONTRAST = 3;

const NAMED: Record<string, Rgba> = {
  transparent: { r: 0, g: 0, b: 0, a: 0 },
  black: { r: 0, g: 0, b: 0, a: 1 },
  white: { r: 255, g: 255, b: 255, a: 1 },
};

export function parseColour(value: string | null | undefined): Rgba | null {
  if (!value) return null;
  const text = value.trim().toLowerCase();
  if (NAMED[text]) return NAMED[text];
  const hex = /^#([0-9a-f]{3,8})$/.exec(text);
  if (hex) {
    const digits = hex[1];
    const pair = (at: number) =>
      digits.length <= 4
        ? Number.parseInt(digits[at] + digits[at], 16)
        : Number.parseInt(digits.slice(at * 2, at * 2 + 2), 16);
    if ([3, 4, 6, 8].includes(digits.length)) {
      return {
        r: pair(0),
        g: pair(1),
        b: pair(2),
        a: digits.length === 4 || digits.length === 8 ? pair(3) / 255 : 1,
      };
    }
    return null;
  }
  const match = /^rgba?\(([^)]+)\)$/.exec(text);
  if (match) {
    const parts = match[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map((part) => Number.parseFloat(part));
    if (parts.length >= 3 && parts.every((part) => Number.isFinite(part))) {
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: parts.length > 3 ? parts[3] : 1,
      };
    }
  }
  return null;
}

/** Paints a translucent colour over what is behind it, as the screen does. */
export function over(front: Rgba, behind: Rgba): Rgba {
  if (front.a >= 1) return front;
  const a = front.a;
  return {
    r: front.r * a + behind.r * (1 - a),
    g: front.g * a + behind.g * (1 - a),
    b: front.b * a + behind.b * (1 - a),
    a: 1,
  };
}

export function luminance(colour: Rgba): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel(colour.r) +
    0.7152 * channel(colour.g) +
    0.0722 * channel(colour.b)
  );
}

export function contrastRatio(
  foreground: string | Rgba | null,
  background: string | Rgba | null,
): number {
  const front =
    typeof foreground === 'string' ? parseColour(foreground) : foreground;
  const back =
    typeof background === 'string' ? parseColour(background) : background;
  if (!front || !back) return 0;
  const painted = over(front, back);
  const light = Math.max(luminance(painted), luminance(back));
  const dark = Math.min(luminance(painted), luminance(back));
  return (light + 0.05) / (dark + 0.05);
}

/** Approved text thresholds: 4.5:1, or 3:1 for large text. */
export function textContrastRequired(
  fontSize: number,
  fontWeight: number,
): number {
  const large = fontSize >= 24 || (fontWeight >= 700 && fontSize >= 18.66);
  return large ? LARGE_TEXT_CONTRAST : TEXT_CONTRAST;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export type FocusSample = {
  where: string;
  outlineStyle: string;
  outlineWidth: number;
  outlineColor: string;
  /** A positive offset puts the ring outside the element, on the page behind it. */
  outlineOffset?: number;
  boxShadow: string;
  background: string;
  parentBackground: string;
  beforeBackground: string;
};

const firstColour = (value: string): string | null =>
  /rgba?\([^)]*\)|#[0-9a-f]{3,8}/i.exec(value)?.[0] ?? null;

/**
 * Judges the keyboard focus indicator against the approved 3:1 threshold. A
 * ring that exists but cannot be seen fails, which is what the approved test
 * asks for; measuring presence alone was the confirmed fault.
 */
export function judgeFocus(sample: FocusSample): {
  state: 'missing' | 'low-contrast' | 'ok';
  ratio: number;
  indicator: string | null;
} {
  let indicator: string | null = null;
  let surroundings: string[] = [];
  if (sample.outlineStyle !== 'none' && sample.outlineWidth >= 1) {
    indicator = sample.outlineColor;
    surroundings =
      (sample.outlineOffset ?? 0) > 0
        ? [sample.parentBackground]
        : [sample.background, sample.parentBackground];
  } else if (sample.boxShadow && sample.boxShadow !== 'none') {
    indicator = firstColour(sample.boxShadow);
    surroundings = [sample.parentBackground];
  } else if (
    sample.background &&
    sample.beforeBackground &&
    sample.background !== sample.beforeBackground
  ) {
    indicator = sample.background;
    surroundings = [sample.beforeBackground];
  }
  const colour = parseColour(indicator);
  if (!indicator || !colour || colour.a < 0.5) {
    return { state: 'missing', ratio: 0, indicator };
  }
  const ratios = surroundings
    .map((value) => parseColour(value))
    .filter((value): value is Rgba => Boolean(value))
    .map((value) => contrastRatio(colour, value));
  const ratio = ratios.length ? Math.min(...ratios) : 0;
  return {
    state: ratio >= FOCUS_CONTRAST ? 'ok' : 'low-contrast',
    ratio: round1(ratio),
    indicator,
  };
}
