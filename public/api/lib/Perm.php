<?php
declare(strict_types=1);

namespace Pipolune;

/**
 * What each Studio role may do. The owner may do everything; only the owner manages staff.
 * The same list is sent to Studio (Auth::publicUser) so the interface hides what the API would refuse.
 */
final class Perm
{
    public const ROLES = ['owner', 'manager', 'editor', 'content', 'accountant', 'fulfilment', 'support'];

    public const MAP = [
        'products.view' => ['manager', 'editor', 'content', 'accountant', 'fulfilment', 'support'],
        // Texts, photos, video, specifications, size chart, close-ups.
        'products.content' => ['manager', 'editor', 'content'],
        // Prices, status, address (slug), sizes/SKUs, sourcing.
        'products.manage' => ['manager', 'editor'],
        'sourcing.view' => ['manager', 'editor', 'accountant'],
        'uploads' => ['manager', 'editor', 'content'],
        'publish' => ['manager', 'editor', 'content'],
        'inventory.view' => ['manager', 'editor', 'accountant', 'fulfilment'],
        'inventory.edit' => ['manager', 'editor', 'fulfilment'],
        'orders.view' => ['manager', 'accountant', 'fulfilment', 'support'],
        'orders.status' => ['manager', 'fulfilment'],
        'orders.payment' => ['manager', 'accountant', 'fulfilment'],
        'orders.note' => ['manager', 'accountant', 'fulfilment', 'support'],
        'customers.view' => ['manager', 'accountant', 'fulfilment', 'support'],
        'customers.note' => ['manager', 'fulfilment', 'support'],
        'customers.export' => ['manager', 'accountant'],
        'leads' => ['manager', 'fulfilment', 'support'],
        'reports' => ['manager', 'accountant'],
        'settings.content' => ['manager', 'editor'],
        'settings.sales' => ['manager'],
        'staff' => [],
    ];

    public static function can(array $user, string $permission): bool
    {
        return $user['role'] === 'owner' || in_array($user['role'], self::MAP[$permission] ?? [], true);
    }

    public static function require(string $permission): array
    {
        $user = Auth::requireUser();
        if (!self::can($user, $permission)) {
            throw new ApiError(403, 'forbidden', 'You do not have access to this section.');
        }
        return $user;
    }

    /** @return string[] */
    public static function of(array $user): array
    {
        if (!in_array($user['role'], self::ROLES, true)) {
            return [];
        }
        return array_values(array_filter(array_keys(self::MAP), static fn ($p) => self::can($user, $p)));
    }
}
