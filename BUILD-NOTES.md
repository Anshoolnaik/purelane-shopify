# Build notes

What I found in `purelane-homepage.html`, what changed on the way to production
Shopify sections, and what I would do next.

The rule I worked to: **the design is the spec, the code is not**. Every visual
value here — colour, size, easing, breakpoint — is lifted from the prototype.
Where I changed something, it is because the original was broken, unreachable,
or could not survive being a Shopify section. Each of those is listed below.

---

## 1. The prototype ships two themes, and the second one wins

The single most important thing about this file, and the thing that reframes
everything else.

`purelane-homepage.html` contains **two `<style>` blocks**. The first (lines
12–633) declares `:root` with a dark purple palette. The second (lines 634–823),
headed `VERSION 2 - BRAND COLOURS (light)`, re-declares `:root` with a pale mint
and dark-ink palette, then overrides roughly 90 specific rules.

The second block wins the cascade. **The design that actually renders is the
light one.** The dark palette never paints a single pixel.

So `assets/purelane-tokens.css` carries the V2 values only. Reproducing both
would have recreated exactly the bug this file exists to prevent: a second
palette silently overriding the first, inside a theme where a merchant can
also set colours.

The structural tokens — `--r`, `--r-sm`, `--maxw`, `--sec-y`, `--ease` — came
from V1 and were never overridden, so they carry through unchanged.

**Knock-on effect:** roughly 150 lines of V1 colour declarations are dead. They
are not reproduced. If the intent was a switchable dark mode, that is a feature
to build deliberately, not to leave as a cascade accident.

---

## 2. Bugs found and fixed

Each of these is a defect in the prototype, not a preference.

### 2.1 Duplicate SVG ids in the backdrop

`wl-a` and `wl-b` each define a gradient with `id="cg"` and filters `id="wf"`
and `id="wf2"`. Duplicate ids are invalid HTML, and `url(#cg)` resolves to
whichever appears first in the document — so **`wl-b` was painting with `wl-a`'s
gradient**. It looked identical only because the two definitions happened to
match, character for character.

Latent in a standalone page. **Live in a theme**, where a merchant can place the
backdrop section twice and every reference in the second copy would reach back
into the first.

Fixed: every id is scoped by layer and by `section.id`
(`cg-a-{{ section.id }}`). The definitions neither layer used — `wf2` in `wl-a`,
`wf` in `wl-b` — are dropped.

### 2.2 The proof stats strip was outside its own grid

```html
<div class="proof">
  <div class="proof-l">…</div>
  <div class="glass-2 rot">…</div>
  </div>                                      <!-- .proof closes here -->
  <div class="stats proof-stats" style="grid-column:1/-1">
```

The stats strip carries `grid-column: 1 / -1`, but the grid container closed one
`<div>` early, so the strip was a **sibling** of the grid rather than a child.
The declaration did nothing. It looked approximately right only because a
full-width block below a grid lands in roughly the same place.

Fixed: the strip is inside the grid, where the span works.

### 2.3 The footer's legal line is invisible

```html
<p style="font-size:12px;color:rgba(236,230,247,.5)">Purelane Eco Products Pvt Ltd</p>
```

That colour is V1 dark-theme pale lavender at 50% opacity — set **inline**, so
the V2 light block could not override it. On the near-white footer it is
effectively unreadable, and nowhere near any contrast threshold.

Fixed: uses the tertiary ink token.

### 2.4 The swipe hint shows at every width

`.striphint { display: block }` is declared **only inside** the
`max-width: 760px` media query, with no base rule. Since its default is already
`block`, "Swipe to see the full shelf" rendered at every width — including the
desktop layout, which does not scroll.

Fixed: `display: none` at base, `block` at the scrolling breakpoint.

### 2.5 A navigation dot that goes nowhere

The progress rail and the footer both link to `#voices`. **No element with that
id exists anywhere in the document.** The corresponding `.voices` CSS (three
rules including two media queries) is also dead — no markup ever uses it.

