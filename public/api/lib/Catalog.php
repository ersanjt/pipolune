<?php
declare(strict_types=1);

namespace Pipolune;

final class Catalog
{
    public const SEASONS = ['spring', 'summer', 'autumn', 'winter', 'all'];
    public const GENDERS = ['girl', 'boy', 'unisex'];
    public const STATUSES = ['draft', 'active', 'archived'];

    /** Storefront list. $locale null returns every translation (used by the static site build). */
    public static function list(?string $locale, bool $staff = false): array
    {
        $where = $staff ? "p.status <> 'archived'" : "p.status = 'active'";
        $products = Db::all("SELECT p.* FROM products p WHERE $where ORDER BY p.sort_order, p.id");
        return self::hydrate($products, $locale, $staff);
    }

    public static function bySlug(string $slug, ?string $locale): ?array
    {
        $p = Db::one("SELECT * FROM products WHERE slug = ? AND status = 'active'", [$slug]);
        return $p ? self::hydrate([$p], $locale, false)[0] : null;
    }

    public static function byId(int $id, bool $staff = true): ?array
    {
        $p = Db::one('SELECT * FROM products WHERE id = ?', [$id]);
        return $p ? self::hydrate([$p], null, $staff)[0] : null;
    }

    private static function hydrate(array $products, ?string $locale, bool $staff): array
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
                'available' => (int) $v['stock'] > 0,
            ];
            if ($staff) {
                $variant += ['stock' => (int) $v['stock'], 'active' => (bool) $v['active']];
            }
            $variants[$v['product_id']][] = $variant;
        }

        return array_map(static function (array $p) use ($translations, $variants, $locale, $staff) {
            $all = $translations[$p['id']] ?? [];
            $item = [
                'id' => (int) $p['id'],
                'slug' => $p['slug'],
                'season' => $p['season'],
                'category' => $p['category'],
                'gender' => $p['gender'],
                'ageBand' => $p['age_band'],
                'prices' => Money::prices($p),
                'image' => $p['image'],
                'variants' => $variants[$p['id']] ?? [],
            ];
            if ($locale === null) {
                $item['translations'] = $all;
            } else {
                $item += $all[$locale] ?? $all['en'] ?? reset($all) ?: ['name' => $p['slug'], 'subtitle' => '', 'description' => ''];
            }
            if ($staff) {
                $item += ['status' => $p['status'], 'sortOrder' => (int) $p['sort_order'], 'updatedAt' => iso($p['updated_at'])];
            }
            return $item;
        }, $products);
    }

    /** Create or update a product with its translations and variants from Studio. */
    public static function save(?int $id, array $data, int $actorId): array
    {
        $in = new Input($data);
        $slug = $in->str('slug', 120, true);
        if ($slug !== null && !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
            $in->fail('slug', 'invalid_slug');
        }
        $row = [
            'slug' => $slug,
            'status' => $in->oneOf('status', self::STATUSES) ?? 'draft',
            'season' => $in->oneOf('season', self::SEASONS) ?? 'all',
            'category' => $in->str('category', 40) ?? '',
            'gender' => $in->oneOf('gender', self::GENDERS) ?? 'unisex',
            'age_band' => $in->str('ageBand', 20) ?? '',
            'image' => $in->str('image', 255) ?? '',
            'sort_order' => $in->int('sortOrder', -9999, 9999) ?? 0,
        ];
        foreach (Money::COLUMN as $currency => $column) {
            $value = $data['prices'][$currency] ?? null;
            if (!is_int($value) || $value < 1 || $value > 100_000_000) {
                $in->fail("prices.$currency", 'required');
                continue;
            }
            $row[$column] = $value;
        }
        $translations = is_array($data['translations'] ?? null) ? $data['translations'] : [];
        if (trim((string) ($translations['en']['name'] ?? '')) === '') {
            $in->fail('translations.en.name', 'required');
        }
        $variants = is_array($data['variants'] ?? null) ? array_values($data['variants']) : [];
        foreach ($variants as $i => $v) {
            if (!is_array($v) || trim((string) ($v['sku'] ?? '')) === '') {
                $in->fail("variants.$i.sku", 'required');
            }
        }
        $clash = Db::value('SELECT id FROM products WHERE slug = ? AND id <> ?', [$slug, $id ?? 0]);
        if ($clash) {
            $in->fail('slug', 'taken');
        }
        $in->check();

        return Db::tx(static function () use ($id, $row, $translations, $variants, $actorId) {
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
                Db::run(
                    'INSERT INTO product_translations (product_id, locale, name, subtitle, description) VALUES (?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE name = VALUES(name), subtitle = VALUES(subtitle), description = VALUES(description)',
                    [$id, $locale, mb_substr(trim($t['name']), 0, 160), mb_substr(trim((string) ($t['subtitle'] ?? '')), 0, 190), trim((string) ($t['description'] ?? ''))],
                );
            }
            $keep = [];
            foreach ($variants as $v) {
                $values = [
                    'sku' => mb_substr(trim((string) $v['sku']), 0, 60),
                    'colour' => mb_substr(trim((string) ($v['colour'] ?? '')), 0, 60),
                    'size' => mb_substr(trim((string) ($v['size'] ?? '')), 0, 20),
                    'stock' => max(0, (int) ($v['stock'] ?? 0)),
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
            Audit::log($actorId, 'product.save', 'product', (string) $id);
            return self::byId($id);
        });
    }
}
