// Usage: node searchFromQuery.ts 'Show me 3-bedroom condos in Irvine under $1.5M with a pool.'
import { parsePropertyQuery } from "./parseQuery.ts";
import { searchActiveListings } from "./search.ts";
import { pool } from "./db.ts";

function toCard(row) {
  return {
    address: row.L_Address,
    city: row.L_City,
    zip: row.L_Zip,
    price: row.price,
    beds: row.beds,
    baths: row.baths,
    sqft: row.sqft,
    type: row.type,
    photos: row.PhotoCount,
    agent: [row.LA1_UserFirstName, row.LA1_UserLastName].filter(Boolean).join(" "),
    office: row.LO1_OrganizationName,
    listingId: row.L_ListingID,
  };
}

const text = process.argv.slice(2).join(" ").trim();
if (!text) {
  console.error('Usage: node searchFromQuery.ts "<free-text property query>"');
  process.exit(1);
}

const filters = parsePropertyQuery(text);
const rows = await searchActiveListings(filters);
const cards = rows.map(toCard);

console.log(JSON.stringify({ filters, count: cards.length, cards }, null, 2));
await pool.end();
