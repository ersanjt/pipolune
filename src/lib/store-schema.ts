import { store, storeMapsUrl } from './store';

/** One shop identity for search engines. No map pin: the floor and door are inside a shared building. */
export function storeNode(origin: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': ['ClothingStore', 'Organization'],
    '@id': `${origin}/#shop`,
    name: store.tradeName,
    description,
    url: `${origin}/`,
    logo: new URL('/brand/icon-512.png', origin).href,
    image: new URL('/brand/og-image.jpg', origin).href,
    email: store.email,
    telephone: store.phoneTel,
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${store.line1}, ${store.line2}`,
      postalCode: store.postalCode,
      addressLocality: store.district,
      addressRegion: store.city,
      addressCountry: store.countryCode,
    },
    hasMap: storeMapsUrl,
    areaServed: [
      { '@type': 'AdministrativeArea', name: store.district },
      { '@type': 'City', name: store.city },
      { '@type': 'Country', name: store.country },
    ],
    currenciesAccepted: 'TRY, USD, RUB',
    knowsLanguage: ['tr', 'en', 'ru'],
  };
}

export function breadcrumb(origin: string, lang: string, crumbs: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: new URL(`/${lang}/${crumb.path}`, origin).href,
    })),
  };
}
