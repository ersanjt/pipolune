<?php
declare(strict_types=1);

// Queues "new in the shop" letters for active products that have not been announced yet.
// Deploy runs this after the new product pages are on the server. The cron sends them a few minutes later.

namespace Pipolune;

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/bootstrap.php';

$result = Mailer::queueUnannouncedProducts();
echo "products={$result['products']} messages={$result['messages']}\n";
