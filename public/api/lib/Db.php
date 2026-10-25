<?php
declare(strict_types=1);

namespace Pipolune;

use PDO;
use PDOStatement;

final class Db
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            $c = config('db');
            self::$pdo = new PDO(
                "mysql:host={$c['host']};dbname={$c['name']};charset=utf8mb4",
                $c['user'],
                $c['pass'],
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_STRINGIFY_FETCHES => false,
                ],
            );
            self::$pdo->exec("SET time_zone = '+00:00'");
        }
        return self::$pdo;
    }

    public static function run(string $sql, array $params = []): PDOStatement
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public static function all(string $sql, array $params = []): array
    {
        return self::run($sql, $params)->fetchAll();
    }

    public static function one(string $sql, array $params = []): ?array
    {
        $row = self::run($sql, $params)->fetch();
        return $row === false ? null : $row;
    }

    public static function value(string $sql, array $params = []): mixed
    {
        $value = self::run($sql, $params)->fetchColumn();
        return $value === false ? null : $value;
    }

    public static function insert(string $table, array $row): int
    {
        $cols = array_keys($row);
        $sql = sprintf(
            'INSERT INTO `%s` (`%s`) VALUES (%s)',
            $table,
            implode('`, `', $cols),
            implode(', ', array_fill(0, count($cols), '?')),
        );
        self::run($sql, array_values($row));
        return (int) self::pdo()->lastInsertId();
    }

    public static function update(string $table, array $row, array $where): int
    {
        if (!$row) {
            return 0;
        }
        $set = implode(', ', array_map(static fn ($c) => "`$c` = ?", array_keys($row)));
        $cond = implode(' AND ', array_map(static fn ($c) => "`$c` = ?", array_keys($where)));
        return self::run("UPDATE `$table` SET $set WHERE $cond", [...array_values($row), ...array_values($where)])->rowCount();
    }

    public static function tx(callable $fn): mixed
    {
        $pdo = self::pdo();
        $pdo->beginTransaction();
        try {
            $result = $fn();
            $pdo->commit();
            return $result;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /** "?, ?, ?" for IN (...) lists. */
    public static function marks(array $values): string
    {
        return implode(', ', array_fill(0, max(1, count($values)), '?'));
    }
}
