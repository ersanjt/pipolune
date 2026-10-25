-- The main owner (the shop's owner) keeps full access: no one can change her role or remove her from Studio.
-- The first owner account becomes the main owner; on a fresh install it is the first owner invited.
ALTER TABLE users ADD is_primary TINYINT(1) NOT NULL DEFAULT 0 AFTER role;

UPDATE users SET is_primary = 1 WHERE role = 'owner' ORDER BY id LIMIT 1;
