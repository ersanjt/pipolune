---
name: add-product-from-link
description: Adds a product to the Pipolune shop from a supplier link (1688, Taobao, Tmall, AliExpress or any shop page) with the full standard content — cover, photo gallery, video, EN/TR/RU texts, details, specifications, size guide, close-ups, parcel weight, hand-set ₺/$/₽ prices and staff-only sourcing — then deploys and verifies it. Use whenever the user sends a product link or pasted supplier data and asks to add, import or update a product ("این محصول رو اضافه کن", "добавь товар").
---

# Add a product from a supplier link

The Acorn Hooded Jumpsuit (`acorn-hooded-jumpsuit`, 1688 offer 837546995437) is the reference: every new product gets the same parts, file layout and quality. Read [reference.md](reference.md) for the seed template and 1688 extraction snippets.

```
Progress:
- [ ] 1. Pull, read the listing, collect facts
- [ ] 2. Ask the owner for prices (and stock) if not given
- [ ] 3. Download, review and prepare media
- [ ] 4. Write the seed entry (EN/TR/RU)
- [ ] 5. Build and check the page locally
- [ ] 6. Commit, push, watch deploy, run Publish
- [ ] 7. Verify live and report
```

## 1. Read the listing

- `git pull --rebase origin main` first (workspace rule).
- `WebFetch` is usually blocked by 1688. Open the link in the IDE browser (`cursor-ide-browser`) and read it with `browser_snapshot` and CDP `Runtime.evaluate` (snippets in reference.md). If a login or captcha blocks the page, ask the user to paste the attributes block and screenshots instead of guessing.
- Collect: title, attributes (fabric, composition, season, thickness, closure, hood, sleeves, safety class, colour, origin), every size with height/weight/age and garment measurements, parcel weight, supplier price per size (CNY), supplier name and item number, supplier stock, returns policy, all photo and video URLs.
- Clean the supplier URL to `https://detail.1688.com/offer/<id>.html` (drop share tokens and tracking parameters).

## 2. Ask the owner (only what the listing cannot answer)

Use `AskQuestion` when the user did not give them:
- **Prices in all three currencies** (₺ TRY, $ USD, ₽ RUB). Prices are set by hand — never convert from the supplier cost or between currencies.
- **Stock per size** — default 0 (shown as out of stock) when the user has none yet.
- Status defaults to `active`. Note: an active new product is emailed to marketing subscribers by the announcement cron. Use `"status": "draft"` if the owner wants it hidden.

## 3. Media

Work in `%TEMP%/pl-<slug>/`; originals never go into the repo. Use `scripts/product-media.py` (run `--help`):

```bash
python scripts/product-media.py fetch  $TMP/raw <photo and video URLs>
python scripts/product-media.py sheet  $TMP/raw            # look at _sheet.jpg and choose
python scripts/product-media.py cover  $TMP/raw/05.jpg public/images/products/<slug>.webp
python scripts/product-media.py photo  $TMP/raw/01.jpg public/images/products/<slug>/01.webp
python scripts/product-media.py photo  $TMP/raw/13.jpg public/images/products/<slug>/detail-collar.webp --crop --edge 900
python scripts/product-media.py frames $TMP/raw/video.mp4 $TMP/frames.jpg   # check for text overlays
python scripts/product-media.py video  $TMP/raw/video.mp4 public/videos/products/<slug>.mp4 --poster public/images/products/<slug>/video-poster.webp --at 3
```

Selection rules:
- **Cover**: the garment alone on a plain white backdrop, run through `cover` (warm background, soft shadow, 1250×1000). If no such photo exists, use the cleanest front photo with `photo`.
- **Gallery**: 5–8 photos — on-model, flat lay, back, texture. Drop near-duplicates.
- **Close-ups**: 3–6 detail shots (collar, cuffs, fastening, lining, pockets…), `--crop` when the slide has captions around the photo, named `detail-<part>.webp`.
- **Never publish**: images with Chinese (or any supplier) text, prices, logos, watermarks, QR codes, promo banners, or size-chart graphics (re-type them as the size guide instead).
- **Video**: only without text overlays or watermarks; muted, 540 px wide, normally 1–5 MB. Skip the video rather than publish a branded one.
- Always look at the outputs (Read the WebP/contact sheet) before using them.

## 4. Seed entry

Add one object to `products` in `public/api/lib/seed/catalog.json` following the template in reference.md. `migrate.php` inserts it on deploy because the slug is new; after that Studio owns the product (seed changes to an existing slug only fill empty fields).

Content rules:
- **Name**: a short English woodland name + garment, same in all languages (Meadow Dress, Forest Cardigan, Acorn Hooded Jumpsuit). Slug = kebab-case of it. Do not use the supplier brand.
- **Texts**: write our own calm, factual copy in EN, TR and RU (subtitle, description with sizes by height, 2–3 paragraph `details`, 8–14 `specs` including composition, care-relevant facts, safety class, parcel weight, "Made in"). No marketing claims the listing does not support.
- **Size guide**: rows from the supplier table (size, height, weight, age, garment measurements), column titles and the note translated in all three languages.
- **Variants**: one per size and colour, SKU `PL-<3 letters>-<COLOUR 3>-<size>`, `weight_g` from the parcel weight.
- **Gender**: `unisex` unless the design is clearly for one; record the supplier's label in the sourcing note.
- **sort_order**: lower than the current lowest so the newest appears first.
- **Sourcing** (staff only, never shown publicly): supplier name in English and Chinese, clean URL, item number, `cost_cny` in fen (¥59 → 5900, use the price of the size you will stock most), note with supplier brand, colour name, parcel weight, supplier stock with date, returns policy, anything unusual.
- **Do not copy** supplier reviews or ratings — they are not Pipolune customers. Offer a real review system instead if asked.

## 5. Build and check

- `npx astro check` and `npm run build`.
- Build from the seed (PowerShell: `$env:CATALOG_SOURCE='seed'; npm run build; Remove-Item Env:CATALOG_SOURCE`) and confirm `dist/{en,tr,ru}/shop/<slug>/index.html` contains the gallery, the video file name, `spec-list`, `size-table` and `feature-grid`.

## 6. Ship

- Commit (`Add <Product name>`) with the WebP/MP4 files and the seed change; never commit the temp originals. Push to `origin main`.
- `gh run watch` the push run; its log must show `added products: <slug>`.
- The first build ran before the product existed in the database, so trigger one more build: `gh workflow run ci.yml --ref main`, then watch it to success (same as Studio → Publish).

## 7. Verify and report

- `https://pipolune.com/api/catalog?locale=ru`: the product has the gallery, video, sizeChart, features, specs, `weightG`, and **no** `sourcing` key; the public JSON must not contain the supplier name or URL.
- Open `/{en,tr,ru}/shop/<slug>/` in the browser, screenshot the gallery and the details/size section, and embed them in the report.
- Report in the user's language: what was added, prices and stock, which supplier images were left out and why, the video size, and that everything is editable in Studio → Products.
