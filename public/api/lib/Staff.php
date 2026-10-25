<?php
declare(strict_types=1);

namespace Pipolune;

final class Staff
{
    public static function list(): array
    {
        return array_map(static fn ($u) => [
            'id' => (int) $u['id'],
            'email' => $u['email'],
            'name' => $u['name'],
            'role' => $u['role'],
            'active' => $u['password_hash'] !== null,
            'lastLoginAt' => iso($u['last_login_at']),
        ], Db::all("SELECT * FROM users WHERE role <> 'customer' ORDER BY FIELD(role, 'owner', 'editor', 'fulfilment'), email"));
    }

    /** Creates or promotes the account and emails a set-password link (valid 72 hours). */
    public static function invite(string $email, string $role, string $locale, ?int $actorId): void
    {
        $user = Db::one('SELECT * FROM users WHERE email = ?', [$email]);
        if ($user) {
            Db::update('users', ['role' => $role], ['id' => $user['id']]);
            $id = (int) $user['id'];
        } else {
            $id = Db::insert('users', ['email' => $email, 'role' => $role, 'locale' => $locale]);
        }
        $token = Auth::createToken($id, 'reset', 72 * 3600);
        Mailer::template('invite', $locale, $email, [
            'name' => is_array($user) ? (string) $user['name'] : '',
            'role' => $role,
            'link' => config('app.url') . "/$locale/account/reset/?token=$token",
            'studio' => config('app.url') . '/studio/',
        ]);
        Audit::log($actorId, 'staff.invite', 'user', (string) $id);
    }

    public static function setRole(int $userId, string $role, array $actor): void
    {
        if ($userId === (int) $actor['id']) {
            throw new ApiError(409, 'cannot_change_self', 'You cannot change your own role.');
        }
        $target = Db::one('SELECT role FROM users WHERE id = ?', [$userId]) ?? throw ApiError::notFound();
        if ($target['role'] === 'owner' && $role !== 'owner'
            && (int) Db::value("SELECT COUNT(*) FROM users WHERE role = 'owner'") <= 1) {
            throw new ApiError(409, 'last_owner', 'Studio needs at least one owner.');
        }
        Db::update('users', ['role' => $role], ['id' => $userId]);
        if ($role === 'customer') {
            Auth::logoutEverywhere($userId);
        }
        Audit::log((int) $actor['id'], 'staff.role', 'user', "$userId:$role");
    }
}
