<?php
declare(strict_types=1);

namespace Pipolune;

final class Orders
{
    public const STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'];
    public const PAYMENT = ['not_started', 'pending', 'paid', 'failed', 'refunded'];
    public const FULFILMENT = ['unfulfilled', 'preparing', 'shipped', 'delivered', 'returned'];

    /** Turns the current bag into an order request. Prices and stock are re-read inside the transaction. */
    public static function checkout(array $data, string $locale): array
    {
        $mode = Settings::get('sales_mode');
        if ($mode !== 'request') {
            throw new ApiError(409, 'sales_closed', 'Online orders are not open yet.');
        }
        RateLimit::hit('checkout', Http::ip(), 10, 3600);

        $user = Auth::user();
        $in = new Input($data);
        $email = $user ? $user['email'] : $in->email();
        $address = [
            'shipping_name' => $in->str('fullName', 120, true),
            'shipping_line1' => $in->str('line1', 190, true),
            'shipping_line2' => $in->str('line2', 190),
            'shipping_city' => $in->str('city', 80, true),
            'shipping_postal_code' => $in->str('postalCode', 20),
            'shipping_country' => $in->oneOf('country', ['TR'], true),
        ];
        $phone = $in->str('phone', 40);
        $note = $in->str('note', 500);
        $marketing = $in->bool('marketing');
        $in->check();

        $cartId = Cart::id(false) ?? throw new ApiError(409, 'cart_empty', 'Your bag is empty.');
        $shipping = Settings::get('shipping_standard_kurus');

        $order = Db::tx(static function () use ($cartId, $locale, $user, $email, $phone, $note, $marketing, $address, $shipping) {
            $items = Cart::items($cartId, $locale);
            if (!$items) {
                throw new ApiError(409, 'cart_empty', 'Your bag is empty.');
            }
            $ids = array_column($items, 'variantId');
            $stock = array_column(
                Db::all('SELECT id, stock FROM product_variants WHERE id IN (' . Db::marks($ids) . ') FOR UPDATE', $ids),
                'stock',
                'id',
            );
            $subtotal = 0;
            foreach ($items as $item) {
                if (!$item['available'] || ($stock[$item['variantId']] ?? 0) < $item['quantity']) {
                    throw new ApiError(409, 'cart_changed', 'Some items are no longer available. Please review your bag.');
                }
                $subtotal += $item['unitPrice'] * $item['quantity'];
            }
            $id = Db::insert('orders', [
                'user_id' => $user['id'] ?? null,
                'email' => $email,
                'phone' => $phone,
                'locale' => $locale,
                'subtotal_kurus' => $subtotal,
                'shipping_kurus' => $shipping,
                'total_kurus' => $subtotal + (int) $shipping,
                'marketing_opt_in' => $marketing ? 1 : 0,
                'customer_note' => $note,
                'access_token_hash' => '',
            ] + $address);
            $number = 'PL' . (1000 + $id);
            Db::update('orders', ['number' => $number, 'access_token_hash' => Auth::hash(self::token($number))], ['id' => $id]);
            foreach ($items as $item) {
                Db::insert('order_items', [
                    'order_id' => $id,
                    'product_id' => $item['productId'],
                    'variant_id' => $item['variantId'],
                    'sku' => $item['sku'],
                    'name' => $item['name'],
                    'colour' => $item['colour'],
                    'size' => $item['size'],
                    'image' => $item['image'],
                    'unit_price_kurus' => $item['unitPrice'],
                    'quantity' => $item['quantity'],
                ]);
            }
            self::event($id, 'requested', 'Order request received.', true, null);
            if ($user && $marketing && !$user['marketing_opt_in']) {
                Db::run('UPDATE users SET marketing_opt_in = 1 WHERE id = ?', [$user['id']]);
            }
            Cart::clear($cartId);
            return ['id' => $id, 'number' => $number, 'items' => $items, 'subtotal' => $subtotal];
        });

        $token = self::token($order['number']);
        $link = self::link($order['number'], $token, $locale);
        $lines = implode("\n", array_map(
            static fn ($i) => "• {$i['name']} ({$i['colour']}, {$i['size']}) × {$i['quantity']} — " . self::money($i['unitPrice'] * $i['quantity']),
            $order['items'],
        ));
        Mailer::template('order_requested', $locale, $email, [
            'name' => $address['shipping_name'],
            'number' => $order['number'],
            'items' => $lines,
            'link' => $link,
        ]);
        Mailer::notifyTeam(
            "New order request {$order['number']}",
            "{$address['shipping_name']} <$email>\n\n$lines\n\nSubtotal: " . self::money($order['subtotal']),
        );
        return ['number' => $order['number'], 'token' => $token];
    }

