<?php
declare(strict_types=1);

namespace Pipolune;

final class Catalog
{
    public const SEASONS = ['spring', 'summer', 'autumn', 'winter', 'all'];
    public const GENDERS = ['girl', 'boy', 'unisex', 'mother'];
    public const CATEGORIES = ['jumpsuit', 'dress', 'cardigan', 'blouse', 'outerwear', 'set', 'shoes', 'hat', 'accessory', 'care'];
    public const STATUSES = ['draft', 'active', 'archived'];

    /** Storefront list. $locale null returns every translation (used by the static site build). */
    public static function list(?string $locale, bool $staff = false, bool $sourcing = false): array
    {
        $where = $staff ? "p.status <> 'archived'" : "p.status = 'active'";
        $products = Db::all("SELECT p.* FROM products p WHERE $where ORDER BY p.sort_order, p.id");
        return self::hydrate($products, $locale, $staff, $sourcing);
    }

    public static function bySlug(string $slug, ?string $locale): ?array
    {
        $p = Db::one("SELECT * FROM products WHERE slug = ? AND status = 'active'", [$slug]);
        return $p ? self::hydrate([$p], $locale, false)[0] : null;
    }

    public static function byId(int $id, bool $staff = true, bool $sourcing = false): ?array
    {
        $p = Db::one('SELECT * FROM products WHERE id = ?', [$id]);
        return $p ? self::hydrate([$p], null, $staff, $sourcing)[0] : null;
    }

    private static function json(?string $value): array
    {
        $decoded = $value ? json_decode($value, true) : null;
        return is_array($decoded) ? $decoded : [];
    }

    /** Picks one language from a {en, tr, ru} map, falling back to English. */
    private static function pick(mixed $map, ?string $locale): mixed
    {
        if ($locale === null || !is_array($map)) {
            return $map;
        }
        return $map[$locale] ?? $map['en'] ?? null;
    }

    private static function hydrate(array $products, ?string $locale, bool $staff, bool $sourcing = false): array
    {
        if (!$products) {
            return [];
        }
        $ids = array_column($products, 'id');
        $marks = Db::marks($ids);
        $translations = [];
        foreach (Db::all("SELECT * FROM product_translations WHERE product_id IN ($marks)", $ids) as $t) {
            $translations[$t['product_id']][$t['locale']] = [
                'name' => $t['name'],
                'subtitle' => $t['subtitle'],
                'description' => $t['description'] ?? '',
                'details' => $t['details'] ?? '',
                'specs' => array_values(array_filter(self::json($t['specs']), 'is_array')),
            ];
        }
        $variants = [];
        $variantWhere = $staff ? '' : 'AND active = 1';
        foreach (Db::all("SELECT * FROM product_variants WHERE product_id IN ($marks) $variantWhere ORDER BY id", $ids) as $v) {
            $variant = [
                'id' => (int) $v['id'],
                'sku' => $v['sku'],
                'colour' => $v['colour'],
                'size' => $v['size'],
                'weightG' => $v['weight_g'] === null ? null : (int) $v['weight_g'],
                'available' => (int) $v['stock'] > 0,
            ];
            if ($staff) {
                $variant += ['stock' => (int) $v['stock'], 'active' => (bool) $v['active']];
            }
            $variants[$v['product_id']][] = $variant;
        }

        return array_map(static function (array $p) use ($translations, $variants, $locale, $staff, $sourcing) {
            $all = $translations[$p['id']] ?? [];
            $chart = self::json($p['size_chart']);
            $item = [
                'id' => (int) $p['id'],
                'slug' => $p['slug'],
                'season' => $p['season'],
                'category' => $p['category'],
                'gender' => $p['gender'],
                'ageBand' => $p['age_band'],
                'prices' => Money::prices($p),
                'image' => $p['image'],
                'gallery' => array_values(array_filter(self::json($p['gallery']), 'is_string')),
                'video' => $p['video'] === '' ? null : ['url' => $p['video'], 'poster' => $p['video_poster']],
                'sizeChart' => empty($chart['rows']) ? null : [
                    'head' => self::pick($chart['head'] ?? [], $locale) ?? [],
                    'rows' => $chart['rows'],
                    'note' => self::pick($chart['note'] ?? [], $locale) ?? '',
                ],
                'features' => array_map(static fn ($f) => [
                    'image' => (string) ($f['image'] ?? ''),
                    'caption' => self::pick($f['caption'] ?? [], $locale) ?? '',
                ], array_values(array_filter(self::json($p['features']), 'is_array'))),
                'variants' => $variants[$p['id']] ?? [],
            ];
            if ($locale === null) {
                $item['translations'] = $all;
            } else {
                $item += $all[$locale] ?? $all['en'] ?? reset($all)
                    ?: ['name' => $p['slug'], 'subtitle' => '', 'description' => '', 'details' => '', 'specs' => []];
            }
            if ($staff) {
                $item += ['status' => $p['status'], 'sortOrder' => (int) $p['sort_order'], 'updatedAt' => iso($p['updated_at'])];
            }
            if ($sourcing) {
                $item['sourcing'] = [
                    'supplierName' => $p['supplier_name'],
                    'supplierUrl' => $p['supplier_url'],
                    'supplierSku' => $p['supplier_sku'],
                    'costCny' => $p['cost_cny'] === null ? null : (int) $p['cost_cny'],
                    'note' => $p['sourcing_note'] ?? '',
                ];
            }
            return $item;
        }, $products);
    }

