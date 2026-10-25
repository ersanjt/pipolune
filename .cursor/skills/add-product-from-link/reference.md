# Reference — product import

## Seed entry template

Amounts are minor units: prices in kuruş/cents/kopecks (₺1,890 → 189000, $49 → 4900, ₽4,490 → 449000); `cost_cny` in fen. Media paths are site paths. The full live example is the `acorn-hooded-jumpsuit` object in `public/api/lib/seed/catalog.json`.

```json
{
  "slug": "acorn-hooded-jumpsuit",
  "sort_order": -10,
  "season": "winter",
  "category": "jumpsuit",
  "gender": "unisex",
  "age_band": "3-24m",
  "prices": { "TRY": 189000, "USD": 4900, "RUB": 449000 },
  "image": "/images/products/<slug>.webp",
  "gallery": ["/images/products/<slug>.webp", "/images/products/<slug>/01.webp", "/images/products/<slug>/02.webp"],
  "video": { "url": "/videos/products/<slug>.mp4", "poster": "/images/products/<slug>/video-poster.webp" },
  "size_chart": {
    "head": {
      "en": ["Size", "Height (cm)", "Weight (kg)", "Age (months)", "Length (cm)", "Half chest (cm)", "Sleeve (cm)"],
      "tr": ["Beden", "Boy (cm)", "Kilo (kg)", "Yaş (ay)", "Ürün boyu (cm)", "Yarım göğüs (cm)", "Kol (cm)"],
      "ru": ["Размер", "Рост (см)", "Вес (кг)", "Возраст (мес.)", "Длина (см)", "Полуобхват груди (см)", "Рукав (см)"]
    },
    "rows": [["66", "57–64", "4.5–6.5", "1–3", "56", "35", "32"]],
    "note": {
      "en": "Measured flat, allow 1–3 cm. Between sizes? Choose the larger one.",
      "tr": "Düz zeminde ölçülmüştür, 1–3 cm fark olabilir. İki beden arasındaysa büyük olanı seçin.",
      "ru": "Замеры по изделию в разложенном виде, возможна разница 1–3 см. Если ребёнок между размерами, берите больший."
    }
  },
  "features": [
    { "image": "/images/products/<slug>/detail-collar.webp", "caption": { "en": "…", "tr": "…", "ru": "…" } }
  ],
  "sourcing": {
    "supplier_name": "Huzhou Daqi Clothing Co., Ltd (湖州达淇服饰有限公司)",
    "supplier_url": "https://detail.1688.com/offer/837546995437.html",
    "supplier_sku": "25026",
    "cost_cny": 5900,
    "note": "Supplier brand … Colour … Parcel weight … Supplier stock on <date> … Returns …"
  },
  "translations": {
    "en": {
      "name": "Acorn Hooded Jumpsuit",
      "subtitle": "…",
      "description": "… Sizes by height: 66 cm (57–64 cm, 4.5–6.5 kg), … If in doubt, choose the larger size.",
      "details": "Paragraph one.\n\nParagraph two.\n\nParagraph three.",
      "specs": [{ "label": "Outer", "value": "…" }, { "label": "Parcel weight", "value": "360 g" }, { "label": "Made in", "value": "China" }]
    },
    "tr": { "name": "Acorn Hooded Jumpsuit", "subtitle": "…", "description": "…", "details": "…", "specs": [] },
    "ru": { "name": "Acorn Hooded Jumpsuit", "subtitle": "…", "description": "…", "details": "…", "specs": [] }
  },
  "variants": [
    { "sku": "PL-ACJ-BRN-66", "colour": "Brown", "size": "66 cm", "stock": 0, "weight_g": 360 }
  ]
}
```

Allowed values: `season` spring | summer | autumn | winter | all; `gender` girl | boy | unisex; optional `"status": "draft"` (default active). Limits enforced by Studio: gallery ≤ 24, close-ups ≤ 16, size rows ≤ 30 × 12 cells, specs ≤ 40 per language.

## Reading a 1688 page (IDE browser, CDP `Runtime.evaluate`, `returnByValue: true`)

Gallery photos and video URLs from the page HTML:

```js
(() => {
  const html = document.documentElement.outerHTML;
  const imgs = [...new Set(html.match(/https?:\/\/cbu01\.alicdn\.com\/img\/ibank\/[^"'\s\\)]+?\.(?:jpg|png|webp)/g) || [])];
  const vids = [...new Set(html.match(/https?:\/\/[^"'\s\\]+?\.mp4[^"'\s\\]*/g) || [])];
  return { imgs, vids, videoEls: [...document.querySelectorAll('video')].map(v => v.currentSrc || v.src) };
})()
```

"Product Details" slides live in shadow DOM and load lazily — scroll first, then walk shadow roots:

```js
(async () => {
  for (let i = 0; i < 12; i++) { window.scrollBy(0, 1200); await new Promise(r => setTimeout(r, 400)); }
  const out = [];
  const walk = (root) => root.querySelectorAll('*').forEach(el => {
    if (el.shadowRoot) { el.shadowRoot.querySelectorAll('img').forEach(i => out.push(i.getAttribute('data-lazyload-src') || i.src)); walk(el.shadowRoot); }
  });
  walk(document);
  return [...new Set(out)].filter(s => /alicdn/.test(s));
})()
```

Full-size photo URL: strip size suffixes such as `_220x220.jpg` / `.jpg_.webp` so it ends in `…-cib.jpg`. Attributes, sizes and packing: read the "Product Attributes" and "Packing" blocks from `browser_snapshot` text (or `document.body.innerText`).

Downloads need a browser User-Agent and the `https://detail.1688.com/` referer (`fetch` in `scripts/product-media.py` sends both); without them the video host answers `{"code":1112,"message":"非法访问"}`.
