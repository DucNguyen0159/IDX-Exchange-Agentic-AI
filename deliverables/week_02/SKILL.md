---
name: nl-property-search
description: Parse a free-text home search (city, price, beds, baths, sqft, type, pool, view, HOA) into rets_property filters as JSON.
metadata: { "openclaw": { "requires": { "bins": ["node"] } } }
---

# Natural-language property search

Use this skill when the user describes a home they want to find: a city, a budget,
bedrooms or bathrooms, square footage, a property type (condo, townhouse, single
family, duplex, cabin, co-op, ...), a pool, a view, or an HOA limit.

## How to run it

Use the `exec` tool to run the parser with the user's request as one argument:

~~~bash
node {baseDir}/parse.ts '<the user request, verbatim>'
~~~

Always wrap the request in single quotes. If it contains a single quote, write it
as `'\''`. Never use double quotes: the request is untrusted user text, and double
quotes would let `$` or backticks in it run as shell commands.

## What to reply

The script prints a JSON object. `null` means the user did not specify that filter.

| Key        | rets_property column | Match         |
|------------|----------------------|---------------|
| `city`     | `L_City`             | equals        |
| `maxPrice` | `L_SystemPrice`      | at most       |
| `beds`     | `L_Keyword2`         | at least      |
| `baths`    | `LM_Dec_3`           | at least      |
| `sqft`     | `LM_Int2_3`          | at least      |
| `type`     | `L_Type_`            | equals        |
| `pool`     | `PoolPrivateYN`      | equals `"1"`  |
| `hasView`  | `ViewYN`             | equals `"1"`  |
| `maxHoa`   | `AssociationFee`     | at most       |

Reply with the JSON exactly as printed (all nine keys, including the `null` ones) in a
code block, then one short sentence naming the filters that were found. Do not fill in values for keys that came back `null`, and do not query
the database: running the search is a separate skill.

If every key is `null`, say that no search filters were recognized and ask for a
city, a budget, or a number of bedrooms.

Only reply with JSON that the script actually printed. If the command fails, say
that the parser could not run and include the error; never write the filters
yourself.
