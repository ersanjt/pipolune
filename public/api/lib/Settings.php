<?php
declare(strict_types=1);

namespace Pipolune;

final class Settings
{
    /**
     * sales_mode: off      – bag works, checkout closed (launch default: no orders or payments, see website brief)
     *             request  – checkout sends an order request; no payment is taken, the team confirms by email
     *             live     – reserved for a tested payment provider; refused until one is configured
     */
    public const DEFAULTS = [
        'sales_mode' => 'off',
        'season_mode' => 'auto',
        'manual_season' => 'spring',
        'homepage_mode' => 'seasonal',
        'shipping_standard' => ['TRY' => null, 'USD' => null, 'RUB' => null],
        'catalog_preview' => true,
    ];

    private static ?array $cache = null;

    public static function all(): array
    {
        if (self::$cache === null) {
            self::$cache = self::DEFAULTS;
            foreach (Db::all('SELECT name, value FROM settings') as $row) {
                if (array_key_exists($row['name'], self::DEFAULTS)) {
                    self::$cache[$row['name']] = json_decode($row['value'], true);
                }
            }
        }
        return self::$cache;
    }

    public static function get(string $name): mixed
    {
        return self::all()[$name] ?? null;
    }

    public static function set(array $values): void
    {
        foreach ($values as $name => $value) {
            if (!array_key_exists($name, self::DEFAULTS)) {
                continue;
            }
            Db::run(
                'INSERT INTO settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
                [$name, json_encode($value, JSON_UNESCAPED_UNICODE)],
            );
        }
        self::$cache = null;
    }

    /** Standard delivery in the order currency (minor units); null means it is confirmed by email. */
    public static function shipping(string $currency): ?int
    {
        $value = self::get('shipping_standard')[$currency] ?? null;
        return $value === null ? null : (int) $value;
    }

    /** Season by the Europe/Istanbul calendar unless Studio pins one. Night is 19:00–06:59. */
    public static function season(): array
    {
        $now = new \DateTimeImmutable('now', new \DateTimeZone('Europe/Istanbul'));
        $month = (int) $now->format('n');
        $auto = match (true) {
            $month >= 3 && $month <= 5 => 'spring',
            $month >= 6 && $month <= 8 => 'summer',
            $month >= 9 && $month <= 11 => 'autumn',
            default => 'winter',
        };
        $hour = (int) $now->format('G');
        return [
            'season' => self::get('season_mode') === 'manual' ? self::get('manual_season') : $auto,
            'mode' => self::get('season_mode'),
            'night' => $hour >= 19 || $hour < 7,
        ];
    }

    public static function publicView(): array
    {
        return [
            'salesMode' => self::get('sales_mode'),
            'shippingStandard' => self::get('shipping_standard'),
            'catalogPreview' => (bool) self::get('catalog_preview'),
            'homepageMode' => self::get('homepage_mode'),
        ] + self::season();
    }
}
