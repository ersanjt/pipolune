export const locales = ['en', 'tr', 'ru'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  tr: 'Türkçe',
  ru: 'Русский',
};

export type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';

interface Dictionary {
  metaTitle: string;
  metaDescription: string;
  skipLink: string;
  languageLabel: string;
  nav: { shop: string; seasons: string; about: string };
  menu: string;
  closeMenu: string;
  search: string;
  account: string;
  bag: string;
  comingSoon: string;
  heroTitle: string;
  heroLead: string;
  heroCta: string;
  seasonsTitle: string;
  seasons: Record<SeasonKey, string>;
  collectionTitle: string;
  previewNote: string;
  aboutTitle: string;
  aboutBody: string;
  statusBody: string;
  statusOpenBody: string;
  contactBody: string;
  notFoundTitle: string;
  notFoundBody: string;
  notFoundAction: string;
}

export const ui: Record<Locale, Dictionary> = {
  en: {
    metaTitle: 'Pipolune — A little wonder, every season',
    metaDescription:
      'Timeless clothing for curious children, inspired by the quiet magic of the forest. Our first collection is in preparation.',
    skipLink: 'Skip to content',
    languageLabel: 'Language',
    nav: { shop: 'Shop', seasons: 'Seasons', about: 'About' },
    menu: 'Menu',
    closeMenu: 'Close menu',
    search: 'Search',
    account: 'Account',
    bag: 'Bag',
    comingSoon: 'coming soon',
    heroTitle: 'A little wonder, every season.',
    heroLead: 'Timeless clothing for curious children inspired by the quiet magic of the forest.',
    heroCta: 'Explore the collection',
    seasonsTitle: 'Seasons',
    seasons: { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' },
    collectionTitle: 'Collection',
    previewNote: 'Design preview · illustrative products',
    aboutTitle: 'About Pipolune',
    aboutBody:
      "A children's woodland boutique for Türkiye: timeless pieces for curious little ones, changing with the four seasons.",
    statusBody:
      'Our first collection is in preparation. The online shop is not open yet, and we are not taking orders or payments.',
    statusOpenBody:
      'Our first collection is here. You can send an order request online; we confirm availability, delivery and payment with you by email before anything is charged.',
    contactBody: 'Write to us:',
    notFoundTitle: 'Page not found',
    notFoundBody: 'This path does not lead anywhere yet.',
    notFoundAction: 'Back to home',
  },
  tr: {
    metaTitle: 'Pipolune — Her mevsim küçük bir mucize',
    metaDescription:
      'Ormanın sessiz büyüsünden ilham alan, meraklı çocuklar için zamansız giysiler. İlk koleksiyonumuz hazırlanıyor.',
    skipLink: 'İçeriğe geç',
    languageLabel: 'Dil',
    nav: { shop: 'Mağaza', seasons: 'Mevsimler', about: 'Hakkımızda' },
    menu: 'Menü',
    closeMenu: 'Menüyü kapat',
    search: 'Ara',
    account: 'Hesap',
    bag: 'Sepet',
    comingSoon: 'yakında',
    heroTitle: 'Her mevsim küçük bir mucize.',
    heroLead: 'Ormanın sessiz büyüsünden ilham alan, meraklı çocuklar için zamansız giysiler.',
    heroCta: 'Koleksiyonu keşfedin',
    seasonsTitle: 'Mevsimler',
    seasons: { spring: 'İlkbahar', summer: 'Yaz', autumn: 'Sonbahar', winter: 'Kış' },
    collectionTitle: 'Koleksiyon',
    previewNote: 'Tasarım önizlemesi · örnek ürünler',
    aboutTitle: 'Pipolune hakkında',
    aboutBody:
      'Türkiye için orman temalı bir çocuk butiği: dört mevsimle değişen, meraklı küçükler için zamansız parçalar.',
    statusBody:
      'İlk koleksiyonumuz hazırlanıyor. Online mağaza henüz açılmadı; şu anda sipariş veya ödeme alınmıyor.',
    statusOpenBody:
      'İlk koleksiyonumuz burada. Online sipariş talebi gönderebilirsiniz; herhangi bir ödeme alınmadan önce stok, teslimat ve ödemeyi sizinle e-postayla onaylıyoruz.',
    contactBody: 'Bize yazın:',
    notFoundTitle: 'Sayfa bulunamadı',
    notFoundBody: 'Bu yol henüz bir yere çıkmıyor.',
    notFoundAction: 'Ana sayfaya dön',
  },
  ru: {
    metaTitle: 'Pipolune — Маленькое чудо в каждом сезоне',
    metaDescription:
      'Вневременная одежда для любознательных детей, вдохновлённая тихим волшебством леса. Первая коллекция готовится.',
    skipLink: 'Перейти к содержанию',
    languageLabel: 'Язык',
    nav: { shop: 'Магазин', seasons: 'Сезоны', about: 'О нас' },
    menu: 'Меню',
    closeMenu: 'Закрыть меню',
    search: 'Поиск',
    account: 'Аккаунт',
    bag: 'Корзина',
    comingSoon: 'скоро',
    heroTitle: 'Маленькое чудо в каждом сезоне.',
    heroLead: 'Вневременная одежда для любознательных детей, вдохновлённая тихим волшебством леса.',
    heroCta: 'Смотреть коллекцию',
    seasonsTitle: 'Сезоны',
    seasons: { spring: 'Весна', summer: 'Лето', autumn: 'Осень', winter: 'Зима' },
    collectionTitle: 'Коллекция',
    previewNote: 'Дизайн-превью · примеры товаров',
    aboutTitle: 'О Pipolune',
    aboutBody:
      'Детский бутик в лесной эстетике для Турции: вневременные вещи для любознательных малышей, меняющиеся вместе с четырьмя сезонами.',
    statusBody:
      'Первая коллекция готовится. Интернет-магазин ещё не открыт: заказы и оплата сейчас не принимаются.',
    statusOpenBody:
      'Первая коллекция уже здесь. Можно отправить запрос заказа онлайн: до любой оплаты мы подтвердим с вами наличие, доставку и оплату по email.',
    contactBody: 'Напишите нам:',
    notFoundTitle: 'Страница не найдена',
    notFoundBody: 'Эта тропинка пока никуда не ведёт.',
    notFoundAction: 'На главную',
  },
};

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}
