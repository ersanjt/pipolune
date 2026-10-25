<?php
declare(strict_types=1);

namespace Pipolune;

/**
 * CRM view. A customer is an email address seen anywhere: an account, an order or an enquiry,
 * so guest buyers and people who only asked about a product appear in the same list.
 */
final class Customers
{
    private const BASE = "
        SELECT c.email,
               COALESCE(u.name, (SELECT o2.shipping_name FROM orders o2 WHERE o2.email = c.email ORDER BY o2.id DESC LIMIT 1),
                        (SELECT l2.name FROM leads l2 WHERE l2.email = c.email ORDER BY l2.id DESC LIMIT 1), '') AS name,
               u.id AS user_id, u.locale AS account_locale, u.email_verified_at,
               (u.marketing_opt_in = 1 OR EXISTS (SELECT 1 FROM orders o3 WHERE o3.email = c.email AND o3.marketing_opt_in = 1)) AS marketing,
               (SELECT COUNT(*) FROM orders o WHERE o.email = c.email AND o.status <> 'cancelled') AS order_count,
               (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.email = c.email AND o.currency = 'TRY' AND o.status IN ('confirmed','completed')) AS spent_try,
               (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.email = c.email AND o.currency = 'USD' AND o.status IN ('confirmed','completed')) AS spent_usd,
               (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.email = c.email AND o.currency = 'RUB' AND o.status IN ('confirmed','completed')) AS spent_rub,
               (SELECT MAX(o.created_at) FROM orders o WHERE o.email = c.email) AS last_order_at,
               (SELECT COUNT(*) FROM leads l WHERE l.email = c.email) AS lead_count,
               c.first_seen
        FROM (
            SELECT email, MIN(first_seen) AS first_seen FROM (
                SELECT email, created_at AS first_seen FROM users WHERE role = 'customer'
                UNION ALL SELECT email, created_at FROM orders
                UNION ALL SELECT email, created_at FROM leads
            ) all_emails GROUP BY email
        ) c
        LEFT JOIN users u ON u.email = c.email";

    public static function list(?string $q, ?string $segment, int $page): array
    {
        $where = [];
        $params = [];
        if ($q) {
            $where[] = '(x.email LIKE ? OR x.name LIKE ?)';
            $like = '%' . addcslashes($q, '%_\\') . '%';
            array_push($params, $like, $like);
        }
        $where[] = match ($segment) {
            'buyers' => 'x.order_count > 0',
            'accounts' => 'x.user_id IS NOT NULL',
            'leads' => 'x.lead_count > 0 AND x.order_count = 0',
            'marketing' => 'x.marketing = 1',
            default => '1 = 1',
        };
        $sqlWhere = implode(' AND ', $where);
        $total = (int) Db::value("SELECT COUNT(*) FROM (" . self::BASE . ") x WHERE $sqlWhere", $params);
        $offset = max(0, $page - 1) * 50;
        $rows = Db::all("SELECT * FROM (" . self::BASE . ") x WHERE $sqlWhere ORDER BY COALESCE(x.last_order_at, x.first_seen) DESC LIMIT 50 OFFSET $offset", $params);
        return ['total' => $total, 'page' => $page, 'pageSize' => 50, 'customers' => array_map(self::row(...), $rows)];
    }

    public static function row(array $r): array
    {
        return [
            'email' => $r['email'],
            'name' => $r['name'],
            'hasAccount' => $r['user_id'] !== null,
            'emailVerified' => $r['email_verified_at'] !== null,
            'marketing' => (bool) $r['marketing'],
            'orderCount' => (int) $r['order_count'],
            'spent' => array_filter(['TRY' => (int) $r['spent_try'], 'USD' => (int) $r['spent_usd'], 'RUB' => (int) $r['spent_rub']]),
            'lastOrderAt' => iso($r['last_order_at']),
            'leadCount' => (int) $r['lead_count'],
            'firstSeen' => iso($r['first_seen']),
        ];
    }

    public static function detail(string $email): array
    {
        $row = Db::one("SELECT * FROM (" . self::BASE . ") x WHERE x.email = ?", [$email]) ?? throw ApiError::notFound('customer_not_found');
        $user = Db::one('SELECT * FROM users WHERE email = ?', [$email]);
        return [
            'customer' => self::row($row),
            'account' => $user ? Auth::publicUser($user) : null,
            'addresses' => $user ? Account::addresses((int) $user['id']) : [],
            'orders' => array_map(Orders::summary(...), Db::all('SELECT * FROM orders WHERE email = ? ORDER BY id DESC', [$email])),
            'leads' => array_map(self::lead(...), Db::all(self::LEADS_SQL . ' WHERE l.email = ? ORDER BY l.id DESC', [$email])),
            'notes' => array_map(static fn ($n) => [
                'id' => (int) $n['id'],
                'body' => $n['body'],
                'author' => $n['author'],
                'createdAt' => iso($n['created_at']),
            ], Db::all('SELECT n.*, u.name AS author FROM crm_notes n LEFT JOIN users u ON u.id = n.author_id WHERE n.email = ? ORDER BY n.id DESC', [$email])),
        ];
    }

    public static function addNote(string $email, string $body, int $authorId): void
    {
        Db::insert('crm_notes', ['email' => $email, 'author_id' => $authorId, 'body' => $body]);
        Audit::log($authorId, 'crm.note', 'customer', $email);
    }

    private const LEADS_SQL = "SELECT l.*, COALESCE(t.name, p.slug) AS product_name
        FROM leads l LEFT JOIN products p ON p.id = l.product_id
        LEFT JOIN product_translations t ON t.product_id = p.id AND t.locale = 'en'";

    public static function leads(?string $status, int $page): array
    {
        $where = in_array($status, ['new', 'contacted', 'closed'], true) ? 'WHERE l.status = ?' : '';
        $params = $where ? [$status] : [];
        $offset = max(0, $page - 1) * 50;
        return [
            'total' => (int) Db::value('SELECT COUNT(*) FROM leads l ' . $where, $params),
            'leads' => array_map(self::lead(...), Db::all(self::LEADS_SQL . " $where ORDER BY l.id DESC LIMIT 50 OFFSET $offset", $params)),
        ];
    }

    public static function lead(array $l): array
    {
        return [
            'id' => (int) $l['id'],
            'email' => $l['email'],
            'name' => $l['name'],
            'product' => $l['product_name'],
            'locale' => $l['locale'],
            'country' => $l['country'],
            'source' => $l['source'],
            'message' => $l['message'],
            'status' => $l['status'],
            'createdAt' => iso($l['created_at']),
        ];
    }

    public static function csv(): never
    {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="pipolune-customers-' . gmdate('Y-m-d') . '.csv"');
        header('Cache-Control: no-store, private');
        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF");
        fputcsv($out, ['email', 'name', 'account', 'marketing_opt_in', 'orders', 'spent_try', 'spent_usd', 'spent_rub', 'last_order', 'enquiries', 'first_seen']);
        foreach (Db::all("SELECT * FROM (" . self::BASE . ") x ORDER BY x.first_seen") as $r) {
            $c = self::row($r);
            fputcsv($out, [
                $c['email'], $c['name'], $c['hasAccount'] ? 'yes' : 'no', $c['marketing'] ? 'yes' : 'no', $c['orderCount'],
                ($c['spent']['TRY'] ?? 0) / 100, ($c['spent']['USD'] ?? 0) / 100, ($c['spent']['RUB'] ?? 0) / 100,
                $c['lastOrderAt'], $c['leadCount'], $c['firstSeen'],
            ]);
        }
        exit;
    }
}
