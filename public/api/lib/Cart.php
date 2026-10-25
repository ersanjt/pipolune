<?php
declare(strict_types=1);

namespace Pipolune;

/** Guests get a cart cookie; signed-in customers have one cart per account, merged on sign-in. */
final class Cart
{
    public const COOKIE = 'pl_cart';
    private const TTL = 60 * 60 * 24 * 90;
    public const MAX_QTY = 10;

    public static function id(bool $create): ?int
    {
        $user = Auth::user();
        if ($user) {
            $id = Db::value('SELECT id FROM carts WHERE user_id = ?', [$user['id']]);
            if (!$id && $create) {
                $id = Db::insert('carts', ['user_id' => $user['id']]);
            }
            return $id ? (int) $id : null;
        }
        $token = $_COOKIE[self::COOKIE] ?? '';
        if (is_string($token) && strlen($token) === 64) {
            $id = Db::value('SELECT id FROM carts WHERE token_hash = ?', [Auth::hash($token)]);
            if ($id) {
                return (int) $id;
            }
        }
        if (!$create) {
            return null;
        }
        $token = bin2hex(random_bytes(32));
        Http::cookie(self::COOKIE, $token, self::TTL);
        $_COOKIE[self::COOKIE] = $token;
        return Db::insert('carts', ['token_hash' => Auth::hash($token)]);
    }

    public static function adoptGuestCart(int $userId): void
    {
        $token = $_COOKIE[self::COOKIE] ?? '';
        if (!is_string($token) || strlen($token) !== 64) {
            return;
        }
        $guest = Db::value('SELECT id FROM carts WHERE token_hash = ?', [Auth::hash($token)]);
        Http::cookie(self::COOKIE, '', -1);
        if (!$guest) {
            return;
        }
        $own = Db::value('SELECT id FROM carts WHERE user_id = ?', [$userId]);
        if (!$own) {
            Db::run('UPDATE carts SET user_id = ?, token_hash = NULL WHERE id = ?', [$userId, $guest]);
            return;
        }
        Db::run(
            'INSERT INTO cart_items (cart_id, variant_id, quantity)
             SELECT ?, variant_id, quantity FROM cart_items WHERE cart_id = ?
             ON DUPLICATE KEY UPDATE quantity = LEAST(?, cart_items.quantity + VALUES(quantity))',
            [$own, $guest, self::MAX_QTY],
        );
        Db::run('DELETE FROM carts WHERE id = ?', [$guest]);
    }

    public static function view(string $locale, string $currency): array
    {
        $id = self::id(false);
        $items = $id ? self::items($id, $locale, $currency) : [];
        $subtotal = 0;
        $count = 0;
        foreach ($items as $item) {
            $subtotal += $item['unitPrice'] * $item['quantity'];
            $count += $item['quantity'];
        }
        return [
            'items' => $items,
            'count' => $count,
            'subtotal' => $subtotal,
            'currency' => $currency,
            'ready' => $items && !array_filter($items, static fn ($i) => !$i['available']),
        ];
    }

    public static function items(int $cartId, string $locale, string $currency): array
    {
        $column = Money::COLUMN[$currency] ?? throw new \InvalidArgumentException("Unknown currency $currency");
        $rows = Db::all(
            "SELECT ci.quantity, v.id AS variant_id, v.sku, v.colour, v.size, v.stock, v.active AS variant_active,
                    p.$column AS unit_price, p.id AS product_id, p.slug, p.image, p.status,
                    COALESCE(t.name, te.name, p.slug) AS name, COALESCE(t.subtitle, te.subtitle, '') AS subtitle
             FROM cart_items ci
             JOIN product_variants v ON v.id = ci.variant_id
             JOIN products p ON p.id = v.product_id
             LEFT JOIN product_translations t ON t.product_id = p.id AND t.locale = ?
             LEFT JOIN product_translations te ON te.product_id = p.id AND te.locale = 'en'
             WHERE ci.cart_id = ?
             ORDER BY ci.added_at",
            [$locale, $cartId],
        );
        return array_map(static fn (array $r) => [
            'variantId' => (int) $r['variant_id'],
            'productId' => (int) $r['product_id'],
            'slug' => $r['slug'],
            'name' => $r['name'],
            'subtitle' => $r['subtitle'],
            'image' => $r['image'],
            'sku' => $r['sku'],
            'colour' => $r['colour'],
            'size' => $r['size'],
            'quantity' => (int) $r['quantity'],
            'unitPrice' => (int) $r['unit_price'],
            'currency' => $currency,
            'available' => $r['status'] === 'active' && $r['variant_active'] && (int) $r['stock'] >= (int) $r['quantity']
                && (int) $r['unit_price'] > 0,
        ], $rows);
    }

    public static function set(int $variantId, int $quantity, bool $add): void
    {
        $variant = Db::one(
            "SELECT v.stock FROM product_variants v JOIN products p ON p.id = v.product_id
             WHERE v.id = ? AND v.active = 1 AND p.status = 'active'",
            [$variantId],
        );
        if (!$variant) {
            throw new ApiError(404, 'variant_unavailable', 'This item is no longer available.');
        }
        $cartId = self::id(true);
        $current = (int) Db::value('SELECT quantity FROM cart_items WHERE cart_id = ? AND variant_id = ?', [$cartId, $variantId]);
        $target = min(self::MAX_QTY, $add ? $current + $quantity : $quantity);
        if ($target <= 0) {
            self::remove($variantId);
            return;
        }
        if ($target > (int) $variant['stock']) {
            throw new ApiError(409, 'not_enough_stock', 'Not enough items in stock.', ['available' => (int) $variant['stock']]);
        }
        Db::run(
            'INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)',
            [$cartId, $variantId, $target],
        );
        Db::run('UPDATE carts SET updated_at = UTC_TIMESTAMP() WHERE id = ?', [$cartId]);
    }

    public static function remove(int $variantId): void
    {
        $cartId = self::id(false);
        if ($cartId) {
            Db::run('DELETE FROM cart_items WHERE cart_id = ? AND variant_id = ?', [$cartId, $variantId]);
        }
    }

    public static function clear(int $cartId): void
    {
        Db::run('DELETE FROM cart_items WHERE cart_id = ?', [$cartId]);
    }
}
