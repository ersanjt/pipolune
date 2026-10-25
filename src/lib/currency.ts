// Prices are set by hand in three currencies. The page language picks the default
// (en → USD, tr → TRY, ru → RUB); the header switcher stores another choice in the pl_currency cookie,
// which the API also reads (public/api/lib/Money.php).
import type { Locale } from '../i18n/ui';

export const currencies = ['USD', 'TRY', 'RUB'] as const;
export type Currency = (typeof currencies)[number];
export type Prices = Record<Currency, number>;

export const defaultCurrency: Record<Locale, Currency> = { en: 'USD', tr: 'TRY', ru: 'RUB' };
export const currencySymbol: Record<Currency, string> = { USD: '$', TRY: '₺', RUB: '₽' };

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (currencies as readonly string[]).includes(value);
}

export function savedCurrency(): Currency | null {
  if (typeof document === 'undefined') return null;
  const value = document.cookie.match(/(?:^|;\s*)pl_currency=([A-Z]{3})/)?.[1];
  return isCurrency(value) ? value : null;
}

export function currentCurrency(lang: Locale): Currency {
  return savedCurrency() ?? defaultCurrency[lang];
}

export function chooseCurrency(currency: Currency): void {
  document.cookie = `pl_currency=${currency}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
}
