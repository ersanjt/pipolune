<?php
declare(strict_types=1);

namespace Pipolune;

/** Cookie sessions stored in the database (PHP's file sessions expire after 24 minutes on this host). */
final class Auth
{
    public const COOKIE = 'pl_session';
    private const TTL = 60 * 60 * 24 * 30;

    private static array|false|null $user = null;

    public static function hash(string $token): string
    {
        return hash_hmac('sha256', $token, (string) config('app.secret'));
    }

    public static function user(): ?array
    {
        if (self::$user === null) {
            self::$user = false;
            $token = $_COOKIE[self::COOKIE] ?? '';
            if (is_string($token) && strlen($token) === 64) {
                $row = Db::one(
                    'SELECT u.*, s.token_hash, s.last_seen_at FROM sessions s JOIN users u ON u.id = s.user_id
                     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()',
                    [self::hash($token)],
                );
                if ($row) {
                    if (strtotime($row['last_seen_at'] . ' UTC') < time() - 600) {
                        Db::run(
                            'UPDATE sessions SET last_seen_at = UTC_TIMESTAMP(), expires_at = ? WHERE token_hash = ?',
                            [gmdate('Y-m-d H:i:s', time() + self::TTL), $row['token_hash']],
                        );
                        Http::cookie(self::COOKIE, $token, self::TTL);
                    }
                    self::$user = $row;
                }
            }
        }
        return self::$user ?: null;
    }

    public static function requireUser(): array
    {
        return self::user() ?? throw new ApiError(401, 'unauthenticated', 'Please sign in.');
    }

    /** @param string[] $roles allowed staff roles; owner is always allowed. */
    public static function requireStaff(array $roles = STAFF_ROLES): array
    {
        $user = self::requireUser();
        if ($user['role'] !== 'owner' && !in_array($user['role'], $roles, true)) {
            throw new ApiError(403, 'forbidden', 'You do not have access to this section.');
        }
        return $user;
    }

    public static function login(array $user): void
    {
        $token = bin2hex(random_bytes(32));
        Db::insert('sessions', [
            'token_hash' => self::hash($token),
            'user_id' => $user['id'],
            'ip' => Http::ip(),
            'user_agent' => mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
            'expires_at' => gmdate('Y-m-d H:i:s', time() + self::TTL),
        ]);
        Db::run('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [$user['id']]);
        Db::run('DELETE FROM sessions WHERE expires_at < UTC_TIMESTAMP()');
        Http::cookie(self::COOKIE, $token, self::TTL);
        self::$user = null;
        $_COOKIE[self::COOKIE] = $token;
        Cart::adoptGuestCart((int) $user['id']);
    }

    public static function logout(): void
    {
        $token = $_COOKIE[self::COOKIE] ?? '';
        if (is_string($token) && $token !== '') {
            Db::run('DELETE FROM sessions WHERE token_hash = ?', [self::hash($token)]);
        }
        Http::cookie(self::COOKIE, '', -1);
        self::$user = false;
    }

    public static function logoutEverywhere(int $userId): void
    {
        Db::run('DELETE FROM sessions WHERE user_id = ?', [$userId]);
    }

    public static function createToken(int $userId, string $purpose, int $ttl): string
    {
        $token = bin2hex(random_bytes(32));
        Db::run('DELETE FROM user_tokens WHERE user_id = ? AND purpose = ?', [$userId, $purpose]);
        Db::insert('user_tokens', [
            'token_hash' => self::hash($token),
            'user_id' => $userId,
            'purpose' => $purpose,
            'expires_at' => gmdate('Y-m-d H:i:s', time() + $ttl),
        ]);
        return $token;
    }

    /** Returns the user id for a valid unused token and marks it used, or throws token_invalid / token_expired. */
    public static function consumeToken(string $token, string $purpose): int
    {
        $row = Db::one('SELECT * FROM user_tokens WHERE token_hash = ? AND purpose = ?', [self::hash($token), $purpose]);
        if (!$row || $row['used_at'] !== null) {
            throw new ApiError(400, 'token_invalid', 'This link is no longer valid.');
        }
        if (strtotime($row['expires_at'] . ' UTC') < time()) {
            throw new ApiError(400, 'token_expired', 'This link has expired.');
        }
        Db::run('UPDATE user_tokens SET used_at = UTC_TIMESTAMP() WHERE token_hash = ?', [$row['token_hash']]);
        return (int) $row['user_id'];
    }

    public static function publicUser(array $u): array
    {
        return [
            'id' => (int) $u['id'],
            'email' => $u['email'],
            'name' => $u['name'],
            'phone' => $u['phone'],
            'locale' => $u['locale'],
            'role' => $u['role'],
            'emailVerified' => $u['email_verified_at'] !== null,
            'marketing' => (bool) $u['marketing_opt_in'],
            'createdAt' => iso($u['created_at']),
        ];
    }
}
