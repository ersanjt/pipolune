<?php
declare(strict_types=1);

namespace Pipolune;

final class Http
{
    private static ?array $body = null;

    public static function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    /** Request path below /api, e.g. "/cart/items/3". */
    public static function path(): string
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $path = preg_replace('#^/api#', '', $path);
        return '/' . trim((string) $path, '/');
    }

    public static function query(string $key, ?string $default = null): ?string
    {
        $value = $_GET[$key] ?? $default;
        return is_string($value) ? trim($value) : $default;
    }

    public static function body(): array
    {
        if (self::$body === null) {
            $raw = file_get_contents('php://input', false, null, 0, 1_000_000) ?: '';
            $data = $raw === '' ? [] : json_decode($raw, true);
            if (!is_array($data)) {
                throw new ApiError(400, 'invalid_json', 'Request body must be JSON.');
            }
            self::$body = $data;
        }
        return self::$body;
    }

    public static function ip(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    public static function country(): string
    {
        return strtoupper(substr((string) ($_SERVER['HTTP_CF_IPCOUNTRY'] ?? ''), 0, 2));
    }

    /**
     * Writes must come from our own pages: same-origin fetch with the custom header. Cookies are
     * SameSite=Lax, so together this blocks cross-site form posts and simple-request CSRF.
     */
    public static function guardWrite(): void
    {
        if (in_array(self::method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }
        if (($_SERVER['HTTP_X_PIPOLUNE'] ?? '') !== '1') {
            throw new ApiError(403, 'forbidden', 'Missing request header.');
        }
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '' && !in_array($origin, config('app.allowed_origins') ?? [], true)) {
            throw new ApiError(403, 'forbidden', 'Origin not allowed.');
        }
    }

    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, private');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function cookie(string $name, string $value, int $ttl): void
    {
        setcookie($name, $value, [
            'expires' => $ttl > 0 ? time() + $ttl : time() - 3600,
            'path' => '/',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
}
