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

The homepage reproduces boards 00/01 (desktop) and 03 (mobile). All imagery is cut from those boards by `scripts/brand-assets.py`, not redrawn:

- `public/brand/wordmark.svg` — vector trace of the board 00 lettering (provisional until the final hand-drawn vector exists).
- `public/favicon.ico`, `favicon-96.png`, `apple-touch-icon.png`, `brand/icon-*.png` — the four-season woodland from board 03 (winter upper left, spring upper right, autumn lower left, summer lower right).
- `public/images/home/` — hero woodland, season sprigs, product photos. Products are illustrative; prices and material claims from the boards are intentionally not shown.

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

Every push to `main` runs `.github/workflows/ci.yml`: the **Build** job builds `dist/` and stores it as an artifact; the **Deploy to cPanel** job uploads exactly that artifact over SFTP with `scripts/deploy.mjs`. Pull requests only build. The deploy job never cancels mid-upload.

`scripts/deploy.mjs` keeps the cPanel-generated blocks (PHP handler, ini directives) from the server's `public_html/.htaccess` and appends them to ours. It refuses to upload if those blocks are missing. Upload order: `_astro/` assets, then pages, then `.htaccess`. After uploading it clears cPanel's nginx page cache (`uapi NginxCaching clear_cache`) so the new version is served immediately.

Repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `SFTP_HOST` | `server.netinode.net` |
| `SFTP_USER` | `pipolune` |
| `SFTP_KEY` | private deploy key (ed25519), whole file |
| `SFTP_KNOWN_HOSTS` | `ssh-keyscan -H server.netinode.net` output line |

The matching public key is authorized for the `pipolune` cPanel user (SSH Access → Manage SSH Keys). Without the secrets, Build still runs and Deploy is skipped with a warning.

Manual deploy from your machine: copy `.env.deploy.example` to `.env.deploy`, set `SFTP_KEY_PATH` to your private key, then `npm run build && npm run deploy`.

Brand assets (logo SVG, favicons, social image) are generated by `npm run brand:assets` (Python with `pillow numpy potracer`).

Hosting: cPanel (user `pipolune`, shared IP `92.205.182.143`, Apache). DNS: Cloudflare. Mail settings and required DNS records: [docs/ops/email-and-dns.md](docs/ops/email-and-dns.md).
