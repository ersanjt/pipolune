import type { Locale } from '../i18n/ui';
import type { Currency } from './currency';

const intlLocale: Record<Locale, string> = { en: 'en-GB', tr: 'tr-TR', ru: 'ru-RU' };

/** Amounts are minor units (kuruş, cents, kopecks). English lira prices follow the boards ("TRY 1,190"). Mirrors Money::format in PHP. */
export function money(minor: number, lang: Locale, currency: Currency): string {
  const value = minor / 100;
  return new Intl.NumberFormat(intlLocale[lang], {
    style: 'currency',
    currency,
    currencyDisplay: lang === 'en' && currency === 'TRY' ? 'code' : 'narrowSymbol',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace(/\u00a0/g, ' ');
}

export function date(iso: string | null | undefined, lang: Locale): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(intlLocale[lang], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(
    new Date(iso),
  );
}

export function dateTime(iso: string | null | undefined, lang: Locale): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(intlLocale[lang], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(iso));
}

export function plural(count: number, lang: Locale, forms: Partial<Record<Intl.LDMLPluralRule, string>>): string {
  const rule = new Intl.PluralRules(intlLocale[lang]).select(count);
  return (forms[rule] ?? forms.other ?? '').replace('{n}', String(count));
}
