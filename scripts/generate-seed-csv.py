#!/usr/bin/env python3
"""
Generate a Shopify product CSV that seeds the whole Purelane catalogue.

Import at: Products -> Import -> Add file. One upload creates every product,
its prices, its inventory state and its Purelane metafields.

This exists as an alternative to the Admin API. Since 1 Jan 2026 Shopify no
longer issues static admin tokens, and the Dev Dashboard client-credentials
grant requires the app and store to sit in the same organization — which is
easy to get wrong and hard to diagnose. CSV import needs no credentials at all.

No image URLs are set, on purpose. A product with no image falls back to the
prototype's own silhouette artwork (see purelane-silhouettes.css), which is
exactly what the original design showed — it had zero <img> tags. So the seeded
store renders like the prototype rather than like a store missing its photos.
`purelane.silhouette` is set per product so each one gets the right shape.

Usage:
    python scripts/generate-seed-csv.py            # writes seed-products.csv
    python scripts/generate-seed-csv.py out.csv
"""

import csv
import json
import sys

# Shopify's rating metafield expects a JSON object, not a bare number.
def rating(value):
    return json.dumps({"scale_min": "1.0", "scale_max": "5.0", "value": str(value)})


COLUMNS = [
    "Handle",
    "Title",
    "Body (HTML)",
    "Vendor",
    "Type",
    "Tags",
    "Published",
    "Option1 Name",
    "Option1 Value",
    "Variant SKU",
    "Variant Inventory Tracker",
    "Variant Inventory Qty",
    "Variant Inventory Policy",
    "Variant Fulfillment Service",
    "Variant Price",
    "Variant Compare At Price",
    "Variant Requires Shipping",
    "Variant Taxable",
    "Status",
    "Metafield: purelane.rating [rating]",
    "Metafield: purelane.rating_count [number_integer]",
    "Metafield: purelane.badge [single_line_text_field]",
    "Metafield: purelane.benefit [single_line_text_field]",
    "Metafield: purelane.silhouette [single_line_text_field]",
]


def product(
    handle,
    title,
    price,
    compare_at="",
    qty=100,
    policy="deny",
    score=4.8,
    count=237,
    badge="",
    benefit="",
    silhouette="",
    body="",
    tags="",
):
    return {
        "Handle": handle,
        "Title": title,
        "Body (HTML)": body,
        "Vendor": "Purelane",
        "Type": "Homecare",
        "Tags": tags,
        "Published": "TRUE",
        "Option1 Name": "Title",
        "Option1 Value": "Default Title",
        "Variant SKU": handle.upper()[:20],
        "Variant Inventory Tracker": "shopify",
        "Variant Inventory Qty": qty,
        "Variant Inventory Policy": policy,
        "Variant Fulfillment Service": "manual",
        "Variant Price": price,
        "Variant Compare At Price": compare_at,
        "Variant Requires Shipping": "TRUE",
        "Variant Taxable": "TRUE",
        "Status": "active",
        "Metafield: purelane.rating [rating]": rating(score) if score else "",
        "Metafield: purelane.rating_count [number_integer]": count if count else "",
        "Metafield: purelane.badge [single_line_text_field]": badge,
        "Metafield: purelane.benefit [single_line_text_field]": benefit,
        "Metafield: purelane.silhouette [single_line_text_field]": silhouette,
    }


