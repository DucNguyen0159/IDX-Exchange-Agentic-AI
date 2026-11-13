// Usage: node recommend.ts <listingId>
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { pool } from "./db.ts";
import { validateWithComps } from "./comps.ts";
import { hybridScore, loadEmbeddedListings } from "./hybrid.ts";

export async function recommendListings(listingId: string, limit = 5) {
  const listings = loadEmbeddedListings();
  const target = listings.find((listing) => listing.listingId === listingId);
  if (!target) {
    throw new Error(`Listing ${listingId} is not in the saved Irvine index`);
  }

  const ranked = listings
    .filter((listing) => listing.listingId !== target.listingId)
    .map((listing) => ({ ...hybridScore(target, listing), listing }))
    .sort((left, right) => right.total - left.total)
    .slice(0, limit);

  const recommendations = [];
  for (const hit of ranked) {
    const comps = await validateWithComps(hit.listing.city, hit.listing.sqft, hit.listing.price);
    recommendations.push({
      total: hit.total,
      structured: hit.structured,
      semantic: hit.semantic,
      listingId: hit.listing.listingId,
      address: hit.listing.address,
      city: hit.listing.city,
      type: hit.listing.type,
      price: hit.listing.price,
      beds: hit.listing.beds,
      baths: hit.listing.baths,
      sqft: hit.listing.sqft,
      comps: {
        compPrice: comps.compPrice,
        compCount: comps.compCount,
        avgPpsf: comps.avgPpsf,
        deltaPct: comps.deltaPct,
      },
    });
  }

  return {
    target: {
      listingId: target.listingId,
      address: target.address,
      city: target.city,
      type: target.type,
      price: target.price,
      beds: target.beds,
      baths: target.baths,
      sqft: target.sqft,
    },
    recommendations,
  };
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]!);

if (isMain) {
  const listingId = process.argv[2]?.trim();
  if (!listingId) {
    console.error("Usage: node recommend.ts <listingId>");
    process.exit(1);
  }

  const result = await recommendListings(listingId, 5);
  console.log(JSON.stringify(result, null, 2));
  await pool.end();
}
