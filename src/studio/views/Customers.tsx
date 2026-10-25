import { useState } from 'preact/hooks';
import { api } from '../../lib/api';
import { amounts, Badge, can, dateTime, ErrorNote, Loading, PageHead, Pager, Panel, shortDate, useApi, type Ctx } from '../shared';
import type { Currency } from '../../lib/currency';
import { OrderTable, type OrderSummary } from './Orders';

interface Customer {
  email: string;
  name: string;
  hasAccount: boolean;
  emailVerified: boolean;
  marketing: boolean;
  orderCount: number;
  spent: Partial<Record<Currency, number>>;
  lastOrderAt: string | null;
  leadCount: number;
  firstSeen: string;
}

interface Lead {
  id: number;
  email: string;
  name: string;
  product: string | null;
  locale: string;
  country: string | null;
  source: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function Customers({ ctx }: { ctx: Ctx }) {
  const { t, lang } = ctx;
  const [segment, setSegment] = useState('all');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), segment, ...(query && { q: query }) });
  const { data, error } = useApi<{ total: number; pageSize: number; customers: Customer[] }>(`/studio/customers?${params}`);

  return (
    <>
      <PageHead title={t.nav.customers}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(q.trim());
          }}
        >
          <input class="s-search" type="search" placeholder={t.search} value={q} onInput={(e) => setQ(e.currentTarget.value)} aria-label={t.search} />
        </form>
        {can.owner(ctx.me) && (
          <a class="s-btn s-btn--ghost" href="/api/studio/customers/export" download>
            {t.exportCsv}
          </a>
        )}
      </PageHead>
      <div class="s-tabs" role="tablist">
        {Object.entries(t.segments).map(([key, label]) => (
          <button
            type="button"
            role="tab"
            aria-selected={segment === key}
            onClick={() => {
              setSegment(key);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <Panel>
        {error ? (
          <ErrorNote ctx={ctx} />
        ) : !data ? (
          <Loading ctx={ctx} />
        ) : !data.customers.length ? (
          <p class="s-muted">{t.none}</p>
        ) : (
          <table class="s-table">
            <thead>
              <tr>
                <th>{t.customer}</th>
                <th>{t.account}</th>
                <th>{t.ordersCount}</th>
                <th>{t.spent}</th>
                <th>{t.lastOrder}</th>
                <th>{t.enquiries}</th>
                <th>{t.marketing}</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map((c) => (
                <tr class="s-row-link" onClick={() => ctx.go(`/customers/${encodeURIComponent(c.email)}`)}>
                  <td>
                    <a href={`#/customers/${encodeURIComponent(c.email)}`}>{c.name || c.email}</a>
                    {c.name && <div class="s-muted">{c.email}</div>}
                  </td>
                  <td>{c.hasAccount ? t.yes : '—'}</td>
                  <td>{c.orderCount}</td>
                  <td>{amounts(c.spent, lang)}</td>
                  <td>{shortDate(c.lastOrderAt, lang)}</td>
                  <td>{c.leadCount || '—'}</td>
                  <td>{c.marketing ? '✓' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && <Pager ctx={ctx} page={page} total={data.total} size={data.pageSize} onPage={setPage} />}
      </Panel>
    </>
  );
}

interface Detail {
  customer: Customer;
  account: { locale: string; phone: string | null; emailVerified: boolean } | null;
  addresses: { id: number; fullName: string; line1: string; line2: string | null; city: string; postalCode: string | null; isDefault: boolean }[];
  orders: OrderSummary[];
  leads: Lead[];
  notes: { id: number; body: string; author: string | null; createdAt: string }[];
}

export function CustomerPage({ ctx, email }: { ctx: Ctx; email: string }) {
  const { t, lang } = ctx;
  const { data, setData, error } = useApi<Detail>(`/studio/customers/${encodeURIComponent(email)}`);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (error) return <ErrorNote ctx={ctx} />;
  if (!data) return <Loading ctx={ctx} />;
  const c = data.customer;

  async function addNote(e: Event) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try {
      setData(await api<Detail>(`/studio/customers/${encodeURIComponent(email)}/notes`, { method: 'POST', body: { body: note } }));
      setNote('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title={c.name || c.email} subtitle={c.name ? c.email : undefined}>
        <a class="s-btn s-btn--ghost" href="#/customers">
          ← {t.nav.customers}
        </a>
        <a class="s-btn" href={`mailto:${c.email}`}>
          {t.email}
        </a>
      </PageHead>
      <div class="s-stats">
        <div class="s-stat">
          <span class="s-muted">{t.ordersCount}</span>
          <strong>{c.orderCount}</strong>
        </div>
        <div class="s-stat">
          <span class="s-muted">{t.spent}</span>
          <strong>{amounts(c.spent, lang)}</strong>
        </div>
        <div class="s-stat">
          <span class="s-muted">{t.lastOrder}</span>
          <strong class="s-stat--small">{shortDate(c.lastOrderAt, lang)}</strong>
        </div>
        <div class="s-stat">
          <span class="s-muted">{t.firstSeen}</span>
          <strong class="s-stat--small">{shortDate(c.firstSeen, lang)}</strong>
        </div>
      </div>
      <div class="s-grid s-grid--2-1">
        <div class="s-stack">
          <Panel title={t.nav.orders}>
            <OrderTable ctx={ctx} orders={data.orders} />
          </Panel>
          <Panel title={t.enquiries}>
            {data.leads.length ? <LeadList ctx={ctx} leads={data.leads} compact /> : <p class="s-muted">{t.none}</p>}
          </Panel>
        </div>
        <div class="s-stack">
          <Panel title={t.account}>
            <p>
              {data.account ? `${t.yes} · ${data.account.locale.toUpperCase()}` : t.no}
              {data.account?.phone && (
                <>
                  <br />
                  {data.account.phone}
                </>
              )}
            </p>
            <p class="s-muted">
              {t.marketing}: {c.marketing ? t.yes : t.no}
            </p>
            {data.addresses.map((a) => (
              <address class="s-address">
                {a.fullName}
                <br />
                {a.line1}
                {a.line2 && <>, {a.line2}</>}
                <br />
                {a.postalCode} {a.city}
              </address>
            ))}
          </Panel>
          <Panel title={t.notes}>
            <form class="s-stack" onSubmit={addNote}>
              <textarea rows={3} placeholder={t.notePlaceholder} value={note} onInput={(e) => setNote(e.currentTarget.value)} aria-label={t.addNote} />
              <button class="s-btn" type="submit" disabled={busy || !note.trim()}>
                {t.addNote}
              </button>
            </form>
            <ol class="s-timeline">
              {data.notes.map((n) => (
                <li>
                  <span class="s-muted">
                    {dateTime(n.createdAt, lang)}
                    {n.author ? ` · ${n.author}` : ''}
                  </span>
                  <span class="s-pre">{n.body}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}

function LeadList({ ctx, leads, compact, onStatus }: { ctx: Ctx; leads: Lead[]; compact?: boolean; onStatus?: (lead: Lead, status: string) => void }) {
  const { t, lang } = ctx;
  return (
    <ul class="s-leads">
      {leads.map((l) => (
        <li>
          <div class="s-leads__head">
            <span>
              {!compact && (
                <>
                  <a href={`#/customers/${encodeURIComponent(l.email)}`}>{l.name || l.email}</a>
                  {' · '}
                </>
              )}
              <span class="s-muted">
                {dateTime(l.createdAt, lang)} · {l.locale.toUpperCase()}
                {l.country ? ` · ${l.country}` : ''}
                {l.product ? ` · ${l.product}` : ''}
              </span>
            </span>
            {onStatus ? (
              <select value={l.status} onChange={(e) => onStatus(l, e.currentTarget.value)} aria-label={t.status}>
                {Object.entries(t.leadStatus).map(([k, v]) => (
                  <option value={k}>{v}</option>
                ))}
              </select>
            ) : (
              <Badge value={l.status} label={t.leadStatus[l.status]} />
            )}
          </div>
          <p class="s-pre">{l.message}</p>
          {!compact && (
            <a class="s-muted" href={`mailto:${l.email}`}>
              {l.email}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export function Leads({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  const [status, setStatus] = useState('new');
  const params = new URLSearchParams(status ? { status } : {});
  const { data, setData, error } = useApi<{ total: number; leads: Lead[] }>(`/studio/leads?${params}`);

  async function onStatus(lead: Lead, next: string) {
    await api(`/studio/leads/${lead.id}`, { method: 'PATCH', body: { status: next } });
    setData({ ...data!, leads: data!.leads.map((l) => (l.id === lead.id ? { ...l, status: next } : l)) });
  }

  return (
    <>
      <PageHead title={t.nav.leads} />
      <div class="s-tabs" role="tablist">
        {[...Object.keys(t.leadStatus), ''].map((s) => (
          <button type="button" role="tab" aria-selected={status === s} onClick={() => setStatus(s)}>
            {s ? t.leadStatus[s] : t.all}
          </button>
        ))}
      </div>
      <Panel>
        {error ? <ErrorNote ctx={ctx} /> : !data ? <Loading ctx={ctx} /> : data.leads.length ? <LeadList ctx={ctx} leads={data.leads} onStatus={onStatus} /> : <p class="s-muted">{t.none}</p>}
      </Panel>
    </>
  );
}
