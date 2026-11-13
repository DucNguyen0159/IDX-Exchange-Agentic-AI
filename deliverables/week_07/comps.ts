// Usage: node comps.ts <city> <sqft> <listPrice>
// Part 3: compare a list price to recent sold comps in that city.
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { RowDataPacket } from "mysql2";
import { pool, query } from "./db.ts";

export type CompValidation = {
  city: string;
  sqft: number;
  listPrice: number;
  avgPpsf: number;
  compPrice: number;
  compCount: number;
  deltaPct: number | null;
};

export async function validateWithComps(
  city: string,
  sqft: number,
  listPrice: number,
): Promise<CompValidation> {
  const rows = await query<RowDataPacket>(
    `
    SELECT
      AVG(ClosePrice / NULLIF(LivingArea, 0)) AS avg_ppsf,
      COUNT(*) AS comp_count
    FROM california_sold
    WHERE City = ?
      AND PropertyType = 'Residential'
      AND LivingArea BETWEEN ? AND ?
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      AND ClosePrice > 0
      AND LivingArea > 0
    `,
    [city, sqft * 0.8, sqft * 1.2],
  );

  const avgPpsf = Number(rows[0]?.avg_ppsf ?? 0);
  const compCount = Number(rows[0]?.comp_count ?? 0);
  const compPrice = Math.round(avgPpsf * sqft);
  const deltaPct =
    compPrice > 0 ? Math.round(((listPrice - compPrice) / compPrice) * 1000) / 10 : null;

  return {
    city,
    sqft,
    listPrice,
    avgPpsf: Math.round(avgPpsf),
    compPrice,
    compCount,
    deltaPct,
  };
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]!);

if (isMain) {
  const city = process.argv[2]?.trim();
  const sqft = Number(process.argv[3]);
  const listPrice = Number(process.argv[4]);
  if (!city || !Number.isFinite(sqft) || sqft <= 0 || !Number.isFinite(listPrice) || listPrice <= 0) {
    console.error("Usage: node comps.ts <city> <sqft> <listPrice>");
    process.exit(1);
  }

  const result = await validateWithComps(city, sqft, listPrice);
  console.log(result);
  await pool.end();
}
