
# AI workflow notes

How this build was actually run with an agent, where the agent broke, and what
I would turn into standing process for the next one.

This is written from the build itself, not in the abstract. Every failure below
happened during this conversion.

---

## The shape of the work

The job splits into three kinds of task, and they want completely different
treatment.

| Kind | Example | Who does it |
| --- | --- | --- |
| **Judgement** | Which of the two `:root` blocks is the real design. Whether the stats-grid bug is a bug or intentional. Blocks vs metaobjects. | Me, before any code |
| **Translation** | Turning `.combo` markup into a section with a schema | Agent, with the decision already made |
| **Mechanical bulk** | Moving 14 base64 data URIs and 5 SVG drawings | A script, never the agent |

Most of the value came from being strict about that third row.

---

## What I delegated, and what I kept

### Kept out of the agent's hands

**The reading pass.** Before generating anything, the whole 1,716-line file gets
read — both style blocks, all 13 sections, the script. The finding that changed
the entire build — that the second `<style>` block re-declares `:root` and the
light theme is the real design — is invisible if you work section by section.
An agent asked to "convert the hero" produces a confident, wrong hero in the
dark palette, and you will not notice until the whole page is assembled.

**Bug versus preference.** The brief says rebuilding to personal taste is an
automatic rejection, so every deviation needs a defensible reason. The agent is
happy to "improve" spacing, rename things for tidiness, or modernise a layout.
Every change in [BUILD-NOTES.md](BUILD-NOTES.md) had to clear one bar: *the
original was broken, unreachable, or could not survive being a section.* That
test is mine to apply; the agent has no stake in it.

**The data model.** Whether a combo is a block or a metaobject, whether price
comes from a bundle product or a text field. These decide what the merchant's
day looks like, and they cannot be inferred from markup.

### Delegated freely

- Section scaffolding once the model was fixed — schema, blocks, presets
- Translating CSS to scoped, tokenised equivalents
- Writing the editor-lifecycle boilerplate (`shopify:section:load` /
  `:unload` / `:block:select`) once the pattern was set on the first section
- Accessibility mechanics: `inert`, live regions, hit-area padding, label
  wiring — reliable when the requirement is stated concretely

### Delegated to a script, never the agent

The prototype carries ~15 KB of base64 data URIs and ~22 KB of SVG path data.
**An LLM will silently corrupt these.** Not fail loudly — corrupt. A dropped
character in a base64 string produces an image that either fails to decode or
renders subtly wrong, and no test catches it because nothing asserts on it.

So the silhouettes, the water layers and the botanical drawings were all pulled
out by regex script straight from the source file, transformed programmatically,
and written to disk without passing through generated text. The scoped SVG ids
in `snippets/purelane-water.liquid` were rewritten by the same script.

**Rule: if the content is longer than you would proofread by hand, extract it,
do not regenerate it.**

---

## Where the agent broke

Five real failures from this build, in rough order of how dangerous they are.

### 1. Plausible-but-wrong Liquid filter chains

Generated:

```liquid
assign unit_line = 'Flat ' | append: unit_price | money | append: ' per product'
```

This reads fine. It is wrong — `money` lands on the concatenated string, not the
number, so it silently produces nothing useful. Caught by reading, not by any
tool.

**This is the dangerous class.** Liquid has no type checker and no compiler.
Wrong code renders as empty output, which looks like an unset field, which looks
like the merchant has not filled it in yet. It can survive to production.

*Mitigation:* every derived value gets read line by line. Any expression with
more than two filters gets split across `assign`s so each step is inspectable.

### 2. Accessibility regressions introduced while solving layout

To make a block wrapper participate in a CSS grid, the agent reached for
`display: contents`. That works visually and drops the wrapped content out of
the accessibility tree in some browsers. Fixed by passing
`block.shopify_attributes` into the card snippet instead, so no wrapper exists.

The pattern: **the agent optimises the constraint you stated and quietly trades
away the one you did not.** Layout was named; the a11y tree was not.

### 3. Fragile coupling that looks tidy

The first version of the proof rotator paired each product image with a sibling
`<template>` holding its caption, matched by document order. Clean-looking,
breaks the moment a merchant reorders a block. Replaced with a wrapper carrying
its own `data-name` / `data-note`.

