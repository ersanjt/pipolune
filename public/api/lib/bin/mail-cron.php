<?php
declare(strict_types=1);

// Sends queued mail and one reminder for bags left for 24 hours.
// Installed by scripts/deploy.mjs: every 5 minutes.

namespace Pipolune;

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/bootstrap.php';

$queued = Mailer::queueAbandonedCarts();
$result = Mailer::drain(40);
if ($queued || $result['sent'] || $result['failed'] || $result['skipped']) {
    echo gmdate('c') . " abandoned=$queued sent={$result['sent']} failed={$result['failed']} skipped={$result['skipped']}\n";
}
