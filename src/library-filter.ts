export const LIBRARY_CATEGORIES = [
  'Featured',
  'All',
  'Text effects',
  'Backgrounds',
  'Cards',
  'Galleries',
  'Navigation',
  'Buttons',
  'Sections',
] as const;

/**
 * The opening set a person sees first: the strongest, most distinct pieces
 * across categories, so the library leads with real visual range.
 */
export const FEATURED_IDS = [
  'aurora-field',
  'bento-grid',
  'gradient-headline',
  'holo-card',
  'coverflow',
  'masonry-gallery',
  'dock-nav',
  'pricing-ticket',
] as const;

export function filterLibraryPieces<
  T extends {
    id: string;
    name: string;
    category?: string;
    description?: string;
  },
>(pieces: readonly T[], category: string, query: string): T[] {
  const q = query.trim().toLowerCase();
  const featured = (): T[] =>
    FEATURED_IDS.map((id) => pieces.find((p) => p.id === id)).filter(
      (p): p is T => Boolean(p),
    );
  const base =
    category === 'All' || (q.length > 0 && category === 'Featured')
      ? [...pieces]
      : category === 'Featured'
        ? featured()
        : pieces.filter((p) => {
            const cat = (p.category || '').toLowerCase();
            const target = category.toLowerCase();
            if (cat === target || cat.includes(target)) return true;
            if (
              target === 'proof & testimonials' &&
              (cat.includes('proof') || cat.includes('testimonial'))
            )
              return true;
            if (
              target === 'contact & faq' &&
              (cat.includes('contact') || cat.includes('faq'))
            )
              return true;
            if (
              target === 'footers' &&
              (cat.includes('footer') || cat === 'footer')
            )
              return true;
            if (target === 'navigation' && cat.includes('nav')) return true;
            if (target === 'heroes' && cat.includes('hero')) return true;
            if (
              target === 'services' &&
              (cat.includes('service') || cat.includes('menu'))
            )
              return true;
            return false;
          });

  if (q.length === 0) return base;
  return base.filter((p) =>
    `${p.name} ${p.description ?? ''} ${p.category ?? ''} ${p.id}`
      .toLowerCase()
      .includes(q),
  );
}
