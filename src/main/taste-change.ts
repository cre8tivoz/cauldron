import type { DesignDirection } from './directions';
import type { Finding } from './quality';
import {
  contrastRatio as canonicalContrastRatio,
  luminance as canonicalLuminance,
  parseColourTuple,
} from './contrast';

/**
 * The approved taste and direction checks judge only what the agent added or
 * changed (design/camillo/taste-tests.md). This module finds that output: the CSS
 * a run wrote, and the selectors it introduced, so the rendered checks can look
 * at just those parts of the built page.
 *
 * It also judges the run's own CSS declarations against the site's tokens. The
 * built page is one bundle, so a declaration's file cannot be recovered from it
 * afterwards; the run's files are the only honest source for "what the agent
 * wrote".
 */

export type ChangedText = {
  file: string;
  before: string | null;
  after: string | null;
};

const MARKUP_FILE = /\.(astro|html?|mdx?|tsx|jsx|vue|svelte)$/i;
const STYLE_FILE = /\.(css|pcss)$/i;
const BINARY_FILE =
  /\.(png|jpe?g|gif|webp|avif|svgz?|woff2?|ttf|otf|mp4|webm|mp3|pdf|ico|zip)$/i;

const PSEUDO =
  /::?(hover|focus-visible|focus-within|focus|active|visited|disabled|checked|first-child|last-child|nth-child|placeholder|selection|marker|before|after)\b(\([^)]*\))?(?![\w-])/gi;

/** The CSS inside a markup file's `<style>` blocks. */
export function styleBlocks(text: string): string[] {
  const blocks: string[] = [];
  const pattern = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) blocks.push(match[1]);
  return blocks;
}

/** The CSS the run wrote: whole changed stylesheets, plus its markup style blocks. */
export function changedStyleText(
  changed: ChangedText[],
): Array<{ file: string; css: string }> {
  const result: Array<{ file: string; css: string }> = [];
  for (const item of changed) {
    if (!item.after || BINARY_FILE.test(item.file)) continue;
    if (STYLE_FILE.test(item.file)) {
      result.push({ file: item.file, css: item.after });
      continue;
    }
    if (!MARKUP_FILE.test(item.file)) continue;
    const blocks = styleBlocks(item.after);
    if (blocks.length > 0)
      result.push({ file: item.file, css: blocks.join('\n') });
  }
  return result;
}

/** A rule's selector and body. At-rules are unwrapped, `@keyframes` dropped. */
export type Rule = { selector: string; body: string };

export function rules(css: string): Rule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const found: Rule[] = [];
  const walk = (source: string) => {
    let depth = 0;
    let start = 0;
    let bodyStart = 0;
    let prelude = '';
    for (let index = 0; index < source.length; index++) {
      const char = source[index];
      if (char === '{') {
        if (depth === 0) {
          prelude = source.slice(start, index).trim();
          bodyStart = index + 1;
        }
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          const body = source.slice(bodyStart, index);
          if (prelude.startsWith('@')) {
            if (/^@(media|supports|layer|container|scope)\b/i.test(prelude))
              walk(body);
          } else if (body.includes('{')) {
            // Nested CSS. Its inner selectors are relative, and only the values
            // are judged, so the nesting is unwrapped and the parent dropped.
            walk(body);
          } else if (prelude) {
            found.push({ selector: prelude, body });
          }
          start = index + 1;
        }
      }
    }
  };
  walk(text);
  return found;
}

export type Declaration = { property: string; value: string; selector: string };

export function declarations(css: string): Declaration[] {
  const result: Declaration[] = [];
  for (const rule of rules(css)) {
    for (const part of rule.body.split(';')) {
      const colon = part.indexOf(':');
      if (colon < 1) continue;
      const property = part.slice(0, colon).trim().toLowerCase();
      const value = part.slice(colon + 1).trim();
      if (!property || !value || property.startsWith('--')) continue;
      result.push({ property, value, selector: rule.selector });
    }
  }
  return result;
}

/** A colour value as red, green, blue (0–255) and alpha, or null if not a colour. */
export function parseColour(
  input: string,
): [number, number, number, number] | null {
  return parseColourTuple(input);
}

const COLOUR_TOKEN = /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)/gi;

/** Every colour written into a value, ignoring ones inside `var(--…)` names. */
export function coloursIn(
  value: string,
): Array<[number, number, number, number]> {
  const found: Array<[number, number, number, number]> = [];
  for (const match of value.match(COLOUR_TOKEN) ?? []) {
    const colour = parseColour(match);
    if (colour) found.push(colour);
  }
  return found;
}

export function hue([r, g, b]: number[]): number {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  if (!delta) return 0;
  const sector =
    max === red
      ? (green - blue) / delta
      : max === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4;
  return (sector * 60 + 360) % 360;
}

export function luminance(colour: number[]): number {
  return canonicalLuminance(colour);
}

/** WCAG contrast ratio, 1–21. Delegates to canonical `contrast.ts`. */
export function contrastRatio(first: number[], second: number[]): number {
  return canonicalContrastRatio(first, second);
}

