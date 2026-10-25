import { useEffect, useState } from 'preact/hooks';
import { api, ApiError } from '../lib/api';
import { money } from '../lib/format';
import { currentCurrency, defaultCurrency, type Currency, type Prices } from '../lib/currency';
import { getSession, onSession, updateSession, type Session } from '../lib/session';
import { errorText, shop } from '../i18n/shop';
import type { Locale } from '../i18n/ui';
import { Button, Notice } from './ui';
import EnquiryForm from './EnquiryForm';

interface Variant {
  id?: number;
  sku: string;
  colour: string;
  size: string;
  available?: boolean;
}

interface Live {
  id: number;
  prices: Prices;
  variants: Required<Pick<Variant, 'id' | 'sku' | 'colour' | 'size' | 'available'>>[] & Variant[];
}

/** Size choice, add to bag, wishlist and enquiry on the product page. Static HTML shows the price before this loads. */
export default function ProductBuy(props: { lang: Locale; slug: string; prices: Prices; variants: Variant[] }) {
  const t = shop[props.lang];
  const [live, setLive] = useState<Live | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [asking, setAsking] = useState(false);
  const [currency, setCurrency] = useState<Currency>(defaultCurrency[props.lang]);

  useEffect(() => {
    setCurrency(currentCurrency(props.lang));
    api<Live>(`/catalog/${props.slug}?locale=${props.lang}`).then(setLive).catch(() => setLive(null));
    getSession().then(setSession).catch(() => {});
    return onSession(setSession);
  }, []);

  const variants: Variant[] = live?.variants ?? props.variants;
  const chosen = variants.find((v) => v.id === selected);
  const price = (live?.prices ?? props.prices)[currency];
  const soldOut = !!live && variants.every((v) => v.available === false);
  const inWishlist = !!live && !!session?.wishlist.includes(live.id);

  async function addToBag() {
    if (!chosen?.id) {
      setMessage({ tone: 'error', text: t.selectSize });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const cart = await api<{ count: number }>('/cart/items', { method: 'POST', body: { variantId: chosen.id, quantity: 1, locale: props.lang, currency } });
      updateSession({ cartCount: cart.count });
      setMessage({ tone: 'success', text: t.added });
    } catch (e) {
      setMessage({ tone: 'error', text: errorText(props.lang, e instanceof ApiError ? e.code : undefined) });
    } finally {
      setBusy(false);
    }
  }

  async function toggleWishlist() {
    if (!live) return;
    if (!session?.user) {
      location.href = `/${props.lang}/account/sign-in/?next=${encodeURIComponent(location.pathname)}`;
      return;
    }
    const res = inWishlist
      ? await api<{ ids: number[] }>(`/account/wishlist/${live.id}`, { method: 'DELETE' })
      : await api<{ ids: number[] }>('/account/wishlist', { method: 'POST', body: { productId: live.id } });
    updateSession({ wishlist: res.ids });
  }

  return (
    <div class="product-buy">
      <p class="product-buy__price">{money(price, props.lang, currency)}</p>

      <fieldset class="size-picker">
        <legend>{t.size}</legend>
        <div class="size-picker__options">
          {variants.map((v) => {
            const disabled = !v.id || v.available === false;
            return (
              <button
                type="button"
                class="size-chip"
                aria-pressed={selected === v.id}
                disabled={disabled}
                title={v.available === false ? t.soldOut : v.colour}
                onClick={() => {
                  setSelected(v.id ?? null);
                  setMessage(null);
                }}
              >
                {v.size}
                {v.available === false && <span class="visually-hidden"> — {t.soldOut}</span>}
              </button>
            );
          })}
        </div>
        {chosen && (
          <p class="size-picker__colour">
            {t.colour}: {chosen.colour}
          </p>
        )}
      </fieldset>

      <div class="product-buy__actions">
        <Button onClick={addToBag} busy={busy} disabled={!live || soldOut} full>
          {soldOut ? t.soldOut : busy ? t.adding : t.addToBag}
        </Button>
        <button
          type="button"
          class="icon-toggle"
          aria-pressed={inWishlist}
          onClick={toggleWishlist}
          disabled={!live}
          title={session?.user ? (inWishlist ? t.wishlistRemove : t.wishlistAdd) : t.wishlistSignIn}
        >
          <span class="visually-hidden">{inWishlist ? t.wishlistRemove : t.wishlistAdd}</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.4 4.5 4.5 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />
          </svg>
        </button>
      </div>

      {message && (
        <Notice tone={message.tone}>
          {message.text}
          {message.tone === 'success' && (
            <>
              {' '}
              <a href={`/${props.lang}/bag/`}>{t.viewBag}</a>
            </>
          )}
        </Notice>
      )}

      <div class="product-buy__ask">
        {asking ? (
          <>
            <h2 class="h-sub">{t.enquiryTitle}</h2>
            <EnquiryForm lang={props.lang} productId={live?.id} source="product" email={session?.user?.email} />
          </>
        ) : (
          <Button variant="link" onClick={() => setAsking(true)}>
            {t.askAbout}
          </Button>
        )}
      </div>
    </div>
  );
}
