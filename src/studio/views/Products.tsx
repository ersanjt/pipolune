import { useEffect, useState } from 'preact/hooks';
import { api, ApiError, upload } from '../../lib/api';
import { amounts, Badge, can, ErrorNote, Loading, PageHead, Panel, useApi, type Ctx } from '../shared';
import { currencies, currencySymbol, type Prices } from '../../lib/currency';
import { PublishButton } from './Settings';

const LOCALES = ['en', 'tr', 'ru'] as const;
type Locale = (typeof LOCALES)[number];
type LangMap<T> = Partial<Record<Locale, T>>;

interface Variant {
  id?: number;
  sku: string;
  colour: string;
  size: string;
  stock: number;
  active: boolean;
  weightG?: number | null;
}

interface Spec {
  label: string;
  value: string;
}

interface ProductText {
  name: string;
  subtitle: string;
  description: string;
  details?: string;
  specs?: Spec[];
}

interface Feature {
  image: string;
  caption: LangMap<string>;
}

interface Sourcing {
  supplierName: string;
  supplierUrl: string;
  supplierSku: string;
  /** Fen (1/100 yuan). */
  costCny: number | null;
  note: string;
}

interface Product {
  id: number;
  slug: string;
  status: string;
  season: string;
  category: string;
  gender: string;
  ageBand: string;
  prices: Prices;
  image: string;
  gallery: string[];
  video: { url: string; poster: string } | null;
  sizeChart: { head: LangMap<string[]>; rows: string[][]; note: LangMap<string> } | null;
  features: Feature[];
  sourcing?: Sourcing;
  sortOrder: number;
  translations: LangMap<ProductText>;
  variants: Variant[];
}

type Draft = Omit<Product, 'id'>;

/** Specifications and size-guide cells are edited as plain text and parsed on save. */
interface TextDrafts {
  specs: Record<Locale, string>;
  head: Record<Locale, string>;
  rows: string;
}