Worth noting the prototype had the *same* class of bug — a caption array kept in
step with an image array by index. The agent reproduced the original's fragility
in a new form because it was pattern-matching the source.

### 4. Environment failures that corrupt output silently

Two in one session: a PowerShell here-string that broke a commit message into
pathspec arguments, and a Python heredoc whose em-dashes came back as `?` in
console output. The second is the nastier one — it *looked* like the file was
corrupted, and the instinct is to "fix" a file that was actually fine.

*Mitigation:* verify the artefact, not the console. Reading the file back as
UTF-8 bytes and counting `U+FFFD` settled it in one command.

### 5. Over-abstraction on request

Asked for "reusable components", the agent will happily produce a snippet per
component. `purelane-icon`, `purelane-product-card` and `purelane-price` earn
their keep — used 3+ times each. A separate snippet for a two-line badge would
not have. Reuse is justified by call count, not by tidiness.

---

## What actually caught things

In descending order of value:

1. **Reading the generated Liquid.** Found the filter-chain bug, the
   `display: contents` hazard and the template coupling. Nothing else would
   have.
2. **Static parse checks after every batch** — `json.loads` on every section
   schema, `node --check` on every script. Cheap, ran in seconds, caught nothing
   in the end, which is itself the point: it made the reading pass the only
   remaining gap.
3. **Extracting instead of generating.** Removed a whole class of silent
   corruption.
4. **Small commits.** Each section is one commit with its reasoning in the
   message. When something looks wrong three sections later, `git log -p` on one
   file answers "why is this like this" without re-deriving it.

What did **not** catch anything, and should have: no browser. Everything here is
verified by reading and static parsing. That is the honest limit of this
submission and it is stated plainly at the end of
[BUILD-NOTES.md](BUILD-NOTES.md).

---

## What I would systematise

Concrete things that would make the next conversion faster, in the order I would
build them.

### 1. A prototype audit pass, run before any code

A fixed checklist against the source file, because these findings shape
everything downstream and are cheap to look for:

- How many `:root` declarations? Which wins?
- Count `<img>` tags. Zero means the image strategy is the whole job.
- Duplicate SVG `id` attributes across the document
- Every `href="#…"` — does the target exist?
- Every CSS class — is it in the markup? Every markup class — is it styled?
- Inline `style=` attributes carrying colour (they cannot be themed)
- `display` declared only inside a media query with no base rule
- Numbers that should agree with each other, and do not

Two thirds of [BUILD-NOTES.md](BUILD-NOTES.md) §2 came out of exactly this list.
It is mechanical enough to script most of it.

### 2. A Shopify section conversion template

The same skeleton every time: scoped wrapper, asset tags, schema shape, editor
lifecycle, anchor setting, empty state, `block_attributes` pass-through. Given
the template, the agent produces a correct section from markup in one pass. The
first section of this build took several iterations to settle the pattern; the
next fifteen were fast because the pattern was fixed.

### 3. A standing "do not change" contract

Written into the prompt, not hoped for:

> Reproduce every visual value exactly. Do not adjust spacing, type, colour or
> layout. If something looks wrong, flag it in build notes — do not fix it
> silently. Changes are only allowed when the original is broken, unreachable,
> or cannot work as a section, and every one must be listed.

Without this the agent tidies as it goes, and "pixel-accurate" quietly stops
being true.

### 4. Screenshot diffing in CI

The one missing layer. Playwright against the prototype at 375/768/1024/1440,
per section, on every commit. That converts "I read it carefully" into something
that holds up when someone else edits the theme. This is the first thing I would
add with more time — see BUILD-NOTES §6.6.

### 5. A metafield definition file, not a document

`docs/metafields.md` is prose a human has to follow by hand. The definitions
should be a GraphQL mutation file run by a script, so the store setup is
reproducible and reviewable rather than a checklist someone can half-complete.

---

## Honest summary

The agent was fastest at the middle layer: mechanical translation once someone
had decided what the answer should be. It was actively dangerous at both ends —
it will not notice that two `:root` blocks mean the design is not what it looks
like, and it will silently mangle a base64 string.

The leverage was not in generating more. It was in deciding what not to
generate, and in reading every line that came back.
