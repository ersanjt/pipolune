<?php
declare(strict_types=1);

namespace Pipolune;

/** @var Router $router */

$sendVerification = static function (array $user): void {
    $token = Auth::createToken((int) $user['id'], 'verify', 48 * 3600);
    Mailer::template('verify', $user['locale'], $user['email'], [
        'name' => $user['name'],
        'link' => config('app.url') . "/{$user['locale']}/account/verify/?token=$token",
    ]);
};

$router->post('/auth/register', static function () use ($sendVerification) {
    RateLimit::hit('register', Http::ip(), 5, 3600);
    $in = Input::body();
    $email = $in->email();
    $password = $in->password();
    $name = $in->str('name', 120) ?? '';
    $locale = locale($in->raw('locale'));
    $marketing = $in->bool('marketing');
    if ($email && Db::value('SELECT id FROM users WHERE email = ?', [$email])) {
        $in->fail('email', 'email_taken');
    }
    $in->check();
    $id = Db::insert('users', [
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'name' => $name,
        'locale' => $locale,
        'marketing_opt_in' => $marketing ? 1 : 0,
    ]);
    // Guest orders placed with this email become visible in the new account.
    Db::run('UPDATE orders SET user_id = ? WHERE email = ? AND user_id IS NULL', [$id, $email]);
    $user = Db::one('SELECT * FROM users WHERE id = ?', [$id]);
    $sendVerification($user);
    Auth::login($user);
    return ['user' => Auth::publicUser($user)];
});

$router->post('/auth/login', static function () {
    $in = Input::body();
    $email = $in->email();
    $password = $in->str('password', 200, true);
    $in->check();
    RateLimit::hit('login-ip', Http::ip(), 20, 900);
    RateLimit::hit('login-email', $email, 8, 900);
    $user = Db::one('SELECT * FROM users WHERE email = ?', [$email]);
    if (!$user || !$user['password_hash'] || !password_verify($password, $user['password_hash'])) {
        throw new ApiError(401, 'invalid_credentials', 'Email or password is incorrect.');
    }
    if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
        Db::update('users', ['password_hash' => password_hash($password, PASSWORD_DEFAULT)], ['id' => $user['id']]);
    }
    RateLimit::clear('login-email', $email);
    Auth::login($user);
    return ['user' => Auth::publicUser($user)];
});

$router->post('/auth/logout', static function () {
    Auth::logout();
    return ['ok' => true];
});

$router->post('/auth/verify', static function () {
    $in = Input::body();
    $token = $in->str('token', 128, true);
    $in->check();
    $userId = Auth::consumeToken($token, 'verify');
    Db::run('UPDATE users SET email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()) WHERE id = ?', [$userId]);
    return ['ok' => true];
});

$router->post('/auth/resend-verification', static function () use ($sendVerification) {
    $user = Auth::requireUser();
    RateLimit::hit('verify-resend', (string) $user['id'], 3, 3600);
    if ($user['email_verified_at'] === null) {
        $sendVerification($user);
    }
    return ['ok' => true];
});

// Same response whether or not the email exists, so the form cannot be used to probe accounts.
$router->post('/auth/forgot', static function () {
    RateLimit::hit('forgot', Http::ip(), 5, 3600);
    $in = Input::body();
    $email = $in->email();
    $in->check();
    $user = Db::one('SELECT * FROM users WHERE email = ?', [$email]);
    if ($user) {
        $locale = locale($in->raw('locale') ?? $user['locale']);
        $token = Auth::createToken((int) $user['id'], 'reset', 3600);
        Mailer::template('reset', $locale, $email, [
            'name' => $user['name'],
            'link' => config('app.url') . "/$locale/account/reset/?token=$token",
        ]);
    }
    return ['ok' => true];
});

$router->post('/auth/reset', static function () {
    $in = Input::body();
    $token = $in->str('token', 128, true);
    $password = $in->password();
    $in->check();
    $userId = Auth::consumeToken($token, 'reset');
    Db::run(
        'UPDATE users SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()) WHERE id = ?',
        [password_hash($password, PASSWORD_DEFAULT), $userId],
    );
    Auth::logoutEverywhere($userId);
    $user = Db::one('SELECT * FROM users WHERE id = ?', [$userId]);
    Auth::login($user);
    return ['user' => Auth::publicUser($user)];
});

