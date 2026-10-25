# Pipolune — Brand and Website Brief (v0)

Working brief for the brand identity and tri-lingual product catalogue. Markdown version of [`archive/source/brand-and-website-brief-v0.en.docx`](../../archive/source/brand-and-website-brief-v0.en.docx).

> **Superseded visual direction.** Sections 3 (logo), 4 (palette) and 6 (typography) describe the earlier "Seaside Postcard" direction. They are replaced by [`docs/brand/approved-style-v1.1.ru.md`](../brand/approved-style-v1.1.ru.md) (woodland, four seasons, custom lettering, milk `#F7F2E8` / forest `#203D2B`). Do not implement them. The product, catalogue, functionality and trust rules in the other sections remain valid unless the UI/UX foundation says otherwise.

## 1. Project goal

Create an online showcase in English, Turkish, and Russian for a curated children's clothing and accessories boutique serving customers in Türkiye. The first version is for presenting products and measuring interest; it is not yet a full online shop and must not imply that orders or payments are available.

Use the website to learn which styles, products, colors, and sizes people save or ask about before buying inventory. Keep early costs low and avoid promising delivery, stock, or product claims that have not been verified. Provide a persistent language switcher so visitors can choose English, Turkish, or Russian; keep the selected language when they navigate between pages.

## 2. Brand

- **Name:** Pipolune
- **Audience:** parents and gift buyers looking for distinctive, attractive children's clothing and accessories.
- **Brand character:** thoughtful, warm, refined, gently imaginative, modern, and trustworthy.
- **Avoid:** overly childish visuals, cartoon mascots, generic marketplace styling, visual clutter, and exaggerated luxury language.
- **Languages:** English, Turkish, and Russian. Prices, if shown, should be in Turkish lira (₺).

## 3. Logo direction — superseded

The earlier logo idea was a custom wordmark with a sunrise inside the lowercase o:

- An elegant editorial serif wordmark.
- A slightly open oval lowercase o that remains readable as a letter.
- A small apricot half-sun inside the o.
- A single deep-teal flowing line suggesting a tide, integrated into the lower part of the o.
- A couple of very small, asymmetric rays.
- A compact icon derived from the custom o for the favicon and small uses.

Still valid: redraw the final mark as clean vector artwork and test it at small sizes and in one color. Do not use an off-the-shelf logo template or claim the design is legally unique. Before public brand launch or trademark filing, search for similar marks and clear the name and logo in the relevant trademark databases and territories, especially Türkiye and any intended export markets.

## 4. Color palette — Seaside Postcard (superseded)

| Role | Color | Working hex | Use |
|---|---|---|---|
| Main background | Salt Paper | #F7F3EB | Page background and large quiet areas |
| Cards / clear surfaces | Shell | #FFFDFA | Product cards, panels, forms |
| Primary brand | Deep Tide | #28565B | Main buttons, links, selected states, logo accents |
| Secondary accent | Sea Glass | #8FB8B5 | Secondary controls, soft decorative accents |
| Supporting cool tone | Mist Blue | #C9DDE0 | Quiet section backgrounds and subtle highlights |
| Warm accent | Apricot | #E5A07F | Sunrise mark, small highlights, occasional badges |
| Small highlight | Sunwashed Yellow | #E8C875 | Tiny accents only; never large blocks of text |
| Main text | Espresso Ink | #2C2523 | Headings and body text |

Still valid: keep most screens light and calm, and check text contrast and accessibility before launch.

## 5. Visual design reference

