import fs from 'node:fs';
import path from 'node:path';
import { isInside } from './files';

/**
 * Asset management: curated starter photography and local asset storage.
 *
 * NOTE: Live API search against Unsplash and Pexels requires developer API
 * keys and is marked Coming Soon in the UI. In the meantime, Cauldron provides
 * a hand-curated starter set of high-resolution royalty-free photos attributed
 * to their original Unsplash photographers, and allows dropping any local image
 * file directly into the site's `public/images/` directory.
 */

export type StockPhoto = {
  id: string;
  title: string;
  photographer: string;
  source: 'Unsplash' | 'Pexels';
  sourceUrl: string;
  thumbUrl: string;
  fullUrl: string;
  directionId: string;
  category: string;
};

export const CURATED_STOCK_PHOTOS: StockPhoto[] = [
  // Long Lunch (Hospitality & Dining)
  {
    id: 'sourdough-hearth',
    title: 'Wood-fired Country Sourdough',
    photographer: 'Mae Mu',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/marmalade-bread',
    thumbUrl:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=85',
    directionId: 'long-lunch',
    category: 'Bakery',
  },
  {
    id: 'espresso-morning',
    title: 'Morning Espresso with Crema',
    photographer: 'Nathan Dumlao',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/coffee-cup',
    thumbUrl:
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=85',
    directionId: 'long-lunch',
    category: 'Coffee',
  },
  {
    id: 'long-table-setting',
    title: 'Communal Lunch Table Setting',
    photographer: 'Annie Spratt',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/dining-table',
    thumbUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85',
    directionId: 'long-lunch',
    category: 'Dining',
  },
  {
    id: 'terracotta-ceramics',
    title: 'Textured Terracotta Ceramics',
    photographer: 'Tom Crew',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/ceramics',
    thumbUrl:
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=400&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1200&q=85',
    directionId: 'long-lunch',
    category: 'Craft',
  },

  // PeNtA / Architecture & Studio
  {
    id: 'raw-concrete-facade',
    title: 'Monolithic Raw Concrete Facade',
    photographer: 'Simone Hutsch',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/concrete-facade',
    thumbUrl:
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=85',
    directionId: 'the-edit',
    category: 'Architecture',
  },
  {
    id: 'minimalist-timber-stairs',
    title: 'Cantilevered Timber Staircase',
    photographer: 'Javier Allegue Barros',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/timber-stairs',
    thumbUrl:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
    directionId: 'the-edit',
    category: 'Interiors',
  },
  {
    id: 'modernist-granite-pavilion',
    title: 'Granite and Glass Pavilion',
    photographer: 'Rory Gardiner',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/pavilion',
    thumbUrl:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85',
    directionId: 'the-edit',
    category: 'Architecture',
  },

  // Good Trade / Trades & Builders
  {
    id: 'carpenter-blackbutt',
    title: 'Carpenter Measuring Hardwood',
    photographer: 'Malo Malas',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/carpentry-workshop',
    thumbUrl:
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=85',
    directionId: 'solid-ground',
    category: 'Joinery',
  },
  {
    id: 'structural-timber-framing',
    title: 'Residential Roof Truss Framing',
    photographer: 'Scott Blake',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/roof-framing',
    thumbUrl:
      'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f6?auto=format&fit=crop&w=400&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f6?auto=format&fit=crop&w=1200&q=85',
    directionId: 'solid-ground',
    category: 'Construction',
  },
  {
    id: 'hand-tools-chisels',
    title: 'Japanese Hand Chisels & Bench Plane',
    photographer: 'Barn Images',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/woodworking-tools',
    thumbUrl:
      'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=400&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=85',
    directionId: 'solid-ground',
    category: 'Tools',
  },

  // The Desk / Writers & Creators
  {
    id: 'fountain-pen-notebook',
    title: 'Fountain Pen on Heavy Linen Paper',
    photographer: 'Aaron Burden',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/pen-paper',
    thumbUrl:
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=400&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=85',
    directionId: 'henry-from-online',
    category: 'Editorial',
  },
  {
    id: 'reading-lamp-atelier',
    title: 'Quiet Reading Desk with Morning Sun',
    photographer: 'Alisa Anton',
    source: 'Unsplash',
    sourceUrl: 'https://unsplash.com/photos/quiet-desk',
    thumbUrl:
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=85',
    directionId: 'henry-from-online',
    category: 'Workspace',
  },
];

/**
 * Returns curated starter photos matching the optional filter query or direction.
 * Note: This searches the static curated collection, not live external APIs.
 */
export function getCuratedPhotos(
  query?: string,
  directionId?: string,
): StockPhoto[] {
  let list = CURATED_STOCK_PHOTOS;
  if (directionId) {
    list = list.filter((p) => p.directionId === directionId);
    if (list.length === 0) list = CURATED_STOCK_PHOTOS;
  }
  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.photographer.toLowerCase().includes(q),
    );
  }
  return list;
}

/**
 * Saves a local image buffer directly into the site's `public/images/` directory,
 * sanitizing the file name and ensuring it stays within the site root.
 */
export function saveAssetFile(
  root: string,
  fileName: string,
  buffer: Buffer,
): { ok: true; relativePath: string } | { ok: false; problem: string } {
  const imagesDir = path.join(root, 'public/images');
  if (!isInside(root, imagesDir)) {
    return { ok: false, problem: 'Images path is outside the site.' };
  }
  if (
    fileName.includes('..') ||
    path.isAbsolute(fileName) ||
    fileName.startsWith('/') ||
    fileName.startsWith('\\')
  ) {
    return { ok: false, problem: 'Path traversal attempt rejected.' };
  }
  try {
    fs.mkdirSync(imagesDir, { recursive: true });
    // Sanitize filename
    const cleanName = path
      .basename(fileName)
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-');
    if (!cleanName) {
      return { ok: false, problem: 'Invalid file name.' };
    }
    const targetFile = path.join(imagesDir, cleanName);
    if (!isInside(imagesDir, targetFile)) {
      return {
        ok: false,
        problem: 'Target file is outside the images directory.',
      };
    }
    fs.writeFileSync(targetFile, buffer);
    return { ok: true, relativePath: `/images/${cleanName}` };
  } catch (e) {
    return {
      ok: false,
      problem: `Could not save asset: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