export default function Products({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  const { data, error } = useApi<{ products: Product[] }>('/studio/products');
  if (error) return <ErrorNote ctx={ctx} />;
  if (!data) return <Loading ctx={ctx} />;
  return (
    <>
      <PageHead title={t.nav.products} subtitle={t.publishHint}>
        <PublishButton ctx={ctx} />
        {can(ctx.me, 'products.content') && (
          <a class="s-btn" href="#/products/new">
            + {t.newProduct}
          </a>
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
                  <div class="s-muted">
                    {p.slug}
                    {p.video ? ` · ▶ ${t.video}` : ''}
                  </div>
                </td>
                <td>{t.seasons[p.season]}</td>
                <td>{amounts(p.prices, ctx.lang)}</td>
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

const EMPTY: Draft = {
  slug: '',
  status: 'draft',
  season: 'all',
  category: '',
  gender: 'unisex',
  ageBand: '',
  prices: { USD: 0, TRY: 0, RUB: 0 },
  image: '',
  gallery: [],
  video: null,
  sizeChart: null,
  features: [],
  sortOrder: 0,
  translations: { en: { name: '', subtitle: '', description: '', details: '', specs: [] } },
  variants: [],
};

const EMPTY_SOURCING: Sourcing = { supplierName: '', supplierUrl: '', supplierSku: '', costCny: null, note: '' };

function photoList(p: Pick<Product, 'image' | 'gallery'>): string[] {
  return [...new Set([p.image, ...(p.gallery ?? [])].filter(Boolean))];
}

function toDrafts(p: Draft): TextDrafts {
  const per = (fn: (l: Locale) => string) => Object.fromEntries(LOCALES.map((l) => [l, fn(l)])) as Record<Locale, string>;
  return {
    specs: per((l) => (p.translations[l]?.specs ?? []).map((s) => (s.value ? `${s.label}: ${s.value}` : s.label)).join('\n')),
    head: per((l) => (p.sizeChart?.head[l] ?? []).join(' | ')),
    rows: (p.sizeChart?.rows ?? []).map((r) => r.join(' | ')).join('\n'),
  };
}

const lines = (text: string) => text.split('\n').map((s) => s.trim()).filter(Boolean);
const cells = (line: string) => line.split('|').map((s) => s.trim());

function parseSpecs(text: string): Spec[] {
  return lines(text).map((line) => {
    const i = line.indexOf(':');
    return i < 0 ? { label: line, value: '' } : { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() };
  });
}

function toBody(p: Draft, d: TextDrafts) {
  const rows = lines(d.rows).map(cells);
  const translations = Object.fromEntries(
    Object.entries(p.translations)
      .filter(([, text]) => text?.name.trim())
      .map(([l, text]) => [l, { ...text, specs: parseSpecs(d.specs[l as Locale]) }]),
  );
  return {
    ...p,
    image: p.gallery[0] ?? p.image,
    video: p.video?.url ? p.video : null,
    sizeChart: rows.length
      ? {
          rows,
          head: Object.fromEntries(LOCALES.map((l) => [l, d.head[l].trim() ? cells(d.head[l]) : []])),
          note: p.sizeChart?.note ?? {},
        }
      : null,
    features: p.features.filter((f) => f.image),
    translations,
  };
}

function withGallery(p: Draft): Draft {
  return { ...p, gallery: photoList(p), video: p.video ?? null, features: p.features ?? [] };
}

export function ProductEditor({ ctx, id }: { ctx: Ctx; id: number | null }) {
  const { t, me } = ctx;
  const [product, setProduct] = useState<Draft | null>(id === null ? EMPTY : null);
  const [drafts, setDrafts] = useState<TextDrafts>(() => toDrafts(EMPTY));
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const editable = can(me, 'products.content');
  const manage = can(me, 'products.manage');
  const mayUpload = editable && can(me, 'uploads');
  const meta = manage || id === null;
  const limits = useApi<{ videoMb: number }>(mayUpload ? '/studio/uploads/limits' : null);

  useEffect(() => {
    if (id === null) return;
    api<Product>(`/studio/products/${id}`)
      .then((p) => {
        const next = withGallery(p);
        setProduct(next);
        setDrafts(toDrafts(next));
      })
      .catch(() => setMessage(t.error));
  }, [id]);

  if (!product) return message ? <ErrorNote ctx={ctx} /> : <Loading ctx={ctx} />;

  const update = (fn: (p: Draft) => Draft) => setProduct((p) => (p ? fn(p) : p));
  const set = (patch: Partial<Draft>) => update((p) => ({ ...p, ...patch }));
  const setText = (l: Locale, key: keyof ProductText, value: string) =>
    update((p) => ({
      ...p,
      translations: { ...p.translations, [l]: { name: '', subtitle: '', description: '', ...p.translations[l], [key]: value } },
    }));
  const setVariant = (i: number, patch: Partial<Variant>) => set({ variants: product.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const setGallery = (gallery: string[]) => set({ gallery, image: gallery[0] ?? '' });
  const move = (i: number, by: number) => {
    const next = [...product.gallery];
    const [item] = next.splice(i, 1);
    next.splice(i + by, 0, item);
    setGallery(next);
  };
  const setVideo = (patch: Partial<{ url: string; poster: string }>) => set({ video: { url: '', poster: '', ...product.video, ...patch } });
  const setFeature = (i: number, patch: Partial<Feature>) => set({ features: product.features.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const sourcing = product.sourcing ?? EMPTY_SOURCING;
  const setSourcing = (patch: Partial<Sourcing>) => set({ sourcing: { ...sourcing, ...patch } });

  async function save(e: Event) {
    e.preventDefault();
    if (!product) return;
    setBusy(true);
    setMessage('');
    setFields({});
    try {
      const body = toBody(product, drafts);
      const saved = id === null
        ? await api<Product>('/studio/products', { method: 'POST', body })
        : await api<Product>(`/studio/products/${id}`, { method: 'PATCH', body });
      setMessage(t.saved);
      if (id === null) ctx.go(`/products/${saved.id}`);
      else {
        const next = withGallery(saved);
        setProduct(next);
        setDrafts(toDrafts(next));
      }
    } catch (err) {
      if (err instanceof ApiError) setFields(err.fields);
      setMessage(err instanceof ApiError ? err.message || t.error : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function send(kind: string, files: File[], path: string, done: (urls: string[]) => void) {
    if (!files.length) return;
    setUploading(kind);
    setMessage('');
    try {
      const urls: string[] = [];
      for (const file of files) urls.push((await upload<{ url: string }>(path, file)).url);
      done(urls);
    } catch (err) {
      setMessage(err instanceof ApiError && err.message ? err.message : t.error);
    } finally {
      setUploading(null);
    }
  }

  const err = (key: string) => fields[key] && <span class="s-error">{fields[key]}</span>;
  const imageTypes = 'image/jpeg,image/png,image/webp';

  return (
    <form onSubmit={save}>
      <PageHead title={id === null ? t.newProduct : t.editProduct} subtitle={product.translations.en?.name}>
        <a class="s-btn s-btn--ghost" href="#/products">
          {t.cancel}
        </a>
        {editable && (
          <button class="s-btn" type="submit" disabled={busy || uploading !== null}>
            {t.save}
          </button>
        )}
      </PageHead>
      {message && <p class={Object.keys(fields).length || message !== t.saved ? 's-error' : 's-success'}>{message}</p>}
      {!editable && <p class="s-muted">{t.viewOnly}</p>}
      {editable && !manage && <p class="s-muted">{t.contentOnly}</p>}

      <fieldset disabled={!editable} class="s-grid s-grid--2-1 s-fieldset">
        <div class="s-stack">
          <Panel title={t.media}>
            <p class="s-muted">{t.galleryHelp}</p>
            <ul class="s-gallery">
              {product.gallery.map((src, i) => (
                <li class="s-gallery__item">
                  <img src={src} alt="" loading="lazy" />
                  {i === 0 && <span class="s-gallery__cover">{t.cover}</span>}
                  <div class="s-gallery__tools">
                    <button type="button" class="s-icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t.moveEarlier} title={t.moveEarlier}>
                      ←
                    </button>
                    <button type="button" class="s-icon-btn" disabled={i === product.gallery.length - 1} onClick={() => move(i, 1)} aria-label={t.moveLater} title={t.moveLater}>
                      →
                    </button>
                    <button type="button" class="s-icon-btn" onClick={() => setGallery(product.gallery.filter((_, j) => j !== i))} aria-label={t.remove} title={t.remove}>
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div class="s-inline">
              {mayUpload && (
                <label class="s-btn s-btn--ghost s-upload">
                  {uploading === 'gallery' ? t.uploading : `+ ${t.addPhotos}`}
                  <input
                    type="file"
                    multiple
                    accept={imageTypes}
                    onChange={(e) => {
                      const files = Array.from(e.currentTarget.files ?? []);
                      e.currentTarget.value = '';
                      send('gallery', files, '/studio/uploads', (urls) => update((p) => ({ ...p, gallery: [...p.gallery, ...urls], image: p.gallery[0] ?? urls[0] })));
                    }}
                  />
                </label>
              )}
              <input value={photoUrl} onInput={(e) => setPhotoUrl(e.currentTarget.value)} placeholder="/images/… https://…" aria-label={t.addByUrl} />
              <button
                type="button"
                class="s-btn s-btn--ghost"
                disabled={!photoUrl.trim()}
                onClick={() => {
                  setGallery([...product.gallery, photoUrl.trim()]);
                  setPhotoUrl('');
                }}
              >
                {t.addByUrl}
              </button>
            </div>

            <h3 class="s-subhead">{t.video}</h3>
            <div class="s-video-edit">
              {product.video?.url && <video src={product.video.url} poster={product.video.poster || undefined} muted playsInline controls preload="metadata" />}
              <div class="s-stack">
                <label>
                  {t.videoUrl}
                  <input value={product.video?.url ?? ''} onInput={(e) => setVideo({ url: e.currentTarget.value })} placeholder="/uploads/videos/… https://…" />
                  {err('video')}
                </label>
                <label>
                  {t.videoPoster}
                  <input value={product.video?.poster ?? ''} onInput={(e) => setVideo({ poster: e.currentTarget.value })} />
                </label>
                <div class="s-inline">
                  {mayUpload && (
                    <label class="s-btn s-btn--ghost s-upload">
                      {uploading === 'video' ? t.uploading : t.uploadVideo}
                      <input
                        type="file"
                        accept="video/mp4,video/webm"
                        onChange={(e) => {
                          const files = Array.from(e.currentTarget.files ?? []);
                          e.currentTarget.value = '';
                          send('video', files, '/studio/uploads/video', ([url]) => setVideo({ url }));
                        }}
                      />
                    </label>
                  )}
                  {mayUpload && (
                    <label class="s-btn s-btn--ghost s-upload">
                      {uploading === 'poster' ? t.uploading : t.videoPoster}
                      <input
                        type="file"
                        accept={imageTypes}
                        onChange={(e) => {
                          const files = Array.from(e.currentTarget.files ?? []);
                          e.currentTarget.value = '';
                          send('poster', files, '/studio/uploads', ([poster]) => setVideo({ poster }));
                        }}
                      />
                    </label>
                  )}
                  {product.video?.url && (
                    <button type="button" class="s-link" onClick={() => set({ video: null })}>
                      {t.removeVideo}
                    </button>
                  )}
                </div>
                {limits.data && <span class="s-muted">{t.videoHelp.replace('{mb}', String(limits.data.videoMb))}</span>}
              </div>
            </div>
          </Panel>

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
                  <label>
                    {t.details}
                    <textarea rows={7} value={product.translations[l]?.details ?? ''} onInput={(e) => setText(l, 'details', e.currentTarget.value)} />
                  </label>
                  <label>
                    {t.specs}
                    <textarea
                      rows={8}
                      class="s-mono"
                      value={drafts.specs[l]}
                      onInput={(e) => setDrafts({ ...drafts, specs: { ...drafts.specs, [l]: e.currentTarget.value } })}
                    />
                  </label>
                </div>
              ))}
            </div>
            <p class="s-muted">
              {t.detailsHelp} {t.specsHelp}
            </p>
          </Panel>

          <Panel title={t.sizeChart}>
            <div class="s-stack">
              <label>
                {t.sizeRows}
                <textarea rows={6} class="s-mono" value={drafts.rows} onInput={(e) => setDrafts({ ...drafts, rows: e.currentTarget.value })} />
              </label>
              <span class="s-muted">{t.sizeHelp}</span>
              <div class="s-langs-grid">
                {LOCALES.map((l) => (
                  <div class="s-stack">
                    <h3 class="s-lang-title">{l.toUpperCase()}</h3>
                    <label>
                      {t.sizeHead}
                      <input class="s-mono" value={drafts.head[l]} onInput={(e) => setDrafts({ ...drafts, head: { ...drafts.head, [l]: e.currentTarget.value } })} />
                    </label>
                    <label>
                      {t.sizeNote}
                      <textarea
                        rows={3}
                        value={product.sizeChart?.note[l] ?? ''}
                        onInput={(e) =>
                          set({ sizeChart: { head: {}, rows: [], ...product.sizeChart, note: { ...product.sizeChart?.note, [l]: e.currentTarget.value } } })
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel
            title={t.features}
            action={
              <button type="button" class="s-btn s-btn--ghost" onClick={() => set({ features: [...product.features, { image: '', caption: {} }] })}>
                + {t.addFeature}
              </button>
            }
          >
            <p class="s-muted">{t.featuresHelp}</p>
            <div class="s-features">
              {product.features.map((f, i) => (
                <div class="s-feature">
                  <div class="s-feature__image">
                    {f.image ? <img src={f.image} alt="" loading="lazy" /> : <span class="s-muted">—</span>}
                    {mayUpload && (
                      <label class="s-btn s-btn--ghost s-upload">
                        {uploading === `feature-${i}` ? t.uploading : t.uploadImage}
                        <input
                          type="file"
                          accept={imageTypes}
                          onChange={(e) => {
                            const files = Array.from(e.currentTarget.files ?? []);
                            e.currentTarget.value = '';
                            send(`feature-${i}`, files, '/studio/uploads', ([image]) => setFeature(i, { image }));
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <div class="s-stack">
                    <input value={f.image} onInput={(e) => setFeature(i, { image: e.currentTarget.value })} aria-label={t.image} placeholder="/images/…" />
                    {LOCALES.map((l) => (
                      <label>
                        {t.caption} · {l.toUpperCase()}
                        <input value={f.caption[l] ?? ''} onInput={(e) => setFeature(i, { caption: { ...f.caption, [l]: e.currentTarget.value } })} />
                      </label>
                    ))}
                    <button type="button" class="s-link" onClick={() => set({ features: product.features.filter((_, j) => j !== i) })}>
                      {t.remove}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title={t.variants}
            action={
              manage && (
                <button
                  type="button"
                  class="s-btn s-btn--ghost"
                  onClick={() => set({ variants: [...product.variants, { sku: '', colour: '', size: '', stock: 0, active: true, weightG: null }] })}
                >
                  + {t.addVariant}
                </button>
              )
            }
          >
            <fieldset disabled={!manage} class="s-fieldset">
              <table class="s-table s-table--edit">
                <thead>
                  <tr>
                    <th>{t.sku}</th>
                    <th>{t.colour}</th>
                    <th>{t.size}</th>
                    <th>{t.stock}</th>
                    <th>{t.weight}</th>
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
                        <input
                          type="number"
                          min="0"
                          max="30000"
                          value={v.weightG ?? ''}
                          onInput={(e) => setVariant(i, { weightG: e.currentTarget.value === '' ? null : Number(e.currentTarget.value) })}
                        />
                      </td>
                      <td>
                        <input type="checkbox" checked={v.active} onChange={(e) => setVariant(i, { active: e.currentTarget.checked })} />
                      </td>
                      <td>
                        {manage && (
                          <button type="button" class="s-link" onClick={() => set({ variants: product.variants.filter((_, j) => j !== i) })}>
                            {t.remove}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </fieldset>
          </Panel>
        </div>

        <div class="s-stack">
          <Panel>
            <div class="s-stack">
              <label>
                {t.status}
                <select value={product.status} disabled={!manage} onChange={(e) => set({ status: e.currentTarget.value })}>
                  {Object.entries(t.productStatus).map(([k, v]) => (
                    <option value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <fieldset disabled={!meta} class="s-stack s-fieldset">
                <label>
                  {t.slug}
                  <input value={product.slug} onInput={(e) => set({ slug: e.currentTarget.value.toLowerCase() })} pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
                  <span class="s-muted">{t.slugHelp}</span>
                  {err('slug')}
                </label>
              </fieldset>
              <fieldset disabled={!manage} class="s-stack s-prices">
                <legend>{t.price}</legend>
                {currencies.map((c) => (
                  <label>
                    {currencySymbol[c]} {c}
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={product.prices[c] ? product.prices[c] / 100 : ''}
                      onInput={(e) => set({ prices: { ...product.prices, [c]: Math.round(Number(e.currentTarget.value) * 100) } })}
                      required={manage}
                    />
                    {err(`prices.${c}`)}
                  </label>
                ))}
                <span class="s-muted">{t.pricesHelp}</span>
              </fieldset>
              <fieldset disabled={!meta} class="s-stack s-fieldset">
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
                  <select value={product.category} onChange={(e) => set({ category: e.currentTarget.value })}>
                    <option value="">{t.categoryUnset}</option>
                    {product.category && !t.categories[product.category] && <option value={product.category}>{product.category}</option>}
                    {Object.entries(t.categories).map(([k, v]) => (
                      <option value={k}>{v}</option>
                    ))}
                  </select>
                  <span class="s-muted">{t.categoryHelp}</span>
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
                  <input value={product.ageBand} onInput={(e) => set({ ageBand: e.currentTarget.value })} placeholder="0-1y" />
                </label>
                <label>
                  {t.sortOrder}
                  <input type="number" value={product.sortOrder} onInput={(e) => set({ sortOrder: Number(e.currentTarget.value) })} />
                </label>
              </fieldset>
            </div>
          </Panel>

          {can(me, 'sourcing.view') && (
            <Panel title={t.sourcing}>
              <fieldset disabled={!manage} class="s-stack s-fieldset">
                <label>
                  {t.supplier}
                  <input value={sourcing.supplierName} onInput={(e) => setSourcing({ supplierName: e.currentTarget.value })} />
                </label>
                <label>
                  {t.supplierUrl}
                  <input type="url" value={sourcing.supplierUrl} onInput={(e) => setSourcing({ supplierUrl: e.currentTarget.value })} />
                  {/^https?:\/\/[^/\s]+/.test(sourcing.supplierUrl) && (
                    <a href={sourcing.supplierUrl} target="_blank" rel="noopener noreferrer">
                      ↗ {sourcing.supplierUrl.replace(/^https?:\/\//, '').split('/')[0]}
                    </a>
                  )}
                </label>
                <label>
                  {t.supplierSku}
                  <input value={sourcing.supplierSku} onInput={(e) => setSourcing({ supplierSku: e.currentTarget.value })} />
                </label>
                <label>
                  {t.cost}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={sourcing.costCny == null ? '' : sourcing.costCny / 100}
                    onInput={(e) => setSourcing({ costCny: e.currentTarget.value === '' ? null : Math.round(Number(e.currentTarget.value) * 100) })}
                  />
                  {err('sourcing.costCny')}
                </label>
                <label>
                  {t.sourcingNote}
                  <textarea rows={6} value={sourcing.note} onInput={(e) => setSourcing({ note: e.currentTarget.value })} />
                </label>
              </fieldset>
            </Panel>
          )}
        </div>
      </fieldset>
    </form>
  );
}