const key = (colour: number[]): string => colour.slice(0, 3).join(',');

const LENGTH = /(-?\d*\.?\d+)(px|rem|em)?/g;

/** Lengths written in a value, in pixels. Percentages and functions are skipped. */
export function lengths(value: string): number[] {
  if (/\b(auto|calc|clamp|min|max|var|%|vw|vh|vmin|vmax|ch|ex)\b/i.test(value))
    return [];
  const result: number[] = [];
  for (const match of value.matchAll(LENGTH)) {
    const number = parseFloat(match[1]);
    if (!Number.isFinite(number)) continue;
    const unit = match[2] ?? 'px';
    result.push(unit === 'rem' || unit === 'em' ? number * 16 : number);
  }
  return result;
}

const onScale = (value: number, scale: number[]): boolean =>
  scale.some((token) => Math.abs(token - value) < 0.6);

const ACCENTS = ['#2563eb', '#3b82f6', '#7c3aed', '#6366f1', '#4f46e5'];

const COLOUR_PROPERTY =
  /^(color|background|background-color|border-color|border-(top|right|bottom|left)-color|outline-color|fill|stroke|box-shadow)$/;
const SPACING_PROPERTY =
  /^((margin|padding)(-(top|right|bottom|left))?|(row-|column-)?gap)$/;
const RADIUS_PROPERTY = /^border(-(top|bottom)-(left|right))?-radius$/;

