// Usage: node comps.ts Irvine 12
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { RowDataPacket } from "mysql2";
import { query, pool } from "./db.ts";

export type SoldRow = RowDataPacket & {
  ListingKey: number | string;
  UnparsedAddress: string;
  City: string;
  CloseDate: string | Date;
  ClosePrice: number;
  OriginalListPrice: number;
  ListPrice: number;
  DaysOnMarket: number;
  BedroomsTotal: number;
  BathroomsTotalInteger: number;
  LivingArea: number;
  PropertyType: string;
  PropertySubType: string;
  YearBuilt: number;
  ListAgentFullName: string;
  ListOfficeName: string;
  BuyerOfficeName: string;
};

export async function getSoldComps(
  city: string,
  months = 12,
): Promise<SoldRow[]> {
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
  return query<SoldRow>(sql, [city, months]);
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]!);

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
