// Runs the parser against known queries.
// Usage: npm test            (PASS/FAIL per query, exit code 1 on failure)
//        node test.ts --markdown   (results as a Markdown table for the README)
import { deepStrictEqual } from "node:assert";
import { parsePropertyQuery, type PropertyFilters } from "./parseQuery.ts";

const EMPTY: PropertyFilters = {
  city: null, maxPrice: null, beds: null, baths: null, sqft: null,
  type: null, pool: null, hasView: null, maxHoa: null,
};

// Each case lists only the filters that should be set; the rest must be null.
const CASES: [string, Partial<PropertyFilters>][] = [
  ["Show me 3-bedroom condos in Irvine under $1.5M with a pool.",
    { city: "Irvine", maxPrice: 1500000, beds: 3, type: "Condominium", pool: "1" }],
  ["single family in San Diego, 2.5 baths, 1,800 sqft, HOA under $300, ocean view, budget 900k",
    { city: "San Diego", maxPrice: 900000, baths: 2.5, sqft: 1800, type: "SingleFamilyResidence", hasView: "1", maxHoa: 300 }],
  ["Townhomes in Long Beach under 800k",
    { city: "Long Beach", maxPrice: 800000, type: "Townhouse" }],
  ["4 bed 3 bath house in Los Angeles below $2 million",
    { city: "Los Angeles", maxPrice: 2000000, beds: 4, baths: 3 }],
  ["Homes with a view in Palm Springs",
    { city: "Palm Springs", hasView: "1" }],
  ["condo in San Jose with no pool, max HOA 400",
    { city: "San Jose", type: "Condominium", maxHoa: 400 }],
  ["2br condo under 650k",
    { maxPrice: 650000, beds: 2, type: "Condominium" }],
  ["Looking for a duplex in Oakland, at least 2,000 square feet",
    { city: "Oakland", sqft: 2000, type: "Duplex" }],
  ["cabin in Lake Arrowhead under $500k with mountain views",
    { city: "Lake Arrowhead", maxPrice: 500000, type: "Cabin", hasView: "1" }],
  ["I am interested in a 3 bed single-family home in Temecula up to 750,000",
    { city: "Temecula", maxPrice: 750000, beds: 3, type: "SingleFamilyResidence" }],
  ["3+ beds, 2+ baths in Riverside with pool under 600k",
    { city: "Riverside", maxPrice: 600000, beds: 3, baths: 2, pool: "1" }],
  ["fourplex in los angeles under 2.5m",
    { city: "Los Angeles", maxPrice: 2500000, type: "Quadruplex" }],
  ["Show me something nice",
    {}],
];

const markdown = process.argv.includes("--markdown");
const rows: string[] = [];
let failed = 0;

for (const [query, partial] of CASES) {
  const expected = { ...EMPTY, ...partial };
  const actual = parsePropertyQuery(query);
  let ok = true;
  try {
    deepStrictEqual(actual, expected);
  } catch {
    ok = false;
    failed++;
  }
  const shown = JSON.stringify(
    Object.fromEntries(Object.entries(actual).filter(([, v]) => v !== null)),
  );
  if (markdown) {
    rows.push(`| ${query.replace(/\|/g, "\\|")} | \`${shown}\` | ${ok ? "Pass" : "Fail"} |`);
  } else {
    console.log(`${ok ? "PASS" : "FAIL"}  ${query}\n      ${shown}`);
    if (!ok) console.log(`      expected ${JSON.stringify(partial)}`);
  }
}

if (markdown) {
  console.log(["| Query | Parsed filters (non-null) | Result |", "|---|---|---|", ...rows].join("\n"));
}
console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
process.exit(failed ? 1 : 0);
