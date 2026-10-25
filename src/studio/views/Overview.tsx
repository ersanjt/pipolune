import { amount, amounts, Badge, can, ErrorNote, Loading, PageHead, Panel, shortDate, useApi, type Ctx } from '../shared';
import type { Currency, Prices } from '../../lib/currency';

interface OverviewData {
  counts: Record<string, number>;
  recentOrders: { number: string; createdAt: string; name: string; itemCount: number; currency: Currency; total: number; status: string; fulfilmentStatus: string }[];
  lowStock: { id: number; sku: string; colour: string; size: string; stock: number }[];
  latestProducts: { id: number; image: string; name?: string; translations?: Record<string, { name: string }>; prices: Prices }[];
  languageCompleteness: Record<string, { products: number; of: number }>;
  revenue?: Partial<Record<Currency, { total: number; orders: number }>> | [];
  settings: { salesMode: string; season: string; night: boolean };
}

/** Board 05 "Overview". */
export default function Overview({ ctx }: { ctx: Ctx }) {
  const { t, lang } = ctx;
  const { data, error } = useApi<OverviewData>('/studio/overview');
  if (error) return <ErrorNote ctx={ctx} />;
  if (!data) return <Loading ctx={ctx} />;

  const cards: { key: string; href: string }[] = [
    { key: 'products', href: '#/products' },
    { key: 'collections', href: '#/content' },
    { key: 'inventory', href: '#/inventory' },
    { key: 'orders', href: '#/orders' },
  ];
  const revenue = Object.entries(Array.isArray(data.revenue) ? {} : (data.revenue ?? {}));

  return (
    <>
      <PageHead title={t.nav.overview} subtitle={t.calm}>
        <img class="s-head__art" src="/images/home/season-winter.webp" alt="" width="105" height="83" />
      </PageHead>

      <div class="s-stats">
        {cards.map((c) => (
          <a class="s-stat" href={c.href}>
            <span class="s-muted">{t.counts[c.key as keyof typeof t.counts]}</span>
            <strong>{data.counts[c.key]}</strong>
          </a>
        ))}
      </div>

      {can(ctx.me, 'reports') && (
        <div class="s-alerts">
          <span class="s-chip">{t.revenue}:</span>
          {revenue.length ? (
            revenue.map(([c, r]) => (
              <span class="s-chip">
                <strong>{amount(r!.total, c as Currency, lang)}</strong> · {r!.orders} {t.ordersShort}
              </span>
            ))
          ) : (
            <span class="s-chip">—</span>
          )}
        </div>
      )}

      <div class="s-alerts">
        <a class="s-chip" href="#/orders">
          {t.counts.openRequests}: <strong>{data.counts.openRequests}</strong>
        </a>
        <a class="s-chip" href="#/leads">
          {t.counts.newLeads}: <strong>{data.counts.newLeads}</strong>
        </a>
        <a class="s-chip" href="#/customers">
          {t.counts.customers}: <strong>{data.counts.customers}</strong>
        </a>
        <a class="s-chip" href="#/content">
          {t.salesMode}: <strong>{t.salesModes[data.settings.salesMode]}</strong>
        </a>
        <span class="s-chip">
          {t.currentSeason}: <strong>{t.seasons[data.settings.season]}</strong> · {data.settings.night ? t.night : t.day}
        </span>
      </div>

      <div class="s-grid s-grid--2-1">
        {can(ctx.me, 'orders.view') && (
        <Panel title={t.recentOrders} action={<a href="#/orders">{t.viewAll} →</a>}>
          {data.recentOrders.length ? (
            <table class="s-table">
              <thead>
                <tr>
                  <th>{t.order}</th>
                  <th>{t.date}</th>
                  <th>{t.customer}</th>
                  <th>{t.items}</th>
                  <th>{t.total}</th>
                  <th>{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr onClick={() => ctx.go(`/orders/${encodeURIComponent(o.number)}`)} class="s-row-link">
                    <td>
                      <a href={`#/orders/${encodeURIComponent(o.number)}`}>{o.number}</a>
                    </td>
                    <td>{shortDate(o.createdAt, lang)}</td>
                    <td>{o.name}</td>
                    <td>{o.itemCount}</td>
                    <td>{amount(o.total, o.currency, lang)}</td>
                    <td>
                      <Badge value={o.status} label={t.orderStatus[o.status]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div class="s-empty">
              <img src="/images/home/season-spring.webp" alt="" width="105" height="83" />
              <p>{t.none}</p>
            </div>
          )}
        </Panel>
        )}

        <Panel title={t.inventoryBySku} action={<a href="#/inventory">{t.viewAll} →</a>}>
          <table class="s-table">
            <thead>
              <tr>
                <th>{t.sku}</th>
                <th>{t.colour}</th>
                <th>{t.size}</th>
                <th>{t.stock}</th>
              </tr>
            </thead>
            <tbody>
              {data.lowStock.map((v) => (
                <tr>
                  <td>{v.sku}</td>
                  <td>{v.colour}</td>
                  <td>{v.size}</td>
                  <td>
                    <span class={v.stock <= 2 ? 's-stock s-stock--low' : 's-stock'}>{v.stock}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div class="s-grid s-grid--2-1">
        <Panel title={t.latestProducts} action={<a href="#/products">{t.viewAll} →</a>}>
          <ul class="s-products">
            {data.latestProducts.map((p) => (
              <li>
                <a href={`#/products/${p.id}`}>
                  <img src={p.image} alt="" width="160" height="128" loading="lazy" />
                  <span>{p.name ?? p.translations?.en?.name}</span>
                  <span class="s-muted">{amounts(p.prices, lang)}</span>
                </a>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={t.languageCompleteness}>
          <table class="s-table">
            <tbody>
              {Object.entries(data.languageCompleteness).map(([l, c]) => (
                <tr>
                  <td>{l.toUpperCase()}</td>
                  <td>
                    {c.products} / {c.of} {t.productsTranslated}
                  </td>
                  <td>{c.products >= c.of ? <span class="s-ok">✓</span> : <span class="s-warn">–</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}
