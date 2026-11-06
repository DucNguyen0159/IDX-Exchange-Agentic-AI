---
name: semantic-search
description: Find active Irvine listings that match a free-text home description such as style, renovation, or features. Use this instead of mls-db-search, property-chat, and nl-property-search. Returns only the 5 closest saved listings.
metadata: { "openclaw": { "requires": { "bins": ["node"] } } }
---

# Semantic listing search

Use this skill when the user describes a home in their own words: style, features,
renovation, yard, kitchen, or a similar vibe. Run only the command below. Do not
also run `mls-db-search`, `property-chat`, or `nl-property-search` in the same
turn. Do not use this skill for city market statistics (`market-stats`) or for a
structured filter search that names city, budget, beds, and type.

The index is 40 saved active Irvine listings, not the full MLS.

## How to run it

~~~bash
node {baseDir}/similar.ts '<the user description, verbatim>'
~~~

Always wrap the description in single quotes. If it contains a single quote, write
it as `'\''`. Never use double quotes around the description.

## What to reply

The script prints a JSON array of up to 5 homes, best match first. `score` is
similarity, from 0 to 1.

1. Say these are the closest saved Irvine listings, and how many came back.
2. For each home, give address, price, beds, baths, sqft, and score.
3. Use only rows the script printed. Do not invent listings.
4. If the command fails, report the error.
