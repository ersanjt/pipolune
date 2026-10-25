import type { CatalogProduct } from './catalog';
import type { SeasonKey } from '../i18n/ui';

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

const seasonOrder: SeasonKey[] = ['spring', 'summer', 'autumn', 'winter'];

/** Filter groups that actually have products. Age, size, type, gender and colour stay separate. */
export function catalogFacets(products: CatalogProduct[]) {
  return {
    ages: unique(products.map((p) => p.ageBand)),
    categories: unique(products.map((p) => p.category)),
    genders: unique(products.map((p) => p.gender)),
    colours: unique(products.flatMap((p) => p.variants.map((v) => v.colour))),
    sizes: unique(products.flatMap((p) => p.variants.map((v) => v.size))),
    seasons: seasonOrder.filter((season) => products.some((p) => p.season === season)),
  };
}
