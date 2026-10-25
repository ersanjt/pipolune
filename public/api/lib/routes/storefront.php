<?php
declare(strict_types=1);

namespace Pipolune;

/** @var Router $router */

$router->get('/health', static fn () => ['ok' => true, 'db' => (int) Db::value('SELECT 1') === 1]);

$router->get('/session', static function () {
    $user = Auth::user();
    $cartId = Cart::id(false);
    return [
        'user' => $user ? Auth::publicUser($user) : null,
        'cartCount' => $cartId ? (int) Db::value('SELECT COALESCE(SUM(quantity), 0) FROM cart_items WHERE cart_id = ?', [$cartId]) : 0,
        'wishlist' => $user ? array_map('intval', array_column(Db::all('SELECT product_id FROM wishlist_items WHERE user_id = ?', [$user['id']]), 'product_id')) : [],
        'settings' => Settings::publicView(),
        'country' => Http::country(),
    ];
});

$router->get('/catalog', static function () {
    $lang = Http::query('locale', 'en');
    return ['products' => Catalog::list($lang === 'all' ? null : locale($lang))];
});

$router->get('/catalog/{slug}', static function (array $p) {
    return Catalog::bySlug($p['slug'], locale(Http::query('locale'))) ?? throw ApiError::notFound('product_not_found');
});

$router->get('/cart', static fn () => Cart::view(locale(Http::query('locale'))));

$router->post('/cart/items', static function () {
    $in = Input::body();
    $variant = $in->int('variantId', 1, required: true);
    $qty = $in->int('quantity', 1, Cart::MAX_QTY) ?? 1;
    $in->check();
    Cart::set($variant, $qty, true);
    return Cart::view(locale($in->raw('locale')));
});

$router->patch('/cart/items/{variant}', static function (array $p) {
    $in = Input::body();
    $qty = $in->int('quantity', 0, Cart::MAX_QTY, true);
    $in->check();
    Cart::set((int) $p['variant'], $qty, false);
    return Cart::view(locale($in->raw('locale')));
});

$router->delete('/cart/items/{variant}', static function (array $p) {
    Cart::remove((int) $p['variant']);
    return Cart::view(locale(Http::query('locale')));
});

$router->post('/checkout', static function () {
    $body = Http::body();
    return Orders::checkout($body, locale($body['locale'] ?? null));
});

$router->get('/orders/{number}', static function (array $p) {
    $token = Http::query('t', '');
    $user = Auth::user();
    if ($token === '' && $user) {
        return Orders::forUser((int) $user['id'], $p['number']);
    }
    return Orders::forGuest($p['number'], (string) $token);
});

$router->post('/leads', static function () {
    RateLimit::hit('lead', Http::ip(), 10, 3600);
    $in = Input::body();
    $row = [
        'email' => $in->email(),
        'name' => $in->str('name', 120) ?? '',
        'product_id' => $in->int('productId', 1),
        'locale' => locale($in->raw('locale')),
        'country' => Http::country(),
        'source' => $in->oneOf('source', ['contact', 'product', 'bag', 'newsletter']) ?? 'contact',
        'message' => $in->str('message', 2000),
    ];
    $in->check();
    if ($row['product_id'] && !Db::value("SELECT id FROM products WHERE id = ? AND status = 'active'", [$row['product_id']])) {
        $row['product_id'] = null;
    }
    Db::insert('leads', $row);
    if ($row['source'] === 'newsletter') {
        Db::run("DELETE FROM mail_suppressions WHERE email = ? AND category = 'marketing'", [$row['email']]);
        Mailer::template('newsletter', $row['locale'], $row['email'], ['name' => $row['name']]);
    } else {
        Mailer::template('enquiry_received', $row['locale'], $row['email'], ['name' => $row['name']]);
    }
    Mailer::notifyTeam("New enquiry from {$row['email']}", "Source: {$row['source']}\nLanguage: {$row['locale']}\n\n" . ($row['message'] ?? ''));
    return ['ok' => true];
});

$router->post('/mail/unsubscribe', static function () {
    $email = mb_strtolower(trim((string) (Http::query('email') ?? '')));
    $token = trim((string) (Http::query('token') ?? ''));
    if ($email === '' || $token === '') {
        $data = json_decode(file_get_contents('php://input') ?: '', true);
        if (is_array($data)) {
            $email = mb_strtolower(trim((string) ($data['email'] ?? $email)));
            $token = trim((string) ($data['token'] ?? $token));
        }
    }
    $expected = filter_var($email, FILTER_VALIDATE_EMAIL) ? Mailer::unsubscribeToken($email) : '';
    if ($expected === '' || $token === '' || !hash_equals($expected, $token)) {
        throw new ApiError(403, 'forbidden', 'This unsubscribe link is not valid.');
    }
    Mailer::suppress($email, 'marketing', 'unsubscribe');
    Db::run('UPDATE users SET marketing_opt_in = 0 WHERE email = ?', [$email]);
    return ['ok' => true];
});
