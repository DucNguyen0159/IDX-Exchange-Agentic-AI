// Usage: node market.ts 'Is now a good time to buy in Irvine?'
import { pool } from "./db.ts";
import { getCitySummary } from "./citySummary.ts";
import { getInventory } from "./inventory.ts";
import { getPriceTrend } from "./trend.ts";

const CITY_STOP = "under|below|with|for|at|that|and|less|up|near|around|over|between|max|budget";
const CITY_RE = new RegExp(
  `\\bin\\s+([a-z][a-z.' -]*?)(?=\\s+(?:${CITY_STOP})\\b|[,.!?;]|\\s+\\$|\\s+\\d|$)`,
  "gi",
);

function titleCase(value: string): string {
  return value.trim().toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function extractCity(text: string): string | null {
  const cities = [...` ${text} `.matchAll(CITY_RE)];
  if (!cities.length) return null;
  return titleCase(cities[cities.length - 1][1]) || null;
}

export async function answerMarketQuestion(text: string) {
  const city = extractCity(text);
  if (!city) {
    return {
      city: null,
      reply: "Name a California city, for example: in Irvine.",
    };
  }

  const summary = await getCitySummary(city);
  if (!summary) {
    return { city, reply: `No residential sales found for ${city} in the last 12 months.` };
  }

  const inventory = await getInventory(city);
  const trend = await getPriceTrend(city, 12);
  const first = trend[0];
  const last = trend[trend.length - 1];
  const trendChangePct =
    first && last && first.avgPrice
      ? Math.round(((last.avgPrice - first.avgPrice) / first.avgPrice) * 1000) / 10
      : null;

  return {
    city,
    medianClosePrice: summary.medianClosePrice,
    avgClosePrice: summary.avgClosePrice,
    avgPricePerSqft: summary.avgPricePerSqft,
    avgDaysOnMarket: summary.avgDaysOnMarket,
    listToClosePct: summary.listToClosePct,
    soldCount: summary.soldCount,
    activeCount: inventory.activeCount,
    monthsOfSupply: inventory.monthsOfSupply,
    trendMonths: trend.length,
    trendChangePct,
    latestMonth: last
      ? { month: last.month, sales: last.sales, avgPrice: last.avgPrice, priceChangePct: last.priceChangePct }
      : null,
  };
}

const text = process.argv.slice(2).join(" ").trim();
if (!text) {
  console.error("Usage: node market.ts '<market question>'");
  process.exit(1);
}

console.log(JSON.stringify(await answerMarketQuestion(text), null, 2));
await pool.end();
