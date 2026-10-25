import { money, date, dateTime } from '../lib/format';
import type { Currency } from '../lib/currency';
import { shop } from '../i18n/shop';
import type { Locale } from '../i18n/ui';

export interface Order {
  number: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  currency: Currency;
  subtotal: number;
  shipping: number | null;
  total: number;
  email: string;
  address: { fullName: string; line1: string; line2: string | null; city: string; postalCode: string | null; country: string };
  carrier: string | null;
  trackingNumber: string | null;
  items: { sku: string; name: string; colour: string; size: string; image: string; unitPrice: number; quantity: number }[];
  events: { type: string; message: string; createdAt: string }[];
}

/** Order card from board 04: number, date, items, totals, and payment/delivery as separate statuses. */
export default function OrderDetail({ lang, order }: { lang: Locale; order: Order }) {
  const t = shop[lang];
  const price = (minor: number) => money(minor, lang, order.currency);
  return (
    <div class="order-detail">
      <div class="order-detail__head card">
        <div>
          <p class="muted">{t.order}</p>
          <p class="order-detail__number">{order.number}</p>
          <p class="muted">
            {t.placedOn}: {date(order.createdAt, lang)}
          </p>
        </div>
        <dl class="status-list">
          <div>
            <dt>{t.order}</dt>
            <dd>
              <span class={`badge badge--${order.status}`}>{t.orderStatus[order.status] ?? order.status}</span>
            </dd>
          </div>
          <div>
            <dt>{t.paymentLabel}</dt>
            <dd>
              <span class={`badge badge--${order.paymentStatus}`}>{t.paymentStatus[order.paymentStatus] ?? order.paymentStatus}</span>
            </dd>
          </div>
          <div>
            <dt>{t.deliveryLabel}</dt>
            <dd>
              <span class={`badge badge--${order.fulfilmentStatus}`}>{t.fulfilmentStatus[order.fulfilmentStatus] ?? order.fulfilmentStatus}</span>
            </dd>
          </div>
        </dl>
      </div>

      {order.trackingNumber && (
        <p class="card">
          {t.tracking}: <strong>{[order.carrier, order.trackingNumber].filter(Boolean).join(' ')}</strong>
        </p>
      )}

      <div class="order-detail__body">
        <section class="card">
          <h2 class="h-sub">{t.orderSummary}</h2>
          <ul class="mini-items">
            {order.items.map((i) => (
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
            <span>{price(order.subtotal)}</span>
          </div>
          <div class="summary-row">
            <span>{t.delivery}</span>
            <span>{order.shipping === null ? t.toBeConfirmed : price(order.shipping)}</span>
          </div>
          <div class="summary-row summary-row--total">
            <span>{t.total}</span>
            <span>{price(order.total)}</span>
          </div>
        </section>

        <section class="card">
          <h2 class="h-sub">{t.shippingAddress}</h2>
          <p>
            {order.address.fullName}
            <br />
            {order.address.line1}
            {order.address.line2 && (
              <>
                <br />
                {order.address.line2}
              </>
            )}
            <br />
            {order.address.postalCode} {order.address.city}, {t.turkiye}
          </p>
          <p class="muted">{order.email}</p>
          {order.events.length > 0 && (
            <>
              <h2 class="h-sub">{t.history}</h2>
              <ol class="timeline">
                {order.events.map((e) => (
                  <li>
                    <span class="muted">{dateTime(e.createdAt, lang)}</span>
                    <span>{eventLabel(e, lang)}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function eventLabel(e: { type: string; message: string }, lang: Locale): string {
  const t = shop[lang];
  if (e.type === 'requested') return t.orderStatus.requested;
  const to = e.message.split('→').pop()?.trim() ?? '';
  if (e.type === 'status') return t.orderStatus[to] ?? to;
  if (e.type === 'fulfilment_status') return t.fulfilmentStatus[to] ?? to;
  return e.message;
}