Fixed: rail targets are blocks, so a broken anchor is visible in the theme
editor rather than silently dead on the page.

### 2.6 The type scale doubles as animation hooks

```html
<span class="hp p-kbtl a d1" role="img" …>
```

```css
.d1 { font-size: clamp(48px, 8.6vw, 112px); … }        /* the display scale */
.hslide.on .hp.d1 { transition-delay: .06s }           /* a stagger hook */
```

`.d1`, `.d2` and `.d3` are both the display type scale and the hero's stagger
delays. The empty product spans were inheriting a 112px uppercase font.
Harmless while the spans are empty; a landmine the moment merchant content
lands in one.

Fixed: renamed to `.pl-hero__shot--s1/2/3`, which describes what they do.

### 2.7 Numbers that disagree with each other

- The **Complete home bundle** combo card says "5 products" and lists five in
  its copy, while its tray shows three.
- Per-product bundle prices are rounded inconsistently: ₹349/2 shown as **₹174**
  and ₹499/3 as **₹166** are floored, ₹799/5 as **₹160** is rounded.

Both are symptoms of hand-typed figures. Fixed by deriving: the count comes from
the products actually picked, the per-product price from the bundle price
divided by the tier quantity. Both stay overridable, because a merchant
sometimes wants the marketing number.

### 2.8 Controls that do nothing

| Control | In the prototype | Now |
| --- | --- | --- |
| Burger menu | Button with no handler and no menu behind it | Real disclosure panel: `aria-expanded`, Escape to close, click-outside dismissal, focus returned |
| Add to cart | `<button>` with no form | Real product form, works without JS, goes through Dawn's cart |
| Product card | Linked nowhere | Title and image link to the product page |
| Signup form | `onsubmit="return false"` | Real Shopify customer form, tagged `newsletter`, with success and error states |
| Cart badge | Literal `0` and `aria-label="Cart, 0 items"` | Real `cart.item_count`, pluralised |

### 2.9 Dead CSS

Beyond the V1 palette:

- **~45 rules for a product detail page** (`.crumb`, `.gal-main`, `.vopt`,
  `.cmp`, `.rscore`, `.stickybuy`, `.vb .meter`…) — the file has no PDP.
- `.grain` — styled in V2, no element anywhere.
- `.voices` — see 2.5.

None reproduced.

---

## 3. Changes forced by Shopify

Not bugs. Things that were fine in a single HTML file and impossible in a theme.

### 3.1 There were no images

**The prototype contains zero `<img>` tags.** All fourteen product "photos" are
base64 SVG data URIs held in CSS custom properties and painted as
`background-image` on `<span>`s. There was nothing to convert — the images had
to be built.

Every product visual is now a real `product.featured_image` rendered through
`image_tag` with a srcset ladder, a context-appropriate `sizes`, explicit
dimensions for CLS, and caller-controlled `loading`/`fetchpriority` so the hero
can go eager while grids stay lazy.

Sizing keeps the prototype's model exactly: heights are set per context and the
width follows from the aspect ratio, so swapping a tall bottle for a wide carton
reflows the way the original did.

The fourteen silhouettes are kept for one job — **the fallback when a product
has no image**. That is a real merchandising state, it is in the seeded
catalogue on purpose, and falling back to the prototype's own artwork keeps the
layout intact where a grey placeholder box would break it.

### 3.2 Global styles had to be scoped

The prototype styled `body`, `a`, `button`, `img` and ran `* { margin: 0 }`.
Dropped into Dawn that restyles the entire storefront — header, cart drawer,
product pages, checkout-adjacent templates.

Everything is scoped to `.pl`, the wrapper each section renders, and components
are prefixed `pl-`. Nothing in this build can reach outside a Purelane section.

For the same reason the sticky CTA cannot use `body { padding-bottom: 74px }`,
so a spacer element reserves the same room.

### 3.3 Every script had to survive the theme editor

The prototype ran one IIFE at load: `querySelectorAll` once, `setInterval` never
cleared, `getElementById` for singletons. In the theme editor, sections are
destroyed and recreated on every change.