    /** Secret part of the guest order link; derived, so every email for an order carries the same working link. */
    public static function token(string $number): string
    {
        return substr(hash_hmac('sha256', "order:$number", (string) config('app.secret')), 0, 48);
    }

    public static function link(string $number, string $token, string $locale): string
    {
        return config('app.url') . "/$locale/order/?n=" . rawurlencode($number) . '&t=' . rawurlencode($token);
    }

    public static function money(int $kurus): string
    {
        return 'TRY ' . number_format($kurus / 100, $kurus % 100 ? 2 : 0, '.', ',');
    }

    public static function event(int $orderId, string $type, string $message, bool $visible, ?int $authorId): void
    {
        Db::insert('order_events', [
            'order_id' => $orderId,
            'type' => $type,
            'message' => mb_substr($message, 0, 500),
            'visible_to_customer' => $visible ? 1 : 0,
            'author_id' => $authorId,
        ]);
    }

    /** Guest access via the emailed link: order number plus secret token, never number + email alone. */
    public static function forGuest(string $number, string $token): array
    {
        $order = Db::one('SELECT * FROM orders WHERE number = ?', [$number]);
        if (!$order || !hash_equals($order['access_token_hash'], Auth::hash($token))) {
            throw ApiError::notFound('order_not_found');
        }
        return self::present($order, false);
    }

    public static function forUser(int $userId, string $number): array
    {
        $order = Db::one('SELECT * FROM orders WHERE number = ? AND user_id = ?', [$number, $userId]);
        if (!$order) {
            throw ApiError::notFound('order_not_found');
        }
        return self::present($order, false);
    }

    public static function listForUser(int $userId, int $limit = 50): array
    {
        $orders = Db::all('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT ' . $limit, [$userId]);
        return array_map(static fn ($o) => self::summary($o), $orders);
    }

    public static function summary(array $o): array
    {
        $first = Db::one('SELECT name, image FROM order_items WHERE order_id = ? ORDER BY id LIMIT 1', [$o['id']]);
        return [
            'number' => $o['number'],
            'createdAt' => iso($o['created_at']),
            'email' => $o['email'],
            'name' => $o['shipping_name'],
            'status' => $o['status'],
            'paymentStatus' => $o['payment_status'],
            'fulfilmentStatus' => $o['fulfilment_status'],
            'total' => (int) $o['total_kurus'],
            'itemCount' => (int) Db::value('SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = ?', [$o['id']]),
            'firstItem' => $first,
        ];
    }

    public static function present(array $o, bool $staff): array
    {
        $items = array_map(static fn ($i) => [
            'sku' => $i['sku'],
            'name' => $i['name'],
            'colour' => $i['colour'],
            'size' => $i['size'],
            'image' => $i['image'],
            'unitPrice' => (int) $i['unit_price_kurus'],
            'quantity' => (int) $i['quantity'],
        ], Db::all('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', [$o['id']]));
        $eventWhere = $staff ? '' : 'AND e.visible_to_customer = 1';
        $events = array_map(static fn ($e) => [
            'type' => $e['type'],
            'message' => $e['message'],
            'visibleToCustomer' => (bool) $e['visible_to_customer'],
            'author' => $e['author'],
            'createdAt' => iso($e['created_at']),
        ], Db::all("SELECT e.*, u.name AS author FROM order_events e LEFT JOIN users u ON u.id = e.author_id WHERE e.order_id = ? $eventWhere ORDER BY e.id", [$o['id']]));

        $view = [
            'number' => $o['number'],
            'createdAt' => iso($o['created_at']),
            'status' => $o['status'],
            'paymentStatus' => $o['payment_status'],
            'fulfilmentStatus' => $o['fulfilment_status'],
            'currency' => $o['currency'],
            'subtotal' => (int) $o['subtotal_kurus'],
            'shipping' => $o['shipping_kurus'] === null ? null : (int) $o['shipping_kurus'],
            'total' => (int) $o['total_kurus'],
            'email' => $o['email'],
            'phone' => $o['phone'],
            'address' => [
                'fullName' => $o['shipping_name'],
                'line1' => $o['shipping_line1'],
                'line2' => $o['shipping_line2'],
                'city' => $o['shipping_city'],
                'postalCode' => $o['shipping_postal_code'],
                'country' => $o['shipping_country'],
            ],
            'carrier' => $o['carrier'],
            'trackingNumber' => $o['tracking_number'],
            'items' => $items,
            'events' => $events,
        ];
        if ($staff) {
            $view += [
                'locale' => $o['locale'],
                'note' => $o['customer_note'],
                'marketing' => (bool) $o['marketing_opt_in'],
                'hasAccount' => $o['user_id'] !== null,
            ];
        }
        return $view;
    }

