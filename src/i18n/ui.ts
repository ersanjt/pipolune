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
  heroTitle: string;
  heroLead: string;
  statusTitle: string;
  statusBody: string;
  seasonsTitle: string;
  seasonsLead: string;
  currentSeason: string;
  seasons: Record<SeasonKey, { name: string; months: string; note: string }>;
  contactTitle: string;
  contactBody: string;
  footerNote: string;
  notFoundTitle: string;
  notFoundBody: string;
  notFoundAction: string;
}

export const ui: Record<Locale, Dictionary> = {
  en: {
    metaTitle: 'Pipolune — A little wonder, every season',
    metaDescription:
      "Pipolune is a children's woodland boutique for Türkiye. Our first collection is in preparation.",
    skipLink: 'Skip to content',
    languageLabel: 'Language',
    heroTitle: 'A little wonder, every season.',
    heroLead: 'Timeless clothing for curious children, inspired by the quiet magic of the forest.',
    statusTitle: 'We are preparing our first collection',
    statusBody:
      'The online shop is not open yet, and we are not taking orders or payments. We will share the collection here when it is ready.',
    seasonsTitle: 'Four seasons, one woodland path',
    seasonsLead: 'Each season opens its own collection along the same forest path.',
    currentSeason: 'Now',
    seasons: {
      spring: { name: 'Spring', months: 'March – May', note: 'First blossoms' },
      summer: { name: 'Summer', months: 'June – August', note: 'Sunlit days' },
      autumn: { name: 'Autumn', months: 'September – November', note: 'Copper leaves' },
      winter: { name: 'Winter', months: 'December – February', note: 'Snow and red berries' },
    },
    contactTitle: 'Write to us',
    contactBody: 'For questions and collaborations:',
    footerNote: 'This site is in design and development.',
    notFoundTitle: 'Page not found',
    notFoundBody: 'This path does not lead anywhere yet.',
    notFoundAction: 'Back to home',
  },
  tr: {
    metaTitle: 'Pipolune — Her mevsim küçük bir mucize',
    metaDescription:
      'Pipolune, Türkiye için orman temalı bir çocuk butiği. İlk koleksiyonumuz hazırlanıyor.',
    skipLink: 'İçeriğe geç',
    languageLabel: 'Dil',
    heroTitle: 'Her mevsim küçük bir mucize.',
    heroLead: 'Ormanın sessiz büyüsünden ilham alan, meraklı çocuklar için zamansız giysiler.',
    statusTitle: 'İlk koleksiyonumuzu hazırlıyoruz',
    statusBody:
      'Online mağaza henüz açılmadı; şu anda sipariş veya ödeme alınmıyor. Koleksiyon hazır olduğunda burada paylaşacağız.',
    seasonsTitle: 'Dört mevsim, tek bir orman yolu',
    seasonsLead: 'Her mevsim, aynı orman yolunda kendi koleksiyonunu açar.',
    currentSeason: 'Şimdi',
    seasons: {
      spring: { name: 'İlkbahar', months: 'Mart – Mayıs', note: 'İlk çiçekler' },
      summer: { name: 'Yaz', months: 'Haziran – Ağustos', note: 'Güneşli günler' },
      autumn: { name: 'Sonbahar', months: 'Eylül – Kasım', note: 'Bakır yapraklar' },
      winter: { name: 'Kış', months: 'Aralık – Şubat', note: 'Kar ve kırmızı yemişler' },
    },
    contactTitle: 'Bize yazın',
    contactBody: 'Sorularınız ve iş birlikleri için:',
    footerNote: 'Bu site tasarım ve geliştirme aşamasındadır.',
    notFoundTitle: 'Sayfa bulunamadı',
    notFoundBody: 'Bu yol henüz bir yere çıkmıyor.',
    notFoundAction: 'Ana sayfaya dön',
  },
  ru: {
    metaTitle: 'Pipolune — Маленькое чудо в каждом сезоне',
    metaDescription:
      'Pipolune — детский бутик в лесной эстетике для Турции. Первая коллекция готовится.',
    skipLink: 'Перейти к содержанию',
    languageLabel: 'Язык',
    heroTitle: 'Маленькое чудо в каждом сезоне.',
    heroLead:
      'Вневременная одежда для любознательных детей, вдохновлённая тихим волшебством леса.',
    statusTitle: 'Мы готовим первую коллекцию',
    statusBody:
      'Интернет-магазин ещё не открыт: заказы и оплата сейчас не принимаются. Мы расскажем здесь, когда коллекция будет готова.',
    seasonsTitle: 'Четыре сезона, одна лесная тропа',
    seasonsLead: 'Каждый сезон открывает свою коллекцию на той же лесной тропе.',
    currentSeason: 'Сейчас',
    seasons: {
      spring: { name: 'Весна', months: 'Март – май', note: 'Первое цветение' },
      summer: { name: 'Лето', months: 'Июнь – август', note: 'Солнечные дни' },
      autumn: { name: 'Осень', months: 'Сентябрь – ноябрь', note: 'Медные листья' },
      winter: { name: 'Зима', months: 'Декабрь – февраль', note: 'Снег и красные ягоды' },
    },
    contactTitle: 'Напишите нам',
    contactBody: 'По вопросам и сотрудничеству:',
    footerNote: 'Сайт находится в стадии дизайна и разработки.',
    notFoundTitle: 'Страница не найдена',
    notFoundBody: 'Эта тропинка пока никуда не ведёт.',
    notFoundAction: 'На главную',
  },
};

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}
