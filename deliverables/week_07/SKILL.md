---
name: recommend-listings
description: Recommend similar active Irvine listings for a listing the user likes. Hybrid score uses structured fields plus saved embeddings, then checks each ask against recent california_sold comps. Use when the user says they like a home and wants similar ones or comps on the price.
metadata: { "openclaw": { "requires": { "bins": ["node"] } } }
---

# Listing recommendations

Use this skill when the user likes a specific listing and wants similar active homes,
or wants a sold-comp check on those recommendations. Prefer it over
`semantic-search` when the input is a listing id or a liked address from the
saved Irvine index. Do not use it for city market stats (`market-stats`) or a
fresh free-text vibe search (`semantic-search`).

The candidate pool is the saved Irvine embedding index, not the full MLS.

## How to run it

~~~bash
node {baseDir}/recommend.ts '<listingId>'
~~~

Always wrap the listing id in single quotes. Pass only the MLS listing id, for
example `1136991548`.

## What to reply

The script prints JSON with `target` and `recommendations`.

1. Name the liked home from `target`.
2. Say these are the top similar saved Irvine listings.
3. For each recommendation, give address, price, beds, baths, sqft, hybrid
   `total`, and the comps note: `compPrice`, `compCount`, and `deltaPct`.
4. Explain `deltaPct` briefly: positive means the ask is above recent similar
   sold comps, negative means below.
5. Use only rows the script printed. If the command fails, report the error.
