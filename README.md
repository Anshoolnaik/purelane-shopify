# Purelane — Production Shopify Sections

Conversion of the `purelane-homepage.html` prototype into merchant-editable Shopify
sections running on the stock Dawn theme.

**Assignment:** Troopod AI Product Engineer build assignment.
**Guiding rule:** *The design is the spec. The code is not.* Visual output is
reproduced as-is; the underlying HTML/CSS was rebuilt to production standards and
every deviation is documented in [BUILD-NOTES.md](BUILD-NOTES.md).

---

## Repository layout

```
theme/                  Files that drop into a stock Dawn theme
  assets/               Tokens, shared base CSS, per-section CSS + JS
  sections/             The Shopify sections
  snippets/             Shared, reusable components
  templates/            index.json wiring the homepage
docs/                   Metafield + metaobject definitions, seed data plan
reference/              The original prototype, unmodified, as the visual source of truth
```

## Documents

| File | What it covers |
| --- | --- |
| [SETUP.md](SETUP.md) | Creating the dev store, seeding products, installing the theme |
| [docs/metafields.md](docs/metafields.md) | Metafield + metaobject definitions to create |
| [BUILD-NOTES.md](BUILD-NOTES.md) | Issues found in the prototype, what changed and why, future work |
| [AI-WORKFLOW.md](AI-WORKFLOW.md) | What was delegated to agents, where they broke, what to systematise |

## Status

Build in progress. See the commit history for the order of work.