    /** Site paths ("/images/…", "/uploads/…") or https links only. */
    private static function mediaUrl(mixed $value): string
    {
        $value = is_string($value) ? trim($value) : '';
        if ($value === '' || mb_strlen($value) > 255) {
            return '';
        }
        return preg_match('~^(/[^/\s][^\s]*|https://[^\s]+)$~', $value) ? $value : '';
    }

    private static function text(mixed $value, int $max): string
    {
        return is_scalar($value) ? mb_substr(trim((string) $value), 0, $max) : '';
    }

    /** Texts and media: what a content creator may change. */
    private static function contentRow(array $data, Input $in): array
    {
        $gallery = [];
        foreach (array_slice(is_array($data['gallery'] ?? null) ? $data['gallery'] : [], 0, 24) as $url) {
            if ($url = self::mediaUrl($url)) {
                $gallery[] = $url;
            }
        }
        $chart = is_array($data['sizeChart'] ?? null) ? $data['sizeChart'] : [];
        $rows = [];
        foreach (array_slice(is_array($chart['rows'] ?? null) ? $chart['rows'] : [], 0, 30) as $row) {
            if (is_array($row) && ($cells = array_map(static fn ($c) => self::text($c, 40), array_slice($row, 0, 12)))) {
                $rows[] = $cells;
            }
        }
        $head = [];
        $note = [];
        foreach (LOCALES as $l) {
            $head[$l] = array_map(static fn ($c) => self::text($c, 60), array_slice(is_array($chart['head'][$l] ?? null) ? $chart['head'][$l] : [], 0, 12));
            $note[$l] = self::text($chart['note'][$l] ?? '', 400);
        }
        $features = [];
        foreach (array_slice(is_array($data['features'] ?? null) ? $data['features'] : [], 0, 16) as $f) {
            $image = self::mediaUrl($f['image'] ?? '');
            if (!$image) {
                continue;
            }
            $caption = [];
            foreach (LOCALES as $l) {
                $caption[$l] = self::text($f['caption'][$l] ?? '', 160);
            }
            $features[] = ['image' => $image, 'caption' => $caption];
        }
        $video = self::mediaUrl($data['video']['url'] ?? '');
        if (!empty($data['video']['url']) && !$video) {
            $in->fail('video', 'invalid');
        }
        return [
            'image' => self::mediaUrl($data['image'] ?? '') ?: ($gallery[0] ?? ''),
            'gallery' => json_encode($gallery, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'video' => $video,
            'video_poster' => $video ? self::mediaUrl($data['video']['poster'] ?? '') : '',
            'size_chart' => $rows ? json_encode(['head' => $head, 'rows' => $rows, 'note' => $note], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
            'features' => json_encode($features, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ];
    }

    /**
     * Create or update a product from Studio. Content creators change texts and media only;
     * prices, status, address, sizes and sourcing need products.manage.
     */
    public static function save(?int $id, array $data, array $actor): array
    {
        $manage = Perm::can($actor, 'products.manage');
        $in = new Input($data);
        $row = self::contentRow($data, $in);

        if ($manage || $id === null) {
            $slug = $in->str('slug', 120, true);
            if ($slug !== null && !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
                $in->fail('slug', 'invalid_slug');
            }
            if (Db::value('SELECT id FROM products WHERE slug = ? AND id <> ?', [$slug, $id ?? 0])) {
                $in->fail('slug', 'taken');
            }
            $categories = self::CATEGORIES;
            if ($id !== null) {
                $existing = Db::value('SELECT category FROM products WHERE id = ?', [$id]);
                if (is_string($existing) && $existing !== '' && !in_array($existing, $categories, true)) {
                    $categories[] = $existing;
                }
            }
            $row += [
                'slug' => $slug,
                'status' => $manage ? ($in->oneOf('status', self::STATUSES) ?? 'draft') : 'draft',
                'season' => $in->oneOf('season', self::SEASONS) ?? 'all',
                'category' => $in->oneOf('category', $categories) ?? '',
                'gender' => $in->oneOf('gender', self::GENDERS) ?? 'unisex',
                'age_band' => $in->str('ageBand', 20) ?? '',
                'sort_order' => $in->int('sortOrder', -9999, 9999) ?? 0,
            ];
        }
        if ($manage) {
            foreach (Money::COLUMN as $currency => $column) {
                $value = $data['prices'][$currency] ?? null;
                if (!is_int($value) || $value < 1 || $value > 100_000_000) {
                    $in->fail("prices.$currency", 'required');
                    continue;
                }
                $row[$column] = $value;
            }
            $s = is_array($data['sourcing'] ?? null) ? $data['sourcing'] : [];
            $cost = $s['costCny'] ?? null;
            if ($cost !== null && (!is_int($cost) || $cost < 0 || $cost > 100_000_000)) {
                $in->fail('sourcing.costCny', 'invalid');
            }
            $row += [
                'supplier_name' => self::text($s['supplierName'] ?? '', 160),
                'supplier_url' => preg_match('~^https?://~', (string) ($s['supplierUrl'] ?? '')) ? self::text($s['supplierUrl'], 255) : '',
                'supplier_sku' => self::text($s['supplierSku'] ?? '', 80),
                'cost_cny' => is_int($cost) ? $cost : null,
                'sourcing_note' => self::text($s['note'] ?? '', 4000),
            ];
        }

        $translations = is_array($data['translations'] ?? null) ? $data['translations'] : [];
        if (trim((string) ($translations['en']['name'] ?? '')) === '') {
            $in->fail('translations.en.name', 'required');
        }
        $variants = $manage && is_array($data['variants'] ?? null) ? array_values($data['variants']) : null;
        foreach ($variants ?? [] as $i => $v) {
            if (!is_array($v) || trim((string) ($v['sku'] ?? '')) === '') {
                $in->fail("variants.$i.sku", 'required');
            }
        }
        $in->check();

        return Db::tx(static function () use ($id, $row, $translations, $variants, $actor) {
            if ($id === null) {
                $id = Db::insert('products', $row);
            } else {
                Db::update('products', $row, ['id' => $id]);
            }
            foreach (LOCALES as $locale) {
                $t = $translations[$locale] ?? null;
                if (!is_array($t) || trim((string) ($t['name'] ?? '')) === '') {
                    Db::run('DELETE FROM product_translations WHERE product_id = ? AND locale = ?', [$id, $locale]);
                    continue;
                }
                $specs = [];
                foreach (array_slice(is_array($t['specs'] ?? null) ? $t['specs'] : [], 0, 40) as $spec) {
                    $label = self::text($spec['label'] ?? '', 80);
                    $value = self::text($spec['value'] ?? '', 300);
                    if ($label !== '' && $value !== '') {
                        $specs[] = ['label' => $label, 'value' => $value];
                    }
                }
                Db::run(
                    'INSERT INTO product_translations (product_id, locale, name, subtitle, description, details, specs) VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE name = VALUES(name), subtitle = VALUES(subtitle), description = VALUES(description),
                       details = VALUES(details), specs = VALUES(specs)',
                    [
                        $id, $locale, self::text($t['name'], 160), self::text($t['subtitle'] ?? '', 190),
                        self::text($t['description'] ?? '', 5000), self::text($t['details'] ?? '', 10000),
                        json_encode($specs, JSON_UNESCAPED_UNICODE),
                    ],
                );
            }
            if ($variants !== null) {
                self::saveVariants($id, $variants);
            }
            Audit::log((int) $actor['id'], 'product.save', 'product', (string) $id);
            return self::byId($id, true, Perm::can($actor, 'sourcing.view'));
        });
    }

    private static function saveVariants(int $id, array $variants): void
    {
        $keep = [];
        foreach ($variants as $v) {
            $weight = $v['weightG'] ?? null;
            $values = [
                'sku' => self::text($v['sku'], 60),
                'colour' => self::text($v['colour'] ?? '', 60),
                'size' => self::text($v['size'] ?? '', 20),
                'stock' => max(0, (int) ($v['stock'] ?? 0)),
                'weight_g' => is_int($weight) && $weight > 0 && $weight < 65000 ? $weight : null,
                'active' => !isset($v['active']) || $v['active'] ? 1 : 0,
            ];
            $existing = isset($v['id']) ? Db::value('SELECT id FROM product_variants WHERE id = ? AND product_id = ?', [(int) $v['id'], $id]) : null;
            if ($existing) {
                Db::update('product_variants', $values, ['id' => (int) $existing]);
                $keep[] = (int) $existing;
            } else {
                $keep[] = Db::insert('product_variants', ['product_id' => $id] + $values);
            }
        }
        // Variants referenced by carts are deactivated instead of deleted so bags never break silently.
        $stale = Db::all(
            'SELECT id FROM product_variants WHERE product_id = ?' . ($keep ? ' AND id NOT IN (' . Db::marks($keep) . ')' : ''),
            [$id, ...$keep],
        );
        foreach (array_column($stale, 'id') as $variantId) {
            Db::run('UPDATE product_variants SET active = 0 WHERE id = ?', [$variantId]);
        }
    }
}
