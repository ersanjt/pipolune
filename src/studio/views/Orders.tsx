import { useEffect, useState } from 'preact/hooks';
import { api, ApiError } from '../../lib/api';
import { amount, Badge, dateTime, ErrorNote, Loading, PageHead, Pager, Panel, shortDate, useApi, type Ctx } from '../shared';
import type { Currency } from '../../lib/currency';

export interface OrderSummary {
  number: string;
  createdAt: string;
  email: string;
  name: string;
  status: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  currency: Currency;
  total: number;
  itemCount: number;
}

interface OrderFull {
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
  phone: string | null;
  address: { fullName: string; line1: string; line2: string | null; city: string; postalCode: string | null; country: string };
  carrier: string | null;
  trackingNumber: string | null;
  items: { sku: string; name: string; colour: string; size: string; image: string; unitPrice: number; quantity: number }[];
  events: { type: string; message: string; visibleToCustomer: boolean; author: string | null; createdAt: string }[];
  locale: string;
  note: string | null;
  marketing: boolean;
  hasAccount: boolean;
}

export function OrderTable({ ctx, orders }: { ctx: Ctx; orders: OrderSummary[] }) {
  const { t, lang } = ctx;
  if (!orders.length) return <p class="s-muted">{t.none}</p>;
  return (
    <table class="s-table">
      <thead>
        <tr>
          <th>{t.order}</th>
          <th>{t.date}</th>
          <th>{t.customer}</th>
          <th>{t.items}</th>
          <th>{t.total}</th>
          <th>{t.status}</th>
          <th>{t.delivery}</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr class="s-row-link" onClick={() => ctx.go(`/orders/${encodeURIComponent(o.number)}`)}>
            <td>
              <a href={`#/orders/${encodeURIComponent(o.number)}`}>{o.number}</a>
            </td>
            <td>{shortDate(o.createdAt, lang)}</td>
            <td>
              {o.name}
              <div class="s-muted">{o.email}</div>
            </td>
            <td>{o.itemCount}</td>
            <td>{amount(o.total, o.currency, lang)}</td>
            <td>
              <Badge value={o.status} label={t.orderStatus[o.status]} />
            </td>
            <td>
              <Badge value={o.fulfilmentStatus} label={t.fulfilmentStatus[o.fulfilmentStatus]} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Orders({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), ...(status && { status }), ...(query && { q: query }) });
  const { data, error } = useApi<{ total: number; pageSize: number; orders: OrderSummary[] }>(`/studio/orders?${params}`);

  return (
    <>
      <PageHead title={t.nav.orders}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(q.trim());
          }}
        >
          <input class="s-search" type="search" placeholder={t.search} value={q} onInput={(e) => setQ(e.currentTarget.value)} aria-label={t.search} />
        </form>
      </PageHead>
      <div class="s-tabs" role="tablist">
        {['', ...Object.keys(t.orderStatus)].map((s) => (
          <button
            type="button"
            role="tab"
            aria-selected={status === s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {s ? t.orderStatus[s] : t.all}
          </button>
        ))}
      </div>
      <Panel>
        {error ? <ErrorNote ctx={ctx} /> : !data ? <Loading ctx={ctx} /> : <OrderTable ctx={ctx} orders={data.orders} />}
        {data && <Pager ctx={ctx} page={page} total={data.total} size={data.pageSize} onPage={setPage} />}
      </Panel>
    </>
  );
}

