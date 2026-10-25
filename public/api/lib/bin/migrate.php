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

if ((int) Db::value('SELECT COUNT(*) FROM products') === 0) {
    $seed = json_decode(file_get_contents(dirname(__DIR__) . '/seed/catalog.json'), true, flags: JSON_THROW_ON_ERROR);
    Db::tx(static function () use ($seed): void {
        foreach ($seed['products'] as $i => $p) {
            $id = Db::insert('products', [
                'slug' => $p['slug'],
                'status' => 'active',
                'season' => $p['season'],
                'category' => $p['category'],
                'gender' => $p['gender'],
                'age_band' => $p['age_band'],
                'price_kurus' => $p['price_kurus'],
                'image' => $p['image'],
                'sort_order' => $i,
            ]);
            foreach ($p['translations'] as $locale => $t) {
                Db::insert('product_translations', ['product_id' => $id, 'locale' => $locale] + $t);
            }
            foreach ($p['variants'] as $v) {
                Db::insert('product_variants', ['product_id' => $id] + $v);
            }
        }
    });
    echo 'seeded ' . count($seed['products']) . " products\n";
}

echo "database up to date\n";
