// Usage: node compsFromCity.ts Irvine 12
import { getSoldComps } from "./comps.ts";
import { pool } from "./db.ts";

function toCard(row) {
  return {
    address: row.UnparsedAddress,
    city: row.City,
    closePrice: row.ClosePrice,
    closeDate: row.CloseDate,
    beds: row.BedroomsTotal,
    baths: row.BathroomsTotalInteger,
    sqft: row.LivingArea,
    type: row.PropertySubType ?? row.PropertyType,
    agent: row.ListAgentFullName,
    office: row.ListOfficeName,
  };
}

const city = process.argv[2];
const months = Number(process.argv[3] ?? 12);

if (!city) {
  console.error("Usage: node compsFromCity.ts <city> [months]");
  process.exit(1);
}

const rows = await getSoldComps(city, months);
const cards = rows.slice(0, 10).map(toCard);

console.log(JSON.stringify({ city, months, count: cards.length, cards }, null, 2));
await pool.end();
