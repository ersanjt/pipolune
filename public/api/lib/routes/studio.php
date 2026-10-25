<?php
declare(strict_types=1);

namespace Pipolune;

/**
 * Studio (admin) API. Roles: owner – everything; editor – products, content, uploads;
 * fulfilment – orders, inventory, customers.
 *
 * @var Router $router
 */

$router->get('/studio/overview', static function () {
    $user = Auth::requireStaff();
    $completeness = [];
    $activeProducts = (int) Db::value("SELECT COUNT(*) FROM products WHERE status = 'active'");
    foreach (LOCALES as $l) {
        $completeness[$l] = [
            'products' => (int) Db::value("SELECT COUNT(*) FROM product_translations t JOIN products p ON p.id = t.product_id WHERE p.status = 'active' AND t.locale = ?", [$l]),
            'of' => $activeProducts,
        ];
    }
    return [
        'me' => Auth::publicUser($user),
        'counts' => [
            'products' => $activeProducts,
            'collections' => (int) Db::value("SELECT COUNT(DISTINCT season) FROM products WHERE status = 'active'"),
            'inventory' => (int) Db::value("SELECT COALESCE(SUM(v.stock), 0) FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.active = 1 AND p.status <> 'archived'"),
            'orders' => (int) Db::value("SELECT COUNT(*) FROM orders WHERE status <> 'cancelled'"),
            'openRequests' => (int) Db::value("SELECT COUNT(*) FROM orders WHERE status = 'requested'"),
            'newLeads' => (int) Db::value("SELECT COUNT(*) FROM leads WHERE status = 'new'"),
            'customers' => (int) Db::value("SELECT COUNT(DISTINCT email) FROM (SELECT email FROM users WHERE role = 'customer' UNION SELECT email FROM orders UNION SELECT email FROM leads) e"),
        ],
        'recentOrders' => array_map(Orders::summary(...), Db::all('SELECT * FROM orders ORDER BY id DESC LIMIT 5')),
        'lowStock' => Db::all(
            "SELECT v.id, v.sku, v.colour, v.size, v.stock FROM product_variants v JOIN products p ON p.id = v.product_id
             WHERE v.active = 1 AND p.status = 'active' ORDER BY v.stock, v.sku LIMIT 6",
        ),
        'latestProducts' => array_slice(Catalog::list('en', true), 0, 4),
        'languageCompleteness' => $completeness,
        'settings' => Settings::publicView(),
    ];
});

// ---- Products & content (editor) ----

$router->get('/studio/products', static function () {
    Auth::requireStaff(['editor', 'fulfilment']);
    return ['products' => Catalog::list(null, true)];
});

$router->get('/studio/products/{id}', static function (array $p) {
    Auth::requireStaff(['editor', 'fulfilment']);
    return Catalog::byId((int) $p['id']) ?? throw ApiError::notFound('product_not_found');
});

$router->post('/studio/products', static function () {
    $user = Auth::requireStaff(['editor']);
    return Catalog::save(null, Http::body(), (int) $user['id']);
});

$router->patch('/studio/products/{id}', static function (array $p) {
    $user = Auth::requireStaff(['editor']);
    if (!Db::value('SELECT id FROM products WHERE id = ?', [(int) $p['id']])) {
        throw ApiError::notFound('product_not_found');
    }
    return Catalog::save((int) $p['id'], Http::body(), (int) $user['id']);
});

$router->post('/studio/uploads', static function () {
    $user = Auth::requireStaff(['editor']);
    return Uploads::image((int) $user['id']);
});

// ---- Inventory & orders (fulfilment) ----

$router->get('/studio/inventory', static function () {
    Auth::requireStaff(['fulfilment', 'editor']);
    return ['variants' => Db::all(
        "SELECT v.id, v.sku, v.colour, v.size, v.stock, v.active, p.id AS productId, p.status AS productStatus,
                COALESCE(t.name, p.slug) AS product
         FROM product_variants v JOIN products p ON p.id = v.product_id
         LEFT JOIN product_translations t ON t.product_id = p.id AND t.locale = 'en'
         WHERE p.status <> 'archived' ORDER BY product, v.sku",
    )];
});

$router->patch('/studio/variants/{id}', static function (array $p) {
    $user = Auth::requireStaff(['fulfilment', 'editor']);
    $in = Input::body();
    $stock = $in->int('stock', 0, 100000, true);
    $in->check();
    if (!Db::update('product_variants', ['stock' => $stock], ['id' => (int) $p['id']])
        && !Db::value('SELECT id FROM product_variants WHERE id = ?', [(int) $p['id']])) {
        throw ApiError::notFound();
    }
    Audit::log((int) $user['id'], 'inventory.set', 'variant', "{$p['id']}:$stock");
    return ['id' => (int) $p['id'], 'stock' => $stock];
});

$router->get('/studio/orders', static function () {
    Auth::requireStaff(['fulfilment']);
    return Orders::adminList(['status' => Http::query('status'), 'q' => Http::query('q')], max(1, (int) Http::query('page', '1')));
});

$router->get('/studio/orders/{number}', static function (array $p) {
    Auth::requireStaff(['fulfilment']);
    $order = Db::one('SELECT * FROM orders WHERE number = ?', [$p['number']]) ?? throw ApiError::notFound('order_not_found');
    return Orders::present($order, true);
});

$router->patch('/studio/orders/{number}', static function (array $p) {
    $user = Auth::requireStaff(['fulfilment']);
    return Orders::adminUpdate($p['number'], Http::body(), $user);
});

// ---- CRM (fulfilment) ----

$router->get('/studio/customers', static function () {
    Auth::requireStaff(['fulfilment']);
    return Customers::list(Http::query('q'), Http::query('segment'), max(1, (int) Http::query('page', '1')));
});

