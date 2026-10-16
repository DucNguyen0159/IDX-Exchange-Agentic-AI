// Usage: node comps.ts Irvine 12
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { query, pool } from "./db.ts";

export async function getSoldComps(city, months = 12) {
  const sql = `
    SELECT
      ListingKey, UnparsedAddress, City, CloseDate, ClosePrice,
      OriginalListPrice, ListPrice, DaysOnMarket,
      BedroomsTotal, BathroomsTotalInteger, LivingArea,
      PropertyType, PropertySubType, YearBuilt,
      ListAgentFullName, ListOfficeName, BuyerOfficeName
    FROM california_sold
    WHERE City = ?
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      AND PropertyType = 'Residential'
    ORDER BY CloseDate DESC
    LIMIT 50
  `;
  return query(sql, [city, months]);
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const city = process.argv[2];
  const months = Number(process.argv[3] ?? 12);
  if (!city) {
    console.error("Usage: node comps.ts <city> [months]");
    process.exit(1);
  }
  const rows = await getSoldComps(city, months);
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
}