| Prototype | Consequence in the editor | Fix |
| --- | --- | --- |
| `.rv` collected once at load | A section added later never animated — and since the CSS hid `.rv` unconditionally, it rendered **invisible** | Singleton re-scans on `shopify:section:load`; elements are only hidden once JS marks them observed, so a script failure can no longer strand a section at opacity 0 |
| `setInterval` never cleared | Every edit left another timer running against a detached node | Teardown on `shopify:section:unload` |
| `getElementById('hstage')` | A second instance would drive the first | Per-element state on a `WeakMap` |
| `[data-scene]` captured once | Added sections never affected the backdrop; removed ones left stale entries | Re-read on section load and unload |
| Block selection ignored | Editing slide 3 while looking at slide 1 | `shopify:block:select` jumps to that slide and holds it |

### 3.4 In-page anchors had to be reintroduced

Shopify generates its own `shopify-section-*` ids, so `#shop`, `#bundles` and
`#ingredients` had nothing to resolve against once the markup became sections.
Every content section takes a merchant-controlled anchor id.

### 3.5 Content had to become settings

Everything the prototype hardcoded is now a setting or a block: headings, copy,
badges, feature lists, labels, intervals, column counts. Prices, ratings,
product names and cart counts come from Shopify.

For combos and bundle tiers — which are not native Shopify objects — the model
is a block holding real products **plus the bundle product that actually sells
at that price**. Price, compare-at and the saving all derive from it. See
[docs/metafields.md](docs/metafields.md) for why these are blocks and not
metaobjects, and what would trigger the switch.

---

## 4. Accessibility

The prototype was better than most on this — real focus styles, a
`prefers-reduced-motion` block, `aria-label` on icon buttons. These are the gaps
that were left.

| Issue | Fix |
| --- | --- |
| Reduced motion stopped animations but left content unreachable — the reviews marquee was an `overflow: hidden` strip, so every card past the fold was gone; the rotator froze on product one forever | Marquees become real scroll regions with the duplicate set collapsed; the rotator lays out as a static row |
| The reviews track holds each review **twice** for the seamless loop, so screen readers announced every review twice | The clone pass is generated and `aria-hidden` |
| The whole ticker was `aria-hidden` — but "Free shipping on every bundle" and "Buy 3 at flat ₹499" are offers, not decoration | First pass announced, clone pass hidden |
| Horizontal rails were pointer-only | Combos, reviews and the range strip are labelled, focusable scroll regions |
| Carousel dots 6px, rail dots 8px — far below minimum target size | Transparent 24–32px hit areas, marks unchanged |
| Stacked inactive carousel slides stayed in the tab order | `inert` plus `aria-hidden` |
| The carousel changed silently | A polite live region announces the active composition |
| `★★★★★` announced as five separate star characters | Hidden from AT behind a single readable score |
| A bare `<s>` compare-at price read as a second, contradictory price | Labelled "Regular price" |
| Three identical "Learn more" links; repeated "Shop bundle" links | Each carries its own context |
| Email field had a placeholder and no label | Visually hidden `<label>` |
| Marquee paused on hover only | Also on `focus-within`, so a keyboard reader is not carried away mid-sentence |
| No current-page marker in the nav | `aria-current="page"` |

---

## 5. Performance

**Helping:** one shared token and base stylesheet instead of per-section
duplication; 68 inline SVGs reduced to one snippet rendered by name; responsive
`srcset` with `sizes` derived from the actual column count; explicit image
dimensions; eager/high-priority only on the hero, lazy everywhere else; all
scripts `defer`; three chrome behaviours sharing one rAF-throttled scroll
listener; parallax skipped entirely on coarse pointers and under reduced motion.

**Fixed:** the prototype recomputed an `offsetTop`/`offsetParent` walk for every
section on every scroll frame. That walk also returns the wrong value as soon as
an ancestor is positioned or transformed, which most Dawn section wrappers are.
Offsets now come from `getBoundingClientRect()` and are cached per resize.

