# Week 3 - MLS Database Integration

## Objective

Connect OpenClaw to MySQL with a parameterized query layer: accept Week 2 NLP filters,
query `rets_property` and/or `california_sold`, and return formatted property cards.

Example:

> Show me 3-bedroom condos in Irvine under $1.5M with a pool.

```json
{
  "filters": {
    "city": "Irvine",
    "maxPrice": 1500000,
    "beds": 3,
    "type": "Condominium",
    "pool": "1"
  },
  "count": 3,
  "cards": [
    {
      "address": "10 Goldenbush",
      "city": "Irvine",
      "price": 999000,
      "beds": 3,
      "baths": "3.0",
      "sqft": 1688,
      "type": "Condominium",
      "photos": 53
    }
  ]
}
```

---

## Files

| File | Purpose |
|------|---------|
| `db.ts` | MySQL pool + `query(sql, params)`; loads `~/projects/idx_ai/.env` |
| `search.ts` | `searchActiveListings(filters, page, limit)` on `rets_property` |
| `comps.ts` | `getSoldComps(city, months)` on `california_sold` |
| `parseQuery.ts` | Week 2 parser (copied so the skill is self-contained) |
| `searchFromQuery.ts` | NL text → filters → active listing cards |
| `compsFromCity.ts` | city → sold-comp cards (top 10) |
| `SKILL.md` | OpenClaw skill `mls-db-search` |
| `package.json` | deps (`mysql2`, `dotenv`) + `install-skill` |

Requires Node 22.18+ (native TypeScript type stripping). MySQL must be running locally.

---

## Filter → column map

Same values as Week 2 (checked against live data: pool/view = `"1"`, not `"True"`).

| Key | `rets_property` column | Match |
|-----|------------------------|-------|
| `city` | `L_City` | equals |
| `maxPrice` | `L_SystemPrice` | `<=` |
| `beds` | `L_Keyword2` | `>=` |
| `baths` | `LM_Dec_3` | `>=` |
| `sqft` | `LM_Int2_3` | `>=` |
| `type` | `L_Type_` | equals |
| `pool` | `PoolPrivateYN` | equals `"1"` |
| `hasView` | `ViewYN` | equals `"1"` |
| `maxHoa` | `AssociationFee` | `<=` |

`null` keys are omitted from the `WHERE` clause.

---

## Sample CLI results

Active search (matches hand-run MySQL smoke test):

```bash
node searchFromQuery.ts 'Show me 3-bedroom condos in Irvine under $1.5M with a pool.'
# count: 3 → 10 Goldenbush ($999k), 57 Silverado ($1.0M), 108 Tribeca ($1.35M)
```

Sold comps:

```bash
node compsFromCity.ts Irvine 12
# recent Irvine Residential sales (cards capped at 10)
```

---

## Running It

```bash
sudo service mysql start          # if needed
cd deliverables/week_03
npm install
node search.ts '{"city":"Irvine","maxPrice":1500000,"beds":3,"type":"Condominium","pool":"1"}'
node comps.ts Irvine 12
node searchFromQuery.ts 'Show me 3-bedroom condos in Irvine under $1.5M with a pool.'
npm run install-skill             # → ~/.openclaw/workspace/coordinator/skills/mls-db-search/
```

Env vars (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`) come from
`~/projects/idx_ai/.env` (outside the git repo). Never commit that file.

---

## OpenClaw live test

Skill is installed and listed as ready:

```bash
openclaw skills list --agent coordinator
# ✓ ready  mls-db-search
```

Live agent turn was **skipped** for this deliverable: the Gemini free-tier project hit
quota (`429 RESOURCE_EXHAUSTED` on `gemini-3.5-flash-lite`, then `UNAVAILABLE` when
retrying another Flash model). End-to-end search was validated via CLI instead
(`node searchFromQuery.ts '...'` → 3 Irvine cards).

To retry later (gateway up, MySQL up, new session):

```bash
openclaw agent --agent coordinator --session-id week3-live-1 \
  --message 'Show me 3-bedroom condos in Irvine under $1.5M with a pool.'
```

If `exec` runs JavaScript instead of shell, Code Mode is on — keep `tools.codeMode: false`.

---

## Design notes

- **Parameterized SQL only** (`?` placeholders). Never concatenate user text into the query.
- **Skill is copied, not symlinked**, and includes `node_modules` so OpenClaw can run `mysql2` from `{baseDir}`.
- **CLI guards on `search.ts` / `comps.ts`:** entrypoint code runs only when that file is started directly, so importing them from `searchFromQuery.ts` does not try to `JSON.parse` English text.
- Prefer **`mls-db-search`** over Week 2’s `nl-property-search` when the user wants real listings, not filters alone.