- **Visual inspiration:** [minimerri.com](https://minimerri.com/) — the polished boutique feeling, spacing, imagery, and editorial presentation. Do not copy its exact layout, assets, wording, or distinctive components.
- **Catalogue / technical inspiration:** [Scout & Co Kids](https://scoutandcokids.com/collections/baby) — catalogue structure, product browsing, collection organization, and product information. The visual identity must remain Pipolune's.

The overall direction is a refined storybook boutique: elegant serif headlines paired with clean sans-serif interface text; warm background; generous whitespace; fine botanical line details used sparingly.

## 6. Typography — superseded

Earlier working pairing: Cormorant Garamond (headlines) and Plus Jakarta Sans (interface). The approved style v1.1 leaves the interface font open and requires the logo to be the custom lettering, never a typed font.

Still valid: use readable sizes and restrained letter spacing. Avoid bubbly, handwritten, or novelty fonts. Confirm webfont licensing and support for Turkish characters (ğ, ı, İ, ö, ş, ü) and Cyrillic before launch.

## 7. Site structure

> The UI/UX foundation sets the main navigation as Shop / Seasons / New in / About. The list below is the earlier version.

### Main navigation

Home · New In · Clothing · Accessories · About Pipolune · Saved Items (heart icon)

Keep navigation short and easy to use on mobile. Include a visible language selector (EN / TR / RU) in the header or mobile menu and localize every navigation label. Add an announcement strip only when there is useful, accurate information, such as "Curated finds for little ones." Do not show fake promotions, urgency timers, or false stock counts.

### Homepage sections

- **Header:** Pipolune wordmark, compact navigation, search, saved-items icon, and EN / TR / RU language selector.
- **Hero:** one strong editorial image, concise headline, one primary action such as "Explore the collection." Avoid implying checkout is active.
- **Shop by category:** image-led entry points such as Baby, Kids, Clothing, and Accessories, adjusted to the actual catalogue.
- **Featured collection / New In:** a small, curated selection of available catalogue items.
- **Brand note:** brief explanation of Pipolune's point of view and curation.
- **Interest prompt:** invite visitors to save favorites or register interest; explain what happens when they do.
- **Footer:** contact/social links, About, privacy notice, and accurate availability and shipping status.

### Catalogue and product pages

Give visitors clear ways to browse the catalogue: Shop by Age, Shop by Gender, and Shop by Category. These work as browse pages or filters and can be combined. Keep an All Products view available.

- **Age / size bands:** 0–3 months, 3–6 months, 6–12 months, 12–18 months, 18–24 months, then year bands such as 2–3 years and 3–4 years if those sizes exist. Match the options to the actual assortment and supplier size labels. Show the original size label and measurements where available; treat age as guidance, not a fit guarantee.
- **Gender:** Girls, Boys, Unisex, plus All. Use Unisex for products actually presented as suitable for any child; do not infer gender from color alone. Visitors can always see all products without selecting a gender.
- **Product categories:** Dresses; Rompers & Jumpsuits; Matching Sets; Tops; Bottoms; Shorts; Swim; Pyjamas & Sleepwear; Shoes; Jackets & Outerwear; Accessories. Show a category only when the assortment contains relevant products. Add subcategories only when they help shoppers browse the real catalogue.
- **Curated edits and occasions:** keep editorial collections distinct from product categories, e.g. Everyday & Play, Party & Occasion, Special Days, Warm-Weather Edit, Family Matching, Gift Picks. Use these as collection landing pages when there are enough matching products; they are not substitutes for the category menu.

Localize all category, collection, and age-band labels in English, Turkish, and Russian. Keep the taxonomy and filter behavior consistent across languages.

- Use collection filters that match the actual data: category, age/size, color, and season when useful. The gender filter appears only when product data supports it.
- Product cards show the product name, price in ₺ if verified, and a heart/save control.
- Each color option has its own distinct product photo/card and its own saved state. Do not make a color swatch silently change to a photo that is not shown.
- Product detail includes verified material, pieces included, available sizes, care, fit notes, price, and availability status.
- Clearly label estimates or unknown details; do not invent fiber composition, safety certification, age suitability, stock, or delivery times.
- Where checkout is not active, replace "Buy now" with a truthful action such as "Save this item" or "Ask about this item."

## 8. Images and product information

- Preserve supplier/product photos as provided. Do not AI-inpaint, recolor garments, replace textures, change garment details, or add text over the product.
- Crop only when needed for layout, keeping the whole garment and important details visible.
- Remove interface or screenshot elements only when they are outside the product image and removal does not alter the product itself.
- Keep a record of the source and verified facts for each item.
- Product data distinguishes verified details from assumptions. Translate source information carefully and flag unclear terms for review.
- Do not publish supplier contact details or private supplier communications.

## 9. Functionality for the first version

- Responsive design, with mobile as a primary layout.
- Full interface and content localization in English, Turkish, and Russian, including navigation, forms, validation messages, empty states, product details, and footer. Do not mix languages on a page.
- A visible language switcher (EN / TR / RU); preserve the selected language across pages and, where practical, on return visits.
- Search and practical catalogue filters, with their labels and values localized.
- Account registration and sign-in using email address and password, with email validation, password rules, email verification, sign-out, and a secure password-reset flow.
- Visitors can browse without an account. Guests' favorites may be saved locally; registered users' favorites are associated with their account and persist across devices. Clearly explain the difference.
- Use a reputable authentication provider or secure authentication implementation. Never store or log plaintext passwords. Protect account data, provide an account deletion path, and publish clear privacy information before collecting registration details. Review applicable privacy and data-protection requirements for Türkiye and other target markets before launch.
- No checkout, payment collection, or order confirmation until those functions are deliberately added and tested.
- If collecting contact details later, ask for explicit consent, explain the purpose, and provide an appropriate privacy notice. Keep the initial demand test as lightweight as possible.
- Add analytics only with appropriate privacy disclosure and consent requirements for the markets served.

## 10. Content and trust

Write in clear, natural English, Turkish, and Russian, natural in each language rather than word-for-word. Keep product descriptions specific and warm rather than flowery. State that the site is a curated preview if that is still the operating model. Do not imply products are in stock or ready to ship unless confirmed. Avoid unsupported claims such as "organic," "hypoallergenic," "safe," or "certified."

## 11. Build and review checklist

- Confirm the spelling Pipolune consistently across the site and logo.
- Test mobile and desktop layouts.
- Test search, filters, product variants, and saved items. Confirm that browsing by age, gender, and product type works individually and in combination, and that all three taxonomies are localized.
- Test EN / TR / RU switching on desktop and mobile, including whether the choice persists and every page is fully localized.
- Test account registration, verification email, sign-in, sign-out, password reset, and account deletion. Confirm registered favorites persist across devices and guest favorites are described accurately.
- Check that every published product fact matches a source record.
- Verify contrast, keyboard navigation, image alt text, and readable type sizes.
- Confirm all contact, privacy, availability, and shipping copy is accurate.
- Before investing in inventory or publicly launching the mark, complete trademark/name clearance for the countries and product/service classes that matter.

## 12. Decisions still to confirm

- Final exact palette values and accessibility adjustments.
- Final vector redraw, wordmark font, and small-size icon behavior.
- Product categories and launch assortment based on demand research.
- Authentication provider, account/favorites data handling, privacy copy, and email-delivery setup.
- Trademark clearance and domain availability in intended markets; real prices, stock, delivery, and return information before publication.
