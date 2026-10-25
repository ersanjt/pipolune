# Pipolune

Children’s woodland boutique for Türkiye. Brand, concept art and UI/UX project archive.

**Status:** design and UX planning. This repository does not contain a production-ready store, working authentication, payment integration, installable custom font or print-ready packaging.

## Start here

1. [UI/UX foundation (Russian PDF)](docs/uiux/Pipolune_UIUX_Foundation_v1_RU.pdf)
2. [Selected visual direction](design/reference/00-selected-direction.png)
3. [Style rules](docs/brand/Pipolune_Approved_Style_v1_1_RU.md)
4. [Experience specification](docs/brand/Pipolune_Experience_Blueprint_v1_RU.md)
5. [Brand constitution](docs/brand/Pipolune_Brand_Constitution_v1_RU.md)

## Reference boards

- [Home and four seasons](design/reference/01-home-seasons.png)
- [Catalogue, menu, product](design/reference/02-catalogue-menu-product.png)
- [Mobile](design/reference/03-mobile.png)
- [Bag, checkout, account](design/reference/04-bag-checkout-account.png)
- [Administration](design/reference/05-admin.png)
- [Packaging](design/reference/06-packaging.png)

These are reference concepts, not pixel-perfect implementation files. Source artwork is retained unchanged. Incidental claims, prices, customers, material descriptions and quantities in generated artwork are illustrative, not verified catalogue data.

## Current decisions

- Name: Pipolune. Planned domain discussed: pipolune.shop; ownership and availability are not verified by this archive.
- Languages EN/TR/RU; prices TRY; calendar Europe/Istanbul.
- Continuous woodland: spring upper right, summer lower right, autumn lower left, winter upper left. Winter includes snow and red berries.
- Custom lettering: P without an R-like leg, star on i, curled p and leaf terminal e. Final vector/font production remains outstanding.
- Product photos must preserve real garment colours and material appearance.
- Initial public mode is a demand-testing showcase. Checkout designs do not authorize activating payments.

## IMPORTANT: rejected tracking revisions

All tracking redraws produced after board 04 were rejected by the user. The tracking PDF and its associated images are retained **only as history**, never as approved UI. Tracking must inherit the exact component system from board 04. Older documents may predate this decision; this note and the UI/UX foundation take precedence for tracking.

## Structure

- `docs/`: working brand and UX specifications.
- `design/reference/`: selected direction and six reference boards.
- `archive/`: previous documents, generated images, experiments and generation scripts. Presence in archive does not imply approval.
- `MANIFEST.json`: file sizes and SHA-256 hashes.

The early `archive/early-experiments/index.html` is the old Merhaba Seçki experiment, not the current Pipolune website. There is intentionally no root index.html or automatic deployment configuration.

Private account-verification screenshots, payment screenshots, chat screenshots, temporary renders, credentials and transfer helpers are excluded. This is the available project workspace archive, not an export of every historical chat or remote Drive file.

Prepared 25 October 2026. Target repository: https://github.com/ersanjt/pipolune
