# Setup

From nothing to the Purelane homepage running on a development store.

Steps 1–3 are store setup, 4 installs the theme, 5 connects the sections to real
products. Budget about 45 minutes, most of it seeding the catalogue.

---

## 1. Development store

1. Create a free Shopify Partner account at
   [partners.shopify.com](https://partners.shopify.com).
2. **Stores → Add store → Create development store**.
   - Store name: `purelane-dev` (or anything)
   - Purpose: **Test and build**
   - Data: start with an empty store
3. In the new store, set the currency to **INR** under
   **Settings → Store details**, so the `money` filter renders ₹ the way the
   design does. Every price in the theme goes through that filter, so nothing
   needs editing if you choose a different currency.
4. **Online Store → Preferences → Password protection** — note the password.
   That, plus the store URL, is deliverable 1.

## 2. Metafield definitions

Follow [docs/metafields.md](docs/metafields.md) and create the five product
metafield definitions before installing the theme.

## 3. Seed the catalogue

Create **at least 8 products**. The theme is built against the edge cases as
much as the happy path, so seed those deliberately — three of them exist to
prove the layout holds when data is missing.

### Core products

| Title | Price | Compare at | Image | Notes |
| --- | --- | --- | --- | --- |
| Tap cleaner & limescale remover | 200 | 299 | yes | badge `Best seller` |
| Kitchen cleaner, foaming | 200 | 299 | yes | badge `Best seller` |
| Copper, bronze & brass cleaner | 200 | 299 | yes | badge `Top rated` |
| Washing machine cleaner & descaler | 200 | 299 | yes | badge `New` |
| Non-toxic toilet cleaner | 200 | 299 | yes | |
| Natural herbal floor cleaner | 200 | 299 | yes | |
| Organic dishwash liquid gel | 200 | 299 | yes | |
| Gentle hydrating liquid handwash | 200 | 299 | yes | |

### Required edge cases

| Case | How to seed it | What it proves |
| --- | --- | --- |
| **Sold out** | Any product, inventory `0`, "Continue selling when out of stock" **off** | Card shows a disabled control and a "Sold out" badge instead of a dead Add to cart |
| **No image** | Delete the image on one product, set `purelane.silhouette` to a matching value | The prototype's silhouette stands in and the grid does not collapse |
| **Very long title** | e.g. `Extra strength plant-based multi-surface foaming kitchen cleaner and degreaser with lemongrass and neem, refill pack` | Title clamps to three lines and the card stays the height of its row |
| **No rating** | Leave `purelane.rating` empty on one product | No rating block renders, and the price still aligns with the rest of the row |
| **No compare-at price** | One product with price only | No strikethrough and no saving badge |

### Bundle products

The combos and bundle tiers read their price from a real product, so create
these too. They are what the merchant actually sells at the bundle price.

| Title | Price | Compare at |
| --- | --- | --- |
| Build your box — any 2 | 349 | 598 |
| Build your box — any 3 | 499 | 897 |
| Build your box — any 5 | 799 | 1495 |
| Kitchen essentials combo | 499 | 897 |
| Laundry care bundle | 499 | 947 |
| Complete home bundle | 799 | 1495 |
| Bathroom deep clean | 499 | 897 |
| Hard water solution kit | 349 | 598 |

### Metafield values

On each core product set:

- `purelane.rating` — around `4.8`
- `purelane.rating_count` — a plausible number, e.g. `237`
- `purelane.benefit` — the outcome line used in combo trays, e.g.
  "Cuts grease instantly", "Melts hard water stains"
- `purelane.badge` — only where the design shows a pill

### Collections

| Collection | Contents | Used by |
| --- | --- | --- |
| `Bestsellers` | the 8 core products | Shop grid |
| `Full range` | every single product | Full range strip |
| `Kitchen`, `Bathroom`, `Laundry`, `Hard water` | the relevant products | Category cards |

### Navigation

**Content → Menus**. The header and footer read real menus.

- `Main menu` — Home, Ingredients, How it works, Shop, Bundles
  (link the in-page ones to `/#ingredients`, `/#how`, `/#shop`, `/#bundles`)
- `Footer shop`, `Footer about`, `Footer policies`

## 4. Install the theme

**`theme/` is a partial theme on purpose.** It has assets, sections, snippets
and one template — but no `layout/`, `config/` or `locales/`, because those
belong to Dawn. Running `shopify theme dev` on `theme/` directly will not work.
It has to be merged into a Dawn checkout first.

### Install the CLI

```bash
npm install -g @shopify/cli@latest
```

The current CLI needs **Node 22.8 or newer**. On older Node you will see
`does not provide an export named 'enableCompileCache'` — pin the CLI instead:

```bash
npm install -g @shopify/cli@3.70.0
```

### Pull Dawn, merge, run

```bash
# 1. authenticate and pull the store's live theme (Dawn) into ../dawn
shopify theme pull --store your-store.myshopify.com --path ../dawn

# 2. copy the Purelane sections in, and add the two font links
node scripts/install-into-dawn.mjs ../dawn

# 3. run it
cd ../dawn
shopify theme dev --store your-store.myshopify.com
```

Step 1 opens a browser to log in. Step 3 prints a preview URL and hot reloads
as you edit.

Add `--dry-run` to step 2 to see what it would touch without writing anything.

The script copies 51 files. The **only** Dawn file it replaces is
`templates/index.json` — the homepage this build exists to replace. Everything
else is new. It also adds the Outfit and Inter `<link>` tags to
`layout/theme.liquid`, which is the single edit to a Dawn file this project
needs, and it is idempotent — re-running will not duplicate them. See
[BUILD-NOTES.md](BUILD-NOTES.md) §6.1 for why the fonts are not self-hosted yet.

### Publishing a copy instead of running the dev server

```bash
cd ../dawn
shopify theme push --store your-store.myshopify.com --unpublished --theme "Purelane"
```

### Without the CLI

Copy the contents of `theme/assets`, `theme/sections`, `theme/snippets` and
`theme/templates` into Dawn through **Online Store → Themes → Edit code**, then
add the font links to `layout/theme.liquid` by hand.

### Checking the code without a store

Theme Check runs offline and needs no authentication:

```bash
cd theme && shopify theme check
```

### Header and footer

The Purelane header and footer are sections, so they go in the header and footer
groups rather than the homepage template:

1. Theme editor → **Header** group → **Add section** → *Purelane header*, then
   hide or remove Dawn's own header.
2. Theme editor → **Footer** group → **Add section** → *Purelane footer*.

Or leave Dawn's header in place — the Purelane sections do not depend on it.
If you do, set the hero's **Top padding** to about `40` so the headline is not
pushed down by padding meant to clear a floating header.

## 5. Connect products

Open the theme editor on the homepage. The layout is already assembled from
`templates/index.json`; what it needs is the product pickers.

| Section | What to set |
| --- | --- |
| **Hero** | On each of the three stage compositions, pick 1, 2 and 3 products, and set "Price comes from" to the matching *Build your box* product on the two multi-buy slides |
| **Shop grid** | Collection → `Bestsellers` |
| **Combos** | On each combo, pick the tray products and set the bundle product |
| **Bundles** | On each tier, set the bundle product and the tray products |
| **Reviews** | Optionally set the product each review is about |
| **Full range** | Collection → `Full range` |
| **Categories** | A collection per card |
| **Proof** | Add rotator product blocks and pick products |

## 6. Check it

- **375px** — the narrowest supported width. Nothing should scroll sideways.
- **Theme editor** — add, remove and reorder sections. Nothing should throw or
  render invisible.
- **Keyboard only** — Tab through the page. The combos rail, the reviews rail
  and the full-range strip are all reachable and scrollable.
- **Reduced motion** — turn it on at the OS level. Marquees stop and become
  scrollable, the hero stops cycling, the rotator lays out as a static row.
- **Lighthouse** — run it on the homepage. See BUILD-NOTES.md for the known
  cost of the backdrop's inline SVG and how to trade it off.