export function OrderPage({ ctx, number }: { ctx: Ctx; number: string }) {
  const { t, lang } = ctx;
  const [order, setOrder] = useState<OrderFull | null>(null);
  const [form, setForm] = useState({ status: '', paymentStatus: '', fulfilmentStatus: '', carrier: '', trackingNumber: '', note: '', notifyCustomer: true });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = (o: OrderFull) => {
    setOrder(o);
    setForm({ status: o.status, paymentStatus: o.paymentStatus, fulfilmentStatus: o.fulfilmentStatus, carrier: o.carrier ?? '', trackingNumber: o.trackingNumber ?? '', note: '', notifyCustomer: true });
  };

  useEffect(() => {
    api<OrderFull>(`/studio/orders/${encodeURIComponent(number)}`).then(load).catch(() => setMessage({ ok: false, text: t.error }));
  }, [number]);

  if (!order) return message ? <ErrorNote ctx={ctx} /> : <Loading ctx={ctx} />;

  async function save(e: Event) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      load(await api<OrderFull>(`/studio/orders/${encodeURIComponent(number)}`, { method: 'PATCH', body: form }));
      setMessage({ ok: true, text: t.saved });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError && err.message ? err.message : t.error });
    } finally {
      setBusy(false);
    }
  }

  const select = (key: 'status' | 'paymentStatus' | 'fulfilmentStatus', options: Record<string, string>) => (
    <select value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.currentTarget.value })}>
      {Object.entries(options).map(([k, v]) => (
        <option value={k}>{v}</option>
      ))}
    </select>
  );

  return (
    <>
      <PageHead title={`${t.order} ${order.number}`} subtitle={dateTime(order.createdAt, lang)}>
        <a class="s-btn s-btn--ghost" href="#/orders">
          ← {t.nav.orders}
        </a>
      </PageHead>
      <div class="s-alerts">
        <Badge value={order.status} label={t.orderStatus[order.status]} />
        <Badge value={order.paymentStatus} label={`${t.payment}: ${t.paymentStatus[order.paymentStatus]}`} />
        <Badge value={order.fulfilmentStatus} label={`${t.delivery}: ${t.fulfilmentStatus[order.fulfilmentStatus]}`} />
      </div>
      <div class="s-grid s-grid--2-1">
        <div class="s-stack">
          <Panel title={t.items}>
            <table class="s-table">
              <tbody>
                {order.items.map((i) => (
                  <tr>
                    <td>
                      <img class="s-thumb" src={i.image} alt="" width="48" height="48" />
                    </td>
                    <td>
                      {i.name}
                      <div class="s-muted">
                        {i.sku} · {i.colour} · {i.size}
                      </div>
                    </td>
                    <td>× {i.quantity}</td>
                    <td>{amount(i.unitPrice * i.quantity, order.currency, lang)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>{t.delivery}</td>
                  <td>{order.shipping === null ? '—' : amount(order.shipping, order.currency, lang)}</td>
                </tr>
                <tr>
                  <th colSpan={3}>{t.total}</th>
                  <th>{amount(order.total, order.currency, lang)}</th>
                </tr>
              </tfoot>
            </table>
          </Panel>
          <Panel title={t.timeline}>
            <ol class="s-timeline">
              {[...order.events].reverse().map((e) => (
                <li class={e.visibleToCustomer ? '' : 's-timeline--internal'}>
                  <span class="s-muted">
                    {dateTime(e.createdAt, lang)}
                    {e.author ? ` · ${e.author}` : ''}
                  </span>
                  <span>{e.message}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
        <div class="s-stack">
          <Panel title={t.customer}>
            <p>
              <a href={`#/customers/${encodeURIComponent(order.email)}`}>{order.address.fullName}</a>
              <br />
              <a href={`mailto:${order.email}`}>{order.email}</a>
              {order.phone && (
                <>
                  <br />
                  <a href={`tel:${order.phone}`}>{order.phone}</a>
                </>
              )}
            </p>
            <p class="s-muted">
              {order.locale.toUpperCase()} · {t.account}: {order.hasAccount ? t.yes : t.no} · {t.marketing}: {order.marketing ? t.yes : t.no}
            </p>
            <h3>{t.shippingAddress}</h3>
            <address>
              {order.address.line1}
              {order.address.line2 && (
                <>
                  <br />
                  {order.address.line2}
                </>
              )}
              <br />
              {order.address.postalCode} {order.address.city}, {order.address.country}
            </address>
            {order.note && (
              <>
                <h3>{t.customerNote}</h3>
                <p>{order.note}</p>
              </>
            )}
          </Panel>
          <Panel title={t.edit}>
            <form class="s-stack" onSubmit={save}>
              <label>
                {t.status}
                {select('status', t.orderStatus)}
              </label>
              <p class="s-muted">{t.confirmHint}</p>
              <label>
                {t.payment}
                {select('paymentStatus', t.paymentStatus)}
              </label>
              <label>
                {t.delivery}
                {select('fulfilmentStatus', t.fulfilmentStatus)}
              </label>
              <label>
                {t.carrier}
                <input value={form.carrier} onInput={(e) => setForm({ ...form, carrier: e.currentTarget.value })} />
              </label>
              <label>
                {t.tracking}
                <input value={form.trackingNumber} onInput={(e) => setForm({ ...form, trackingNumber: e.currentTarget.value })} />
              </label>
              <label>
                {t.internalNote}
                <textarea rows={3} value={form.note} onInput={(e) => setForm({ ...form, note: e.currentTarget.value })} />
              </label>
              <label class="s-check">
                <input type="checkbox" checked={form.notifyCustomer} onChange={(e) => setForm({ ...form, notifyCustomer: e.currentTarget.checked })} />
                {t.notifyCustomer}
              </label>
              {message && <p class={message.ok ? 's-success' : 's-error'}>{message.text}</p>}
              <button class="s-btn" type="submit" disabled={busy}>
                {t.save}
              </button>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
