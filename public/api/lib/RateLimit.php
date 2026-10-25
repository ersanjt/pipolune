<?php
declare(strict_types=1);

namespace Pipolune;

final class RateLimit
{
    /** Allows $max hits per $seconds for (bucket, key); throws 429 after that. */
    public static function hit(string $bucket, string $key, int $max, int $seconds): void
    {
        $hash = hash('sha256', $key);
        $since = gmdate('Y-m-d H:i:s', time() - $seconds);
        $count = (int) Db::value(
            'SELECT COUNT(*) FROM rate_limits WHERE bucket = ? AND key_hash = ? AND created_at > ?',
            [$bucket, $hash, $since],
        );
        if ($count >= $max) {
            throw new ApiError(429, 'too_many_requests', 'Too many attempts. Please try again later.');
        }
        Db::insert('rate_limits', ['bucket' => $bucket, 'key_hash' => $hash]);
        if (random_int(1, 50) === 1) {
            Db::run('DELETE FROM rate_limits WHERE created_at < ?', [gmdate('Y-m-d H:i:s', time() - 86400)]);
        }
    }

    public static function clear(string $bucket, string $key): void
    {
        Db::run('DELETE FROM rate_limits WHERE bucket = ? AND key_hash = ?', [$bucket, hash('sha256', $key)]);
    }
}
