<?php
declare(strict_types=1);

namespace Pipolune;

/** Plain-text transactional email through the server's exim (PHP mail()). */
final class Mailer
{
    private const TEXT = [
        'verify' => [
            'en' => ['Confirm your email', "Hello{name},\n\nPlease confirm your email address for your Pipolune account:\n{link}\n\nThe link is valid for 48 hours. If you did not create an account, you can ignore this email."],
            'tr' => ['E-posta adresinizi doğrulayın', "Merhaba{name},\n\nPipolune hesabınız için e-posta adresinizi doğrulayın:\n{link}\n\nBağlantı 48 saat geçerlidir. Hesap oluşturmadıysanız bu e-postayı yok sayabilirsiniz."],
            'ru' => ['Подтвердите email', "Здравствуйте{name}!\n\nПодтвердите адрес почты для аккаунта Pipolune:\n{link}\n\nСсылка действует 48 часов. Если вы не создавали аккаунт, просто проигнорируйте это письмо."],
        ],
        'reset' => [
            'en' => ['Reset your password', "Hello{name},\n\nUse this link to set a new password for your Pipolune account:\n{link}\n\nThe link is valid for 1 hour. If you did not ask for it, you can ignore this email."],
            'tr' => ['Şifrenizi yenileyin', "Merhaba{name},\n\nPipolune hesabınız için yeni şifre belirlemek üzere bu bağlantıyı kullanın:\n{link}\n\nBağlantı 1 saat geçerlidir. Talep etmediyseniz bu e-postayı yok sayabilirsiniz."],
            'ru' => ['Восстановление пароля', "Здравствуйте{name}!\n\nЧтобы задать новый пароль для аккаунта Pipolune, перейдите по ссылке:\n{link}\n\nСсылка действует 1 час. Если вы не запрашивали восстановление, проигнорируйте письмо."],
        ],
        'invite' => [
            'en' => ['Your Pipolune Studio access', "Hello,\n\nYou have been given {role} access to Pipolune Studio. Set your password here:\n{link}\n\nThe link is valid for 72 hours. Studio: {studio}"],
            'tr' => ['Pipolune Studio erişiminiz', "Merhaba,\n\nPipolune Studio'ya {role} erişimi verildi. Şifrenizi buradan belirleyin:\n{link}\n\nBağlantı 72 saat geçerlidir. Studio: {studio}"],
            'ru' => ['Доступ к Pipolune Studio', "Здравствуйте!\n\nВам выдан доступ к Pipolune Studio (роль: {role}). Задайте пароль по ссылке:\n{link}\n\nСсылка действует 72 часа. Studio: {studio}"],
        ],
        'order_requested' => [
            'en' => ['We received your order request {number}', "Hello{name},\n\nThank you! We received your order request {number}.\n\n{items}\n\nNo payment has been taken. We will check availability and write to you to confirm the order, delivery and payment.\n\nOrder details: {link}"],
            'tr' => ['{number} numaralı sipariş talebinizi aldık', "Merhaba{name},\n\nTeşekkürler! {number} numaralı sipariş talebinizi aldık.\n\n{items}\n\nHerhangi bir ödeme alınmadı. Stok durumunu kontrol edip siparişi, teslimatı ve ödemeyi onaylamak için size yazacağız.\n\nSipariş detayları: {link}"],
            'ru' => ['Мы получили ваш запрос заказа {number}', "Здравствуйте{name}!\n\nСпасибо! Мы получили ваш запрос заказа {number}.\n\n{items}\n\nОплата не списывалась. Мы проверим наличие и напишем вам, чтобы подтвердить заказ, доставку и оплату.\n\nДетали заказа: {link}"],
        ],
        'order_update' => [
            'en' => ['Update on your order {number}', "Hello{name},\n\nYour order {number}: {status}.\n{tracking}\nOrder details: {link}"],
            'tr' => ['{number} numaralı siparişinizde güncelleme', "Merhaba{name},\n\n{number} numaralı siparişiniz: {status}.\n{tracking}\nSipariş detayları: {link}"],
            'ru' => ['Обновление по заказу {number}', "Здравствуйте{name}!\n\nВаш заказ {number}: {status}.\n{tracking}\nДетали заказа: {link}"],
        ],
    ];

    public const STATUS_TEXT = [
        'confirmed' => ['en' => 'confirmed', 'tr' => 'onaylandı', 'ru' => 'подтверждён'],
        'preparing' => ['en' => 'being prepared', 'tr' => 'hazırlanıyor', 'ru' => 'собирается'],
        'shipped' => ['en' => 'shipped', 'tr' => 'kargoya verildi', 'ru' => 'отправлен'],
        'delivered' => ['en' => 'delivered', 'tr' => 'teslim edildi', 'ru' => 'доставлен'],
        'cancelled' => ['en' => 'cancelled', 'tr' => 'iptal edildi', 'ru' => 'отменён'],
    ];

    public static function template(string $template, string $locale, string $to, array $vars): bool
    {
        [$subject, $body] = self::TEXT[$template][locale($locale)];
        $vars['name'] = isset($vars['name']) && $vars['name'] !== '' ? ', ' . $vars['name'] : '';
        $replace = [];
        foreach ($vars as $key => $value) {
            $replace['{' . $key . '}'] = (string) $value;
        }
        return self::send($to, strtr($subject, $replace), strtr($body, $replace) . "\n\n— Pipolune\nhttps://pipolune.com");
    }

    public static function send(string $to, string $subject, string $body): bool
    {
        $from = (string) config('mail.from');
        $name = (string) (config('mail.from_name') ?? 'Pipolune');
        $headers = implode("\r\n", [
            'From: ' . mb_encode_mimeheader($name, 'UTF-8') . " <$from>",
            "Reply-To: $from",
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ]);
        return mail($to, mb_encode_mimeheader($subject, 'UTF-8'), $body, $headers, '-f' . $from);
    }

    public static function notifyTeam(string $subject, string $body): void
    {
        $to = config('mail.notify');
        if ($to) {
            self::send((string) $to, $subject, $body . "\n\nStudio: " . config('app.url') . '/studio/');
        }
    }
}
