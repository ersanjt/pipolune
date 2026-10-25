import { useEffect, useState } from 'preact/hooks';
import { api } from '../lib/api';
import { money } from '../lib/format';
import { currentCurrency } from '../lib/currency';
import { getSession, updateSession, type Session } from '../lib/session';
import { errorText, shop } from '../i18n/shop';
import { checkoutDocuments, legal } from '../i18n/legal';
import type { Locale } from '../i18n/ui';
import { Button, Checkbox, Field, Notice, Spinner, useForm } from './ui';
import type { CartView } from './Bag';

type Step = 1 | 2 | 3;

/** Board 04 checkout: address → delivery → review. Sends an order request; payment is a separate, later step. */
export default function Checkout({ lang }: { lang: Locale }) {
  const t = shop[lang];
  const [cart, setCart] = useState<CartView | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [loadError, setLoadError] = useState('');
  const form = useForm(lang, {
    email: '',
    fullName: '',
    country: 'TR',
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    phone: '',
    note: '',
    marketing: false,
    acceptLegal: false,
  });

  const currency = currentCurrency(lang);

  useEffect(() => {
    Promise.all([api<CartView>(`/cart?locale=${lang}&currency=${currency}`), getSession()])
      .then(async ([c, s]) => {
        setCart(c);
        setSession(s);
        if (s.user) {
          form.setValues((v) => ({ ...v, email: s.user!.email, fullName: s.user!.name, phone: s.user!.phone ?? '' }));
          const { addresses } = await api<{ addresses: any[] }>('/account/addresses');
          const a = addresses.find((x) => x.isDefault) ?? addresses[0];
          if (a) form.setValues((v) => ({ ...v, fullName: a.fullName, line1: a.line1, line2: a.line2 ?? '', city: a.city, postalCode: a.postalCode ?? '', phone: a.phone ?? v.phone }));
        }
      })
      .catch((e) => setLoadError(errorText(lang, e.code)));
  }, []);

  useEffect(() => {
    document.querySelectorAll('[data-step]').forEach((el) => {
      const n = Number((el as HTMLElement).dataset.step);
      el.setAttribute('data-state', n < step ? 'done' : n === step ? 'current' : 'todo');
      if (n === step) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
  }, [step]);

  if (loadError) return <Notice tone="error">{loadError}</Notice>;
  if (!cart || !session) return <Spinner label={t.loading} />;
  if (session.settings.salesMode === 'off') {
    return (
      <Notice tone="info" title={t.salesClosedTitle}>
        <p>{t.salesClosedBody}</p>
        <p>
          <a href={`/${lang}/bag/`}>{t.bagTitle}</a>
        </p>
      </Notice>
    );
  }
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

  const v = form.values;
  const shipping = session.settings.shippingStandard[cart.currency] ?? null;
  const price = (minor: number) => money(minor, lang, cart.currency);

  function requireAddress(): Record<string, string> {
    const missing: Record<string, string> = {};
    if (!session!.user && !/^\S+@\S+\.\S+$/.test(v.email)) missing.email = v.email ? 'invalid_email' : 'required';
    for (const key of ['fullName', 'line1', 'city'] as const) if (!v[key].trim()) missing[key] = 'required';
    return missing;
  }

  async function placeRequest() {
    await form.submit(async () => {
      const res = await api<{ number: string; token: string }>('/checkout', {
        method: 'POST',
        body: { ...v, locale: lang, currency: cart!.currency },
      });
      updateSession({ cartCount: 0 });
      location.href = `/${lang}/order/?n=${encodeURIComponent(res.number)}&t=${encodeURIComponent(res.token)}&new=1`;
    }, v.acceptLegal ? {} : { acceptLegal: 'legal_required' });
  }

  const summary = (
    <aside class="checkout__summary card">
      <h2 class="h-sub">{t.orderSummary}</h2>
      <ul class="mini-items">
        {cart.items.map((i) => (
          <li>
            <img src={i.image} alt="" width="64" height="64" loading="lazy" />
            <div>
              <p class="mini-items__name">{i.name}</p>
              <p class="muted">
                {i.colour} · {i.size} · {t.qty} {i.quantity}
              </p>
            </div>
            <span>{price(i.unitPrice * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <div class="summary-row">
        <span>{t.subtotal}</span>
        <span>{price(cart.subtotal)}</span>
      </div>
      <div class="summary-row">
        <span>{t.delivery}</span>
        <span>{shipping === null ? t.toBeConfirmed : price(shipping)}</span>
      </div>
      <div class="summary-row summary-row--total">
        <span>{t.total}</span>
        <span>{price(cart.subtotal + (shipping ?? 0))}</span>
      </div>
    </aside>
  );

  return (
    <div class="checkout">
      <div class="checkout__main">
        {step === 1 && (
          <form
            class="stack"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              form.submit(async () => setStep(2), requireAddress());
            }}
          >
            <div class="section-head">
              <h2 class="h-sub">{t.contactInfo}</h2>
              {!session.user && (
                <a href={`/${lang}/account/sign-in/?next=${encodeURIComponent(`/${lang}/checkout/`)}`}>
                  {t.haveAccount} {t.signIn}
                </a>
              )}
            </div>
            {session.user ? (
              <p class="muted">{session.user.email}</p>
            ) : (
              <Field label={t.email} name="email" type="email" autoComplete="email" required value={v.email} onInput={form.set('email')} error={form.errors.email} placeholder={t.emailPlaceholder} />
            )}
            <h2 class="h-sub">{t.shippingAddress}</h2>
            <div class="grid-2">
              <Field label={t.fullName} name="fullName" autoComplete="name" required value={v.fullName} onInput={form.set('fullName')} error={form.errors.fullName} />
              <div class="field">
                <label for="f-country">{t.country}</label>
                <select id="f-country" name="country" value={v.country} onChange={(e) => form.set('country')(e.currentTarget.value)}>
                  <option value="TR">{t.turkiye}</option>
                </select>
              </div>
            </div>
            <div class="grid-2">
              <Field label={t.line1} name="line1" autoComplete="address-line1" required value={v.line1} onInput={form.set('line1')} error={form.errors.line1} placeholder={t.line1Placeholder} />
              <Field label={'\u00a0'} name="line2" autoComplete="address-line2" value={v.line2} onInput={form.set('line2')} error={form.errors.line2} placeholder={t.line2Placeholder} />
            </div>
            <div class="grid-3">
              <Field label={t.city} name="city" autoComplete="address-level2" required value={v.city} onInput={form.set('city')} error={form.errors.city} />
              <Field label={t.postalCode} name="postalCode" autoComplete="postal-code" value={v.postalCode} onInput={form.set('postalCode')} error={form.errors.postalCode} />
              <Field label={t.phoneOptional} name="phone" type="tel" autoComplete="tel" value={v.phone} onInput={form.set('phone')} error={form.errors.phone} />
            </div>
            <Checkbox name="marketing" label={t.marketingOptIn} checked={v.marketing} onChange={form.set('marketing')} />
            <div class="form-actions">
              <Button type="submit" arrow>
                {t.continueToDelivery}
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div class="stack">
            <h2 class="h-sub">{t.deliveryTitle}</h2>
            <label class="choice-card">
              <input type="radio" name="delivery" checked readOnly />
              <span>
                <strong>{t.deliveryStandard}</strong>
                <span class="muted">{shipping === null ? t.deliveryConfirmed : price(shipping)}</span>
              </span>
            </label>
            <Field label={t.noteOptional} name="note" multiline value={v.note} onInput={form.set('note')} error={form.errors.note} />
            <div class="form-actions form-actions--split">
              <Button variant="link" onClick={() => setStep(1)}>
                ← {t.back}
              </Button>
              <Button onClick={() => setStep(3)} arrow>
                {t.continueToReview}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div class="stack">
            <h2 class="h-sub">{t.reviewTitle}</h2>
            <div class="card review-block">
              <div>
                <p class="muted">{t.shippingAddress}</p>
                <p>
                  {v.fullName}
                  <br />
                  {v.line1}
                  {v.line2 && (
                    <>
                      <br />
                      {v.line2}
                    </>
                  )}
                  <br />
                  {v.postalCode} {v.city}, {t.turkiye}
                </p>
                <p class="muted">{session.user?.email ?? v.email}</p>
              </div>
              <Button variant="link" onClick={() => setStep(1)}>
                {t.edit}
              </Button>
            </div>
            <Notice tone="info">{t.noPaymentNote}</Notice>
            <section class="legal-panel" aria-labelledby="legal-title">
              <h2 class="h-sub" id="legal-title">{t.legalTitle}</h2>
              <p>{t.legalLead}</p>
              <ul>
                {checkoutDocuments.map((slug) => (
                  <li>
                    <a href={`/${lang}/legal/${slug}/`} target="_blank" rel="noopener noreferrer">
                      {legal[lang].documents[slug].title}
                    </a>
                  </li>
                ))}
              </ul>
              <Checkbox
                name="acceptLegal"
                label={t.legalAccept}
                checked={v.acceptLegal}
                invalid={Boolean(form.errors.acceptLegal)}
                onChange={form.set('acceptLegal')}
              />
              {form.errors.acceptLegal && <p class="field__error">{form.errors.acceptLegal}</p>}
            </section>
            {form.formError && <Notice tone="error">{form.formError}</Notice>}
            {Object.entries(form.errors).some(([key]) => key !== 'acceptLegal') && (
              <Notice tone="error">{Object.entries(form.errors).find(([key]) => key !== 'acceptLegal')?.[1]}</Notice>
            )}
            <div class="form-actions form-actions--split">
              <Button variant="link" onClick={() => setStep(2)}>
                ← {t.back}
              </Button>
              <Button onClick={placeRequest} busy={form.busy} arrow>
                {form.busy ? t.sending : t.sendRequest}
              </Button>
            </div>
          </div>
        )}
      </div>
      {summary}
    </div>
  );
}
