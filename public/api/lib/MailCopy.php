<?php
declare(strict_types=1);

namespace Pipolune;

/** EN / TR / RU copy for branded emails. Placeholders are filled by Mailer. */
final class MailCopy
{
    public const CATEGORY = [
        'product_new' => 'marketing',
        'newsletter' => 'marketing',
    ];

    public const ROLES = [
        'owner' => ['en' => 'owner', 'tr' => 'sahip', 'ru' => 'владелец'],
        'manager' => ['en' => 'store manager', 'tr' => 'mağaza müdürü', 'ru' => 'управляющий магазином'],
        'editor' => ['en' => 'editor', 'tr' => 'editör', 'ru' => 'редактор'],
        'content' => ['en' => 'content creator', 'tr' => 'içerik üreticisi', 'ru' => 'контент-менеджер'],
        'accountant' => ['en' => 'accountant', 'tr' => 'muhasebeci', 'ru' => 'бухгалтер'],
        'fulfilment' => ['en' => 'fulfilment', 'tr' => 'sevkiyat', 'ru' => 'отправка'],
        'support' => ['en' => 'customer support', 'tr' => 'müşteri destek', 'ru' => 'поддержка клиентов'],
    ];

    public const TRACKING = [
        'en' => 'Tracking: {tracking}',
        'tr' => 'Kargo takibi: {tracking}',
        'ru' => 'Отслеживание: {tracking}',
    ];

    public const FOOTER = [
        'en' => [
            'note' => 'This message is about your account or an order.',
            'news' => 'You asked to hear from Pipolune.',
            'unsub' => 'Unsubscribe from news',
        ],
        'tr' => [
            'note' => 'Bu ileti hesabınız veya bir sipariş hakkındadır.',
            'news' => 'Pipolune\'dan haber almak istemiştiniz.',
            'unsub' => 'Haberlerden çık',
        ],
        'ru' => [
            'note' => 'Это письмо об аккаунте или заказе.',
            'news' => 'Вы просили новости от Pipolune.',
            'unsub' => 'Отписаться от новостей',
        ],
    ];