**Known costs, carried deliberately:**

- **The backdrop is ~22 KB of inline SVG paths** with four `mix-blend-mode`
  layers, two `feTurbulence`/`feDisplacementMap` filters and `will-change:
  transform`. This is the single largest performance item in the build, and it
  is the design. It is a section setting, so it can be turned off without
  touching code — the gradient and vignette remain. The prototype already drops
  the heaviest layer and the bubbles below 760px; that trade is kept.
- **`backdrop-filter: blur()` on every glass surface** is expensive to
  composite. The prototype reduces the radius on mobile; kept as-is.
- **Fonts load from Google Fonts**, matching the prototype exactly. See 6.1.

---

## 6. What I would do next

### 6.1 Self-host the fonts

Two render-blocking requests to a third-party origin sit in front of first
paint. Self-hosting Outfit and Inter as WOFF2 in `assets/`, with
`font-display: swap` and a preload for the two weights above the fold, removes a
DNS lookup, a TLS handshake and a redirect. I left it as-is because it is the
one change that could shift rendered type, and pixel accuracy was the higher
priority for this submission.

### 6.2 Make the bundle builder real

"Build this box" and "Shop bundle" link to a product. The design implies a
picker — choose any 3, one flat price — and the rail note says as much
("opens the bundle picker with these products already added"). That is a
Cart Transform or bundle app decision, not a section decision, and it is the
biggest functional gap between this build and the design's intent.

### 6.3 Move reviews to a metaobject

As soon as reviews need to appear on product pages too, or a review app owns
them. The definition is written up in [docs/metafields.md](docs/metafields.md);
the section already loops over a single variable, so it is a contained change.

### 6.4 Ratings from a real review app

`purelane.rating` deliberately uses Shopify's native rating type, so installing
Judge.me or Loox populates it with no template change. Worth doing before
launch — hand-entered ratings on a live store are a compliance risk.

### 6.5 Add-to-cart without a page load

The card form posts and navigates, which is correct and works without JS. Dawn's
cart drawer would be better UX. That means wiring `routes.cart_add_url` with
`sections` for a Section Rendering API response — deliberately out of scope
here, because a half-wired cart is worse than a working page load.

### 6.6 A visual regression harness

Everything here was verified by reading. The right next step is Playwright
screenshots of each section at 375/768/1024/1440 against the prototype, run in
CI. That is what would let anyone change this theme confidently.

---

## 7. Scope and gaps

Built: all 13 sections from the prototype, plus the backdrop, header, footer,
progress rail and sticky CTA — 19 sections, 9 snippets, and a homepage template
that assembles them in the prototype's order.

Deliberately not done, and why:

- **No dark mode.** The V1 palette is dead code, not a mode. Shipping it would
  reintroduce the bug in section 1.
- **No metaobjects.** Reasoned in [docs/metafields.md](docs/metafields.md).
- **No bundle picker logic.** See 6.2.
- **No automated tests.** See 6.6.

Verified:

- **`shopify theme check` — 28 files inspected, no offenses.** Shopify's own
  linter, run against the whole theme.
- Every section schema parses as JSON; every script passes `node --check`.
- Every `asset_url`, `render` target and section type resolves; every
  `section.settings.*` and `block.settings.*` reference matches a declared
  schema id; `index.json` references only declared sections, blocks and
  settings.
- All fourteen silhouettes and five botanical drawings were extracted
  programmatically rather than retyped, so no path data was transcribed by hand.

Theme Check earned its keep: it caught the rating snippet assigning to `empty`,
which is a **Liquid keyword literal** used in comparisons like `value == empty`.
Assigning to it shadows the language's own token. That reads as a style warning
and is not one.

**Not verified in a browser.** I did not have a development store to render
against, so nothing here has been visually diffed against the prototype or run
through Lighthouse. The pixel-accuracy claim rests on values being lifted
directly from the source, not on a screenshot comparison. Section 6.6 is how I
would close that, and it is the first thing to do after step 5 of
[SETUP.md](SETUP.md).
