<?php
declare(strict_types=1);

// Gives an email a Studio role and emails a link to set the password.
// Usage on the server: php ~/public_html/api/lib/bin/invite-staff.php zhanna@pipolune.com owner [ru]

namespace Pipolune;

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/bootstrap.php';

[, $email, $role, $lang] = $argv + [null, null, 'owner', 'en'];
if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL) || !in_array($role, STAFF_ROLES, true)) {
    fwrite(STDERR, "Usage: invite-staff.php <email> <owner|editor|fulfilment> [en|tr|ru]\n");
    exit(1);
}

Staff::invite(mb_strtolower($email), $role, locale($lang), null);
echo "Invitation sent to $email ($role).\n";
