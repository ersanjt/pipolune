import { store, storeAddress } from './store';

/**
 * Public seller identity printed on the legal pages and read by payment-gateway reviewers.
 * Street address and telephone are the shop's real details.
 * Legal name, tax number and MERSIS stay empty until the official values are known.
 * Fill those before applying for iyzico, PayTR, Stripe, YooKassa or any other provider.
 */
export const seller = {
  tradeName: store.tradeName,
  legalName: store.legalName,
  address: storeAddress,
  taxNumber: store.taxNumber,
  mersis: store.mersis,
  phone: store.phone,
  email: store.email,
  website: store.website,
};
