// Build-time catalogue for the static pages (SEO). Reads the live API so products edited in Studio
// appear after "Publish"; falls back to the seed file when the API is unreachable (first deploy, offline).
import seedData from '../../public/api/lib/seed/catalog.json';
import type { Locale } from '../i18n/ui';
import type { Prices } from './currency';

export interface ProductText {
  name: string;
  subtitle: string;
  description: string;
  details?: string;
  specs?: { label: string; value: string }[];
}

export interface SizeChart {
  head: Partial<Record<Locale, string[]>>;
  rows: string[][];
  note: Partial<Record<Locale, string>>;
}

export interface CatalogProduct {
  id: number | null;
  slug: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'all';
  category: string;
  gender: string;
  ageBand: string;
  prices: Prices;
  image: string;
  gallery: string[];
  video: { url: string; poster: string } | null;
  sizeChart: SizeChart | null;
  features: { image: string; caption: Partial<Record<Locale, string>> }[];
  translations: Partial<Record<Locale, ProductText>>;
  variants: { sku: string; colour: string; size: string; weightG?: number | null }[];
}

let cache: Promise<CatalogProduct[]> | undefined;

export function loadCatalog(): Promise<CatalogProduct[]> {
  cache ??= fetchLive().catch((error) => {
    console.warn(`[catalog] using seed data (${error instanceof Error ? error.message : error})`);
    return seed();
  });
  return cache;
}

async function fetchLive(): Promise<CatalogProduct[]> {
  if (process.env.CATALOG_SOURCE === 'seed') throw new Error('CATALOG_SOURCE=seed');
  const res = await fetch('https://pipolune.com/api/catalog?locale=all', { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.products) || data.products.length === 0) throw new Error('empty catalogue');
  if (!data.products.every((p: any) => p.prices && p.prices.USD > 0)) throw new Error('catalogue without USD/TRY/RUB prices');
  if (!data.products.every((p: any) => Array.isArray(p.gallery))) throw new Error('catalogue without media fields');
  return data.products;
}

function seed(): CatalogProduct[] {
  return seedData.products.map((p: any) => ({
    id: null,
    slug: p.slug,
    season: p.season,
    category: p.category,
    gender: p.gender,
    ageBand: p.age_band,
    prices: p.prices,
    image: p.image,
    gallery: p.gallery ?? [],
    video: p.video ?? null,
    sizeChart: p.size_chart ?? null,
    features: p.features ?? [],
    translations: p.translations,
    variants: p.variants.map((v: any) => ({ ...v, weightG: v.weight_g ?? null })),
  }));
}

export function text(product: CatalogProduct, lang: Locale): ProductText {
  return product.translations[lang] ?? product.translations.en ?? { name: product.slug, subtitle: '', description: '' };
}

/** Cover first, then the rest of the gallery without repeats. */
export function photos(product: CatalogProduct): string[] {
  return [...new Set([product.image, ...product.gallery].filter(Boolean))];
}
