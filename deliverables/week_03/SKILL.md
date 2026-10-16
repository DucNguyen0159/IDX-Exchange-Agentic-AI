---
name: mls-db-search
description: Query MLS MySQL (rets_property active listings and california_sold comps) from a natural-language home search; returns formatted property cards.
metadata: { "openclaw": { "requires": { "bins": ["node"] } } }
---

# MLS database property search

Use this skill when the user wants real listing results from the database
(active homes and/or recent sold comps), not just parsed filters.

Prefer this over `nl-property-search` when they ask to find, show, search, or
list homes / sold comps.

## Active listings (rets_property)

Run with the user's request as one argument:

~~~bash
node {baseDir}/searchFromQuery.ts '<the user request, verbatim>'
~~~

Always wrap the request in single quotes. If it contains a single quote, write it
as `'\''`. Never use double quotes around the request.

The script prints JSON: `filters`, `count`, and `cards` (address, city, price,
beds, baths, sqft, type, photos, agent, office, listingId).

## Sold comps (california_sold)

When the user asks for sold / comparable / recently sold homes in a city:

~~~bash
node {baseDir}/compsFromCity.ts '<City>' 12
~~~

## What to reply

1. Summarize the filters that were used in one short sentence.
2. Present each card clearly (address, price, beds/baths, sqft, photos).
3. Do not invent listings. Only use rows the script printed.
4. If `count` is 0, say nothing matched and suggest relaxing city, price, or beds.
5. If the command fails, report the error; do not invent results.
