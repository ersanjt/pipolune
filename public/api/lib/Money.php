<?php
declare(strict_types=1);

namespace Pipolune;

/**
 * Prices are set by hand in three currencies. The visitor's currency follows the page language
 * (en → USD, tr → TRY, ru → RUB) unless they pick another one, which is kept in the pl_currency cookie.
 */
final class Money
{
    public const CURRENCIES = ['TRY', 'USD', 'RUB'];
    public const COLUMN = ['TRY' => 'price_try', 'USD' => 'price_usd', 'RUB' => 'price_rub'];
    private const LOCALE_DEFAULT = ['en' => 'USD', 'tr' => 'TRY', 'ru' => 'RUB'];
    private const SYMBOL = ['TRY' => '₺', 'USD' => '$', 'RUB' => '₽'];
    private const INTL = ['en' => 'en_GB', 'tr' => 'tr_TR', 'ru' => 'ru_RU'];

    public static function forLocale(string $locale): string
    {
        return self::LOCALE_DEFAULT[$locale] ?? 'USD';
    }

    /** Explicit request value, then the visitor's saved choice, then the language default. */
    public static function pick(mixed $requested, string $locale): string
    {
        foreach ([$requested, $_COOKIE['pl_currency'] ?? null] as $candidate) {
            if (is_string($candidate) && in_array(strtoupper($candidate), self::CURRENCIES, true)) {
                return strtoupper($candidate);
            }
        }
        return self::forLocale($locale);
    }

    /** @return array{TRY: int, USD: int, RUB: int} */
    public static function prices(array $product): array
    {
        $prices = [];
        foreach (self::COLUMN as $currency => $column) {
            $prices[$currency] = (int) ($product[$column] ?? 0);
        }
        return $prices;
    }

    /** Matches src/lib/format.ts: "$49", "₺1.890", "4 490 ₽"; English lira prices read "TRY 1,890" like the boards. */
    public static function format(int $minor, string $currency, string $locale = 'en'): string
    {
        $formatter = new \NumberFormatter(self::INTL[$locale] ?? 'en_GB', \NumberFormatter::CURRENCY);
        $digits = $minor % 100 === 0 ? 0 : 2;
        $formatter->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, $digits);
        $formatter->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, $digits);
        $english = $locale === 'en' && $currency === 'TRY';
        $formatter->setSymbol(\NumberFormatter::CURRENCY_SYMBOL, $english ? 'TRY ' : (self::SYMBOL[$currency] ?? $currency));
        $text = (string) $formatter->format($minor / 100);
        return trim(str_replace(["\u{00a0}", "\u{202f}", 'TRY  '], [' ', ' ', 'TRY '], $text));
    }
}
