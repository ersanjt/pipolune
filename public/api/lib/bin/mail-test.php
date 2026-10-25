<?php
declare(strict_types=1);

// Sends one plain test letter. Usage: php mail-test.php you@example.com

namespace Pipolune;

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/bootstrap.php';

$to = $argv[1] ?? '';
if (!is_string($to) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Usage: mail-test.php <email>\n");
    exit(1);
}

$ok = Mailer::send(
    $to,
    'Pipolune mail test',
    "Outgoing mail is working.\n\nIf this letter looks right, welcome notes, orders, password resets and product news will use the same path.",
);
if (!$ok) {
    fwrite(STDERR, "Send failed. See the PHP error log for [pipolune-mail].\n");
    exit(1);
}
echo "Sent a test letter to $to.\n";
