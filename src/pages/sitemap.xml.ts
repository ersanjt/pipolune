import type { APIRoute } from 'astro';
import { loadCatalog } from '../lib/catalog';
import { defaultLocale, locales } from '../i18n/ui';

// One <url> per language with every alternate, as Google expects for hreflang in sitemaps.
export const GET: APIRoute = async ({ site }) => {
  const origin = site!.origin;
  const products = await loadCatalog();
  const paths = ['', 'shop/', ...products.filter((p) => p.translations.en).map((p) => `shop/${p.slug}/`)];

  const urls = paths.flatMap((path) => {
    const available = path.startsWith('shop/') && path !== 'shop/'
      ? locales.filter((l) => products.find((p) => `shop/${p.slug}/` === path)?.translations[l])
      : [...locales];
    const xDefault = path === '' ? `${origin}/` : `${origin}/${defaultLocale}/${path}`;
    const alternates = [
      ...available.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${origin}/${l}/${path}"/>`),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefault}"/>`,
    ].join('\n');
    return available.map((l) => `  <url>\n    <loc>${origin}/${l}/${path}</loc>\n${alternates}\n  </url>`);
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
