# Purelane — Production Shopify Sections

Conversion of the `purelane-homepage.html` prototype into merchant-editable
Shopify sections running on the stock Dawn theme.

**Assignment:** Troopod AI Product Engineer build assignment.
**Guiding rule:** *The design is the spec. The code is not.* Visual output is
reproduced as-is; the underlying HTML/CSS was rebuilt to production standards
and every deviation is documented in [BUILD-NOTES.md](BUILD-NOTES.md).

---

## Start here

| Document | What it covers |
| --- | --- |
| [SETUP.md](SETUP.md) | Dev store, seeded catalogue, installing the theme, connecting products |
| [BUILD-NOTES.md](BUILD-NOTES.md) | What was wrong in the prototype, what changed and why, what is next |
| [docs/metafields.md](docs/metafields.md) | The five metafield definitions to create, and why not metaobjects |
| [AI-WORKFLOW.md](AI-WORKFLOW.md) | What was delegated to agents, where they broke, what to systematise |

If you read one thing, read **BUILD-NOTES §1** — the prototype ships two themes
and the second one wins, which reframes everything else.

---

## What is here

19 sections, 8 shared snippets, 23 assets, and a homepage template that
assembles them in the prototype's order.

### The five required sections

| Section | File |
| --- | --- |
| Hero | [purelane-hero.liquid](theme/sections/purelane-hero.liquid) |
| Shop / product grid | [purelane-shop.liquid](theme/sections/purelane-shop.liquid) |
| Best-selling combos | [purelane-combos.liquid](theme/sections/purelane-combos.liquid) |
| Bundles | [purelane-bundles.liquid](theme/sections/purelane-bundles.liquid) |
| Reviews rail | [purelane-reviews.liquid](theme/sections/purelane-reviews.liquid) |

### The rest

Backdrop, ticker, header, ingredients, pillars, proof, full range, reasons,
categories, trust bar, signup, progress rail, sticky CTA, footer.

### Shared components

`purelane-product-card`, `purelane-product-media`, `purelane-price`,
`purelane-rating`, `purelane-section-head`, `purelane-icon`,
`purelane-botanical`, `purelane-water`.

---

## Repository layout

```
theme/
  assets/       Tokens, shared base CSS, per-section CSS and JS
  sections/     The 19 sections
  snippets/     Shared, reusable components
  templates/    index.json wiring the homepage
docs/           Metafield and metaobject definitions
reference/      The original prototype, unmodified, as the visual source of truth
```

Nothing here overwrites a Dawn file. The only change to Dawn is adding the two
Google Fonts `<link>` tags to `layout/theme.liquid` — see SETUP.md.

---

## Architecture in one page

**Tokens → base → section.** `purelane-tokens.css` holds every colour, radius
and easing as a `--pl-*` custom property. `purelane-base.css` holds the
primitives every section reuses — type scale, glass surfaces, buttons, reveal.
Each section adds only what is its own.

**Everything is scoped.** The prototype styled `body`, `a`, `button` and ran a
global `* { margin: 0 }` reset. All of that is scoped to `.pl`, the wrapper each
section renders, and every class is prefixed `pl-`. Nothing can reach outside a
Purelane section into the rest of the storefront.

**Real Shopify data.** Prices, compare-at prices, savings, ratings, review
counts, product names, cart counts, navigation and collections all come from
Shopify. Combos and bundle tiers — which are not native Shopify objects — point
at the real bundle product that sells at that price, so no figure is typed by
hand.

**Editor-resilient by construction.** Every script keys state per element,
re-scans on `shopify:section:load`, tears down on `:unload`, and responds to
`shopify:block:select`. Adding, removing or reordering sections cannot leave a
stale timer, a detached node or an invisible section behind.

---

## Verification

Static checks that run over the whole theme:

```bash
# every section schema parses as JSON
python -c "import json,re,glob; [json.loads(re.search(r'\{%\s*schema\s*%\}(.*?)\{%\s*endschema\s*%\}',open(f,encoding='utf-8').read(),re.S).group(1)) for f in glob.glob('theme/sections/*.liquid')]"

# every script parses
for f in theme/assets/*.js; do node --check "$f"; done
```

Also verified: every `asset_url`, `render` and section type resolves; every
`section.settings.*` and `block.settings.*` reference matches a declared schema
id; `index.json` references only declared sections, blocks and settings.

**Not verified in a browser.** There was no development store to render against,
so nothing has been visually diffed against the prototype or run through
Lighthouse. Pixel accuracy rests on values being lifted directly from the
source. See BUILD-NOTES §7.

---

## Commit history

Each commit is one coherent piece — a section, a snippet, a decision — and its
message records the reasoning, including which prototype bug it fixes. `git log
-p <file>` answers "why is this like this" without re-deriving it.
