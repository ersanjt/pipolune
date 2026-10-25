<?php
declare(strict_types=1);

namespace Pipolune;

/**
 * Branded HTML + plain-text mail.
 * Uses authenticated SMTP when mail.smtp is set in the server config; otherwise the local Exim via mail().
 */
final class Mailer
{
    public const STATUS_TEXT = [
        'confirmed' => ['en' => 'confirmed', 'tr' => 'onaylandı', 'ru' => 'подтверждён'],
        'preparing' => ['en' => 'being prepared', 'tr' => 'hazırlanıyor', 'ru' => 'собирается'],
        'shipped' => ['en' => 'shipped', 'tr' => 'kargoya verildi', 'ru' => 'отправлен'],
        'delivered' => ['en' => 'delivered', 'tr' => 'teslim edildi', 'ru' => 'доставлен'],
        'cancelled' => ['en' => 'cancelled', 'tr' => 'iptal edildi', 'ru' => 'отменён'],
    ];

    /** Sends immediately. A transport failure is queued and retried by mail-cron.php. */
    public static function template(string $template, string $locale, string $to, array $vars): bool
    {
        $locale = locale($locale);
        try {
            $status = self::deliver($template, $locale, $to, $vars);
            self::record($template, self::category($template), $locale, $to, $status);
            return true;
        } catch (\Throwable $e) {
            error_log('[pipolune-mail] ' . $template . ': ' . $e->getMessage());
            if (!$e instanceof \InvalidArgumentException) {
                try {
                    self::enqueue($template, $locale, $to, $vars, null, gmdate('Y-m-d H:i:s', time() + 120));
                } catch (\Throwable $ignored) {
                    error_log('[pipolune-mail] queue: ' . $ignored->getMessage());
                }
            }
            return false;
        }
    }