$router->get('/studio/customers/export', static function () {
    Auth::requireStaff([]);
    Customers::csv();
});

$router->get('/studio/customers/{email}', static function (array $p) {
    Auth::requireStaff(['fulfilment']);
    return Customers::detail(mb_strtolower($p['email']));
});

$router->post('/studio/customers/{email}/notes', static function (array $p) {
    $user = Auth::requireStaff(['fulfilment']);
    $in = Input::body();
    $body = $in->str('body', 4000, true);
    $in->check();
    Customers::addNote(mb_strtolower($p['email']), $body, (int) $user['id']);
    return Customers::detail(mb_strtolower($p['email']));
});

$router->get('/studio/leads', static function () {
    Auth::requireStaff(['fulfilment']);
    return Customers::leads(Http::query('status'), max(1, (int) Http::query('page', '1')));
});

$router->patch('/studio/leads/{id}', static function (array $p) {
    $user = Auth::requireStaff(['fulfilment']);
    $in = Input::body();
    $status = $in->oneOf('status', ['new', 'contacted', 'closed'], true);
    $in->check();
    Db::update('leads', ['status' => $status], ['id' => (int) $p['id']]);
    Audit::log((int) $user['id'], 'lead.status', 'lead', "{$p['id']}:$status");
    return ['ok' => true];
});

// ---- Settings, staff, publishing (owner; content settings also editor) ----

$router->get('/studio/settings', static function () {
    Auth::requireStaff(['editor']);
    return [
        'settings' => Settings::all(),
        'season' => Settings::season(),
        'paymentProvider' => config('payment.provider'),
        'publishConfigured' => (bool) config('github.token'),
    ];
});

$router->patch('/studio/settings', static function () {
    $user = Auth::requireStaff(['editor']);
    $in = Input::body();
    $values = [];
    if ($in->has('season_mode')) {
        $values['season_mode'] = $in->oneOf('season_mode', ['auto', 'manual'], true);
    }
    if ($in->has('manual_season')) {
        $values['manual_season'] = $in->oneOf('manual_season', ['spring', 'summer', 'autumn', 'winter'], true);
    }
    if ($in->has('homepage_mode')) {
        $values['homepage_mode'] = $in->oneOf('homepage_mode', ['seasonal', 'all-seasons'], true);
    }
    if ($in->has('catalog_preview')) {
        $values['catalog_preview'] = $in->bool('catalog_preview');
    }
    $ownerOnly = ['sales_mode', 'shipping_standard'];
    if (array_intersect($ownerOnly, array_keys(Http::body())) && $user['role'] !== 'owner') {
        throw new ApiError(403, 'forbidden', 'Only an owner can change sales settings.');
    }
    if ($in->has('sales_mode')) {
        $values['sales_mode'] = $in->oneOf('sales_mode', ['off', 'request', 'live'], true);
        if ($values['sales_mode'] === 'live' && !config('payment.provider')) {
            $in->fail('sales_mode', 'payment_provider_missing');
        }
    }
    if ($in->has('shipping_standard')) {
        $shipping = Http::body()['shipping_standard'];
        $values['shipping_standard'] = [];
        foreach (Money::CURRENCIES as $currency) {
            $value = is_array($shipping) ? ($shipping[$currency] ?? null) : null;
            if ($value !== null && (!is_int($value) || $value < 0 || $value > 10_000_000)) {
                $in->fail("shipping_standard.$currency", 'invalid');
            }
            $values['shipping_standard'][$currency] = $value;
        }
    }
    $in->check();
    Settings::set($values);
    Audit::log((int) $user['id'], 'settings.update', 'settings', implode(',', array_keys($values)));
    return ['settings' => Settings::all(), 'season' => Settings::season()];
});

$router->get('/studio/staff', static function () {
    Auth::requireStaff([]);
    return ['staff' => Staff::list()];
});

$router->post('/studio/staff', static function () {
    $user = Auth::requireStaff([]);
    $in = Input::body();
    $email = $in->email();
    $role = $in->oneOf('role', STAFF_ROLES, true);
    $locale = locale($in->raw('locale'));
    $in->check();
    Staff::invite($email, $role, $locale, (int) $user['id']);
    return ['staff' => Staff::list()];
});

$router->patch('/studio/staff/{id}', static function (array $p) {
    $user = Auth::requireStaff([]);
    $in = Input::body();
    $role = $in->oneOf('role', [...STAFF_ROLES, 'customer'], true);
    $in->check();
    Staff::setRole((int) $p['id'], $role, $user);
    return ['staff' => Staff::list()];
});

// Rebuilds the static storefront (product pages, sitemap) from the database via GitHub Actions.
$router->post('/studio/publish', static function () {
    $user = Auth::requireStaff(['editor']);
    $token = config('github.token');
    if (!$token) {
        throw new ApiError(409, 'publish_not_configured', 'Publishing needs a GitHub token in the server configuration.');
    }
    RateLimit::hit('publish', 'site', 12, 3600);
    $ch = curl_init(sprintf('https://api.github.com/repos/%s/actions/workflows/%s/dispatches', config('github.repo'), config('github.workflow')));
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['ref' => 'main']),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => [
            'Accept: application/vnd.github+json',
            "Authorization: Bearer $token",
            'User-Agent: pipolune-studio',
            'X-GitHub-Api-Version: 2022-11-28',
        ],
    ]);
    curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($status !== 204) {
        throw new ApiError(502, 'publish_failed', "GitHub responded with $status.");
    }
    Audit::log((int) $user['id'], 'site.publish');
    return ['ok' => true];
});
