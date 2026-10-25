import { useEffect, useState } from 'preact/hooks';
import { api, ApiError } from '../lib/api';
import { money, plural } from '../lib/format';
import { getSession, updateSession, type Session } from '../lib/session';
import { errorText, shop } from '../i18n/shop';
import type { Locale } from '../i18n/ui';
import { Button, Notice, Spinner } from './ui';
import EnquiryForm from './EnquiryForm';

export interface CartItem {
  variantId: number;
  slug: string;
  name: string;
  subtitle: string;
  image: string;
  colour: string;
  size: string;
  quantity: number;
  unitPrice: number;
  available: boolean;
}

export interface CartView {
  items: CartItem[];
  count: number;
  subtotal: number;
  ready: boolean;
}

/** Board 04 "Your Bag". */
export default function Bag({ lang }: { lang: Locale }) {
  const t = shop[lang];
  const [cart, setCart] = useState<CartView | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    api<CartView>(`/cart?locale=${lang}`).then(setCart).catch((e) => setError(errorText(lang, e.code)));
    getSession().then(setSession).catch(() => {});
  }, []);

  useEffect(() => {
    const heading = document.querySelector('[data-bag-count]');
    if (heading && cart) heading.textContent = plural(cart.count, lang, t.bagItems);
  }, [cart]);

  async function change(item: CartItem, quantity: number) {
    setError('');
    try {
      const next =
        quantity <= 0
          ? await api<CartView>(`/cart/items/${item.variantId}?locale=${lang}`, { method: 'DELETE' })
          : await api<CartView>(`/cart/items/${item.variantId}`, { method: 'PATCH', body: { quantity, locale: lang } });
      setCart(next);
      updateSession({ cartCount: next.count });
    } catch (e) {
      setError(errorText(lang, e instanceof ApiError ? e.code : undefined));
    }
  }

  if (!cart) return error ? <Notice tone="error">{error}</Notice> : <Spinner label={t.loading} />;

  if (!cart.items.length) {
    return (
      <div class="empty-state">
        <p>{t.bagEmpty}</p>
        <Button href={`/${lang}/shop/`} arrow>
          {t.continueShopping}
        </Button>
      </div>
    );
  }

  const salesOpen = session?.settings.salesMode === 'request' || session?.settings.salesMode === 'live';
  const enquiryText = cart.items.map((i) => `${i.name} — ${i.colour}, ${i.size} × ${i.quantity}`).join('\n');

  return (
    <div class="bag">
      <ul class="bag__items">
        {cart.items.map((item) => (
          <li class="bag-item">
            <a class="bag-item__photo" href={`/${lang}/shop/${item.slug}/`}>
              <img src={item.image} alt="" width="120" height="120" loading="lazy" />
            </a>
            <div class="bag-item__info">
              <a class="bag-item__name" href={`/${lang}/shop/${item.slug}/`}>
                {item.name}
              </a>
              <p class="muted">
                {item.subtitle} · {item.colour} · {item.size}
              </p>
              <p>{money(item.unitPrice, lang)}</p>
              {!item.available && <p class="field__error">{t.unavailable}</p>}
              <div class="qty" role="group" aria-label={t.quantity}>
                <button type="button" onClick={() => change(item, item.quantity - 1)} aria-label={t.decrease}>
                  −
                </button>
                <output aria-live="polite">{item.quantity}</output>
                <button type="button" onClick={() => change(item, item.quantity + 1)} aria-label={t.increase}>
                  +
                </button>
              </div>
            </div>
            <button type="button" class="bag-item__remove" onClick={() => change(item, 0)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
                <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />
              </svg>
              <span class="visually-hidden">
                {t.remove} {item.name}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <aside class="bag__summary card">
        <div class="summary-row summary-row--strong">
          <span>{t.estimatedSubtotal}</span>
          <span>{money(cart.subtotal, lang)}</span>
        </div>
        <p class="muted">{t.deliveryNextStep}</p>
        {error && <Notice tone="error">{error}</Notice>}
        {salesOpen ? (
          <Button href={cart.ready ? `/${lang}/checkout/` : undefined} disabled={!cart.ready} arrow full>
            {t.toCheckout}
          </Button>
        ) : (
          <Notice tone="info" title={t.salesClosedTitle}>
            <p>{t.salesClosedBody}</p>
            {asking ? (
              <EnquiryForm lang={lang} source="bag" defaultMessage={enquiryText} email={session?.user?.email} />
            ) : (
              <Button variant="secondary" onClick={() => setAsking(true)}>
                {t.bagEnquiry}
              </Button>
            )}
          </Notice>
        )}
      </aside>

      <a class="back-link" href={`/${lang}/shop/`}>
        ← {t.continueShopping}
      </a>
    </div>
  );
}
