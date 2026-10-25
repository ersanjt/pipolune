-- Records that the customer accepted the published legal pack before the order or account was created.

ALTER TABLE users
  ADD COLUMN legal_accepted_at DATETIME NULL AFTER marketing_opt_in;

ALTER TABLE orders
  ADD COLUMN legal_version VARCHAR(32) NULL AFTER customer_note,
  ADD COLUMN legal_accepted_at DATETIME NULL AFTER legal_version;
