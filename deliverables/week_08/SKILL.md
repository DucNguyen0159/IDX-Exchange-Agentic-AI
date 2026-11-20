---
name: mls-rag
description: Answer real-estate terminology and MLS field questions from indexed documents (Primer, Trestle metadata, Week 5 notes, handbook schema). Use for definitions like DOM, list-to-close, or california_sold columns. Not for live listing search or market stats numbers.
metadata: { "openclaw": { "requires": { "bins": ["node"] } } }
---

# MLS RAG knowledge assistant

Use this skill when the user asks what a real-estate term means, what an MLS field
is, or which columns are in a table. Prefer it over `market-stats` for definitions,
and over listing skills when no search is needed.

Answers come from the saved chunk index only. Do not invent definitions.

## How to run it

~~~bash
node {baseDir}/rag.ts '<the user question, verbatim>'
~~~

Always wrap the question in single quotes. If it contains a single quote, write it
as `'\''`. Never use double quotes around the question.

## What to reply

The script prints JSON with `answer` and `sources`.

1. Give the `answer` text.
2. Mention the top source titles that were retrieved.
3. Use only what the script printed. If the answer says the documents are not
   enough, say that. Do not invent facts.
4. If the command fails, report the error.
