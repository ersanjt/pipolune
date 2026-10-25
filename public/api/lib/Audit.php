<?php
declare(strict_types=1);

namespace Pipolune;

final class Audit
{
    public static function log(?int $userId, string $action, string $entity = '', string $entityId = ''): void
    {
        Db::insert('audit_log', ['user_id' => $userId, 'action' => $action, 'entity' => $entity, 'entity_id' => $entityId]);
    }
}
