-- Product media and content (gallery, video, specifications, size chart, close-ups), staff-only sourcing,
-- parcel weight per size, and more Studio roles.
ALTER TABLE users MODIFY role ENUM('customer','owner','manager','editor','content','accountant','fulfilment','support') NOT NULL DEFAULT 'customer';

ALTER TABLE products
  ADD gallery TEXT NULL AFTER image,
  ADD video VARCHAR(255) NOT NULL DEFAULT '' AFTER gallery,
  ADD video_poster VARCHAR(255) NOT NULL DEFAULT '' AFTER video,
  ADD size_chart TEXT NULL AFTER video_poster,
  ADD features TEXT NULL AFTER size_chart,
  ADD supplier_name VARCHAR(160) NOT NULL DEFAULT '',
  ADD supplier_url VARCHAR(255) NOT NULL DEFAULT '',
  ADD supplier_sku VARCHAR(80) NOT NULL DEFAULT '',
  ADD cost_cny INT UNSIGNED NULL,
  ADD sourcing_note TEXT NULL;

ALTER TABLE product_translations
  ADD specs TEXT NULL,
  ADD details TEXT NULL;

ALTER TABLE product_variants ADD weight_g SMALLINT UNSIGNED NULL AFTER stock;
