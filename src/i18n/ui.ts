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
  nav: { shop: string; seasons: string; newIn: string; about: string };
  home: string;
  shortcuts: string;
  footerHelp: string;
  footerLegal: string;
  footerContact: string;
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
  seasonKicker: Record<SeasonKey, string>;
  seasonLead: Record<SeasonKey, string>;
  seasonsPageTitle: string;
  seasonsPageLead: string;
  newInTitle: string;
  newInLead: string;
  aboutMore: string;
  contactTitle: string;
  contactLead: string;
  contactMeta: string;
  contactPlace: string;
  directions: string;
  sizeGuideTitle: string;
  sizeGuideLead: string;
  sizeGuideBody: string;
  sizeGuideMissing: string;
  sizeGuidePending: string;
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
      'Clothes and accessories for children and mothers, from a woodland boutique in Kağıthane, Istanbul.',
    skipLink: 'Skip to content',
    languageLabel: 'Language',
    nav: { shop: 'Shop', seasons: 'Seasons', newIn: 'New in', about: 'About' },
    home: 'Home',
    shortcuts: 'Shortcuts',
    footerHelp: 'Help',
    footerLegal: 'Legal',
    footerContact: 'Contact',
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
    seasonKicker: {
      spring: 'The spring collection',
      summer: 'The summer collection',
      autumn: 'The autumn collection',
      winter: 'The winter collection',
    },
    seasonLead: {
      spring: 'Lighter layers for brighter days, when the woodland starts to bloom.',
      summer: 'Light pieces for long, warm days outdoors.',
      autumn: 'Cosy layers for crisp days and changing colours.',
      winter: 'Warm layers for cold days, snow and quiet walks.',
    },
    seasonsPageTitle: 'Seasons',
    seasonsPageLead: 'One woodland path, four seasons.',
    newInTitle: 'New in',
    newInLead: 'The latest pieces added to the shop.',
    aboutMore:
      'The shop follows the year in Europe/Istanbul: spring, summer, autumn and winter. There are pieces for girls, boys and mothers, and accessories to go with them, with room to grow and a quiet woodland palette.',
    contactTitle: 'Contact',
    contactLead: 'The shop is in Kağıthane, Istanbul.',
    contactMeta:
      'Pipolune, Merkez Mahallesi, Lale Sokak No: 4-6, Kat 4 Kapı 7, 34406 Kağıthane, Istanbul. Telephone +90 554 606 00 98.',
    contactPlace: 'Kağıthane, Istanbul',
    sizeGuideTitle: 'Size guide',
    sizeGuideLead: 'Choose a size from the measurements of the piece, not a guess.',
    sizeGuideBody:
      'Each piece with confirmed measurements has its own chart. If a child is between sizes, choose the larger one. Charts are measured flat and can vary by 1–3 cm.',
    sizeGuideMissing: 'A size chart will appear here when we have confirmed measurements for a piece.',
    sizeGuidePending: 'No published size chart yet.',
    collectionTitle: 'Collection',
    previewNote: 'Design preview · illustrative products',
    aboutTitle: 'About Pipolune',
    aboutBody:
      'A woodland boutique in Kağıthane, Istanbul, for children and mothers: clothes and accessories that change with the four seasons.',
    statusBody:
      'Our first collection is in preparation. The online shop is not open yet, and we are not taking orders or payments.',
    statusOpenBody:
      'Our first collection is here. You can send an order request online; we confirm availability, delivery and payment with you by email before anything is charged.',
    contactBody: 'For a piece, an order or a visit, write or call. We answer in Turkish, English and Russian.',
    directions: 'Open in maps',
    notFoundTitle: 'Page not found',
    notFoundBody: 'This path does not lead anywhere yet.',
    notFoundAction: 'Back to home',
  },
  tr: {
    metaTitle: 'Pipolune — Her mevsim küçük bir mucize',
    metaDescription:
      'Kağıthane, İstanbul’da çocuklar ve anneler için giysi ve aksesuar. Orman esintili bir butik: kız, erkek ve anne.',
    skipLink: 'İçeriğe geç',
    languageLabel: 'Dil',
    nav: { shop: 'Mağaza', seasons: 'Mevsimler', newIn: 'Yeni gelenler', about: 'Hakkımızda' },
    home: 'Ana sayfa',
    shortcuts: 'Kısayollar',
    footerHelp: 'Yardım',
    footerLegal: 'Yasal',
    footerContact: 'İletişim',
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
    seasonKicker: {
      spring: 'İlkbahar koleksiyonu',
      summer: 'Yaz koleksiyonu',
      autumn: 'Sonbahar koleksiyonu',
      winter: 'Kış koleksiyonu',
    },
    seasonLead: {
      spring: 'Orman çiçeklenirken, daha aydınlık günler için daha hafif katmanlar.',
      summer: 'Uzun ve sıcak günler için hafif parçalar.',
      autumn: 'Serin günler ve değişen renkler için sıcak katmanlar.',
      winter: 'Soğuk günler, kar ve sakin yürüyüşler için sıcak katmanlar.',
    },
    seasonsPageTitle: 'Mevsimler',
    seasonsPageLead: 'Tek bir orman yolu, dört mevsim.',
    newInTitle: 'Yeni gelenler',
    newInLead: 'Mağazaya yeni eklenen parçalar.',
    aboutMore:
      'Mağaza yılı Avrupa/İstanbul takvimine göre izler: ilkbahar, yaz, sonbahar ve kış. Kız, erkek ve anne için parçalar ve onlara eşlik eden aksesuarlar vardır; büyümek için pay bırakır ve sakin bir orman paletine uyar.',
    contactTitle: 'İletişim',
    contactLead: 'Mağaza İstanbul Kağıthane’de.',
    contactMeta:
      'Pipolune, Merkez Mahallesi, Lale Sokak No: 4-6, Kat 4 Kapı 7, 34406 Kağıthane, İstanbul. Telefon +90 554 606 00 98.',
    contactPlace: 'Kağıthane, İstanbul',
    sizeGuideTitle: 'Beden rehberi',
    sizeGuideLead: 'Bedeni tahmine göre değil, parçanın ölçülerine göre seçin.',
    sizeGuideBody:
      'Ölçüleri doğrulanmış her parçanın kendi tablosu vardır. Çocuk iki beden arasındaysa büyük olanı seçin. Tablolar düz zeminde ölçülmüştür ve 1–3 cm fark olabilir.',
    sizeGuideMissing: 'Bir parçanın ölçüleri doğrulandığında beden tablosu burada görünür.',
    sizeGuidePending: 'Yayımlanmış beden tablosu henüz yok.',
    collectionTitle: 'Koleksiyon',
    previewNote: 'Tasarım önizlemesi · örnek ürünler',
    aboutTitle: 'Pipolune hakkında',
    aboutBody:
      'Kağıthane, İstanbul’da çocuklar ve anneler için orman esintili bir butik: dört mevsimle değişen giysiler ve aksesuarlar.',
    statusBody:
      'İlk koleksiyonumuz hazırlanıyor. Online mağaza henüz açılmadı; şu anda sipariş veya ödeme alınmıyor.',
    statusOpenBody:
      'İlk koleksiyonumuz burada. Online sipariş talebi gönderebilirsiniz; herhangi bir ödeme alınmadan önce stok, teslimat ve ödemeyi sizinle e-postayla onaylıyoruz.',
    contactBody: 'Bir parça, sipariş veya ziyaret için yazın ya da arayın. Türkçe, İngilizce ve Rusça yanıtlarız.',
    directions: 'Haritada aç',
    notFoundTitle: 'Sayfa bulunamadı',
    notFoundBody: 'Bu yol henüz bir yere çıkmıyor.',
    notFoundAction: 'Ana sayfaya dön',
  },
  ru: {
    metaTitle: 'Pipolune — Маленькое чудо в каждом сезоне',
    metaDescription:
      'Одежда и аксессуары для детей и мам. Лесной бутик в Кагытхане, Стамбул: для девочек, мальчиков и мам.',
    skipLink: 'Перейти к содержанию',
    languageLabel: 'Язык',
    nav: { shop: 'Магазин', seasons: 'Сезоны', newIn: 'Новинки', about: 'О нас' },
    home: 'Главная',
    shortcuts: 'Разделы',
    footerHelp: 'Помощь',
    footerLegal: 'Документы',
    footerContact: 'Контакты',
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
    seasonKicker: {
      spring: 'Весенняя коллекция',
      summer: 'Летняя коллекция',
      autumn: 'Осенняя коллекция',
      winter: 'Зимняя коллекция',
    },
    seasonLead: {
      spring: 'Более лёгкие слои для светлых дней, когда лес начинает цвести.',
      summer: 'Лёгкие вещи для долгих тёплых дней.',
      autumn: 'Уютные слои для прохладных дней и меняющихся красок.',
      winter: 'Тёплые слои для холодных дней, снега и тихих прогулок.',
    },
    seasonsPageTitle: 'Сезоны',
    seasonsPageLead: 'Одна лесная тропа, четыре сезона.',
    newInTitle: 'Новинки',
    newInLead: 'Вещи, которые недавно появились в магазине.',
    aboutMore:
      'Магазин идёт за годом по календарю Европы/Стамбула: весна, лето, осень и зима. Есть вещи для девочек, мальчиков и мам и аксессуары к ним, с запасом на вырост и спокойной лесной палитрой.',
    contactTitle: 'Контакты',
    contactLead: 'Магазин в Кагытхане, Стамбул.',
    contactMeta:
      'Pipolune, Merkez Mahallesi, Lale Sokak No: 4-6, Kat 4 Kapı 7, 34406 Кагытхане, Стамбул. Телефон +90 554 606 00 98.',
    contactPlace: 'Кагытхане, Стамбул',
    sizeGuideTitle: 'Таблица размеров',
    sizeGuideLead: 'Выбирайте размер по меркам вещи, а не наугад.',
    sizeGuideBody:
      'У каждой вещи с подтверждёнными мерками своя таблица. Если ребёнок между размерами, берите больший. Таблицы сняты по изделию в разложенном виде, возможна разница 1–3 см.',
    sizeGuideMissing: 'Таблица появится здесь, когда мерки вещи будут подтверждены.',
    sizeGuidePending: 'Опубликованной таблицы размеров пока нет.',
    collectionTitle: 'Коллекция',
    previewNote: 'Дизайн-превью · примеры товаров',
    aboutTitle: 'О Pipolune',
    aboutBody:
      'Лесной бутик в Кагытхане, Стамбул, для детей и мам: одежда и аксессуары, которые меняются вместе с четырьмя сезонами.',
    statusBody:
      'Первая коллекция готовится. Интернет-магазин ещё не открыт: заказы и оплата сейчас не принимаются.',
    statusOpenBody:
      'Первая коллекция уже здесь. Можно отправить запрос заказа онлайн: до любой оплаты мы подтвердим с вами наличие, доставку и оплату по email.',
    contactBody: 'Напишите или позвоните о вещи, заказе или визите. Отвечаем на турецком, английском и русском.',
    directions: 'Открыть на карте',
    notFoundTitle: 'Страница не найдена',
    notFoundBody: 'Эта тропинка пока никуда не ведёт.',
    notFoundAction: 'На главную',
  },
};

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}
