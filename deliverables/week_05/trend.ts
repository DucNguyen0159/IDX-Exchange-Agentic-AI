// Usage: node trend.ts Irvine 12
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { RowDataPacket } from "mysql2";
import { pool, query } from "./db.ts";

export type MonthPoint = {
  month: string;
  sales: number;
  avgPrice: number;
  avgDaysOnMarket: number;
  priceChangePct: number | null;
};

export async function getPriceTrend(city: string, months = 12): Promise<MonthPoint[]> {
  const rows = await query<RowDataPacket>(
    `
    SELECT
      DATE_FORMAT(CloseDate, '%Y-%m') AS month,
      COUNT(*) AS sales,
      ROUND(AVG(ClosePrice), 0) AS avg_price,
      ROUND(AVG(DaysOnMarket), 1) AS avg_dom
    FROM california_sold
    WHERE City = ?
      AND PropertyType = 'Residential'
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      AND ClosePrice > 0
    GROUP BY DATE_FORMAT(CloseDate, '%Y-%m')
    ORDER BY month
    `,
    [city, months],
  );

  return rows.map((row, i) => {
    const avgPrice = Number(row.avg_price);
    const prev = i > 0 ? Number(rows[i - 1].avg_price) : null;
    const priceChangePct =
      prev && prev !== 0 ? Math.round(((avgPrice - prev) / prev) * 1000) / 10 : null;
    return {
      month: String(row.month),
      sales: Number(row.sales),
      avgPrice,
      avgDaysOnMarket: Number(row.avg_dom),
      priceChangePct,
    };
  });
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]!);

if (isMain) {
  const city = process.argv[2];
  const months = Number(process.argv[3] ?? 12);
  if (!city) {
    console.error("Usage: node trend.ts <city> [months]");
    process.exit(1);
  }
  const trend = await getPriceTrend(city, months);
  console.log(JSON.stringify({ city, months, points: trend.length, trend }, null, 2));
  await pool.end();
}
