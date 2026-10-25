<?php
declare(strict_types=1);

namespace Pipolune;

require __DIR__ . '/lib/bootstrap.php';

ini_set('display_errors', '0');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

try {
    Http::guardWrite();
    $router = new Router();
    require __DIR__ . '/lib/routes/storefront.php';
    require __DIR__ . '/lib/routes/account.php';
    require __DIR__ . '/lib/routes/studio.php';
    $result = $router->dispatch(Http::method(), Http::path());
    Http::json($result ?? ['ok' => true]);
} catch (ApiError $e) {
    Http::json(array_filter([
        'error' => $e->error,
        'message' => $e->getMessage(),
        'fields' => $e->fields ?: null,
    ]), $e->status);
} catch (\Throwable $e) {
    error_log('[pipolune-api] ' . $e::class . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    Http::json(['error' => 'server_error', 'message' => 'Something went wrong. Please try again.'], 500);
}