/** A selector that targets SVG `text` elements, i.e. drawn wordmark glyphs. */
export function isSvgTextSelector(selector: string | undefined): boolean {
  if (!selector) return false;
  return /(^|[,\s>+~(])text(\s*[,{\s]|$)/.test(selector);
}

/**
 * Judges a run's own CSS against the site's chosen tokens, using the approved
 * thresholds: exact token colours, the direction's spacing/type/radius scales,
 * at most 5% hard-coded values, no unchosen SaaS accents, no unchosen
 * blue-purple gradient.
 */
export function checkTasteOfCss(
  css: string,
  direction: DesignDirection,
  page: string,
  options: { label?: string } = {},
): Finding[] {
  const items = declarations(css);
  const palette = new Set(
    Object.values(direction.colours).map((value) => {
      const colour = parseColour(value);
      return colour ? key(colour) : '';
    }),
  );
  const blackNamed = palette.has('0,0,0');
  const gradientNamed =
    Object.values(direction.colours)
      .map(parseColour)
      .filter((colour): colour is [number, number, number, number] =>
        Boolean(colour),
      )
      .filter((colour) => hue(colour) >= 210 && hue(colour) <= 290).length >= 2;
  const counts = {
    gradient: 0,
    accents: 0,
    accentsNamed: 0,
    colours: 0,
    spacing: 0,
    type: 0,
    radius: 0,
    declarations: 0,
    hardcoded: 0,
  };
  const examples: string[] = [];

  for (const item of items) {
    const value = item.value;
    // The same values the rendered check ignores: nothing to judge.
    if (
      /^(0(?:px|rem)?|auto|inherit|initial|unset|none|transparent|currentcolor)$/i.test(
        value,
      )
    )
      continue;
    if (COLOUR_PROPERTY.test(item.property)) {
      counts.declarations++;
      const tokenOnly = value.includes('var(--cauldron-');
      if (!tokenOnly) {
        counts.hardcoded++;
        if (examples.length < 6) examples.push(`${item.property}: ${value}`);
      }
      for (const colour of coloursIn(value)) {
        if (colour[3] === 0) continue;
        if (
          ACCENTS.includes(
            `#${colour
              .slice(0, 3)
              .map((part) => part.toString(16).padStart(2, '0'))
              .join('')}`,
          )
        ) {
          if (palette.has(key(colour))) counts.accentsNamed++;
          else counts.accents++;
        }
        if (palette.has(key(colour))) continue;
        if (key(colour) === '0,0,0' && blackNamed) continue;
        // A colour mixed from a token is derived from the direction, not stray.
        if (value.includes('color-mix(') && tokenOnly) continue;
        counts.colours++;
      }
      if (/gradient\(/i.test(value)) {
        const stops = coloursIn(value).filter(
          (colour) => hue(colour) >= 210 && hue(colour) <= 290,
        );
        if (stops.length >= 2 && !gradientNamed) counts.gradient++;
      }
      continue;
    }
    if (SPACING_PROPERTY.test(item.property)) {
      counts.declarations++;
      if (!value.includes('var(--cauldron-')) {
        counts.hardcoded++;
        if (examples.length < 6) examples.push(`${item.property}: ${value}`);
      }
      for (const length of lengths(value))
        if (length !== 0 && length !== 1 && !onScale(length, direction.spacing))
          counts.spacing++;
      continue;
    }
    if (item.property === 'font-size') {
      // An SVG wordmark's font-size sets the drawing's coordinate size inside
      // its viewBox, not reading typography on the type scale (ticket 29: a
      // full-width SVG wordmark's 440px glyph size is not an off-scale type
      // size or a stray hard-coded value).
      if (isSvgTextSelector(item.selector)) continue;
      counts.declarations++;
      if (!value.includes('var(--cauldron-')) {
        counts.hardcoded++;
        if (examples.length < 6) examples.push(`font-size: ${value}`);
      }
      for (const length of lengths(value))
        if (!onScale(length, direction.typeScale)) counts.type++;
      continue;
    }
    if (RADIUS_PROPERTY.test(item.property)) {
      for (const length of lengths(value.replace(/\//g, ' ')))
        if (!onScale(length, direction.radii)) counts.radius++;
    }
  }

  const prefix = options.label ? `${options.label}: ` : 'Agent changes: ';
  const page2 = page;
  const add = (
    id: string,
    label: string,
    failed: number,
    detail?: string,
  ): Finding => ({
    id: `taste-changed-${id}-${page2}`,
    label: `${prefix}${label}`,
    status: failed ? 'fail' : 'pass',
    kind: 'measured',
    detail: detail ?? `${failed} violation(s).`,
    page: page2,
    scope: 'change',
  });

  return [
    add(
      'gradients',
      'No tired blue-purple gradients',
      counts.gradient,
      gradientNamed
        ? 'Direction exception: the direction names blue-purple colours. Risk: a generic SaaS feel; prefer a solid colour for large areas.'
        : undefined,
    ),
    add(
      'accents',
      'No unchosen generic SaaS accents',
      counts.accents,
      counts.accentsNamed
        ? `Direction exception: ${counts.accentsNamed} named colour(s) match a common SaaS accent. Risk: it can still read as a template.`
        : undefined,
    ),
    add('colours', 'Colours follow the direction', counts.colours),
    add('spacing', 'Spacing follows the direction', counts.spacing),
    add('type', 'Type sizes use the direction', counts.type),
    add('radius', 'Radii follow the direction', counts.radius),
    add(
      'tokens',
      'Tokens rather than hard-coded values',
      counts.declarations > 0 && counts.hardcoded / counts.declarations > 0.05
        ? 1
        : 0,
      `${counts.hardcoded}/${counts.declarations} colour, spacing, type and radius declarations hard-coded. ${examples.join('; ')}`,
    ),
  ];
}

/** Class and id names the run introduced, as selectors for the built page. */
export function changedSelectors(
  changed: ChangedText[],
  limit = 120,
): string[] {
  const selectors = new Set<string>();
  const addName = (name: string, prefix: string) => {
    const clean = name.trim();
    if (!/^[A-Za-z_][\w-]*$/.test(clean)) return;
    selectors.add(`${prefix}${clean}`);
  };
  for (const item of changed) {
    if (
      !item.after ||
      BINARY_FILE.test(item.file) ||
      !MARKUP_FILE.test(item.file)
    )
      continue;
    const before = new Set(
      [...(item.before ?? '').matchAll(/\b(class|id)\s*=\s*["']([^"']*)["']/gi)]
        .flatMap((match) => match[2].split(/\s+/))
        .filter(Boolean),
    );
    for (const match of item.after.matchAll(/\bclass\s*=\s*["']([^"']*)["']/gi))
      for (const name of match[1].split(/\s+/).filter(Boolean))
        if (!before.has(name)) addName(name, '.');
    for (const match of item.after.matchAll(/\bid\s*=\s*["']([^"']*)["']/gi))
      if (!before.has(match[1])) addName(match[1], '#');
    for (const block of styleBlocks(item.after))
      for (const selector of blockSelectors(block)) selectors.add(selector);
  }
  return [...selectors].slice(0, limit);
}

/** Selectors from a style block that can narrow a rendered page to the change. */
export function blockSelectors(css: string): string[] {
  const found: string[] = [];
  for (const rule of rules(css)) {
    for (const part of rule.selector.split(',')) {
      const selector = part.replace(PSEUDO, '').trim();
      if (!selector || selector.includes('&')) continue;
      // Only class and id selectors: they name the new thing, where a bare tag
      // selector would drag the site's existing code into the judgement.
      if (!/[.#]/.test(selector)) continue;
      if (!/^[A-Za-z0-9_\-\s.#[\]:()>+~="']+$/.test(selector)) continue;
      found.push(selector);
    }
  }
  return [...new Set(found)];
}

/** The site page paths a run touched, and whether it also changed shared files. */
export function changedPages(changed: ChangedText[]): {
  pages: string[];
  shared: boolean;
} {
  const pages = new Set<string>();
  let shared = false;
  for (const item of changed) {
    const match = item.file.match(/(?:^|\/)src\/pages\/(.+)\.(astro|md|mdx)$/i);
    if (!match || item.file.includes('[')) {
      shared = true;
      continue;
    }
    const route = match[1].replace(/(^|\/)index$/i, '').replace(/\\/g, '/');
    pages.add(`/${route}`.replace(/\/+$/, '') || '/');
  }
  return { pages: [...pages], shared };
}
