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
        // Public shop identity. Legal name, tax number and MERSIS stay empty until they are official.
        'store' => [
            'tradeName' => 'Pipolune',
            'legalName' => '',
            'phone' => '+90 554 606 00 98',
            'email' => 'info@pipolune.com',
            'line1' => 'Merkez Mahallesi, Lale Sokak No: 4-6',
            'line2' => 'Kat 4, Kapı 7',
            'postalCode' => '34406',
            'district' => 'Kağıthane',
            'city' => 'İstanbul',
            'country' => 'Türkiye',
            'taxNumber' => '',
            'mersis' => '',
        ],
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

    /**
     * Replace the saved shop identity. Unknown keys are ignored.
     * The caller must already have checked the editor's permission.
     */
    public static function storeFrom(mixed $raw, Input $in): array
    {
        $current = self::get('store');
        $store = is_array($current) ? $current : self::DEFAULTS['store'];
        if (!is_array($raw)) {
            $in->fail('store', 'invalid');
            return $store;
        }
        foreach (array_keys(self::DEFAULTS['store']) as $key) {
            if (!array_key_exists($key, $raw)) {
                continue;
            }
            $value = $raw[$key];
            if (!is_string($value) && !is_int($value) && !is_float($value)) {
                $in->fail("store.$key", 'invalid');
                continue;
            }
            $value = trim((string) $value);
            if (mb_strlen($value) > 190) {
                $in->fail("store.$key", 'too_long');
            }
            $store[$key] = $value;
        }
        if (trim((string) ($store['tradeName'] ?? '')) === '') {
            $in->fail('store.tradeName', 'required');
        }
        $email = trim((string) ($store['email'] ?? ''));
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $in->fail('store.email', 'invalid_email');
        }
        $store['email'] = $email;
        return $store;
    }

    /** Address block sent to the shop. Empty legal fields stay empty. */
    public static function publicStore(): array
    {
        $store = self::get('store');
        if (!is_array($store)) {
            $store = self::DEFAULTS['store'];
        }
        $line1 = trim((string) ($store['line1'] ?? ''));
        $line2 = trim((string) ($store['line2'] ?? ''));
        $postalCode = trim((string) ($store['postalCode'] ?? ''));
        $district = trim((string) ($store['district'] ?? ''));
        $city = trim((string) ($store['city'] ?? ''));
        $country = trim((string) ($store['country'] ?? ''));
        $locality = trim($postalCode . ' ' . $district);
        $place = implode(' / ', array_values(array_filter([$locality, $city], static fn (string $part) => $part !== '')));
        $lines = array_values(array_filter([$line1, $line2, $place, $country], static fn (string $part) => $part !== ''));
        $postal = implode(', ', array_values(array_filter(
            [$line1, $line2, trim($postalCode . ' ' . $district), $city, $country],
            static fn (string $part) => $part !== '',
        )));
        $phone = trim((string) ($store['phone'] ?? ''));
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        return [
            'tradeName' => trim((string) ($store['tradeName'] ?? '')) ?: 'Pipolune',
            'legalName' => trim((string) ($store['legalName'] ?? '')),
            'phone' => $phone,
            'phoneTel' => $digits === '' ? '' : '+' . $digits,
            'email' => trim((string) ($store['email'] ?? '')),
            'lines' => $lines,
            'address' => $postal,
            'taxNumber' => trim((string) ($store['taxNumber'] ?? '')),
            'mersis' => trim((string) ($store['mersis'] ?? '')),
            'mapsUrl' => $lines === [] ? '' : 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode($postal),
        ];
    }

    public static function publicView(): array
    {
        return [
            'salesMode' => self::get('sales_mode'),
            'shippingStandard' => self::get('shipping_standard'),
            'catalogPreview' => (bool) self::get('catalog_preview'),
            'homepageMode' => self::get('homepage_mode'),
            'store' => self::publicStore(),
        ] + self::season();
    }
}
