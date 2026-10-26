import { useEffect, useState } from 'preact/hooks';
import { api, ApiError } from '../lib/api';
import { money } from '../lib/format';
import { currentCurrency, defaultCurrency, type Currency, type Prices } from '../lib/currency';
import { getSession, onSession, updateSession, type Session } from '../lib/session';
import { errorText, shop } from '../i18n/shop';
import type { Locale } from '../i18n/ui';
import { isSaved, toggleGuest, toggleSaved } from '../lib/wishlist';
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

/** Colour, size, add to bag, wishlist and enquiry. Static HTML shows the price before this loads. */
export default function ProductBuy(props: { lang: Locale; slug: string; prices: Prices; variants: Variant[]; sizeGuideHref: string }) {
  const t = shop[props.lang];
  const [live, setLive] = useState<Live | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [asking, setAsking] = useState(false);
  const [currency, setCurrency] = useState<Currency>(defaultCurrency[props.lang]);
  const [colour, setColour] = useState(props.variants.find((v) => v.colour)?.colour ?? '');
  const [guestSaved, setGuestSaved] = useState(false);

  useEffect(() => {
    setCurrency(currentCurrency(props.lang));
    api<Live>(`/catalog/${props.slug}?locale=${props.lang}`).then(setLive).catch(() => setLive(null));
    getSession().then(setSession).catch(() => {});
    const syncGuest = () => setGuestSaved(isSaved(props.slug, null, null));
    syncGuest();
    window.addEventListener('pl:wishlist', syncGuest);
    return () => {
      window.removeEventListener('pl:wishlist', syncGuest);
    };
  }, []);

  useEffect(() => onSession(setSession), []);

  const variants: Variant[] = live?.variants ?? props.variants;
  const colours = [...new Set(variants.map((v) => v.colour).filter(Boolean))];
  const activeColour = colours.includes(colour) ? colour : (colours[0] ?? '');
  const sizes = variants.filter((v) => !activeColour || v.colour === activeColour);
  const chosen = sizes.find((v) => v.id === selected);
  const price = (live?.prices ?? props.prices)[currency];
  const soldOut = !!live && sizes.every((v) => v.available === false);
  const inWishlist = session?.user && live ? session.wishlist.includes(live.id) : guestSaved;

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
    if (session?.user) {
      if (!live) return;
      await toggleSaved(props.slug, live.id);
      return;
    }
    toggleGuest(props.slug);
  }

  return (
    <div class="product-buy">
      <p class="product-buy__price">{money(price, props.lang, currency)}</p>

      {colours.length > 0 && (
        <fieldset class="colour-picker">
          <legend>{t.colour}</legend>
          <div class="colour-picker__options">
            {colours.map((name) => (
              <button
                type="button"
                class="colour-swatch pl-swatch"
                data-colour={name}
                aria-pressed={activeColour === name}
                title={t.colours[name] ?? name}
                onClick={() => {
                  setColour(name);
                  setSelected(null);
                  setMessage(null);
                }}
              >
                <span class="visually-hidden">{t.colours[name] ?? name}</span>
              </button>
            ))}
          </div>
          <p class="colour-picker__name">{t.colours[activeColour] ?? activeColour}</p>
        </fieldset>
      )}

      <fieldset class="size-picker">
        <legend class="visually-hidden">{t.size}</legend>
        <div class="size-picker__head">
          <span>{t.size}</span>
          <a href={props.sizeGuideHref}>{t.sizeGuide}</a>
        </div>
        <div class="size-picker__options">
          {sizes.map((v) => {
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
          title={inWishlist ? t.wishlistRemove : t.wishlistAdd}
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