    /** @param list<array<string, mixed>> $items */
    public static function itemLines(array $items): array
    {
        $lines = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $meta = trim((string) ($item['meta'] ?? ''));
            if ($meta === '') {
                $meta = implode(' · ', array_filter(
                    [(string) ($item['colour'] ?? ''), (string) ($item['size'] ?? '')],
                    static fn (string $part) => $part !== '',
                ));
            }
            $qty = max(1, (int) ($item['qty'] ?? $item['quantity'] ?? 1));
            $price = (string) ($item['price'] ?? '');
            if ($price === '' && isset($item['unitPrice'])) {
                $price = Orders::money((int) $item['unitPrice'] * $qty);
            }
            $lines[] = [
                'name' => (string) ($item['name'] ?? ''),
                'meta' => $meta,
                'qty' => $qty,
                'price' => $price,
                'image' => (string) ($item['image'] ?? ''),
            ];
        }
        return $lines;
    }

    public static function send(string $to, string $subject, string $body): bool
    {
        $paragraphs = array_values(array_filter(
            array_map('trim', preg_split("/\r\n|\n|\r/", $body) ?: []),
            static fn (string $line) => $line !== '',
        ));
        try {
            self::transmit('transactional', 'en', self::address($to), [
                'subject' => $subject,
                'preheader' => $paragraphs[0] ?? $subject,
                'heading' => $subject,
                'body' => $paragraphs,
            ], []);
            return true;
        } catch (\Throwable $e) {
            error_log('[pipolune-mail] send: ' . $e->getMessage());
            return false;
        }
    }

    public static function notifyTeam(string $subject, string $body): void
    {
        $to = config('mail.notify');
        if ($to) {
            self::send((string) $to, $subject, $body . "\n\nStudio: " . config('app.url') . '/studio/');
        }
    }

    public static function suppress(string $email, string $category, string $reason): void
    {
        Db::run(
            'INSERT INTO mail_suppressions (email, category, reason) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE reason = VALUES(reason)',
            [mb_strtolower(trim($email)), $category, mb_substr($reason, 0, 40)],
        );
    }

    public static function unsubscribeToken(string $email): string
    {
        return substr(hash_hmac('sha256', 'unsubscribe:' . mb_strtolower(trim($email)), (string) config('app.secret')), 0, 32);
    }

    public static function unsubscribeUrl(string $locale, string $email): string
    {
        $email = mb_strtolower(trim($email));
        return self::origin() . '/' . locale($locale) . '/unsubscribe/?' . http_build_query([
            'email' => $email,
            'token' => self::unsubscribeToken($email),
        ]);
    }

    /** Queues one letter per opted-in address for every active product not yet announced. */
    public static function queueUnannouncedProducts(): array
    {
        $ids = array_map('intval', array_column(
            Db::all("SELECT id FROM products WHERE status = 'active' AND announced_at IS NULL ORDER BY id"),
            'id',
        ));
        $messages = 0;
        foreach ($ids as $i => $id) {
            $messages += self::queueProductAnnouncement($id, 5 + ($i * 10));
            Db::run('UPDATE products SET announced_at = UTC_TIMESTAMP() WHERE id = ?', [$id]);
        }
        return ['products' => count($ids), 'messages' => $messages];
    }

    /** Finds signed-in bags left untouched for 24 hours and queues a single reminder. */
    public static function queueAbandonedCarts(): int
    {
        $rows = Db::all(
            "SELECT c.id, c.updated_at, u.email, u.name, u.locale
             FROM carts c
             JOIN users u ON u.id = c.user_id
             WHERE u.role = 'customer' AND u.email <> ''
               AND c.updated_at <= UTC_TIMESTAMP() - INTERVAL 24 HOUR
               AND (c.reminded_at IS NULL OR c.updated_at > DATE_ADD(c.reminded_at, INTERVAL 1 MINUTE))
               AND EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = c.id)
               AND NOT EXISTS (
                 SELECT 1 FROM mail_suppressions s WHERE s.email = u.email AND s.category = 'all'
               )",
        );
        $queued = 0;
        foreach ($rows as $row) {
            $lang = locale($row['locale']);
            $items = array_values(array_filter(
                Cart::items((int) $row['id'], $lang),
                static fn (array $item) => $item['available'],
            ));
            // Keep updated_at so this write is not treated as a new edit of the bag.
            Db::run('UPDATE carts SET reminded_at = UTC_TIMESTAMP(), updated_at = updated_at WHERE id = ?', [$row['id']]);
            if (!$items) {
                continue;
            }
            if (self::enqueue('cart_reminder', $lang, $row['email'], [
                'name' => $row['name'],
                'link' => self::origin() . "/$lang/bag/",
                'items' => self::itemLines($items),
            ], 'cart:' . $row['id'] . ':' . $row['updated_at'])) {
                $queued++;
            }
        }
        return $queued;
    }

    /** @return array{sent: int, failed: int, skipped: int} */
    public static function drain(int $limit = 40): array
    {
        $result = ['sent' => 0, 'failed' => 0, 'skipped' => 0];
        $limit = max(1, min(100, $limit));
        $rows = Db::all(
            "SELECT * FROM mail_messages
             WHERE status = 'queued' AND send_after <= UTC_TIMESTAMP() AND attempts < 5
             ORDER BY id LIMIT $limit",
        );
        foreach ($rows as $row) {
            $claimed = Db::run(
                "UPDATE mail_messages SET status = 'sending' WHERE id = ? AND status = 'queued'",
                [$row['id']],
            )->rowCount();
            if ($claimed !== 1) {
                continue;
            }
            $vars = json_decode((string) $row['vars_json'], true);
            try {
                $status = self::deliver($row['template'], locale($row['locale']), $row['to_email'], is_array($vars) ? $vars : []);
                Db::update('mail_messages', [
                    'status' => $status,
                    'sent_at' => $status === 'sent' ? now() : null,
                    'vars_json' => '{}',
                    'last_error' => null,
                ], ['id' => $row['id']]);
                $result[$status === 'skipped' ? 'skipped' : 'sent']++;
            } catch (\Throwable $e) {
                $attempts = (int) $row['attempts'] + 1;
                Db::update('mail_messages', [
                    'attempts' => $attempts,
                    'last_error' => mb_substr($e->getMessage(), 0, 255),
                    'status' => $attempts >= 5 ? 'failed' : 'queued',
                    'send_after' => gmdate('Y-m-d H:i:s', time() + 900),
                    'vars_json' => $attempts >= 5 ? '{}' : $row['vars_json'],
                ], ['id' => $row['id']]);
                $result['failed']++;
            }
        }
        return $result;
    }

    /** @return 'sent'|'skipped' */
    private static function deliver(string $template, string $locale, string $to, array $vars): string
    {
        $copy = MailCopy::TEXT[$template][$locale] ?? MailCopy::TEXT[$template]['en'] ?? null;
        if ($copy === null) {
            throw new \InvalidArgumentException("Unknown mail template: $template");
        }
        $to = self::address($to);
        $category = self::category($template);
        if (self::isSuppressed($to, $category)) {
            return 'skipped';
        }
        if ($template === 'invite' && isset($vars['role'])) {
            $vars['role'] = MailCopy::ROLES[(string) $vars['role']][$locale] ?? (string) $vars['role'];
        }
        $vars['greeting'] = self::greeting($locale, (string) ($vars['name'] ?? ''));
        $tracking = trim((string) ($vars['tracking'] ?? ''));
        $vars['tracking_paragraph'] = $tracking === ''
            ? ''
            : strtr(MailCopy::TRACKING[$locale], ['{tracking}' => $tracking]);
        self::transmit($category, $locale, $to, $copy, $vars);
        return 'sent';
    }

    private static function enqueue(
        string $template,
        string $locale,
        string $to,
        array $vars,
        ?string $dedupe,
        ?string $sendAfter = null,
    ): bool {
        try {
            Db::insert('mail_messages', [
                'dedupe_key' => $dedupe,
                'template' => $template,
                'category' => self::category($template),
                'locale' => locale($locale),
                'to_email' => self::address($to),
                'vars_json' => json_encode($vars, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'status' => 'queued',
                'send_after' => $sendAfter ?? now(),
            ]);
            return true;
        } catch (\PDOException $e) {
            if ($dedupe !== null && (string) $e->getCode() === '23000') {
                return false;
            }
            throw $e;
        }
    }

    private static function queueProductAnnouncement(int $productId, int $delayMinutes): int
    {
        $product = Db::one('SELECT * FROM products WHERE id = ? AND status = \'active\'', [$productId]);
        if (!$product) {
            return 0;
        }
        $translations = [];
        foreach (Db::all('SELECT * FROM product_translations WHERE product_id = ?', [$productId]) as $row) {
            $translations[$row['locale']] = $row;
        }
        $queued = 0;
        foreach (self::marketingRecipients() as $person) {
            $lang = locale($person['locale']);
            $copy = $translations[$lang] ?? $translations['en'] ?? null;
            if ($copy === null) {
                continue;
            }
            if (self::enqueue('product_new', $lang, $person['email'], [
                'name' => $person['name'],
                'product_name' => $copy['name'],
                'product_subtitle' => $copy['subtitle'],
                'product_price' => Orders::money((int) $product['price_kurus']),
                'product_image' => $product['image'],
                'link' => self::origin() . "/$lang/shop/" . rawurlencode($product['slug']) . '/',
            ], 'product:' . $productId . ':' . $person['email'], gmdate('Y-m-d H:i:s', time() + $delayMinutes * 60))) {
                $queued++;
            }
        }
        return $queued;
    }

    /** Account opt-in, checkout opt-in, and newsletter leads. Staff addresses are left out. */
    private static function marketingRecipients(): array
    {
        $rows = Db::all(
            "SELECT email, name, locale, 1 AS rank_order FROM users
              WHERE marketing_opt_in = 1 AND role = 'customer' AND email <> ''
             UNION ALL
             SELECT email, shipping_name, locale, 2 FROM orders WHERE marketing_opt_in = 1 AND email <> ''
             UNION ALL
             SELECT email, name, locale, 3 FROM leads WHERE source = 'newsletter' AND email <> ''
             ORDER BY rank_order",
        );
        $byEmail = [];
        foreach ($rows as $row) {
            $email = mb_strtolower((string) $row['email']);
            if (!isset($byEmail[$email])) {
                $byEmail[$email] = ['email' => $email, 'name' => (string) $row['name'], 'locale' => locale($row['locale'])];
            }
        }
        if (!$byEmail) {
            return [];
        }
        foreach (Db::all("SELECT email FROM users WHERE role <> 'customer'") as $staff) {
            unset($byEmail[mb_strtolower((string) $staff['email'])]);
        }
        if (!$byEmail) {
            return [];
        }
        $emails = array_keys($byEmail);
        $suppressed = Db::all(
            'SELECT email FROM mail_suppressions WHERE category IN (\'marketing\', \'all\') AND email IN (' . Db::marks($emails) . ')',
            $emails,
        );
        foreach ($suppressed as $row) {
            unset($byEmail[mb_strtolower((string) $row['email'])]);
        }
        return array_values($byEmail);
    }

    private static function isSuppressed(string $email, string $category): bool
    {
        if ($category === 'marketing') {
            return (bool) Db::value(
                "SELECT 1 FROM mail_suppressions WHERE email = ? AND category IN ('marketing', 'all')",
                [$email],
            );
        }
        return (bool) Db::value(
            "SELECT 1 FROM mail_suppressions WHERE email = ? AND category = 'all'",
            [$email],
        );
    }

    private static function transmit(string $category, string $locale, string $to, array $copy, array $vars): void
    {
        [$from, $fromName, $replyTo] = self::identity($category);
        $built = self::compose($locale, $category, $to, $copy, $vars);
        $messageId = bin2hex(random_bytes(8)) . '@pipolune.com';
        $headers = [
            'Date: ' . gmdate('D, d M Y H:i:s') . ' +0000',
            'From: ' . self::encodedName($fromName) . " <$from>",
            "To: <$to>",
            "Reply-To: <$replyTo>",
            'Message-ID: <' . $messageId . '>',
            'MIME-Version: 1.0',
            'Content-Type: multipart/alternative; boundary="' . $built['boundary'] . '"',
        ];
        if ($category === 'marketing') {
            $oneClick = self::origin() . '/api/mail/unsubscribe?' . http_build_query([
                'email' => $to,
                'token' => self::unsubscribeToken($to),
            ]);
            $headers[] = 'List-Unsubscribe: <' . $oneClick . '>';
            $headers[] = 'List-Unsubscribe-Post: List-Unsubscribe=One-Click';
        }
        $headerBlock = implode("\r\n", $headers);
        $data = $headerBlock . "\r\nSubject: " . self::encodedName($built['subject']) . "\r\n\r\n" . $built['body'];
        $smtp = self::smtpConfig($category);
        if ($smtp) {
            Smtp::send($smtp, $from, $to, $data);
            return;
        }
        $ok = mail(
            $to,
            self::encodedName($built['subject']),
            str_replace("\r\n", "\n", $built['body']),
            str_replace("\r\n", "\n", $headerBlock),
            '-f' . $from,
        );
        if (!$ok) {
            throw new \RuntimeException('Local mail transport returned false.');
        }
    }

    /** @return array{subject: string, boundary: string, body: string} */
    private static function compose(string $locale, string $category, string $to, array $copy, array $vars): array
    {
        $subject = self::fill((string) $copy['subject'], $vars);
        $preheader = self::fill((string) ($copy['preheader'] ?? ''), $vars);
        $heading = self::fill((string) ($copy['heading'] ?? $subject), $vars);
        $body = self::filledLines($copy['body'] ?? [], $vars);
        $below = self::filledLines($copy['below'] ?? [], $vars);
        $after = self::filledLines($copy['after'] ?? [], $vars);
        $items = is_array($vars['items'] ?? null) ? self::itemLines($vars['items']) : [];
        $button = trim((string) ($copy['button'] ?? ''));
        $link = trim((string) ($vars['link'] ?? ''));
        $product = trim((string) ($vars['product_name'] ?? ''));
        $unsub = $category === 'marketing' ? self::unsubscribeUrl($locale, $to) : '';
        $footer = MailCopy::FOOTER[$locale];

        $text = "Pipolune\n\n$heading\n\n" . implode("\n\n", $body);
        if ($product !== '') {
            $text .= "\n\n" . $product;
            if (!empty($vars['product_subtitle'])) {
                $text .= "\n" . $vars['product_subtitle'];
            }
            if (!empty($vars['product_price'])) {
                $text .= "\n" . $vars['product_price'];
            }
        }
        foreach ($items as $item) {
            $line = '• ' . $item['name'];
            if ($item['meta'] !== '') {
                $line .= ' (' . $item['meta'] . ')';
            }
            if ($item['qty'] > 1) {
                $line .= ' × ' . $item['qty'];
            }
            if ($item['price'] !== '') {
                $line .= ' — ' . $item['price'];
            }
            $text .= "\n" . $line;
        }
        if ($below) {
            $text .= "\n\n" . implode("\n\n", $below);
        }
        if ($button !== '' && $link !== '') {
            $text .= "\n\n$button: $link";
        }
        if ($after) {
            $text .= "\n\n" . implode("\n\n", $after);
        }
        $text .= "\n\n— Pipolune\n" . self::origin();
        $text .= "\n" . ($category === 'marketing' ? $footer['news'] : $footer['note']);
        if ($unsub !== '') {
            $text .= "\n" . $footer['unsub'] . ': ' . $unsub;
        }

        $boundary = 'pl_' . bin2hex(random_bytes(8));
        $html = self::html($locale, $category, $preheader, $heading, $body, $below, $after, $items, $vars, $button, $link, $unsub);
        $mime = "--$boundary\r\n"
            . "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n"
            . quoted_printable_encode($text) . "\r\n"
            . "--$boundary\r\n"
            . "Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n"
            . quoted_printable_encode($html) . "\r\n"
            . "--$boundary--";
        return ['subject' => $subject, 'boundary' => $boundary, 'body' => $mime];
    }

    private static function html(
        string $locale,
        string $category,
        string $preheader,
        string $heading,
        array $body,
        array $below,
        array $after,
        array $items,
        array $vars,
        string $button,
        string $link,
        string $unsub,
    ): string {
        $footer = MailCopy::FOOTER[$locale];
        $icon = self::h(self::absolute('/brand/icon-192.png'));
        $parts = [];
        foreach ($body as $paragraph) {
            $parts[] = self::paragraph($paragraph);
        }
        $product = trim((string) ($vars['product_name'] ?? ''));
        if ($product !== '') {
            $parts[] = self::productCard(
                $product,
                (string) ($vars['product_subtitle'] ?? ''),
                (string) ($vars['product_price'] ?? ''),
                (string) ($vars['product_image'] ?? ''),
            );
        }
        if ($items) {
            $parts[] = self::itemsTable($items);
        }
        foreach ($below as $paragraph) {
            $parts[] = self::paragraph($paragraph);
        }
        if ($button !== '' && $link !== '') {
            $parts[] = '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;"><tr>'
                . '<td bgcolor="#203d2b" style="background:#203d2b;border-radius:6px;">'
                . '<a href="' . self::h($link) . '" style="display:inline-block;padding:14px 28px;font-family:Georgia,\'Times New Roman\',serif;font-size:16px;line-height:1.2;color:#f7f2e8;text-decoration:none;">'
                . self::h($button) . '</a></td></tr></table>';
        }
        foreach ($after as $paragraph) {
            $parts[] = self::paragraph($paragraph, true);
        }
        $note = $category === 'marketing' ? $footer['news'] : $footer['note'];
        $unsubHtml = $unsub === '' ? '' : '<br><a href="' . self::h($unsub) . '" style="color:#365a55;text-decoration:underline;">' . self::h($footer['unsub']) . '</a>';
        return '<!DOCTYPE html><html lang="' . self::h($locale) . '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
            . '<body style="margin:0;padding:0;background:#f7f2e8;">'
            . '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">' . self::h($preheader) . '</div>'
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f2e8;"><tr><td align="center" style="padding:32px 16px;">'
            . '<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">'
            . '<tr><td style="padding:0 8px 20px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>'
            . '<td style="padding-right:12px;"><img src="' . $icon . '" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border:0;border-radius:4px;"></td>'
            . '<td style="font-family:Georgia,\'Times New Roman\',serif;font-size:22px;line-height:1;color:#203d2b;">Pipolune</td>'
            . '</tr></table></td></tr>'
            . '<tr><td bgcolor="#fbf8f1" style="background:#fbf8f1;border:1px solid #e4ddd0;border-radius:8px;padding:36px 32px;font-family:Georgia,\'Times New Roman\',serif;color:#203d2b;">'
            . '<h1 style="margin:0 0 20px;font-family:Georgia,\'Times New Roman\',serif;font-size:28px;font-weight:normal;line-height:1.25;color:#203d2b;">' . self::h($heading) . '</h1>'
            . implode('', $parts)
            . '</td></tr>'
            . '<tr><td style="padding:20px 8px 0;font-family:Georgia,\'Times New Roman\',serif;font-size:13px;line-height:1.5;color:#5c6d62;">'
            . self::h($note) . $unsubHtml
            . '<br><a href="' . self::h(self::origin()) . '" style="color:#5c6d62;text-decoration:none;">pipolune.com</a>'
            . ' · <a href="mailto:info@pipolune.com" style="color:#5c6d62;text-decoration:none;">info@pipolune.com</a>'
            . '</td></tr></table></td></tr></table></body></html>';
    }

    private static function paragraph(string $text, bool $muted = false): string
    {
        $color = $muted ? '#5c6d62' : '#203d2b';
        return '<p style="margin:0 0 16px;font-family:Georgia,\'Times New Roman\',serif;font-size:16px;line-height:1.55;color:' . $color . ';">'
            . nl2br(self::h($text)) . '</p>';
    }

    private static function productCard(string $name, string $subtitle, string $price, string $image): string
    {
        $imageHtml = $image === '' ? '' : '<td width="96" valign="top" style="padding-right:16px;"><img src="'
            . self::h(self::absolute($image)) . '" width="96" alt="' . self::h($name)
            . '" style="display:block;width:96px;height:auto;border:0;"></td>';
        $sub = $subtitle === '' ? '' : '<p style="margin:4px 0 0;font-family:Georgia,serif;font-size:14px;line-height:1.4;color:#5c6d62;">' . self::h($subtitle) . '</p>';
        $cost = $price === '' ? '' : '<p style="margin:8px 0 0;font-family:Georgia,serif;font-size:15px;color:#203d2b;">' . self::h($price) . '</p>';
        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;"><tr>'
            . $imageHtml
            . '<td valign="top"><p style="margin:0;font-family:Georgia,serif;font-size:18px;line-height:1.3;color:#203d2b;">' . self::h($name) . '</p>'
            . $sub . $cost . '</td></tr></table>';
    }

    private static function itemsTable(array $items): string
    {
        $rows = '';
        foreach ($items as $item) {
            $meta = $item['meta'] === '' ? '' : '<br><span style="color:#5c6d62;font-size:13px;">' . self::h($item['meta']) . '</span>';
            $qty = $item['qty'] > 1 ? ' × ' . (int) $item['qty'] : '';
            $thumb = $item['image'] === '' ? '' : '<td width="56" valign="top" style="padding:10px 12px 10px 0;"><img src="'
                . self::h(self::absolute($item['image'])) . '" width="56" alt="" style="display:block;width:56px;height:auto;border:0;"></td>';
            $rows .= '<tr>' . $thumb
                . '<td valign="top" style="padding:10px 8px 10px 0;font-family:Georgia,serif;font-size:15px;line-height:1.4;color:#203d2b;">'
                . self::h($item['name']) . self::h($qty) . $meta . '</td>'
                . '<td valign="top" align="right" style="padding:10px 0;font-family:Georgia,serif;font-size:15px;color:#203d2b;white-space:nowrap;">'
                . self::h($item['price']) . '</td></tr>';
        }
        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 12px;border-top:1px solid #e4ddd0;">'
            . $rows . '</table>';
    }

    private static function filledLines(array $lines, array $vars): array
    {
        $out = [];
        foreach ($lines as $line) {
            $text = trim(self::fill((string) $line, $vars));
            if ($text !== '') {
                $out[] = $text;
            }
        }
        return $out;
    }

    private static function fill(string $text, array $vars): string
    {
        $replace = [];
        foreach ($vars as $key => $value) {
            if (is_scalar($value) || $value === null) {
                $replace['{' . $key . '}'] = (string) $value;
            }
        }
        return strtr($text, $replace);
    }

    private static function greeting(string $locale, string $name): string
    {
        $name = trim($name);
        return match ($locale) {
            'tr' => $name !== '' ? "Merhaba $name," : 'Merhaba,',
            'ru' => $name !== '' ? "Здравствуйте, $name!" : 'Здравствуйте!',
            default => $name !== '' ? "Hello $name," : 'Hello,',
        };
    }

    /** @return array{0: string, 1: string, 2: string} from, from name, reply-to */
    private static function identity(string $category): array
    {
        $marketing = $category === 'marketing';
        $from = (string) ($marketing ? (config('mail.marketing_from') ?: config('mail.from')) : config('mail.from'));
        $name = (string) ($marketing
            ? (config('mail.marketing_from_name') ?: config('mail.from_name') ?: 'Pipolune')
            : (config('mail.from_name') ?: 'Pipolune'));
        $reply = (string) (config('mail.reply_to') ?: config('mail.notify') ?: $from);
        return [self::address($from), $name, self::address($reply)];
    }

    private static function smtpConfig(string $category): ?array
    {
        $smtp = $category === 'marketing' ? config('mail.marketing_smtp') : null;
        if (!self::smtpReady($smtp)) {
            $smtp = config('mail.smtp');
        }
        return self::smtpReady($smtp) ? $smtp : null;
    }

    private static function smtpReady(mixed $smtp): bool
    {
        return is_array($smtp) && !empty($smtp['host']) && !empty($smtp['username']) && !empty($smtp['password']);
    }

    private static function category(string $template): string
    {
        return MailCopy::CATEGORY[$template] ?? 'transactional';
    }

    private static function address(string $email): string
    {
        $email = mb_strtolower(trim($email));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) {
            throw new \InvalidArgumentException('Invalid email address.');
        }
        return $email;
    }

    private static function origin(): string
    {
        return rtrim((string) config('app.url'), '/');
    }

    private static function absolute(string $path): string
    {
        if ($path === '' || str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }
        return self::origin() . '/' . ltrim($path, '/');
    }

    private static function encodedName(string $value): string
    {
        return mb_encode_mimeheader(str_replace(["\r", "\n"], '', $value), 'UTF-8');
    }

    private static function h(?string $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private static function record(string $template, string $category, string $locale, string $to, string $status): void
    {
        try {
            Db::insert('mail_messages', [
                'template' => $template,
                'category' => $category,
                'locale' => $locale,
                'to_email' => mb_strtolower(trim($to)),
                'vars_json' => '{}',
                'status' => $status,
                'attempts' => 1,
                'sent_at' => $status === 'sent' ? now() : null,
            ]);
        } catch (\Throwable $e) {
            error_log('[pipolune-mail] log: ' . $e->getMessage());
        }
    }
}
