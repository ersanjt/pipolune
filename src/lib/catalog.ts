// Build-time catalogue for the static pages (SEO). Reads the live API so products edited in Studio
// appear after "Publish"; falls back to the seed file when the API is unreachable (first deploy, offline).
import seedData from '../../public/api/lib/seed/catalog.json';
import type { Locale } from '../i18n/ui';

export interface ProductText {
  name: string;
  subtitle: string;
  description: string;
}

export interface CatalogProduct {
  id: number | null;
  slug: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'all';
  category: string;
  gender: string;
  ageBand: string;
  price: number;
  image: string;
  translations: Partial<Record<Locale, ProductText>>;
  variants: { sku: string; colour: string; size: string }[];
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
    price: p.price_kurus,
    image: p.image,
    translations: p.translations,
    variants: p.variants,
  }));
}

export function text(product: CatalogProduct, lang: Locale): ProductText {
  return product.translations[lang] ?? product.translations.en ?? { name: product.slug, subtitle: '', description: '' };
}
