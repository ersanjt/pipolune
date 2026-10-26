-- Mother is a shop audience of its own. Accessories stay a product type, not a gender.
ALTER TABLE products
  MODIFY gender ENUM('girl','boy','unisex','mother') NOT NULL DEFAULT 'unisex';
