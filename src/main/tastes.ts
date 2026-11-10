/**
 * Cauldron's taste rules, carried on from Cauldron OS and tightened in
 * design/camillo/taste-tests.md. Every agent job gets these (plan 4.1).
 * When a site's direction deliberately breaks one, the direction wins and
 * Cauldron says why, with a recommendation (Billy's decision).
 */

export type TasteRule = {
  id: string;
  title: string;
  rule: string;
};

export const TASTE_RULES: TasteRule[] = [
  {
    id: 'default-font',
    title: 'No lazy default font',
    rule: "Never use Inter, Roboto, Arial or system-ui as a site's chosen display or body font unless the site's design direction names it.",
  },
  {
    id: 'pure-black',
    title: 'No pure black',
    rule: 'Do not use #000000 as text colour or as a large background, unless the direction names it.',
  },
  {
    id: 'cards-in-cards',
    title: 'No cards inside cards',
    rule: 'Do not nest a bordered or shadowed rounded box inside another one.',
  },
  {
    id: 'saas-gradient',
    title: 'No tired blue-purple gradients',
    rule: 'Do not build gradients between blue and purple hues (210°-290°), unless the direction names it.',
  },
  {
    id: 'saas-accents',
    title: 'No generic SaaS accents',
    rule: 'Do not use #2563eb, #3b82f6, #7c3aed, #6366f1 or #4f46e5, unless the direction names them.',
  },
  {
    id: 'interaction-states',
    title: 'Every control has visible states',
    rule: 'Every button, link and form control needs a visible hover and focus-visible change, and a disabled look where it applies.',
  },
  {
    id: 'focus',
    title: 'Focus is always visible',
    rule: 'The focus indicator must be at least 3:1 against what is behind it. Never remove an outline without replacing it.',
  },
  {
    id: 'contrast',
    title: 'Text and buttons meet 4.5:1',
    rule: 'Small text needs 4.5:1 against its background, large text 3:1, and button labels 4.5:1 against their fill. DESIGN.md lists the measured pairs for this direction; use them.',
  },
  {
    id: 'spacing',
    title: 'Spacing on the scale',
    rule: "Use only the direction's spacing steps, plus 0 and 1px hairlines.",
  },
  {
    id: 'type',
    title: 'Type on the scale',
    rule: "Use only the direction's type sizes. No arbitrary in-between sizes.",
  },
  {
    id: 'reduced-motion',
    title: 'Motion respects the setting',
    rule: 'Under prefers-reduced-motion: reduce, no animation or transition may run longer than 0.01s.',
  },
  {
    id: 'emoji-icons',
    title: 'No emoji as icons',
    rule: 'Do not use emoji inside buttons, navigation or list markers. Use text, SVG or nothing.',
  },
  {
    id: 'truncation',
    title: 'Labels are never cut off',
    rule: 'Buttons and navigation labels must show in full at 1280px wide.',
  },
  {
    id: 'generic-feel',
    title: 'It must not feel like AI made it',
    rule: 'Avoid the generic generated look: centred everything, three equal feature cards, stock gradient hero, decorative blobs, filler copy.',
  },
];

export function tasteRulesText(): string {
  return TASTE_RULES.map((rule) => `- ${rule.title}: ${rule.rule}`).join('\n');
}
