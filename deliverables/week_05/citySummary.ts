// Usage: node citySummary.ts Irvine
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { RowDataPacket } from "mysql2";
import { pool, query } from "./db.ts";

const WHERE = `
  City = ?
  AND PropertyType = 'Residential'
  AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
  AND LivingArea > 0
  AND ClosePrice > 0
`;

export type CitySummary = {
  city: string;
  soldCount: number;
  avgClosePrice: number;
  medianClosePrice: number;
  avgPricePerSqft: number;
  avgDaysOnMarket: number;
  listToClosePct: number;
};

export async function getCitySummary(city: string): Promise<CitySummary | null> {
  const totals = await query<RowDataPacket>(
    `
    SELECT
      COUNT(*) AS sold_count,
      ROUND(AVG(ClosePrice), 0) AS avg_close_price,
      ROUND(AVG(ClosePrice / NULLIF(LivingArea, 0)), 0) AS avg_price_per_sqft,
      ROUND(AVG(DaysOnMarket), 1) AS avg_dom,
      ROUND(AVG(ClosePrice / NULLIF(ListPrice, 0)) * 100, 1) AS list_to_close_pct
    FROM california_sold
    WHERE ${WHERE}
    `,
    [city],
  );

  const soldCount = Number(totals[0]?.sold_count ?? 0);
  if (soldCount === 0) return null;

  const median = await query<RowDataPacket>(
    `
    SELECT ROUND(AVG(ClosePrice), 0) AS median_close_price
    FROM (
      SELECT
        ClosePrice,
        ROW_NUMBER() OVER (ORDER BY ClosePrice) AS rn,
        COUNT(*) OVER () AS cnt
      FROM california_sold
      WHERE ${WHERE}
    ) ranked
    WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2))
    `,
    [city],
  );

  const row = totals[0];
  return {
    city,
    soldCount,
    avgClosePrice: Number(row.avg_close_price),
    medianClosePrice: Number(median[0]?.median_close_price ?? 0),
    avgPricePerSqft: Number(row.avg_price_per_sqft),
    avgDaysOnMarket: Number(row.avg_dom),
    listToClosePct: Number(row.list_to_close_pct),
  };
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]!);

if (isMain) {
  const city = process.argv[2];
  if (!city) {
    console.error("Usage: node citySummary.ts <city>");
    process.exit(1);
  }
  const summary = await getCitySummary(city);
  console.log(summary ?? `No residential sales found for ${city} in the last 12 months.`);
  await pool.end();
}
