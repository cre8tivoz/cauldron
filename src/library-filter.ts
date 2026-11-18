export const LIBRARY_CATEGORIES = [
  'Featured 5',
  'All',
  'Navigation',
  'Heroes',
  'Services',
  'Galleries',
  'Pricing',
  'Proof & Testimonials',
  'Contact & FAQ',
  'Footers',
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
  const base =
    category === 'All' || (q.length > 0 && category === 'Featured 5')
      ? [...pieces]
      : category === 'Featured 5'
        ? pieces.slice(0, 5)
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
