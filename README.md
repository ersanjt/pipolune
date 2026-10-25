# Pipolune

Children's woodland boutique for Türkiye — brand, UI/UX and website. Languages EN / TR / RU, prices in TRY, calendar Europe/Istanbul.

**Status:** design and early development. The live site is a pre-launch page; there is no catalogue, account, checkout or payment yet, and the site must not suggest otherwise.

Website: https://pipolune.com · Contact: info@pipolune.com

## Start here

1. [Approved style v1.1 (RU)](docs/brand/approved-style-v1.1.ru.md) — logo, colours, four seasons, rules. **Source of truth for visuals.**
2. [UI/UX foundation v1 (RU)](docs/uiux/uiux-foundation-v1.ru.md) — site map, scenarios, components, mobile, checkout and tracking rules ([original PDF](docs/uiux/uiux-foundation-v1.ru.pdf)).
3. [Website brief v0 (EN)](docs/product/website-brief-v0.en.md) — product, catalogue and trust requirements. Its logo, palette and typography sections are superseded by the approved style.

## Reference boards

| # | Board |
|---|---|
| 00 | [Selected direction](design/reference/00-selected-direction.png) |
| 01 | [Home and four seasons](design/reference/01-home-seasons.png) |
| 02 | [Catalogue, menu, product](design/reference/02-catalogue-menu-product.png) |
| 03 | [Mobile](design/reference/03-mobile.png) |
| 04 | [Bag, checkout, account](design/reference/04-bag-checkout-account.png) — also the only approved source for order tracking UI |
| 05 | [Studio and administration](design/reference/05-admin.png) |
| 06 | [Packaging](design/reference/06-packaging.png) |

These are concept images, not pixel-perfect specs. Products, prices, customers, orders and material claims (e.g. "organic", "linen") in them are illustrative and must not be published as real data. All tracking redraws made after board 04 were rejected.

## Repository structure

```
docs/brand/        approved brand style
docs/uiux/         UI/UX specification (Markdown + original PDF)
docs/product/      website/product brief
docs/ops/          email, DNS and hosting settings (no passwords)
design/reference/  concept boards 00–06
archive/source/    original source files (docx)
public/            static assets served as-is (logo, favicon, .htaccess)
src/               website source (Astro)
  i18n/ui.ts       all EN/TR/RU interface text
  styles/          design tokens and global CSS
  pages/[lang]/    localized pages → /en/, /tr/, /ru/
.github/workflows/ build + deploy to the cPanel server
```

`public/brand/wordmark-concept.png` and the favicon are cut from the concept board. They are placeholders until the final vector logo is drawn.

## Development

Requires Node.js 24 (or 22.23.4+).

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # static site in dist/
npm run preview   # serve dist/ locally
```

Add or edit text in `src/i18n/ui.ts` for all three languages at once. Colours and spacing are CSS variables in `src/styles/tokens.css`; use them instead of raw hex values.

## Workflow

- `main` is the live branch. Every push to `main` builds the site and deploys it to the server.
- Pull before you start (`git pull --rebase`), commit small changes with clear messages, push when done.
- For larger changes, open a branch and pull request — the build runs on every PR without deploying.
- Never commit passwords, server credentials, invoices or personal data. Local-only files go in `private/` (git-ignored).

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds the site and uploads `dist/` to the cPanel account over FTPS. It needs these repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `FTP_SERVER` | `92.205.182.143` |
| `FTP_USERNAME` | cPanel FTP account, e.g. `deploy@pipolune.com` |
| `FTP_PASSWORD` | password of that FTP account |
| `FTP_SERVER_DIR` | optional, default `public_html/` |

Until the secrets are set, the build still runs and the deploy step is skipped with a warning.

Hosting: cPanel (user `pipolune`, shared IP `92.205.182.143`, Apache). DNS: Cloudflare. Mail settings and required DNS records: [docs/ops/email-and-dns.md](docs/ops/email-and-dns.md).