$router->get('/account', static function () {
    $user = Auth::requireUser();
    $locale = locale(Http::query('locale') ?? $user['locale']);
    return [
        'user' => Auth::publicUser($user),
        'orders' => Orders::listForUser((int) $user['id'], 5),
        'wishlist' => array_slice(Account::wishlist((int) $user['id'], $locale), 0, 6),
    ];
});

$router->patch('/account', static function () {
    $user = Auth::requireUser();
    $in = Input::body();
    $changes = [];
    if ($in->has('name')) {
        $changes['name'] = $in->str('name', 120) ?? '';
    }
    if ($in->has('phone')) {
        $changes['phone'] = $in->str('phone', 40);
    }
    if ($in->has('locale')) {
        $changes['locale'] = locale($in->raw('locale'));
    }
    if ($in->has('marketing')) {
        $changes['marketing_opt_in'] = $in->bool('marketing') ? 1 : 0;
    }
    $in->check();
    Db::update('users', $changes, ['id' => $user['id']]);
    return ['user' => Auth::publicUser(Db::one('SELECT * FROM users WHERE id = ?', [$user['id']]))];
});

$router->post('/account/password', static function () {
    $user = Auth::requireUser();
    $in = Input::body();
    $current = $in->str('currentPassword', 200, true);
    $new = $in->password('newPassword');
    $in->check();
    if (!$user['password_hash'] || !password_verify($current, $user['password_hash'])) {
        throw ApiError::invalid(['currentPassword' => 'wrong_password']);
    }
    Db::update('users', ['password_hash' => password_hash($new, PASSWORD_DEFAULT)], ['id' => $user['id']]);
    Auth::logoutEverywhere((int) $user['id']);
    Auth::login(Db::one('SELECT * FROM users WHERE id = ?', [$user['id']]));
    return ['ok' => true];
});

// Account deletion: orders stay for accounting but are detached from the account.
$router->delete('/account', static function () {
    $user = Auth::requireUser();
    if ($user['role'] !== 'customer') {
        throw new ApiError(409, 'staff_account', 'Studio accounts are removed by an owner.');
    }
    $in = Input::body();
    $password = $in->str('password', 200, true);
    $in->check();
    if (!password_verify($password, (string) $user['password_hash'])) {
        throw ApiError::invalid(['password' => 'wrong_password']);
    }
    Db::run('DELETE FROM users WHERE id = ?', [$user['id']]);
    Auth::logout();
    return ['ok' => true];
});

$router->get('/account/orders', static fn () => ['orders' => Orders::listForUser((int) Auth::requireUser()['id'])]);

$router->get('/account/orders/{number}', static fn (array $p) => Orders::forUser((int) Auth::requireUser()['id'], $p['number']));

$router->get('/account/wishlist', static function () {
    $user = Auth::requireUser();
    return ['products' => Account::wishlist((int) $user['id'], locale(Http::query('locale') ?? $user['locale']))];
});

$router->post('/account/wishlist', static function () {
    $user = Auth::requireUser();
    $in = Input::body();
    $productId = $in->int('productId', 1, required: true);
    $in->check();
    Db::run('INSERT IGNORE INTO wishlist_items (user_id, product_id) SELECT ?, id FROM products WHERE id = ?', [$user['id'], $productId]);
    return ['ids' => array_map('intval', array_column(Db::all('SELECT product_id FROM wishlist_items WHERE user_id = ?', [$user['id']]), 'product_id'))];
});

$router->delete('/account/wishlist/{product}', static function (array $p) {
    $user = Auth::requireUser();
    Db::run('DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?', [$user['id'], (int) $p['product']]);
    return ['ids' => array_map('intval', array_column(Db::all('SELECT product_id FROM wishlist_items WHERE user_id = ?', [$user['id']]), 'product_id'))];
});

$router->get('/account/addresses', static fn () => ['addresses' => Account::addresses((int) Auth::requireUser()['id'])]);

$router->post('/account/addresses', static fn () => ['addresses' => Account::saveAddress((int) Auth::requireUser()['id'], null, Http::body())]);

$router->patch('/account/addresses/{id}', static fn (array $p) => ['addresses' => Account::saveAddress((int) Auth::requireUser()['id'], (int) $p['id'], Http::body())]);

$router->delete('/account/addresses/{id}', static function (array $p) {
    $user = Auth::requireUser();
    Db::run('DELETE FROM addresses WHERE id = ? AND user_id = ?', [(int) $p['id'], $user['id']]);
    return ['addresses' => Account::addresses((int) $user['id'])];
});
