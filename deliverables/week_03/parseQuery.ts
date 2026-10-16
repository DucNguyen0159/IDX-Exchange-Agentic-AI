// Turns a free-text real estate request into filters for rets_property.
// Values match what is stored in the table: PoolPrivateYN / ViewYN use "1",
// L_Type_ uses the RESO names below.

export type PropertyFilters = {
  city: string | null;      // L_City
  maxPrice: number | null;  // L_SystemPrice <=
  beds: number | null;      // L_Keyword2 >=
  baths: number | null;     // LM_Dec_3 >=
  sqft: number | null;      // LM_Int2_3 >=
  type: string | null;      // L_Type_ =
  pool: string | null;      // PoolPrivateYN = "1"
  hasView: string | null;   // ViewYN = "1"
  maxHoa: number | null;    // AssociationFee <=
};

// Longer phrases first so "single family" wins over shorter matches.
const TYPE_MAP: [RegExp, string][] = [
  [/\bsingle[- ]family\b|\bsfr\b|\bdetached house\b/, "SingleFamilyResidence"],
  [/\bcondo(minium)?s?\b/, "Condominium"],
  [/\btown ?(home|house)s?\b/, "Townhouse"],
  [/\bduplex(es)?\b/, "Duplex"],
  [/\btriplex(es)?\b/, "Triplex"],
  [/\b(fourplex|quadruplex)(es)?\b/, "Quadruplex"],
  [/\bco-?op\b|\bcooperative\b/, "StockCooperative"],
  [/\bmobile homes?\b/, "MobileHome"],
  [/\bcabins?\b/, "Cabin"],
  [/\blofts?\b/, "Loft"],
];

const CITY_STOP = "under|below|with|for|at|that|and|less|up|near|around|over|between|max|budget";
const CITY_RE = new RegExp(
  `\\bin\\s+([a-z][a-z.' -]*?)(?=\\s+(?:${CITY_STOP})\\b|[,.!?;]|\\s+\\$|\\s+\\d|$)`,
  "gi",
);

function toNumber(digits: string, unit?: string): number {
  let n = Number(digits.replace(/,/g, ""));
  const u = (unit ?? "").toLowerCase();
  if (u === "k" || u === "thousand") n *= 1_000;
  if (u === "m" || u === "million") n *= 1_000_000;
  return Math.round(n);
}

function titleCase(s: string): string {
  return s.trim().toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function parsePropertyQuery(query: string): PropertyFilters {
  let text = ` ${query.toLowerCase()} `;

  // HOA first, then remove it so its dollar amount is not read as the price.
  let maxHoa: number | null = null;
  const hoa = text.match(/\bhoa\b[^\d$]{0,25}\$?\s*([\d,]+)/);
  if (hoa) {
    maxHoa = toNumber(hoa[1]);
    text = text.replace(hoa[0], " ");
  }

  const price = text.match(
    /\b(?:under|below|less than|up to|max(?:imum)?|budget(?: of)?|no more than)\s*\$?\s*([\d,.]+)\s*(k|m|million|thousand)?\b/,
  );
  const beds = text.match(/(\d+)\s*\+?\s*-?\s*(?:bed|beds|bedroom|bedrooms|br|bd)\b/);
  const baths = text.match(/(\d+(?:\.\d)?)\s*\+?\s*-?\s*(?:bath|baths|bathroom|bathrooms|ba)\b/);
  const sqft = text.match(/(\d[\d,]*)\s*\+?\s*(?:sq\.?\s*ft|sqft|square\s*feet|sf)\b/);

  const typeEntry = TYPE_MAP.find(([re]) => re.test(text));

  const wantsPool = /\bpool\b/.test(text) && !/\b(no|without)\s+(a\s+)?pool\b/.test(text);
  const wantsView = /\bviews?\b/.test(text) && !/\b(no|without)\s+(a\s+)?views?\b/.test(text);

  const cities = [...` ${query} `.matchAll(CITY_RE)];
  const city = cities.length ? titleCase(cities[cities.length - 1][1]) : null;

  return {
    city: city || null,
    maxPrice: price ? toNumber(price[1], price[2]) : null,
    beds: beds ? Number(beds[1]) : null,
    baths: baths ? Number(baths[1]) : null,
    sqft: sqft ? toNumber(sqft[1]) : null,
    type: typeEntry ? typeEntry[1] : null,
    pool: wantsPool ? "1" : null,
    hasView: wantsView ? "1" : null,
    maxHoa,
  };
}
