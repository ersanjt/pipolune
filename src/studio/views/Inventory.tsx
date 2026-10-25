import { useState } from 'preact/hooks';
import { api } from '../../lib/api';
import { ErrorNote, Loading, PageHead, Panel, useApi, type Ctx } from '../shared';

interface Row {
  id: number;
  sku: string;
  colour: string;
  size: string;
  stock: number;
  active: number;
  productId: number;
  product: string;
}

export default function Inventory({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  const { data, setData, error } = useApi<{ variants: Row[] }>('/studio/inventory');
  const [q, setQ] = useState('');
  const [savedId, setSavedId] = useState<number | null>(null);
  if (error) return <ErrorNote ctx={ctx} />;
  if (!data) return <Loading ctx={ctx} />;

  async function setStock(row: Row, stock: number) {
    if (Number.isNaN(stock) || stock === row.stock) return;
    await api(`/studio/variants/${row.id}`, { method: 'PATCH', body: { stock } });
    setData({ variants: data!.variants.map((v) => (v.id === row.id ? { ...v, stock } : v)) });
    setSavedId(row.id);
    setTimeout(() => setSavedId(null), 1500);
  }

  const rows = data.variants.filter((v) => !q || `${v.sku} ${v.product} ${v.colour}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHead title={t.nav.inventory}>
        <input class="s-search" type="search" placeholder={t.search} value={q} onInput={(e) => setQ(e.currentTarget.value)} aria-label={t.search} />
      </PageHead>
      <Panel>
        <table class="s-table">
          <thead>
            <tr>
              <th>{t.sku}</th>
              <th>{t.product}</th>
              <th>{t.colour}</th>
              <th>{t.size}</th>
              <th>{t.stock}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr class={v.active ? '' : 's-row-muted'}>
                <td>{v.sku}</td>
                <td>
                  <a href={`#/products/${v.productId}`}>{v.product}</a>
                </td>
                <td>{v.colour}</td>
                <td>{v.size}</td>
                <td>
                  <input
                    class={`s-stock-input${v.stock <= 2 ? ' s-stock--low' : ''}`}
                    type="number"
                    min="0"
                    value={v.stock}
                    aria-label={`${t.stock} ${v.sku}`}
                    onChange={(e) => setStock(v, Number(e.currentTarget.value))}
                  />
                  {savedId === v.id && <span class="s-ok"> ✓</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
