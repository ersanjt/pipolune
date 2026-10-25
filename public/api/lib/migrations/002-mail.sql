-- Outbound mail queue, marketing opt-out, and one abandoned-bag reminder per cart.

ALTER TABLE carts
  ADD reminded_at DATETIME NULL AFTER updated_at;

ALTER TABLE products
  ADD announced_at DATETIME NULL AFTER updated_at;

UPDATE products SET announced_at = created_at WHERE status = 'active';

CREATE TABLE mail_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dedupe_key VARCHAR(190) NULL,
  template VARCHAR(40) NOT NULL,
  category ENUM('transactional','marketing') NOT NULL DEFAULT 'transactional',
  locale CHAR(2) NOT NULL DEFAULT 'en',
  to_email VARCHAR(190) NOT NULL,
  vars_json MEDIUMTEXT NOT NULL,
  status ENUM('queued','sending','sent','failed','skipped') NOT NULL DEFAULT 'queued',
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  last_error VARCHAR(255) NULL,
  send_after DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mail_dedupe (dedupe_key),
  KEY idx_mail_due (status, send_after)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mail_suppressions (
  email VARCHAR(190) NOT NULL,
  category ENUM('marketing','all') NOT NULL,
  reason VARCHAR(40) NOT NULL DEFAULT 'unsubscribe',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (email, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
