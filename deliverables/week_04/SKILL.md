---
name: property-chat
description: Multi-turn home search. Remembers city, budget, and type for a user, asks one follow-up when something is missing, then returns rets_property cards. Not for a one-shot style or renovation description; that belongs to semantic-search.
metadata: { "openclaw": { "requires": { "bins": ["node"] } } }
---

# Conversational property search

Use this skill when the user is looking for homes across more than one message,
including WhatsApp. Prefer it over `mls-db-search` for a back-and-forth search.

## How to run it

Each message is one command. Pass the same user id every time in that chat
(WhatsApp sender id, or the OpenClaw session id). Pass only the latest message,
not the earlier turns. The script loads the saved session itself.

~~~bash
node {baseDir}/chat.ts '<stable user id>' '<latest message, verbatim>'
~~~

Always wrap both arguments in single quotes. If the message contains a single
quote, write it as `'\''`. Never use double quotes around the message.

## What to reply

The script prints JSON:

- `ready: false` and `reply` is the question to ask next. Ask that question. Do not invent listings.
- `ready: true` and `cards` are the homes. Say how many were found, then list address, price, beds, baths, and photos for each card.

Only use text and cards the script printed. If the command fails, report the error.
