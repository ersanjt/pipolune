import { useEffect, useState } from 'preact/hooks';
import { api, ApiError, upload } from '../../lib/api';
import { Badge, can, ErrorNote, Loading, PageHead, Panel, tryMoney, useApi, type Ctx } from '../shared';
import { PublishButton } from './Settings';

const LOCALES = ['en', 'tr', 'ru'] as const;

interface Variant {
  id?: number;
  sku: string;
  colour: string;
  size: string;
  stock: number;
  price: number | null;
  active: boolean;
}

interface Product {
  id: number;
  slug: string;
  status: string;
  season: string;
  category: string;
  gender: string;
  ageBand: string;
  price: number;
  image: string;
  sortOrder: number;
  translations: Partial<Record<(typeof LOCALES)[number], { name: string; subtitle: string; description: string }>>;
  variants: Variant[];
}

export default function Products({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  const { data, error } = useApi<{ products: Product[] }>('/studio/products');
  if (error) return <ErrorNote ctx={ctx} />;
  if (!data) return <Loading ctx={ctx} />;
  return (
    <>
      <PageHead title={t.nav.products} subtitle={t.publishHint}>
        {can.products(ctx.me) && (
          <>
            <PublishButton ctx={ctx} />
            <a class="s-btn" href="#/products/new">
              + {t.newProduct}
            </a>
          </>
        )}
      </PageHead>
      <Panel>
        <table class="s-table">
          <thead>
            <tr>
              <th />
              <th>{t.product}</th>
              <th>{t.season}</th>
              <th>{t.price}</th>
              <th>{t.stock}</th>
              <th>EN · TR · RU</th>
              <th>{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {data.products.map((p) => (
              <tr class="s-row-link" onClick={() => ctx.go(`/products/${p.id}`)}>
                <td>
                  <img class="s-thumb" src={p.image} alt="" width="48" height="48" loading="lazy" />
                </td>
                <td>
                  <a href={`#/products/${p.id}`}>{p.translations.en?.name ?? p.slug}</a>
                  <div class="s-muted">{p.slug}</div>
                </td>
                <td>{t.seasons[p.season]}</td>
                <td>{tryMoney(p.price)}</td>
                <td>{p.variants.filter((v) => v.active).reduce((n, v) => n + v.stock, 0)}</td>
                <td>{LOCALES.map((l) => (p.translations[l]?.name ? '✓' : '–')).join(' · ')}</td>
                <td>
                  <Badge value={p.status} label={t.productStatus[p.status]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

const EMPTY: Omit<Product, 'id'> = {
  slug: '',
  status: 'draft',
  season: 'all',
  category: '',
  gender: 'unisex',
  ageBand: '',
  price: 0,
  image: '',
  sortOrder: 0,
  translations: { en: { name: '', subtitle: '', description: '' } },
  variants: [],
};

export function ProductEditor({ ctx, id }: { ctx: Ctx; id: number | null }) {
  const { t } = ctx;
  const [product, setProduct] = useState<Omit<Product, 'id'> | null>(id === null ? EMPTY : null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const editable = can.products(ctx.me);

  useEffect(() => {
    if (id !== null) api<Product>(`/studio/products/${id}`).then(setProduct).catch(() => setMessage(t.error));
  }, [id]);

  if (!product) return message ? <ErrorNote ctx={ctx} /> : <Loading ctx={ctx} />;

  const set = (patch: Partial<Product>) => setProduct({ ...product, ...patch });
  const setText = (l: string, key: string, value: string) =>
    set({ translations: { ...product.translations, [l]: { name: '', subtitle: '', description: '', ...(product.translations as any)[l], [key]: value } } });
  const setVariant = (i: number, patch: Partial<Variant>) => set({ variants: product.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) });

  async function save(e: Event) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    setFields({});
    try {
      const saved = id === null
        ? await api<Product>('/studio/products', { method: 'POST', body: product })
        : await api<Product>(`/studio/products/${id}`, { method: 'PATCH', body: product });
      setMessage(t.saved);
      if (id === null) ctx.go(`/products/${saved.id}`);
      else setProduct(saved);
    } catch (err) {
      if (err instanceof ApiError) setFields(err.fields);
      setMessage(err instanceof ApiError ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const res = await upload<{ url: string }>('/studio/uploads', file);
      set({ image: res.url });
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : t.error);
    } finally {
      setUploading(false);
    }
  }

  const err = (key: string) => fields[key] && <span class="s-error">{fields[key]}</span>;

  return (
    <form onSubmit={save}>
      <PageHead title={id === null ? t.newProduct : t.editProduct} subtitle={product.translations.en?.name}>
        <a class="s-btn s-btn--ghost" href="#/products">
          {t.cancel}
        </a>
        {editable && (
          <button class="s-btn" type="submit" disabled={busy}>
            {t.save}
          </button>
        )}
      </PageHead>
      {message && <p class={Object.keys(fields).length || message === t.error ? 's-error' : 's-success'}>{message}</p>}
      <fieldset disabled={!editable} class="s-grid s-grid--2-1 s-fieldset">
        <div class="s-stack">
          <Panel title={t.translations}>
            <div class="s-langs-grid">
              {LOCALES.map((l) => (
                <div class="s-stack">
                  <h3 class="s-lang-title">{l.toUpperCase()}</h3>
                  <label>
                    {t.name}
                    <input value={product.translations[l]?.name ?? ''} onInput={(e) => setText(l, 'name', e.currentTarget.value)} required={l === 'en'} />
                    {l === 'en' && err('translations.en.name')}
                  </label>
                  <label>
                    {t.subtitle}
                    <input value={product.translations[l]?.subtitle ?? ''} onInput={(e) => setText(l, 'subtitle', e.currentTarget.value)} />
                  </label>
                  <label>
                    {t.description}
                    <textarea rows={4} value={product.translations[l]?.description ?? ''} onInput={(e) => setText(l, 'description', e.currentTarget.value)} />
                  </label>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={t.variants} action={<button type="button" class="s-btn s-btn--ghost" onClick={() => set({ variants: [...product.variants, { sku: '', colour: '', size: '', stock: 0, price: null, active: true }] })}>+ {t.addVariant}</button>}>
            <table class="s-table s-table--edit">
              <thead>
                <tr>
                  <th>{t.sku}</th>
                  <th>{t.colour}</th>
                  <th>{t.size}</th>
                  <th>{t.stock}</th>
                  <th>{t.priceOverride}</th>
                  <th>{t.active}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {product.variants.map((v, i) => (
                  <tr>
                    <td>
                      <input value={v.sku} onInput={(e) => setVariant(i, { sku: e.currentTarget.value })} required />
                      {err(`variants.${i}.sku`)}
                    </td>
                    <td>
                      <input value={v.colour} onInput={(e) => setVariant(i, { colour: e.currentTarget.value })} />
                    </td>
                    <td>
                      <input value={v.size} onInput={(e) => setVariant(i, { size: e.currentTarget.value })} />
                    </td>
                    <td>
                      <input type="number" min="0" value={v.stock} onInput={(e) => setVariant(i, { stock: Number(e.currentTarget.value) })} />
                    </td>
                    <td>
                      <input type="number" min="0" step="0.01" value={v.price === null ? '' : v.price / 100} onInput={(e) => setVariant(i, { price: e.currentTarget.value === '' ? null : Math.round(Number(e.currentTarget.value) * 100) })} />
                    </td>
                    <td>
                      <input type="checkbox" checked={v.active} onChange={(e) => setVariant(i, { active: e.currentTarget.checked })} />
                    </td>
                    <td>
                      <button type="button" class="s-link" onClick={() => set({ variants: product.variants.filter((_, j) => j !== i) })}>
                        {t.remove}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        <div class="s-stack">
          <Panel>
            <div class="s-stack">
              <label>
                {t.status}
                <select value={product.status} onChange={(e) => set({ status: e.currentTarget.value })}>
                  {Object.entries(t.productStatus).map(([k, v]) => (
                    <option value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                {t.slug}
                <input value={product.slug} onInput={(e) => set({ slug: e.currentTarget.value.toLowerCase() })} pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
                <span class="s-muted">{t.slugHelp}</span>
                {err('slug')}
              </label>
              <label>
                {t.price}
                <input type="number" min="0" step="0.01" value={product.price / 100} onInput={(e) => set({ price: Math.round(Number(e.currentTarget.value) * 100) })} required />
                {err('price')}
              </label>
              <label>
                {t.season}
                <select value={product.season} onChange={(e) => set({ season: e.currentTarget.value })}>
                  {Object.entries(t.seasons).map(([k, v]) => (
                    <option value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                {t.category}
                <input value={product.category} onInput={(e) => set({ category: e.currentTarget.value.toLowerCase() })} placeholder="dress, cardigan, blouse…" />
              </label>
              <label>
                {t.gender}
                <select value={product.gender} onChange={(e) => set({ gender: e.currentTarget.value })}>
                  {Object.entries(t.genders).map(([k, v]) => (
                    <option value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                {t.ageBand}
                <input value={product.ageBand} onInput={(e) => set({ ageBand: e.currentTarget.value })} placeholder="1-4y" />
              </label>
              <label>
                {t.sortOrder}
                <input type="number" value={product.sortOrder} onInput={(e) => set({ sortOrder: Number(e.currentTarget.value) })} />
              </label>
            </div>
          </Panel>
          <Panel title={t.image}>
            <div class="s-stack">
              {product.image && <img class="s-preview" src={product.image} alt="" />}
              <label class="s-btn s-btn--ghost s-upload">
                {uploading ? t.uploading : t.uploadImage}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onFile(e.currentTarget.files?.[0])} />
              </label>
              <input value={product.image} onInput={(e) => set({ image: e.currentTarget.value })} aria-label={t.image} />
            </div>
          </Panel>
        </div>
      </fieldset>
    </form>
  );
}
