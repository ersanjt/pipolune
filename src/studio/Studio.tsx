import { useEffect, useState } from 'preact/hooks';
import { api, ApiError } from '../lib/api';
import type { User } from '../lib/session';
import { studioText, type StudioLang } from './i18n';
import { can, type Ctx } from './shared';
import Overview from './views/Overview';
import Products, { ProductEditor } from './views/Products';
import Inventory from './views/Inventory';
import Orders, { OrderPage } from './views/Orders';
import Customers, { CustomerPage, Leads } from './views/Customers';
import Content from './views/Content';
import Settings from './views/Settings';

const ICONS: Record<string, string> = {
  overview: 'M4 11 12 4l8 7v9h-5v-6H9v6H4z',
  products: 'M8 4h8l3 4-3 2v10H8V10L5 8z',
  inventory: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  orders: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
  customers: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 20c.9-3.3 3.2-5 6-5s5.1 1.7 6 5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 15c1.5.6 2.5 2.2 3 5',
  leads: 'M4 6h16v10H8l-4 4z',
  content: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
};

function initialLang(): StudioLang {
  const saved = localStorage.getItem('pl:studio-lang');
  if (saved === 'en' || saved === 'tr' || saved === 'ru') return saved;
  const nav = navigator.language.slice(0, 2);
  return nav === 'tr' || nav === 'ru' ? nav : 'en';
}

function useHash(): string {
  const [hash, setHash] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const on = () => {
      setHash(location.hash.slice(1) || '/');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export default function Studio() {
  const [lang, setLangState] = useState<StudioLang>(initialLang);
  const [me, setMe] = useState<User | null | 'anon' | 'denied'>(null);
  const [navOpen, setNavOpen] = useState(false);
  const hash = useHash();
  const t = studioText[lang];

  const setLang = (l: StudioLang) => {
    localStorage.setItem('pl:studio-lang', l);
    setLangState(l);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    api<{ user: User | null }>('/session')
      .then(({ user }) => setMe(!user ? 'anon' : user.role === 'customer' ? 'denied' : user))
      .catch(() => setMe('anon'));
  }, []);

  useEffect(() => setNavOpen(false), [hash]);

  if (me === null) return <p class="s-boot">✦</p>;
  if (me === 'anon') return <SignIn lang={lang} onLang={setLang} onDone={setMe} />;
  if (me === 'denied') {
    return (
      <div class="s-auth">
        <img src="/brand/wordmark.svg" alt="Pipolune" width="180" />
        <p>{t.noAccess}</p>
        <a href="/">{t.backToShop}</a>
      </div>
    );
  }

  const ctx: Ctx = { t, lang, me, go: (h) => (location.hash = h) };
  const [, section = '', param] = hash.split('/');
  const nav = [
    { key: 'overview', href: '#/', show: true },
    { key: 'products', href: '#/products', show: true },
    { key: 'inventory', href: '#/inventory', show: true },
    { key: 'orders', href: '#/orders', show: can.orders(me) },
    { key: 'customers', href: '#/customers', show: can.orders(me) },
    { key: 'leads', href: '#/leads', show: can.orders(me) },
    { key: 'content', href: '#/content', show: can.products(me) },
    { key: 'settings', href: '#/settings', show: can.products(me) },
  ].filter((n) => n.show);
  const active = section || 'overview';

  let view;
  switch (section) {
    case '':
      view = <Overview ctx={ctx} />;
      break;
    case 'products':
      view = param ? <ProductEditor ctx={ctx} id={param === 'new' ? null : Number(param)} /> : <Products ctx={ctx} />;
      break;
    case 'inventory':
      view = <Inventory ctx={ctx} />;
      break;
    case 'orders':
      view = param ? <OrderPage ctx={ctx} number={decodeURIComponent(param)} /> : <Orders ctx={ctx} />;
      break;
    case 'customers':
      view = param ? <CustomerPage ctx={ctx} email={decodeURIComponent(param)} /> : <Customers ctx={ctx} />;
      break;
    case 'leads':
      view = <Leads ctx={ctx} />;
      break;
    case 'content':
      view = <Content ctx={ctx} />;
      break;
    case 'settings':
      view = <Settings ctx={ctx} />;
      break;
    default:
      view = <Overview ctx={ctx} />;
  }

  async function signOut() {
    await api('/auth/logout', { method: 'POST' });
    setMe('anon');
  }

  return (
    <div class="s-shell" data-nav-open={navOpen}>
      <aside class="s-side">
        <a class="s-side__logo" href="#/">
          <img src="/brand/wordmark.svg" alt="Pipolune Studio" width="140" />
        </a>
        <nav aria-label="Studio">
          <ul>
            {nav.map((n) => (
              <li>
                <a href={n.href} aria-current={active === n.key ? 'page' : undefined}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true">
                    <path d={ICONS[n.key]} />
                  </svg>
                  {t.nav[n.key as keyof typeof t.nav]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div class="s-side__foot">
          <a href={`/${lang}/`} target="_blank" rel="noopener">
            {t.viewSite} ↗
          </a>
          <button type="button" onClick={signOut}>
            {t.signOut}
          </button>
        </div>
      </aside>
      <div class="s-main">
        <div class="s-top">
          <button type="button" class="s-top__menu" aria-label="Menu" aria-expanded={navOpen} onClick={() => setNavOpen(!navOpen)}>
            ☰
          </button>
          <div class="s-langs" role="group" aria-label="Language">
            {(['en', 'tr', 'ru'] as StudioLang[]).map((l) => (
              <button type="button" aria-pressed={l === lang} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <span class="s-user">
            <span class="s-user__avatar" aria-hidden="true">
              {(me.name || me.email).charAt(0).toUpperCase()}
            </span>
            <span>
              {me.name || me.email}
              <span class="s-muted"> · {t.roles[me.role]}</span>
            </span>
          </span>
        </div>
        <main class="s-content">{view}</main>
      </div>
    </div>
  );
}

function SignIn({ lang, onLang, onDone }: { lang: StudioLang; onLang: (l: StudioLang) => void; onDone: (u: User | 'denied') => void }) {
  const t = studioText[lang];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div class="s-auth">
      <img src="/brand/wordmark.svg" alt="Pipolune" width="200" />
      <h1>{t.signInTitle}</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            const { user } = await api<{ user: User }>('/auth/login', { method: 'POST', body: { email, password } });
            onDone(user.role === 'customer' ? 'denied' : user);
          } catch (err) {
            setError(err instanceof ApiError && err.message ? err.message : t.error);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {t.email}
          <input type="email" autoComplete="username" required value={email} onInput={(e) => setEmail(e.currentTarget.value)} />
        </label>
        <label>
          {t.password}
          <input type="password" autoComplete="current-password" required value={password} onInput={(e) => setPassword(e.currentTarget.value)} />
        </label>
        {error && <p class="s-error">{error}</p>}
        <button class="s-btn" type="submit" disabled={busy}>
          {t.signIn}
        </button>
        <a href={`/${lang}/account/forgot/`}>{t.forgot}</a>
      </form>
      <div class="s-langs">
        {(['en', 'tr', 'ru'] as StudioLang[]).map((l) => (
          <button type="button" aria-pressed={l === lang} onClick={() => onLang(l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
