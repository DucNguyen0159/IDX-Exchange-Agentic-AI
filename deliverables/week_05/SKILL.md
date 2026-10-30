---
name: market-stats
description: Answer California housing-market questions from sold comps and active inventory. Returns median price, days on market, list-to-close ratio, and the recent price trend for a city.
metadata: { "openclaw": { "requires": { "bins": ["node"] } } }
---

# Market statistics

Use this skill when the user asks about a city's market, prices, days on market,
whether it is a good time to buy, or price per square foot. Do not use it to
list individual homes. Those requests belong to `property-chat` or `mls-db-search`.

## How to run it

~~~bash
node {baseDir}/market.ts '<the user question, verbatim>'
~~~

Always wrap the question in single quotes. If it contains a single quote, write it
as `'\''`. Never use double quotes around the question.

The city must appear as "in <city>", for example "in Irvine" or "in San Diego".

## What to reply

The script prints JSON. Use only those numbers.

1. State the city, median close price, average days on market, and list-to-close percent.
2. Mention active listings, 12-month sales, and months of supply.
3. Mention the latest month and `trendChangePct` (change from the first month in the series to the last).
4. If `city` is null or the reply says nothing was found, say that and ask for a city. Do not invent figures.
5. If the command fails, report the error.
