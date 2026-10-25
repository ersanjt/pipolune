<?php
declare(strict_types=1);

namespace Pipolune;

/** Collects field errors so a form gets every problem in one response. */
final class Input
{
    private array $errors = [];

    public function __construct(private readonly array $data)
    {
    }

    public static function body(): self
    {
        return new self(Http::body());
    }

    public function has(string $key): bool
    {
        return array_key_exists($key, $this->data);
    }

    public function str(string $key, int $max = 255, bool $required = false, int $min = 0): ?string
    {
        $value = $this->data[$key] ?? null;
        if ($value === null || (is_string($value) && trim($value) === '')) {
            if ($required) {
                $this->errors[$key] = 'required';
            }
            return null;
        }
        if (!is_string($value) && !is_int($value) && !is_float($value)) {
            $this->errors[$key] = 'invalid';
            return null;
        }
        $value = trim((string) $value);
        if (mb_strlen($value) > $max) {
            $this->errors[$key] = 'too_long';
        } elseif (mb_strlen($value) < $min) {
            $this->errors[$key] = 'too_short';
        }
        return $value;
    }

    public function email(string $key = 'email', bool $required = true): ?string
    {
        $value = $this->str($key, 190, $required);
        if ($value !== null && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$key] = 'invalid_email';
        }
        return $value === null ? null : mb_strtolower($value);
    }

    public function password(string $key = 'password'): ?string
    {
        $value = $this->data[$key] ?? null;
        if (!is_string($value) || $value === '') {
            $this->errors[$key] = 'required';
            return null;
        }
        if (mb_strlen($value) < 8) {
            $this->errors[$key] = 'password_too_short';
        } elseif (mb_strlen($value) > 200) {
            $this->errors[$key] = 'too_long';
        }
        return $value;
    }

    public function int(string $key, int $min = PHP_INT_MIN, int $max = PHP_INT_MAX, bool $required = false): ?int
    {
        $value = $this->data[$key] ?? null;
        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$key] = 'required';
            }
            return null;
        }
        if (filter_var($value, FILTER_VALIDATE_INT) === false) {
            $this->errors[$key] = 'invalid';
            return null;
        }
        $value = (int) $value;
        if ($value < $min || $value > $max) {
            $this->errors[$key] = 'out_of_range';
        }
        return $value;
    }

    public function bool(string $key): bool
    {
        return filter_var($this->data[$key] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    public function oneOf(string $key, array $allowed, bool $required = false): ?string
    {
        $value = $this->data[$key] ?? null;
        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$key] = 'required';
            }
            return null;
        }
        if (!in_array($value, $allowed, true)) {
            $this->errors[$key] = 'invalid';
            return null;
        }
        return $value;
    }

    public function raw(string $key): mixed
    {
        return $this->data[$key] ?? null;
    }

    public function fail(string $key, string $code): void
    {
        $this->errors[$key] = $code;
    }

    public function check(): void
    {
        if ($this->errors) {
            throw ApiError::invalid($this->errors);
        }
    }
}