    public static function adminList(array $filters, int $page): array
    {
        $where = ['1 = 1'];
        $params = [];
        if (in_array($filters['status'] ?? null, self::STATUSES, true)) {
            $where[] = 'status = ?';
            $params[] = $filters['status'];
        }
        if (!empty($filters['q'])) {
            $where[] = '(number LIKE ? OR email LIKE ? OR shipping_name LIKE ?)';
            $like = '%' . addcslashes($filters['q'], '%_\\') . '%';
            array_push($params, $like, $like, $like);
        }
        $sqlWhere = implode(' AND ', $where);
        $total = (int) Db::value("SELECT COUNT(*) FROM orders WHERE $sqlWhere", $params);
        $offset = max(0, $page - 1) * 25;
        $rows = Db::all("SELECT * FROM orders WHERE $sqlWhere ORDER BY id DESC LIMIT 25 OFFSET $offset", $params);
        return ['total' => $total, 'page' => $page, 'pageSize' => 25, 'orders' => array_map(self::summary(...), $rows)];
    }

    /** Studio status changes. Confirming reserves stock; cancelling a confirmed order releases it. */
    public static function adminUpdate(string $number, array $data, array $actor): array
    {
        $order = Db::one('SELECT * FROM orders WHERE number = ?', [$number]) ?? throw ApiError::notFound('order_not_found');
        $in = new Input($data);
        $changes = array_filter([
            'status' => $in->oneOf('status', self::STATUSES),
            'payment_status' => $in->oneOf('paymentStatus', self::PAYMENT),
            'fulfilment_status' => $in->oneOf('fulfilmentStatus', self::FULFILMENT),
        ], static fn ($v) => $v !== null);
        if ($in->has('carrier')) {
            $changes['carrier'] = $in->str('carrier', 60);
        }
        if ($in->has('trackingNumber')) {
            $changes['tracking_number'] = $in->str('trackingNumber', 80);
        }
        $note = $in->str('note', 500);
        $notify = $in->bool('notifyCustomer');
        $in->check();

        Db::tx(static function () use ($order, $changes, $note, $actor) {
            $id = (int) $order['id'];
            $status = $changes['status'] ?? $order['status'];
            if (!$order['stock_reserved'] && in_array($status, ['confirmed', 'completed'], true)) {
                foreach (Db::all('SELECT variant_id, quantity FROM order_items WHERE order_id = ? AND variant_id IS NOT NULL', [$id]) as $i) {
                    Db::run('UPDATE product_variants SET stock = GREATEST(0, stock - ?) WHERE id = ?', [$i['quantity'], $i['variant_id']]);
                }
                $changes['stock_reserved'] = 1;
            } elseif ($order['stock_reserved'] && $status === 'cancelled') {
                foreach (Db::all('SELECT variant_id, quantity FROM order_items WHERE order_id = ? AND variant_id IS NOT NULL', [$id]) as $i) {
                    Db::run('UPDATE product_variants SET stock = stock + ? WHERE id = ?', [$i['quantity'], $i['variant_id']]);
                }
                $changes['stock_reserved'] = 0;
            }
            Db::update('orders', $changes, ['id' => $id]);
            foreach (['status', 'payment_status', 'fulfilment_status'] as $field) {
                if (isset($changes[$field]) && $changes[$field] !== $order[$field]) {
                    self::event($id, $field, "{$order[$field]} → {$changes[$field]}", $field !== 'payment_status', (int) $actor['id']);
                }
            }
            if ($note) {
                self::event($id, 'note', $note, false, (int) $actor['id']);
            }
            Audit::log((int) $actor['id'], 'order.update', 'order', $order['number']);
        });

        $fresh = Db::one('SELECT * FROM orders WHERE id = ?', [$order['id']]);
        if ($notify) {
            $key = $changes['fulfilment_status'] ?? $changes['status'] ?? null;
            $statusText = Mailer::STATUS_TEXT[$key][$fresh['locale']] ?? null;
            if ($statusText) {
                $token = self::token($fresh['number']);
                $tracking = $fresh['tracking_number'] ? trim(($fresh['carrier'] ?? '') . ' ' . $fresh['tracking_number']) . "\n" : '';
                Mailer::template('order_update', $fresh['locale'], $fresh['email'], [
                    'name' => $fresh['shipping_name'],
                    'number' => $fresh['number'],
                    'status' => $statusText,
                    'tracking' => $tracking,
                    'link' => self::link($fresh['number'], $token, $fresh['locale']),
                ]);
            }
        }
        return self::present($fresh, true);
    }
}
