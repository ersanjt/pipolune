-- Pipolune core schema. Money is stored in kuruş (1 TRY = 100), timestamps in UTC.

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  name VARCHAR(120) NOT NULL DEFAULT '',
  phone VARCHAR(40) NULL,
  locale CHAR(2) NOT NULL DEFAULT 'en',
  role ENUM('customer','owner','editor','fulfilment') NOT NULL DEFAULT 'customer',
  email_verified_at DATETIME NULL,
  marketing_opt_in TINYINT(1) NOT NULL DEFAULT 0,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  ip VARCHAR(45) NOT NULL DEFAULT '',
  user_agent VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  KEY idx_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_tokens (
  token_hash CHAR(64) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  purpose ENUM('verify','reset') NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tokens_user (user_id, purpose),
  CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rate_limits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bucket VARCHAR(32) NOT NULL,
  key_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rate (bucket, key_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE addresses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NULL,
  country CHAR(2) NOT NULL DEFAULT 'TR',
  city VARCHAR(80) NOT NULL,
  postal_code VARCHAR(20) NULL,
  line1 VARCHAR(190) NOT NULL,
  line2 VARCHAR(190) NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_addresses_user (user_id),
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  status ENUM('draft','active','archived') NOT NULL DEFAULT 'draft',
  season ENUM('spring','summer','autumn','winter','all') NOT NULL DEFAULT 'all',
  category VARCHAR(40) NOT NULL DEFAULT '',
  gender ENUM('girl','boy','unisex') NOT NULL DEFAULT 'unisex',
  age_band VARCHAR(20) NOT NULL DEFAULT '',
  price_kurus INT UNSIGNED NOT NULL DEFAULT 0,
  image VARCHAR(255) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_products_status (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_translations (
  product_id INT UNSIGNED NOT NULL,
  locale CHAR(2) NOT NULL,
  name VARCHAR(160) NOT NULL,
  subtitle VARCHAR(190) NOT NULL DEFAULT '',
  description TEXT NULL,
  PRIMARY KEY (product_id, locale),
  CONSTRAINT fk_translations_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_variants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  sku VARCHAR(60) NOT NULL UNIQUE,
  colour VARCHAR(60) NOT NULL DEFAULT '',
  size VARCHAR(20) NOT NULL DEFAULT '',
  stock INT NOT NULL DEFAULT 0,
  price_kurus INT UNSIGNED NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  KEY idx_variants_product (product_id),
  CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wishlist_items (
  user_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE carts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  token_hash CHAR(64) NULL UNIQUE,
  user_id INT UNSIGNED NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cart_items (
  cart_id INT UNSIGNED NOT NULL,
  variant_id INT UNSIGNED NOT NULL,
  quantity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cart_id, variant_id),
  CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts (id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order, payment and fulfilment are separate statuses (docs/uiux/uiux-foundation-v1.ru.md).
CREATE TABLE orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(20) NULL UNIQUE,
  user_id INT UNSIGNED NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(40) NULL,
  locale CHAR(2) NOT NULL DEFAULT 'en',
  status ENUM('requested','confirmed','completed','cancelled') NOT NULL DEFAULT 'requested',
  payment_status ENUM('not_started','pending','paid','failed','refunded') NOT NULL DEFAULT 'not_started',
  fulfilment_status ENUM('unfulfilled','preparing','shipped','delivered','returned') NOT NULL DEFAULT 'unfulfilled',
  stock_reserved TINYINT(1) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'TRY',
  subtotal_kurus INT UNSIGNED NOT NULL,
  shipping_kurus INT UNSIGNED NULL,
  total_kurus INT UNSIGNED NOT NULL,
  shipping_name VARCHAR(120) NOT NULL,
  shipping_line1 VARCHAR(190) NOT NULL,
  shipping_line2 VARCHAR(190) NULL,
  shipping_city VARCHAR(80) NOT NULL,
  shipping_postal_code VARCHAR(20) NULL,
  shipping_country CHAR(2) NOT NULL DEFAULT 'TR',
  marketing_opt_in TINYINT(1) NOT NULL DEFAULT 0,
  carrier VARCHAR(60) NULL,
  tracking_number VARCHAR(80) NULL,
  customer_note VARCHAR(500) NULL,
  access_token_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_orders_user (user_id),
  KEY idx_orders_email (email),
  KEY idx_orders_status (status, created_at),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NULL,
  variant_id INT UNSIGNED NULL,
  sku VARCHAR(60) NOT NULL,
  name VARCHAR(160) NOT NULL,
  colour VARCHAR(60) NOT NULL DEFAULT '',
  size VARCHAR(20) NOT NULL DEFAULT '',
  image VARCHAR(255) NOT NULL DEFAULT '',
  unit_price_kurus INT UNSIGNED NOT NULL,
  quantity SMALLINT UNSIGNED NOT NULL,
  KEY idx_order_items_order (order_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  type VARCHAR(40) NOT NULL,
  message VARCHAR(500) NOT NULL DEFAULT '',
  visible_to_customer TINYINT(1) NOT NULL DEFAULT 0,
  author_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_order_events_order (order_id),
  CONSTRAINT fk_order_events_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CRM: interest / enquiries from the storefront and private staff notes per customer email.
CREATE TABLE leads (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  name VARCHAR(120) NOT NULL DEFAULT '',
  product_id INT UNSIGNED NULL,
  locale CHAR(2) NOT NULL DEFAULT 'en',
  country CHAR(2) NOT NULL DEFAULT '',
  source VARCHAR(40) NOT NULL DEFAULT 'contact',
  message TEXT NULL,
  status ENUM('new','contacted','closed') NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_leads_email (email),
  KEY idx_leads_status (status, created_at),
  CONSTRAINT fk_leads_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE crm_notes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  author_id INT UNSIGNED NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_crm_notes_email (email),
  CONSTRAINT fk_crm_notes_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE settings (
  name VARCHAR(64) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  action VARCHAR(60) NOT NULL,
  entity VARCHAR(40) NOT NULL DEFAULT '',
  entity_id VARCHAR(60) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
