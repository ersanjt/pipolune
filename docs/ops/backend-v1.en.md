# Backend v1 — shop, accounts, Studio, CRM

How the live site works behind the static pages. No passwords or keys here; those live only on the server and in GitHub Actions secrets.

## Overview

| Part | Where | Notes |
|---|---|---|
| Static pages (SEO) | `src/pages/` → `public_html/` | Built by Astro. Product pages are generated from the live catalogue at build time (seed file as fallback). |
| Interactive parts | `src/islands/`, `src/studio/` | Preact; talk to `/api/…` on the same domain. |
| API | `public/api/` → `public_html/api/` | PHP 8.2, one front controller (`index.php`), code in `lib/` (blocked from the web). |
| Database | MariaDB 10.11 on the `pipolune` cPanel account | Schema in `public/api/lib/migrations/*.sql`, applied by every deploy. |
| Server config | `~/.pipolune/config.php` (outside `public_html`) | DB credentials, app secret, optional GitHub token and payment provider. Never committed. |
| Mail | PHP `mail()` from `info@pipolune.com` | Verification, password reset, staff invites, order request/update emails in EN/TR/RU. |

## Languages and geography

English is the main language (`x-default`). `/` is answered by `lang-redirect.php` with a temporary redirect:

1. Search engine and link-preview crawlers → `/en/`.
2. `pl_lang` cookie (set when the visitor uses the EN/TR/RU switcher) → that language.
3. Browser language starting with Turkish or Russian → `/tr/` or `/ru/`.
4. Cloudflare IP country: TR → `/tr/`; RU, BY, KZ, KG → `/ru/`.
5. Everything else → `/en/`.

The redirect is never cached (`Cache-Control: private, no-store`), so nginx and Cloudflare cannot serve one visitor's language to another. Every page has `hreflang` links for all three languages plus `x-default`; `sitemap.xml` lists them too. Account, bag, checkout and order pages are `noindex` and blocked in `robots.txt`.

## Brand fonts

- **Pipolune Display** (headings) — derived from Cormorant Garamond, weights 500 and 600.
- **Pipolune Text** (body) — derived from EB Garamond, weights 400 and 500.

Both are SIL Open Font License derivatives with brand additions: a four-point star ✦ and a stylistic set (`ss08`) with the star-dotted “i” from the logo. Each covers Latin with full Turkish, Cyrillic for Russian, and the lira sign ₺. The web files are split per script, so English and Turkish pages download only Latin and Russian pages add Cyrillic.

- Desktop fonts for designers: `design/fonts/dist/*.ttf`.
- Licences: `design/fonts/source/OFL-*.txt` (must ship with the fonts).
- Rebuild: `npm run brand:fonts` (`scripts/build-fonts.py`).

They are not drawn from scratch. A fully custom typeface would be a separate type-design project.

## Sales mode

Set by an owner in Studio → Settings.

| Mode | Visitor experience |
|---|---|
| `off` (default) | Bag works; checkout is closed; visitors send an enquiry instead. |
| `request` | Checkout sends an order request (no payment). The team confirms by email and manages it in Studio → Orders. |
| `live` | Refused until a tested payment provider is configured on the server. |

Confirming an order reserves stock; cancelling a confirmed order returns it. Order, payment and delivery statuses are separate.

## Currencies

Every product has three prices typed by hand in Studio — lira (TRY), dollar (USD) and ruble (RUB). There is no exchange-rate conversion. The page language picks the default (English → USD, Turkish → TRY, Russian → RUB); the header switcher stores another choice in the `pl_currency` cookie, which the API also reads. The bag, checkout and order use the chosen currency, and an order keeps it (`orders.currency`). Standard delivery is set per currency in Studio → Settings; an empty value means delivery is confirmed by email.

## Studio (`/studio/`)

Permissions are defined once in `public/api/lib/Perm.php` and sent to Studio with the signed-in user, which hides what a role cannot do. The API checks every request again.

| Role (`users.role`) | Access |
|---|---|
| Owner (`owner`) | Everything, including staff and roles. |
| Store manager (`manager`) | Everything except staff and roles: products and prices, sourcing, stock, orders and payments, CRM, CSV export, sales report, sales mode and delivery price, content, publishing. |
| Editor (`editor`) | Products, prices, sizes, sourcing, photos, videos, texts, stock, seasons and homepage, publishing. |
| Content creator (`content`) | Product texts, specifications, photos, videos, close-ups and size guides; can add draft products. No prices, status, sizes or sourcing. |
| Accountant (`accountant`) | Orders (read) and payment status, order notes, customers, CSV export, sales report, sourcing costs (read), stock (read). |
| Fulfilment (`fulfilment`) | Orders and delivery, payment status, stock, customers, enquiries. |
| Customer support (`support`) | Customers and their notes, enquiries, order notes (read-only orders). |

### Product content

Each product has a photo gallery (the first photo is the cover), an optional video with a cover image (MP4/WebM uploaded to `uploads/videos/`, limited by the PHP upload size), a size guide (column titles and note per language, rows shared), close-ups with captions per language, and per-language details and specifications. Variants carry the parcel weight. Supplier, link, item number, cost (CNY) and sourcing notes are visible to staff with sourcing access only and never leave the Studio API.

`migrate.php` fills empty media and text fields of existing products from `lib/seed/catalog.json`; it never overwrites content edited in Studio.

The CRM treats a customer as an email seen anywhere: an account, an order or an enquiry. Staff can add internal notes per customer.

**Publish site** rebuilds the static product pages and sitemap after product edits (GitHub Actions `workflow_dispatch`). It needs `github.token` (fine-grained, Actions: write on `ersanjt/pipolune`) in the server config; without it the button explains that publishing is not configured.

### Adding staff

From Studio → Settings → User roles & permissions (owner), choosing any role above, or over SSH:

```bash
/opt/cpanel/ea-php82/root/usr/bin/php ~/public_html/api/lib/bin/invite-staff.php someone@example.com owner ru
```

The person receives an email to set a password (valid 72 hours).

## Security notes

- Sessions are stored in the database; cookies are `Secure`, `HttpOnly`, `SameSite=Lax`.
- Every write request must carry the `X-Pipolune: 1` header and come from the site's origin (CSRF protection).
- Sign-in, registration, password reset, enquiries and checkout are rate-limited.
- Guest order links use a secret token, never the order number alone.
- Uploaded photos are re-encoded to WebP; scripts cannot run from `uploads/`.
- API responses are `no-store` so the nginx cache never shares personal data.

## Operations

- Run migrations by hand: `/opt/cpanel/ea-php82/root/usr/bin/php ~/public_html/api/lib/bin/migrate.php`.
- Health check: `https://pipolune.com/api/health` → `{"ok":true,"db":true}`.
- Local development: `npm run dev` proxies `/api` to the live server, so the bag, accounts and Studio work against real data. Be careful with Studio changes.
