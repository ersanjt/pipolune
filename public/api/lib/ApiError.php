<?php
declare(strict_types=1);

namespace Pipolune;

/** Thrown by handlers; rendered as {"error": code, "message": ..., "fields": {...}}. */
final class ApiError extends \RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly string $error,
        string $message = '',
        public readonly array $fields = [],
    ) {
        parent::__construct($message ?: $error);
    }

    public static function invalid(array $fields): self
    {
        return new self(422, 'validation_failed', 'Please check the highlighted fields.', $fields);
    }

    public static function notFound(string $what = 'not_found'): self
    {
        return new self(404, $what, 'Not found.');
    }
}
