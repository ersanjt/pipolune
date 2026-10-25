<?php
declare(strict_types=1);

// Applies lib/migrations/*.sql in order, then seeds the catalogue into an empty database.
// Run on the server: php ~/public_html/api/lib/bin/migrate.php  (deploy.mjs does this after upload).

namespace Pipolune;

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/bootstrap.php';

$pdo = Db::pdo();
$pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

$applied = array_flip(array_column(Db::all('SELECT version FROM schema_migrations'), 'version'));
$files = glob(dirname(__DIR__) . '/migrations/*.sql');
sort($files);

foreach ($files as $file) {
    $version = basename($file, '.sql');
    if (isset($applied[$version])) {
        continue;
    }
    $sql = file_get_contents($file);
    $statements = array_filter(array_map('trim', preg_split('/;\s*$/m', preg_replace('/^--.*$/m', '', $sql))));
    foreach ($statements as $statement) {
        $pdo->exec($statement);
    }
    Db::insert('schema_migrations', ['version' => $version]);
    echo "applied $version\n";
}

// Seed products are added once, matched by slug; after that Studio owns them (archived ones stay archived).
// Media and content fields that are still empty on an existing product are filled from the seed, never overwritten.
$seed = json_decode(file_get_contents(dirname(__DIR__) . '/seed/catalog.json'), true, flags: JSON_THROW_ON_ERROR);
$json = static fn (mixed $v): ?string => $v === null ? null : json_encode($v, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
[$added, $filled] = Db::tx(static function () use ($seed, $json): array {
    $added = [];
    $filled = [];
    foreach ($seed['products'] as $i => $p) {
        $media = [
            'gallery' => $json($p['gallery'] ?? null),
            'video' => $p['video']['url'] ?? '',
            'video_poster' => $p['video']['poster'] ?? '',
            'size_chart' => $json($p['size_chart'] ?? null),
            'features' => $json($p['features'] ?? null),
            'supplier_name' => $p['sourcing']['supplier_name'] ?? '',
            'supplier_url' => $p['sourcing']['supplier_url'] ?? '',
            'supplier_sku' => $p['sourcing']['supplier_sku'] ?? '',
            'cost_cny' => $p['sourcing']['cost_cny'] ?? null,
            'sourcing_note' => $p['sourcing']['note'] ?? null,
        ];
        $existing = Db::one('SELECT * FROM products WHERE slug = ?', [$p['slug']]);
        if ($existing) {
            $id = (int) $existing['id'];
            $fill = array_filter($media, static fn ($v, $k) => $v !== null && $v !== '' && ($existing[$k] === null || $existing[$k] === ''), ARRAY_FILTER_USE_BOTH);
            foreach ($p['translations'] as $locale => $t) {
                $row = Db::one('SELECT specs, details FROM product_translations WHERE product_id = ? AND locale = ?', [$id, $locale]);
                if ($row && $row['specs'] === null && $row['details'] === null && (isset($t['specs']) || isset($t['details']))) {
                    Db::update('product_translations', ['specs' => $json($t['specs'] ?? []), 'details' => $t['details'] ?? ''], ['product_id' => $id, 'locale' => $locale]);
                    $fill["specs.$locale"] = true;
                }
            }
            foreach ($p['variants'] as $v) {
                if (isset($v['weight_g'])) {
                    Db::run('UPDATE product_variants SET weight_g = ? WHERE product_id = ? AND sku = ? AND weight_g IS NULL', [$v['weight_g'], $id, $v['sku']]);
                }
            }
            if ($fill) {
                Db::update('products', array_filter($fill, static fn ($v) => $v !== true), ['id' => $id]);
                $filled[] = $p['slug'];
            }
            continue;
        }
        $id = Db::insert('products', [
            'slug' => $p['slug'],
            'status' => $p['status'] ?? 'active',
            'season' => $p['season'],
            'category' => $p['category'],
            'gender' => $p['gender'],
            'age_band' => $p['age_band'],
            'price_try' => $p['prices']['TRY'],
            'price_usd' => $p['prices']['USD'],
            'price_rub' => $p['prices']['RUB'],
            'image' => $p['image'],
            'sort_order' => $p['sort_order'] ?? $i,
        ] + $media);
        foreach ($p['translations'] as $locale => $t) {
            Db::insert('product_translations', [
                'product_id' => $id,
                'locale' => $locale,
                'name' => $t['name'],
                'subtitle' => $t['subtitle'] ?? '',
                'description' => $t['description'] ?? '',
                'details' => $t['details'] ?? null,
                'specs' => $json($t['specs'] ?? null),
            ]);
        }
        foreach ($p['variants'] as $v) {
            Db::insert('product_variants', ['product_id' => $id] + $v);
        }
        $added[] = $p['slug'];
    }
    return [$added, $filled];
});
if ($added) {
    echo 'added products: ' . implode(', ', $added) . "\n";
}
if ($filled) {
    echo 'filled product content: ' . implode(', ', $filled) . "\n";
}

echo "database up to date\n";
