import type { Locale } from './ui';
import { legalEn } from './legal-en';
import { legalTr } from './legal-tr';
import { legalRu } from './legal-ru';

/** Keep in step with Orders::LEGAL_VERSION in public/api/lib/Orders.php. */
export const LEGAL_VERSION = '2026-10-25';

export const legalSlugs = [
  'terms',
  'privacy',
  'cookies',
  'distance-sales',
  'pre-information',
  'returns',
  'delivery',
] as const;

export type LegalSlug = (typeof legalSlugs)[number];

/** Documents named in the checkout acceptance. Cookies stay in the footer. */
export const checkoutDocuments = [
  'pre-information',
  'distance-sales',
  'terms',
  'privacy',
  'returns',
  'delivery',
] as const satisfies readonly LegalSlug[];

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  summary: string;
  sections: LegalSection[];
}

export interface SellerLabels {
  tradeName: string;
  legalName: string;
  address: string;
  taxNumber: string;
  mersis: string;
  phone: string;
  email: string;
  website: string;
  place: string;
}

export interface LegalCopy {
  hubTitle: string;
  hubLead: string;
  updated: string;
  versionLabel: string;
  notice: string;
  sellerTitle: string;
  sellerPending: string;
  place: string;
  sellerLabels: SellerLabels;
  documents: Record<LegalSlug, LegalDocument>;
}

export const legal: Record<Locale, LegalCopy> = {
  en: legalEn,
  tr: legalTr,
  ru: legalRu,
};

export function isLegalSlug(value: string | undefined): value is LegalSlug {
  return legalSlugs.includes(value as LegalSlug);
}
