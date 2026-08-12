# Metafield and metaobject definitions

Everything the Purelane sections read beyond Shopify's built-in product fields.

Create these **before** installing the theme. A section whose metafield does not
exist degrades quietly — no rating renders, no badge shows — but the page will
look unfinished until they are in place.

All definitions live in the `purelane` namespace so they are obviously
theme-owned and cannot collide with an app's.

---

## Product metafields

Admin → **Settings → Custom data → Products → Add definition**

| Name | Namespace and key | Type | Used by |
| --- | --- | --- | --- |
| Rating | `purelane.rating` | Rating | Product card, shop grid |
| Rating count | `purelane.rating_count` | Integer | Product card, shop grid |
| Card badge | `purelane.badge` | Single line text | Product card |
| Benefit line | `purelane.benefit` | Single line text | Combos tray, proof rotator |
| Silhouette | `purelane.silhouette` | Single line text | Image fallback |

### `purelane.rating` — Rating

- Type: **Rating**
- Range: min `1`, max `5`
- Access: storefronts **can read**

Shopify's native rating type is deliberate. It is the type the common review
apps (Judge.me, Loox, Okendo, Shopify Product Reviews) write into, so installing
one of them later populates this with no template change.

A product without a rating renders no rating block at all, rather than a zeroed
or invented score. Leave at least one seeded product unrated to confirm that.

### `purelane.rating_count` — Integer

- Type: **Integer**
- Access: storefronts **can read**

Renders as "· 237 reviews" beside the score, pluralised. Omitted when absent.

### `purelane.badge` — Single line text

- Type: **Single line text**
- Optional: add a list of choices to keep merchant wording consistent —
  `Best seller`, `Top rated`, `New`
- Access: storefronts **can read**

The corner pill on a product card. When a product is out of stock and has no
badge, the card shows "Sold out" in the same position instead.

### `purelane.benefit` — Single line text

- Type: **Single line text**
- Access: storefronts **can read**

The short outcome line under a product in a combo tray — "Cuts grease
instantly", "Melts hard water stains". It lives on the product rather than on
each combo block on purpose: the prototype retyped this per card, so the same
product could describe itself differently in two combos on the same screen.

### `purelane.silhouette` — Single line text

- Type: **Single line text**
- Choices: `kitchen`, `tap`, `floor`, `toilet`, `laundry`, `dish`, `metal`,
  `wm`, `handwash`, `eraser`, `kbtl`, `tbtl`, `mbtl`, `combo2`
- Access: storefronts **can read**

Only ever used when a product has **no image**. It picks which of the
prototype's original artwork stands in, so the layout holds instead of
collapsing. If it is not set, the theme guesses from the product handle, and
falls back to `kitchen`.

This is a deliberately small piece of scaffolding: once every product has real
photography it can be left empty everywhere.

---

## Creating them with the CLI

Faster than clicking through the admin, and it makes the definitions
reproducible. Requires the Admin API with `write_metafield_definitions`.

```bash
shopify app generate # or use the GraphiQL app on the dev store
```

Run against the Admin GraphQL API:

```graphql
mutation CreateRating {
  metafieldDefinitionCreate(definition: {
    name: "Rating"
    namespace: "purelane"
    key: "rating"
    type: "rating"
    ownerType: PRODUCT
    validations: [
      { name: "scale_min", value: "1" }
      { name: "scale_max", value: "5" }
    ]
    access: { storefront: PUBLIC_READ }
  }) {
    createdDefinition { id name }
    userErrors { field message }
  }
}
```

Repeat with:

| name | key | type |
| --- | --- | --- |
| `Rating count` | `rating_count` | `number_integer` |
| `Card badge` | `badge` | `single_line_text_field` |
| `Benefit line` | `benefit` | `single_line_text_field` |
| `Silhouette` | `silhouette` | `single_line_text_field` |

---

## Metaobjects — considered, not shipped

Combos, bundle tiers and reviews are all content that is not a native Shopify
object, so metaobjects are the obvious home for them. They are **not** used
here, and that is a decision rather than an omission.

They are modelled as section blocks instead because:

- **Blocks are what the theme editor is good at.** A merchant adds, reorders,
  removes and previews a combo inline. Editing a metaobject means leaving the
  editor for the admin, then coming back to see the result.
- **A missing definition breaks the editor.** A `metaobject_list` setting whose
  type does not exist in the store renders as an error in the theme editor.
  Blocks have no such dependency, so the theme installs cleanly on any store.
- **Nothing here is reused across pages yet.** Metaobjects earn their cost when
  the same record appears in several places. Today each combo appears once.

### When to switch

Move reviews to a metaobject as soon as they need to appear on product pages as
well as the homepage, or when a review app owns them. Move combos when the same
combo has to appear on a collection page or in a campaign landing page.

The definition to create at that point:

**`purelane_review`** — Admin → Settings → Custom data → Metaobjects

| Field | Type |
| --- | --- |
| `rating` | Integer (1–5) |
| `title` | Single line text |
| `body` | Multi line text |
| `author` | Single line text |
| `product` | Product reference |
| `verified` | True or false |

The reviews section would then take a `metaobject_list` setting alongside its
blocks and prefer it when set. That is a contained change: the card markup in
`sections/purelane-reviews.liquid` already reads from a single loop variable.
