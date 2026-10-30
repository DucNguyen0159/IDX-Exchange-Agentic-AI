// Usage: node inventory.ts Irvine
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { RowDataPacket } from "mysql2";
import { pool, query } from "./db.ts";

export type Inventory = {
  city: string;
  activeCount: number;
  soldCount12mo: number;
  monthsOfSupply: number | null;
};

export async function getInventory(city: string): Promise<Inventory> {
  const active = await query<RowDataPacket>(
    `
    SELECT COUNT(*) AS n
    FROM rets_property
    WHERE L_Status = 'Active' AND L_City = ?
    `,
    [city],
  );
  const sold = await query<RowDataPacket>(
    `
    SELECT COUNT(*) AS n
    FROM california_sold
    WHERE City = ?
      AND PropertyType = 'Residential'
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    `,
    [city],
  );

  const activeCount = Number(active[0]?.n ?? 0);
  const soldCount12mo = Number(sold[0]?.n ?? 0);
  const monthlySales = soldCount12mo / 12;
  const monthsOfSupply =
    monthlySales > 0 ? Math.round((activeCount / monthlySales) * 10) / 10 : null;

  return { city, activeCount, soldCount12mo, monthsOfSupply };
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]!);

if (isMain) {
  const city = process.argv[2];
  if (!city) {
    console.error("Usage: node inventory.ts <city>");
    process.exit(1);
  }
  console.log(await getInventory(city));
  await pool.end();
}
