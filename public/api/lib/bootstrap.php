<?php
declare(strict_types=1);

namespace Pipolune;

const LOCALES = ['en', 'tr', 'ru'];
const STAFF_ROLES = ['owner', 'manager', 'editor', 'content', 'accountant', 'fulfilment', 'support'];

spl_autoload_register(static function (string $class): void {
    if (str_starts_with($class, __NAMESPACE__ . '\\')) {
        $file = __DIR__ . '/' . str_replace('\\', '/', substr($class, strlen(__NAMESPACE__) + 1)) . '.php';
        if (is_file($file)) {
            require $file;
        }
    }
});

/** Reads ~/.pipolune/config.php (outside public_html); dotted keys such as config('db.name'). */
function config(?string $key = null): mixed
{
    static $config = null;
    if ($config === null) {
        $file = getenv('PIPOLUNE_CONFIG') ?: dirname(__DIR__, 3) . '/.pipolune/config.php';
        if (!is_file($file)) {
            throw new \RuntimeException('Server configuration is missing.');
        }
        $config = require $file;
    }
    if ($key === null) {
        return $config;
    }
    $value = $config;
    foreach (explode('.', $key) as $part) {
        $value = is_array($value) ? ($value[$part] ?? null) : null;
    }
    return $value;
}

function now(): string
{
    return gmdate('Y-m-d H:i:s');
}

function iso(?string $datetime): ?string
{
    return $datetime === null ? null : str_replace(' ', 'T', $datetime) . 'Z';
}

function locale(mixed $value): string
{
    return in_array($value, LOCALES, true) ? $value : 'en';
}