ROWS = [
    # ---- Core catalogue -----------------------------------------------------
    product(
        "tap-cleaner-limescale-remover", "Tap cleaner & limescale remover",
        200, 299, badge="Best seller", count=237,
        benefit="Melts hard water stains", silhouette="tap", tags="bestsellers,hard-water",
        body="<p>Two sprays and hard water scale wipes straight off. No scrubbing, no harsh acids.</p>",
    ),
    product(
        "kitchen-cleaner-foaming", "Kitchen cleaner, foaming",
        200, 299, badge="Best seller", count=254,
        benefit="Cuts grease instantly", silhouette="kitchen", tags="bestsellers,kitchen",
        body="<p>The foam clings to grease and lifts it, so you wipe instead of scrub.</p>",
    ),
    product(
        "copper-bronze-brass-cleaner", "Copper, bronze & brass cleaner",
        200, 299, badge="Top rated", count=231,
        benefit="Restores shine, no scrubbing", silhouette="metal", tags="bestsellers",
        body="<p>Brings tarnished metal back without abrasives.</p>",
    ),

    # ---- EDGE CASE: no image -> falls back to the silhouette ----------------
    product(
        "washing-machine-cleaner-descaler", "Washing machine cleaner & descaler",
        200, 299, badge="New", count=183,
        benefit="Deep-cleans your machine", silhouette="wm", tags="bestsellers,laundry",
        body="<p>Descales the drum and clears the residue detergent leaves behind.</p>",
    ),

    # ---- EDGE CASE: sold out ------------------------------------------------
    product(
        "non-toxic-toilet-cleaner", "Non-toxic toilet cleaner",
        200, 299, qty=0, policy="deny", count=198,
        benefit="Kills 99.9% of germs", silhouette="toilet", tags="bestsellers,bathroom",
        body="<p>Kills 99.9% of germs without chlorine.</p>",
    ),

    # ---- EDGE CASE: very long title ----------------------------------------
    product(
        "natural-herbal-floor-cleaner",
        "Extra strength plant-based multi-surface foaming floor cleaner and degreaser with lemongrass and neem, refill pack",
        200, 299, count=164,
        benefit="Neem powered, pet safe", silhouette="floor", tags="bestsellers",
        body="<p>Neem and lemongrass, safe around pets and bare feet.</p>",
    ),

    # ---- EDGE CASE: no rating at all ---------------------------------------
    product(
        "organic-dishwash-liquid-gel", "Organic dishwash liquid gel",
        200, 299, score=None, count=None,
        benefit="Squeaky clean dishes", silhouette="dish", tags="bestsellers,kitchen",
        body="<p>Cuts grease without drying out your hands.</p>",
    ),

    # ---- EDGE CASE: no compare-at price ------------------------------------
    product(
        "gentle-hydrating-liquid-handwash", "Gentle hydrating liquid handwash",
        200, "", count=142,
        benefit="Gentle hydration for hands", silhouette="handwash", tags="bestsellers",
        body="<p>Soft on hands, with a light lemongrass finish.</p>",
    ),

    # ---- Rest of the range --------------------------------------------------
    product(
        "non-toxic-laundry-detergent", "Non-toxic laundry detergent",
        200, 299, count=289,
        benefit="Removes tough stains & odour", silhouette="laundry", tags="laundry",
        body="<p>Tough on odour, soft on fabric.</p>",
    ),
    product(
        "magic-eraser", "Magic eraser",
        149, 199, count=96,
        benefit="Scrubs away soap scum", silhouette="eraser", tags="bathroom",
        body="<p>Lifts soap scum and scuff marks with water alone.</p>",
    ),

    # ---- Bundle SKUs: what the combos and tiers price against ---------------
    product("build-your-box-2", "Build your box — any 2", 349, 598,
            score=None, count=None, silhouette="combo2", tags="bundles",
            body="<p>Pick any two products at one flat price.</p>"),
    product("build-your-box-3", "Build your box — any 3", 499, 897,
            score=None, count=None, silhouette="kitchen", tags="bundles",
            body="<p>Pick any three products at one flat price.</p>"),
    product("build-your-box-5", "Build your box — any 5", 799, 1495,
            score=None, count=None, silhouette="kitchen", tags="bundles",
            body="<p>Pick any five products at one flat price.</p>"),

    product("kitchen-essentials-combo", "Kitchen essentials combo", 499, 897,
            score=None, count=None, silhouette="kitchen", tags="bundles,combos",
            body="<p>Foaming Kitchen Cleaner, Dishwash Gel and Tap Cleaner.</p>"),
    product("laundry-care-bundle", "Laundry care bundle", 499, 947,
            score=None, count=None, silhouette="laundry", tags="bundles,combos",
            body="<p>Laundry Detergent, Fabric Conditioner and Machine Cleaner.</p>"),
    product("complete-home-bundle", "Complete home bundle", 799, 1495,
            score=None, count=None, silhouette="kitchen", tags="bundles,combos",
            body="<p>Kitchen, Laundry, Floor, Toilet and Handwash. The biggest saving box.</p>"),
    product("bathroom-deep-clean", "Bathroom deep clean", 499, 897,
            score=None, count=None, silhouette="toilet", tags="bundles,combos",
            body="<p>Toilet Cleaner, Tap Cleaner and Magic Eraser.</p>"),
    product("hard-water-solution-kit", "Hard water solution kit", 349, 598,
            score=None, count=None, silhouette="tap", tags="bundles,combos",
            body="<p>Tap Cleaner and Toilet Cleaner, for hard water stains.</p>"),
]


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "seed-products.csv"

    with open(out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        for row in ROWS:
            writer.writerow(row)

    sold_out = sum(1 for r in ROWS if r["Variant Inventory Qty"] == 0)
    unrated = sum(1 for r in ROWS if not r["Metafield: purelane.rating [rating]"])
    no_compare = sum(1 for r in ROWS if not r["Variant Compare At Price"])
    longest = max(len(r["Title"]) for r in ROWS)

    print("")
    print("  %s" % out)
    print("  %d products, %d columns" % (len(ROWS), len(COLUMNS)))
    print("")
    print("  edge cases included:")
    print("    sold out:          %d" % sold_out)
    print("    no rating:         %d" % unrated)
    print("    no compare-at:     %d" % no_compare)
    print("    longest title:     %d chars" % longest)
    print("    no images:         all (falls back to prototype silhouettes)")
    print("")
    print("  Import at: Products -> Import -> Add file")
    print("")


if __name__ == "__main__":
    main()