    public const TEXT = [
        'welcome' => [
            'en' => [
                'subject' => 'Welcome to Pipolune',
                'preheader' => 'Confirm your email to finish opening your account.',
                'heading' => 'Welcome',
                'body' => [
                    '{greeting}',
                    'Thank you for creating an account with Pipolune, a small woodland boutique of children\'s clothing for families in Türkiye.',
                    'Please confirm this email address. The link is valid for 48 hours.',
                ],
                'button' => 'Confirm email address',
                'after' => ['If you did not create an account, you can ignore this email.'],
            ],
            'tr' => [
                'subject' => 'Pipolune\'a hoş geldiniz',
                'preheader' => 'Hesabınızı açmak için e-postanızı doğrulayın.',
                'heading' => 'Hoş geldiniz',
                'body' => [
                    '{greeting}',
                    'Pipolune\'da bir hesap açtığınız için teşekkürler. Türkiye\'deki aileler için, özenle seçilmiş çocuk giysilerinden oluşan küçük bir butiğiz.',
                    'Lütfen bu e-posta adresini doğrulayın. Bağlantı 48 saat geçerlidir.',
                ],
                'button' => 'E-posta adresini doğrula',
                'after' => ['Hesap oluşturmadıysanız bu e-postayı yok sayabilirsiniz.'],
            ],
            'ru' => [
                'subject' => 'Добро пожаловать в Pipolune',
                'preheader' => 'Подтвердите почту, чтобы открыть аккаунт.',
                'heading' => 'Добро пожаловать',
                'body' => [
                    '{greeting}',
                    'Спасибо, что создали аккаунт в Pipolune — небольшой лесной бутик детской одежды для семей в Турции.',
                    'Пожалуйста, подтвердите этот адрес. Ссылка действует 48 часов.',
                ],
                'button' => 'Подтвердить email',
                'after' => ['Если вы не создавали аккаунт, просто проигнорируйте письмо.'],
            ],
        ],
        'verify' => [
            'en' => [
                'subject' => 'Confirm your email',
                'preheader' => 'One tap to confirm your Pipolune account.',
                'heading' => 'Confirm your email',
                'body' => ['{greeting}', 'Use the button below to confirm your email address. The link is valid for 48 hours.'],
                'button' => 'Confirm email address',
                'after' => ['If you did not ask for this, you can ignore this email.'],
            ],
            'tr' => [
                'subject' => 'E-posta adresinizi doğrulayın',
                'preheader' => 'Pipolune hesabınız için tek bir dokunuş.',
                'heading' => 'E-postanızı doğrulayın',
                'body' => ['{greeting}', 'E-posta adresinizi doğrulamak için aşağıdaki düğmeyi kullanın. Bağlantı 48 saat geçerlidir.'],
                'button' => 'E-posta adresini doğrula',
                'after' => ['Bunu siz istemediyseniz bu e-postayı yok sayabilirsiniz.'],
            ],
            'ru' => [
                'subject' => 'Подтвердите email',
                'preheader' => 'Одно нажатие, чтобы подтвердить аккаунт Pipolune.',
                'heading' => 'Подтвердите email',
                'body' => ['{greeting}', 'Нажмите кнопку ниже, чтобы подтвердить адрес. Ссылка действует 48 часов.'],
                'button' => 'Подтвердить email',
                'after' => ['Если вы не запрашивали письмо, его можно проигнорировать.'],
            ],
        ],
        'reset' => [
            'en' => [
                'subject' => 'Reset your password',
                'preheader' => 'A link to choose a new Pipolune password.',
                'heading' => 'Choose a new password',
                'body' => ['{greeting}', 'We received a request to reset the password for your Pipolune account. The link is valid for 1 hour.'],
                'button' => 'Reset password',
                'after' => ['If you did not ask for this, you can ignore this email. Your password will stay the same.'],
            ],
            'tr' => [
                'subject' => 'Şifrenizi yenileyin',
                'preheader' => 'Pipolune için yeni bir şifre belirleme bağlantısı.',
                'heading' => 'Yeni bir şifre seçin',
                'body' => ['{greeting}', 'Pipolune hesabınızın şifresini yenileme isteği aldık. Bağlantı 1 saat geçerlidir.'],
                'button' => 'Şifreyi yenile',
                'after' => ['Bunu siz istemediyseniz bu e-postayı yok sayabilirsiniz. Şifreniz aynı kalır.'],
            ],
            'ru' => [
                'subject' => 'Восстановление пароля',
                'preheader' => 'Ссылка, чтобы задать новый пароль Pipolune.',
                'heading' => 'Новый пароль',
                'body' => ['{greeting}', 'Мы получили запрос на новый пароль для вашего аккаунта Pipolune. Ссылка действует 1 час.'],
                'button' => 'Задать пароль',
                'after' => ['Если вы не запрашивали восстановление, проигнорируйте письмо. Пароль не изменится.'],
            ],
        ],
        'password_changed' => [
            'en' => [
                'subject' => 'Your password was changed',
                'preheader' => 'A confirmation from Pipolune.',
                'heading' => 'Password updated',
                'body' => ['{greeting}', 'The password for your Pipolune account was just changed. You can sign in with the new one.'],
                'button' => 'Sign in',
                'after' => ['If you did not do this, write to us at info@pipolune.com and we will help secure the account.'],
            ],
            'tr' => [
                'subject' => 'Şifreniz değiştirildi',
                'preheader' => 'Pipolune\'dan bir onay.',
                'heading' => 'Şifre güncellendi',
                'body' => ['{greeting}', 'Pipolune hesabınızın şifresi az önce değiştirildi. Yeni şifreyle giriş yapabilirsiniz.'],
                'button' => 'Giriş yap',
                'after' => ['Bunu siz yapmadıysanız info@pipolune.com adresine yazın; hesabı güvene almanıza yardımcı oluruz.'],
            ],
            'ru' => [
                'subject' => 'Пароль изменён',
                'preheader' => 'Подтверждение от Pipolune.',
                'heading' => 'Пароль обновлён',
                'body' => ['{greeting}', 'Пароль вашего аккаунта Pipolune только что изменён. Войти можно с новым паролем.'],
                'button' => 'Войти',
                'after' => ['Если это были не вы, напишите на info@pipolune.com — поможем защитить аккаунт.'],
            ],
        ],
        'invite' => [
            'en' => [
                'subject' => 'Your Pipolune Studio access',
                'preheader' => 'Set a password to open Studio.',
                'heading' => 'Studio access',
                'body' => [
                    '{greeting}',
                    'You have been given {role} access to Pipolune Studio. Set your password with the button below. The link is valid for 72 hours.',
                    'Studio: {studio}',
                ],
                'button' => 'Set your password',
            ],
            'tr' => [
                'subject' => 'Pipolune Studio erişiminiz',
                'preheader' => 'Studio\'yu açmak için bir şifre belirleyin.',
                'heading' => 'Studio erişimi',
                'body' => [
                    '{greeting}',
                    'Pipolune Studio\'ya {role} erişimi verildi. Şifrenizi aşağıdaki düğmeyle belirleyin. Bağlantı 72 saat geçerlidir.',
                    'Studio: {studio}',
                ],
                'button' => 'Şifreyi belirle',
            ],
            'ru' => [
                'subject' => 'Доступ к Pipolune Studio',
                'preheader' => 'Задайте пароль, чтобы открыть Studio.',
                'heading' => 'Доступ в Studio',
                'body' => [
                    '{greeting}',
                    'Вам выдан доступ к Pipolune Studio (роль: {role}). Задайте пароль по кнопке ниже. Ссылка действует 72 часа.',
                    'Studio: {studio}',
                ],
                'button' => 'Задать пароль',
            ],
        ],
        'order_requested' => [
            'en' => [
                'subject' => 'We received your order request {number}',
                'preheader' => 'No payment has been taken.',
                'heading' => 'Request received',
                'body' => ['{greeting}', 'Thank you. We have your order request {number}.'],
                'below' => [
                    'Total: {total}',
                    'No payment has been taken. We will check availability and write to you to confirm the order, delivery and payment.',
                ],
                'button' => 'View your order',
            ],
            'tr' => [
                'subject' => '{number} numaralı sipariş talebinizi aldık',
                'preheader' => 'Herhangi bir ödeme alınmadı.',
                'heading' => 'Talebiniz alındı',
                'body' => ['{greeting}', 'Teşekkürler. {number} numaralı sipariş talebiniz bizde.'],
                'below' => [
                    'Toplam: {total}',
                    'Herhangi bir ödeme alınmadı. Stok durumunu kontrol edip siparişi, teslimatı ve ödemeyi onaylamak için size yazacağız.',
                ],
                'button' => 'Siparişi görüntüle',
            ],
            'ru' => [
                'subject' => 'Мы получили запрос заказа {number}',
                'preheader' => 'Оплата не списывалась.',
                'heading' => 'Запрос получен',
                'body' => ['{greeting}', 'Спасибо. Запрос заказа {number} у нас.'],
                'below' => [
                    'Итого: {total}',
                    'Оплата не списывалась. Мы проверим наличие и напишем, чтобы подтвердить заказ, доставку и оплату.',
                ],
                'button' => 'Посмотреть заказ',
            ],
        ],
        'order_update' => [
            'en' => [
                'subject' => 'Update on your order {number}',
                'preheader' => 'There is news about order {number}.',
                'heading' => 'Order {number}',
                'body' => ['{greeting}', 'Your order {number} is now {status}.', '{tracking_paragraph}'],
                'button' => 'View your order',
            ],
            'tr' => [
                'subject' => '{number} numaralı siparişinizde güncelleme',
                'preheader' => '{number} numaralı sipariş hakkında bir haber var.',
                'heading' => 'Sipariş {number}',
                'body' => ['{greeting}', '{number} numaralı siparişiniz artık {status}.', '{tracking_paragraph}'],
                'button' => 'Siparişi görüntüle',
            ],
            'ru' => [
                'subject' => 'Обновление по заказу {number}',
                'preheader' => 'Новости по заказу {number}.',
                'heading' => 'Заказ {number}',
                'body' => ['{greeting}', 'Ваш заказ {number}: {status}.', '{tracking_paragraph}'],
                'button' => 'Посмотреть заказ',
            ],
        ],
        'cart_reminder' => [
            'en' => [
                'subject' => 'Your bag is still here',
                'preheader' => 'The pieces you chose are waiting.',
                'heading' => 'Still in your bag',
                'body' => ['{greeting}', 'You added these pieces and have not ordered them yet. They are still in your bag.'],
                'below' => ['We will not write about this bag again unless you change it.'],
                'button' => 'Return to your bag',
            ],
            'tr' => [
                'subject' => 'Çantanız sizi bekliyor',
                'preheader' => 'Seçtiğiniz parçalar duruyor.',
                'heading' => 'Çantanızda duruyor',
                'body' => ['{greeting}', 'Bu parçaları eklediniz ve henüz sipariş vermediniz. Çantanızda duruyorlar.'],
                'below' => ['Çantanızı değiştirmediğiniz sürece bu çanta hakkında başka bir not göndermeyeceğiz.'],
                'button' => 'Çantaya dön',
            ],
            'ru' => [
                'subject' => 'Ваша сумка ещё ждёт',
                'preheader' => 'Выбранные вещи на месте.',
                'heading' => 'Всё ещё в сумке',
                'body' => ['{greeting}', 'Вы добавили эти вещи и ещё не оформили заказ. Они по-прежнему в сумке.'],
                'below' => ['Мы не будем писать об этой сумке снова, пока вы её не измените.'],
                'button' => 'Вернуться в сумку',
            ],
        ],
        'product_new' => [
            'en' => [
                'subject' => 'New in the shop: {product_name}',
                'preheader' => 'A new piece is on the Pipolune website.',
                'heading' => 'New in',
                'body' => ['{greeting}', 'A new piece is now on the website.'],
                'button' => 'See the piece',
            ],
            'tr' => [
                'subject' => 'Mağazada yeni: {product_name}',
                'preheader' => 'Pipolune sitesinde yeni bir parça var.',
                'heading' => 'Yeni gelen',
                'body' => ['{greeting}', 'Yeni bir parça artık sitede.'],
                'button' => 'Parçayı gör',
            ],
            'ru' => [
                'subject' => 'Новинка: {product_name}',
                'preheader' => 'На сайте Pipolune новая вещь.',
                'heading' => 'Новинка',
                'body' => ['{greeting}', 'На сайте появилась новая вещь.'],
                'button' => 'Смотреть',
            ],
        ],
        'enquiry_received' => [
            'en' => [
                'subject' => 'We received your note',
                'preheader' => 'Thank you for writing to Pipolune.',
                'heading' => 'Thank you',
                'body' => ['{greeting}', 'We received your message and will reply by email.'],
                'after' => ['If you need anything sooner, write to info@pipolune.com.'],
            ],
            'tr' => [
                'subject' => 'Notunuzu aldık',
                'preheader' => 'Pipolune\'a yazdığınız için teşekkürler.',
                'heading' => 'Teşekkürler',
                'body' => ['{greeting}', 'Mesajınızı aldık ve e-posta ile yanıtlayacağız.'],
                'after' => ['Daha önce yazmak isterseniz: info@pipolune.com.'],
            ],
            'ru' => [
                'subject' => 'Мы получили ваше сообщение',
                'preheader' => 'Спасибо, что написали в Pipolune.',
                'heading' => 'Спасибо',
                'body' => ['{greeting}', 'Мы получили сообщение и ответим по email.'],
                'after' => ['Если нужно написать раньше: info@pipolune.com.'],
            ],
        ],
        'newsletter' => [
            'en' => [
                'subject' => 'You are on the Pipolune list',
                'preheader' => 'We will write when something new arrives.',
                'heading' => 'You are subscribed',
                'body' => ['{greeting}', 'We will write when there is something new in the shop. Only the notes you asked for.'],
            ],
            'tr' => [
                'subject' => 'Pipolune listesindesiniz',
                'preheader' => 'Yeni bir şey geldiğinde yazarız.',
                'heading' => 'Abone oldunuz',
                'body' => ['{greeting}', 'Mağazada yeni bir şey olduğunda yazarız. Yalnızca istediğiniz notlar.'],
            ],
            'ru' => [
                'subject' => 'Вы в списке Pipolune',
                'preheader' => 'Напишем, когда появится что-то новое.',
                'heading' => 'Подписка оформлена',
                'body' => ['{greeting}', 'Мы напишем, когда в магазине появится что-то новое. Только те письма, о которых вы просили.'],
            ],
        ],
    ];
}
