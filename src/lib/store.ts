/**
 * Public shop identity. This is the copy baked into the site.
 * Studio can change the same fields; the footer then refreshes them from /session.
 * Legal name, tax number and MERSIS stay empty until the owner has the official values.
 */
export const store = {
  tradeName: 'Pipolune',
  legalName: '',
  phone: '+90 554 606 00 98',
  phoneTel: '+905546060098',
  email: 'info@pipolune.com',
  website: 'https://pipolune.com',
  line1: 'Merkez Mahallesi, Lale Sokak No: 4-6',
  line2: 'Kat 4, Kapı 7',
  postalCode: '34406',
  district: 'Kağıthane',
  city: 'İstanbul',
  country: 'Türkiye',
  countryCode: 'TR',
  taxNumber: '',
  mersis: '',
};

export const storeLines = [store.line1, store.line2, `${store.postalCode} ${store.district} / ${store.city}`, store.country];
export const storeAddress = [store.line1, store.line2, `${store.postalCode} ${store.district}`, store.city, store.country].join(', ');
export const storeMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeAddress)}`;
