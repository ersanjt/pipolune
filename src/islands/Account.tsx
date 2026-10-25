import { useEffect, useState } from 'preact/hooks';
import { api } from '../lib/api';
import { money, date } from '../lib/format';
import { getSession, updateSession, rememberLanguage, type Session, type User } from '../lib/session';
import { errorText, shop } from '../i18n/shop';
import { locales, localeNames, type Locale } from '../i18n/ui';
import { Button, Checkbox, Field, Notice, PasswordField, Spinner, useForm } from './ui';
import OrderDetail, { type Order } from './OrderDetail';

export type AccountView = 'sign-in' | 'create' | 'forgot' | 'reset' | 'verify' | 'overview' | 'orders' | 'order' | 'wishlist' | 'addresses' | 'profile';

const PUBLIC_VIEWS: AccountView[] = ['sign-in', 'create', 'forgot', 'reset', 'verify'];

export default function Account({ lang, view }: { lang: Locale; view: AccountView }) {
  const t = shop[lang];
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    getSession(true).then((s) => {
      if (!s.user && !PUBLIC_VIEWS.includes(view)) {
        location.replace(`/${lang}/account/sign-in/?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      if (s.user && (view === 'sign-in' || view === 'create')) {
        location.replace(nextUrl(lang));
        return;
      }
      setSession(s);
    });
  }, []);

  if (!session) return <Spinner label={t.loading} />;

  switch (view) {
    case 'sign-in':
      return <SignIn lang={lang} />;
    case 'create':
      return <Create lang={lang} />;
    case 'forgot':
      return <Forgot lang={lang} />;
    case 'reset':
      return <Reset lang={lang} />;
    case 'verify':
      return <Verify lang={lang} signedIn={!!session.user} />;
    default:
      return <Dashboard lang={lang} view={view} user={session.user!} />;
  }
}

function nextUrl(lang: Locale): string {
  const next = new URLSearchParams(location.search).get('next') ?? '';
  return next.startsWith('/') && !next.startsWith('//') ? next : `/${lang}/account/`;
}

// ---------- Public views ----------

function SignIn({ lang }: { lang: Locale }) {
  const t = shop[lang];
  const form = useForm(lang, { email: '', password: '' });
  return (
    <div class="auth-layout">
      <form
        class="stack auth-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          form.submit(async () => {
            await api('/auth/login', { method: 'POST', body: form.values });
            location.href = nextUrl(lang);
          });
        }}
      >
        <Field label={t.email} name="email" type="email" autoComplete="email" required value={form.values.email} onInput={form.set('email')} error={form.errors.email} placeholder={t.emailPlaceholder} />
        <PasswordField label={t.password} name="password" autoComplete="current-password" required value={form.values.password} onInput={form.set('password')} error={form.errors.password} showLabel={t.showPassword} hideLabel={t.hidePassword} />
        {form.formError && <Notice tone="error">{form.formError}</Notice>}
        <Button type="submit" busy={form.busy} arrow full>
          {t.signIn}
        </Button>
        <p class="auth-links">
          <a href={`/${lang}/account/forgot/`}>{t.forgot}</a>
        </p>
        <p class="auth-links">
          {t.noAccount} <a href={`/${lang}/account/create/${location.search}`}>{t.createAccount}</a>
        </p>
      </form>
      <Benefits lang={lang} />
    </div>
  );
}

function Benefits({ lang }: { lang: Locale }) {
  return (
    <div class="auth-aside">
      <img src="/images/home/season-spring.webp" alt="" width="105" height="83" loading="lazy" />
      <ul class="check-list">
        {shop[lang].benefits.map((b) => (
          <li>{b}</li>
        ))}
      </ul>
    </div>
  );
}

function Create({ lang }: { lang: Locale }) {
  const t = shop[lang];
  const form = useForm(lang, { name: '', email: '', password: '', confirm: '', marketing: false });
  return (
    <>
      <div class="auth-layout">
        <form
          class="stack auth-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const local: Record<string, string> = {};
            if (form.values.password.length < 8) local.password = 'password_too_short';
            if (form.values.password !== form.values.confirm) local.confirm = 'passwords_differ';
            form.submit(async () => {
              const { confirm, ...body } = form.values;
              await api('/auth/register', { method: 'POST', body: { ...body, locale: lang } });
              location.href = nextUrl(lang);
            }, local);
          }}
        >
          <Field label={t.email} name="email" type="email" autoComplete="email" required value={form.values.email} onInput={form.set('email')} error={form.errors.email} placeholder={t.emailPlaceholder} />
          <Field label={t.name} name="name" autoComplete="name" value={form.values.name} onInput={form.set('name')} error={form.errors.name} />
          <PasswordField label={t.password} name="password" autoComplete="new-password" required value={form.values.password} onInput={form.set('password')} error={form.errors.password} placeholder={t.passwordHint} showLabel={t.showPassword} hideLabel={t.hidePassword} />
          <PasswordField label={t.confirmPassword} name="confirm" autoComplete="new-password" required value={form.values.confirm} onInput={form.set('confirm')} error={form.errors.confirm} placeholder={t.confirmPlaceholder} showLabel={t.showPassword} hideLabel={t.hidePassword} />
          <Checkbox name="marketing" label={t.marketingOptIn} checked={form.values.marketing} onChange={form.set('marketing')} />
          {form.formError && <Notice tone="error">{form.formError}</Notice>}
          <Button type="submit" busy={form.busy} arrow full>
            {t.createAccount}
          </Button>
        </form>
        <Benefits lang={lang} />
      </div>
      <Notice tone="info" title={t.verifyInfoTitle}>
        {t.verifyInfoBody}
      </Notice>
      <p class="auth-links">
        {t.alreadyHave} <a href={`/${lang}/account/sign-in/${location.search}`}>{t.signIn}</a> | <a href={`/${lang}/account/forgot/`}>{t.forgot}</a>
      </p>
    </>
  );
}

function Forgot({ lang }: { lang: Locale }) {
  const t = shop[lang];
  const [sent, setSent] = useState(false);
  const form = useForm(lang, { email: '' });
  if (sent) return <Notice tone="success">{t.forgotSent}</Notice>;
  return (
    <form
      class="stack auth-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(async () => {
          await api('/auth/forgot', { method: 'POST', body: { ...form.values, locale: lang } });
          setSent(true);
        });
      }}
    >
      <p>{t.forgotLead}</p>
      <Field label={t.email} name="email" type="email" autoComplete="email" required value={form.values.email} onInput={form.set('email')} error={form.errors.email} placeholder={t.emailPlaceholder} />
      {form.formError && <Notice tone="error">{form.formError}</Notice>}
      <Button type="submit" busy={form.busy} arrow>
        {t.sendLink}
      </Button>
    </form>
  );
}

function Reset({ lang }: { lang: Locale }) {
  const t = shop[lang];
  const token = new URLSearchParams(location.search).get('token') ?? '';
  const form = useForm(lang, { password: '', confirm: '' });
  return (
    <form
      class="stack auth-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const local: Record<string, string> = {};
        if (form.values.password.length < 8) local.password = 'password_too_short';
        if (form.values.password !== form.values.confirm) local.confirm = 'passwords_differ';
        form.submit(async () => {
          const { user } = await api<{ user: User }>('/auth/reset', { method: 'POST', body: { token, password: form.values.password } });
          location.href = user.role === 'customer' ? `/${lang}/account/` : '/studio/';
        }, local);
      }}
    >
      <PasswordField label={t.newPassword} name="password" autoComplete="new-password" required value={form.values.password} onInput={form.set('password')} error={form.errors.password} placeholder={t.passwordHint} showLabel={t.showPassword} hideLabel={t.hidePassword} />
      <PasswordField label={t.confirmPassword} name="confirm" autoComplete="new-password" required value={form.values.confirm} onInput={form.set('confirm')} error={form.errors.confirm} placeholder={t.confirmPlaceholder} showLabel={t.showPassword} hideLabel={t.hidePassword} />
      {form.formError && (
        <Notice tone="error">
          {form.formError} <a href={`/${lang}/account/forgot/`}>{t.resend}</a>
        </Notice>
      )}
      <Button type="submit" busy={form.busy} arrow>
        {t.savePassword}
      </Button>
    </form>
  );
}

function Verify({ lang, signedIn }: { lang: Locale; signedIn: boolean }) {
  const t = shop[lang];
  const [state, setState] = useState<'busy' | 'ok' | string>('busy');
  const [resent, setResent] = useState(false);
  useEffect(() => {
    const token = new URLSearchParams(location.search).get('token') ?? '';
    api('/auth/verify', { method: 'POST', body: { token } })
      .then(() => {
        setState('ok');
        getSession(true);
      })
      .catch((e) => setState(e.code ?? 'generic'));
  }, []);
  if (state === 'busy') return <Spinner label={t.loading} />;
  if (state === 'ok') {
    return (
      <div class="stack">
        <Notice tone="success">{t.verified}</Notice>
        <Button href={`/${lang}/account/`} arrow>
          {t.toAccount}
        </Button>
      </div>
    );
  }
  return (
    <div class="stack">
      <Notice tone="error">{errorText(lang, state)}</Notice>
      {signedIn &&
        (resent ? (
          <Notice tone="success">{t.resent}</Notice>
        ) : (
          <Button variant="secondary" onClick={() => api('/auth/resend-verification', { method: 'POST' }).then(() => setResent(true))}>
            {t.resend}
          </Button>
        ))}
    </div>
  );
}

// ---------- Dashboard ----------

function Dashboard({ lang, view, user }: { lang: Locale; view: AccountView; user: User }) {
  const t = shop[lang];
  const base = `/${lang}/account`;
  const nav: { key: AccountView; href: string; label: string; icon: string }[] = [
    { key: 'overview', href: `${base}/`, label: t.overview, icon: 'M4 5h16v11H4zM9 20h6' },
    { key: 'orders', href: `${base}/orders/`, label: t.orders, icon: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5' },
    { key: 'wishlist', href: `${base}/wishlist/`, label: t.wishlist, icon: 'M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.4 4.5 4.5 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z' },
    { key: 'addresses', href: `${base}/addresses/`, label: t.addresses, icon: 'M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z' },
    { key: 'profile', href: `${base}/profile/`, label: t.profile, icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5' },
  ];
  const active = view === 'order' ? 'orders' : view;

  useEffect(() => {
    const band = document.querySelector('[data-band-title]');
    if (band && view === 'overview') band.textContent = user.name ? t.hello.replace('{name}', user.name.split(' ')[0]) : t.helloNoName;
  }, []);

  async function signOut() {
    await api('/auth/logout', { method: 'POST' });
    location.href = `/${lang}/`;
  }

  return (
    <div class="account">
      <nav class="account__nav" aria-label={t.profile}>
        <ul>
          {nav.map((item) => (
            <li>
              <a href={item.href} aria-current={item.key === active ? 'page' : undefined}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </a>
            </li>
          ))}
          {user.role !== 'customer' && (
            <li>
              <a href="/studio/">
                <span aria-hidden="true" class="account__nav-star">
                  ✦
                </span>
                Studio
              </a>
            </li>
          )}
        </ul>
        <button type="button" class="account__signout" onClick={signOut}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />
          </svg>
          {t.signOut}
        </button>
      </nav>
      <div class="account__content">
        {!user.emailVerified && <VerifyBanner lang={lang} />}
        {view === 'overview' && <Overview lang={lang} />}
        {view === 'orders' && <Orders lang={lang} />}
        {view === 'order' && <OrderPage lang={lang} />}
        {view === 'wishlist' && <Wishlist lang={lang} />}
        {view === 'addresses' && <Addresses lang={lang} />}
        {view === 'profile' && <Profile lang={lang} user={user} />}
      </div>
    </div>
  );
}

function VerifyBanner({ lang }: { lang: Locale }) {
  const t = shop[lang];
  const [sent, setSent] = useState(false);
  return (
    <Notice tone="warning">
      {t.verifyBanner}{' '}
      {sent ? (
        t.resent
      ) : (
        <button type="button" class="link-btn" onClick={() => api('/auth/resend-verification', { method: 'POST' }).then(() => setSent(true))}>
          {t.resend}
        </button>
      )}
    </Notice>
  );
}

interface OrderSummary {
  number: string;
  createdAt: string;
  status: string;
  fulfilmentStatus: string;
  total: number;
  itemCount: number;
  firstItem: { name: string; image: string } | null;
}

function OrderRow({ lang, o }: { lang: Locale; o: OrderSummary }) {
  const t = shop[lang];
  const label = o.status === 'confirmed' ? t.fulfilmentStatus[o.fulfilmentStatus] : t.orderStatus[o.status];
  return (
    <li>
      <a class="order-row" href={`/${lang}/account/order/?n=${encodeURIComponent(o.number)}`}>
        {o.firstItem && <img src={o.firstItem.image} alt="" width="56" height="56" loading="lazy" />}
        <span class="order-row__id">
          <strong>{o.number}</strong>
          <span class="muted">{date(o.createdAt, lang)}</span>
        </span>
        <span class={`badge badge--${o.status === 'confirmed' ? o.fulfilmentStatus : o.status}`}>{label}</span>
        <span>{money(o.total, lang)}</span>
        <span aria-hidden="true">›</span>
      </a>
    </li>
  );
}

function ProductTile({ lang, p }: { lang: Locale; p: any }) {
  return (
    <li class="tile">
      <a href={`/${lang}/shop/${p.slug}/`}>
        <img src={p.image} alt="" width="200" height="200" loading="lazy" />
        <span class="tile__name">{p.name}</span>
        <span class="muted">{money(p.price, lang)}</span>
      </a>
    </li>
  );
}

function Overview({ lang }: { lang: Locale }) {
  const t = shop[lang];
  const [data, setData] = useState<{ orders: OrderSummary[]; wishlist: any[] } | null>(null);
  useEffect(() => {
    api(`/account?locale=${lang}`).then(setData);
  }, []);
  if (!data) return <Spinner label={t.loading} />;
  return (
    <div class="stack-lg">
      <section class="card">
        <div class="section-head">
          <h2 class="h-sub">{t.recentOrders}</h2>
          <a href={`/${lang}/account/orders/`}>{t.viewAll} →</a>
        </div>
        {data.orders.length ? (
          <ul class="order-list">
            {data.orders.map((o) => (
              <OrderRow lang={lang} o={o} />
            ))}
          </ul>
        ) : (
          <p class="muted">{t.noOrders}</p>
        )}
      </section>
      <section class="card">
        <div class="section-head">
          <h2 class="h-sub">{t.yourWishlist}</h2>
          <a href={`/${lang}/account/wishlist/`}>{t.viewAll} →</a>
        </div>
        {data.wishlist.length ? (
          <ul class="tiles">
            {data.wishlist.map((p) => (
              <ProductTile lang={lang} p={p} />
            ))}
          </ul>
        ) : (
          <p class="muted">{t.wishlistEmpty}</p>
        )}
      </section>
    </div>
  );
}

function Orders({ lang }: { lang: Locale }) {
  const t = shop[lang];
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  useEffect(() => {
    api<{ orders: OrderSummary[] }>('/account/orders').then((r) => setOrders(r.orders));
  }, []);
  if (!orders) return <Spinner label={t.loading} />;
  return orders.length ? (
    <ul class="order-list card">
      {orders.map((o) => (
        <OrderRow lang={lang} o={o} />
      ))}
    </ul>
  ) : (
    <p class="muted">{t.noOrders}</p>
  );
}

function OrderPage({ lang }: { lang: Locale }) {
  const t = shop[lang];
  const [order, setOrder] = useState<Order | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const n = new URLSearchParams(location.search).get('n') ?? '';
    api<Order>(`/account/orders/${encodeURIComponent(n)}`)
      .then(setOrder)
      .catch(() => setFailed(true));
  }, []);
  if (failed) return <Notice tone="error">{t.orderNotFound}</Notice>;
  if (!order) return <Spinner label={t.loading} />;
  return <OrderDetail lang={lang} order={order} />;
}

function Wishlist({ lang }: { lang: Locale }) {
  const t = shop[lang];
  const [products, setProducts] = useState<any[] | null>(null);
  useEffect(() => {
    api<{ products: any[] }>(`/account/wishlist?locale=${lang}`).then((r) => setProducts(r.products));
  }, []);
  if (!products) return <Spinner label={t.loading} />;
  return products.length ? (
    <ul class="tiles">
      {products.map((p) => (
        <ProductTile lang={lang} p={p} />
      ))}
    </ul>
  ) : (
    <p class="muted">{t.wishlistEmpty}</p>
  );
}

interface Address {
  id: number;
  fullName: string;
  phone: string | null;
  city: string;
  postalCode: string | null;
  line1: string;
  line2: string | null;
  isDefault: boolean;
}

function Addresses({ lang }: { lang: Locale }) {
  const t = shop[lang];
  const [list, setList] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  useEffect(() => {
    api<{ addresses: Address[] }>('/account/addresses').then((r) => setList(r.addresses));
  }, []);
  if (!list) return <Spinner label={t.loading} />;
  if (editing) {
    return <AddressForm lang={lang} address={editing === 'new' ? null : editing} onDone={(next) => (next && setList(next), setEditing(null))} />;
  }
  return (
    <div class="stack">
      {list.length === 0 && <p class="muted">{t.noAddresses}</p>}
      <ul class="address-list">
        {list.map((a) => (
          <li class="card">
            <p>
              <strong>{a.fullName}</strong> {a.isDefault && <span class="badge">{t.defaultAddress}</span>}
              <br />
              {a.line1}
              {a.line2 && `, ${a.line2}`}
              <br />
              {a.postalCode} {a.city}, {t.turkiye}
              {a.phone && (
                <>
                  <br />
                  {a.phone}
                </>
              )}
            </p>
            <div class="inline-actions">
              <button type="button" class="link-btn" onClick={() => setEditing(a)}>
                {t.edit}
              </button>
              <button type="button" class="link-btn" onClick={() => api<{ addresses: Address[] }>(`/account/addresses/${a.id}`, { method: 'DELETE' }).then((r) => setList(r.addresses))}>
                {t.delete}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div>
        <Button variant="secondary" onClick={() => setEditing('new')}>
          {t.addAddress}
        </Button>
      </div>
    </div>
  );
}

function AddressForm({ lang, address, onDone }: { lang: Locale; address: Address | null; onDone: (list: Address[] | null) => void }) {
  const t = shop[lang];
  const form = useForm(lang, {
    fullName: address?.fullName ?? '',
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    city: address?.city ?? '',
    postalCode: address?.postalCode ?? '',
    phone: address?.phone ?? '',
    isDefault: address?.isDefault ?? false,
  });
  return (
    <form
      class="stack card"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        form.submit(async () => {
          const body = { ...form.values, country: 'TR' };
          const r = address
            ? await api<{ addresses: Address[] }>(`/account/addresses/${address.id}`, { method: 'PATCH', body })
            : await api<{ addresses: Address[] }>('/account/addresses', { method: 'POST', body });
          onDone(r.addresses);
        });
      }}
    >
      <Field label={t.fullName} name="fullName" autoComplete="name" required value={form.values.fullName} onInput={form.set('fullName')} error={form.errors.fullName} />
      <Field label={t.line1} name="line1" autoComplete="address-line1" required value={form.values.line1} onInput={form.set('line1')} error={form.errors.line1} placeholder={t.line1Placeholder} />
      <Field label={t.line2Placeholder} name="line2" autoComplete="address-line2" value={form.values.line2} onInput={form.set('line2')} error={form.errors.line2} />
      <div class="grid-3">
        <Field label={t.city} name="city" autoComplete="address-level2" required value={form.values.city} onInput={form.set('city')} error={form.errors.city} />
        <Field label={t.postalCode} name="postalCode" autoComplete="postal-code" value={form.values.postalCode} onInput={form.set('postalCode')} error={form.errors.postalCode} />
        <Field label={t.phone} name="phone" type="tel" autoComplete="tel" value={form.values.phone} onInput={form.set('phone')} error={form.errors.phone} />
      </div>
      <Checkbox name="isDefault" label={t.makeDefault} checked={form.values.isDefault} onChange={form.set('isDefault')} />
      {form.formError && <Notice tone="error">{form.formError}</Notice>}
      <div class="form-actions form-actions--split">
        <Button variant="link" onClick={() => onDone(null)}>
          {t.cancel}
        </Button>
        <Button type="submit" busy={form.busy}>
          {t.save}
        </Button>
      </div>
    </form>
  );
}

function Profile({ lang, user }: { lang: Locale; user: User }) {
  const t = shop[lang];
  const [saved, setSaved] = useState(false);
  const profile = useForm(lang, { name: user.name, phone: user.phone ?? '', locale: user.locale, marketing: user.marketing });
  const password = useForm(lang, { currentPassword: '', newPassword: '' });
  const [pwSaved, setPwSaved] = useState(false);
  const removal = useForm(lang, { password: '' });

  return (
    <div class="stack-lg">
      <form
        class="stack card"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          profile.submit(async () => {
            const r = await api<{ user: User }>('/account', { method: 'PATCH', body: profile.values });
            updateSession({ user: r.user });
            rememberLanguage(r.user.locale);
            setSaved(true);
          });
        }}
      >
        <h2 class="h-sub">{t.profile}</h2>
        <p class="muted">{user.email}</p>
        <Field label={t.name} name="name" autoComplete="name" value={profile.values.name} onInput={profile.set('name')} error={profile.errors.name} />
        <Field label={t.phone} name="phone" type="tel" autoComplete="tel" value={profile.values.phone} onInput={profile.set('phone')} error={profile.errors.phone} />
        <div class="field">
          <label for="f-locale">{t.language}</label>
          <select id="f-locale" value={profile.values.locale} onChange={(e) => profile.set('locale')(e.currentTarget.value)}>
            {locales.map((l) => (
              <option value={l}>{localeNames[l]}</option>
            ))}
          </select>
        </div>
        <Checkbox name="marketing" label={t.marketingPref} checked={profile.values.marketing} onChange={profile.set('marketing')} />
        {profile.formError && <Notice tone="error">{profile.formError}</Notice>}
        {saved && <Notice tone="success">{t.saved}</Notice>}
        <div>
          <Button type="submit" busy={profile.busy}>
            {t.save}
          </Button>
        </div>
      </form>

      <form
        class="stack card"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setPwSaved(false);
          password.submit(
            async () => {
              await api('/account/password', { method: 'POST', body: password.values });
              password.setValues({ currentPassword: '', newPassword: '' });
              setPwSaved(true);
            },
            password.values.newPassword.length < 8 ? { newPassword: 'password_too_short' } : {},
          );
        }}
      >
        <h2 class="h-sub">{t.changePassword}</h2>
        <PasswordField label={t.currentPassword} name="currentPassword" autoComplete="current-password" value={password.values.currentPassword} onInput={password.set('currentPassword')} error={password.errors.currentPassword} showLabel={t.showPassword} hideLabel={t.hidePassword} />
        <PasswordField label={t.newPassword} name="newPassword" autoComplete="new-password" value={password.values.newPassword} onInput={password.set('newPassword')} error={password.errors.newPassword} placeholder={t.passwordHint} showLabel={t.showPassword} hideLabel={t.hidePassword} />
        {password.formError && <Notice tone="error">{password.formError}</Notice>}
        {pwSaved && <Notice tone="success">{t.saved}</Notice>}
        <div>
          <Button type="submit" busy={password.busy}>
            {t.savePassword}
          </Button>
        </div>
      </form>

      {user.role === 'customer' && (
        <form
          class="stack card card--danger"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            removal.submit(async () => {
              await api('/account', { method: 'DELETE', body: removal.values });
              location.href = `/${lang}/`;
            });
          }}
        >
          <h2 class="h-sub">{t.deleteAccount}</h2>
          <p class="muted">{t.deleteAccountBody}</p>
          <PasswordField label={t.password} name="deletePassword" autoComplete="current-password" value={removal.values.password} onInput={removal.set('password')} error={removal.errors.password} showLabel={t.showPassword} hideLabel={t.hidePassword} />
          {removal.formError && <Notice tone="error">{removal.formError}</Notice>}
          <div>
            <Button type="submit" variant="danger" busy={removal.busy}>
              {t.deleteConfirm}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
