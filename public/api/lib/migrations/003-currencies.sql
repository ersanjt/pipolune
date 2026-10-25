-- Three hand-set prices per product (TRY, USD, RUB). Amounts are minor units (kuruş, cents, kopecks);
-- orders keep their amounts in orders.currency. Per-size price overrides are dropped.

ALTER TABLE products
  CHANGE price_kurus price_try INT UNSIGNED NOT NULL DEFAULT 0,
  ADD price_usd INT UNSIGNED NOT NULL DEFAULT 0 AFTER price_try,
  ADD price_rub INT UNSIGNED NOT NULL DEFAULT 0 AFTER price_usd;

ALTER TABLE product_variants DROP COLUMN price_kurus;

ALTER TABLE orders
  CHANGE subtotal_kurus subtotal INT UNSIGNED NOT NULL,
  CHANGE shipping_kurus shipping INT UNSIGNED NULL,
  CHANGE total_kurus total INT UNSIGNED NOT NULL;

ALTER TABLE order_items CHANGE unit_price_kurus unit_price INT UNSIGNED NOT NULL;

UPDATE products SET price_usd = 3500, price_rub = 299000 WHERE slug = 'meadow-dress';
UPDATE products SET price_usd = 3200, price_rub = 279000 WHERE slug = 'forest-cardigan';
UPDATE products SET price_usd = 2700, price_rub = 229000 WHERE slug = 'willow-blouse';

DELETE FROM settings WHERE name = 'shipping_standard_kurus';
