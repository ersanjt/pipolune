<?php
declare(strict_types=1);

namespace Pipolune;

final class Account
{
    public static function addresses(int $userId): array
    {
        return array_map(static fn ($a) => [
            'id' => (int) $a['id'],
            'fullName' => $a['full_name'],
            'phone' => $a['phone'],
            'country' => $a['country'],
            'city' => $a['city'],
            'postalCode' => $a['postal_code'],
            'line1' => $a['line1'],
            'line2' => $a['line2'],
            'isDefault' => (bool) $a['is_default'],
        ], Db::all('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id', [$userId]));
    }

    public static function saveAddress(int $userId, ?int $id, array $data): array
    {
        $in = new Input($data);
        $row = [
            'full_name' => $in->str('fullName', 120, true),
            'phone' => $in->str('phone', 40),
            'country' => $in->oneOf('country', ['TR'], true),
            'city' => $in->str('city', 80, true),
            'postal_code' => $in->str('postalCode', 20),
            'line1' => $in->str('line1', 190, true),
            'line2' => $in->str('line2', 190),
            'is_default' => $in->bool('isDefault') ? 1 : 0,
        ];
        $in->check();
        if ($id !== null && !Db::value('SELECT id FROM addresses WHERE id = ? AND user_id = ?', [$id, $userId])) {
            throw ApiError::notFound();
        }
        if ($row['is_default'] || !Db::value('SELECT COUNT(*) FROM addresses WHERE user_id = ?', [$userId])) {
            Db::run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [$userId]);
            $row['is_default'] = 1;
        }
        if ($id === null) {
            Db::insert('addresses', ['user_id' => $userId] + $row);
        } else {
            Db::update('addresses', $row, ['id' => $id]);
        }
        return self::addresses($userId);
    }

    public static function wishlist(int $userId, string $locale): array
    {
        $ids = array_column(Db::all('SELECT product_id FROM wishlist_items WHERE user_id = ? ORDER BY created_at DESC', [$userId]), 'product_id');
        if (!$ids) {
            return [];
        }
        $byId = [];
        foreach (Catalog::list($locale) as $p) {
            $byId[$p['id']] = $p;
        }
        return array_values(array_filter(array_map(static fn ($id) => $byId[$id] ?? null, $ids)));
    }
}
