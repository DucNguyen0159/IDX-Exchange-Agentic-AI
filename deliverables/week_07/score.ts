// Usage: node score.ts <listingId>
// Part 1: structured similarity only (price, beds, city, sqft). Max 60.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export type ScoreListing = {
  listingId: string;
  address: string;
  city: string;
  type: string;
  price: number;
  beds: number;
  baths: string | number;
  sqft: number;
};

type VectorIndex = {
  listings: Array<
    ScoreListing & {
      zip?: string;
      photoCount?: number;
      text?: string;
      vector?: number[];
    }
  >;
};

export function structuredScore(target: ScoreListing, candidate: ScoreListing): number {
  let score = 0;

  const priceDiff = Math.abs(target.price - candidate.price);
  if (priceDiff < 50_000) score += 20;
  else if (priceDiff < 150_000) score += 12;
  else if (priceDiff < 300_000) score += 5;

  if (target.beds === candidate.beds) score += 15;
  if (target.city === candidate.city) score += 15;

  const sqftDiff = Math.abs(target.sqft - candidate.sqft);
  if (sqftDiff < 300) score += 10;
  else if (sqftDiff < 700) score += 5;

  return score;
}

export function loadSavedListings(): ScoreListing[] {
  const paths = [
    resolve(here, "vectors.json"),
    resolve(here, "../week_06/vectors.json"),
  ];
  for (const path of paths) {
    try {
      const index = JSON.parse(readFileSync(path, "utf8")) as VectorIndex;
      if (index.listings?.length) return index.listings;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  throw new Error("vectors.json not found. Run week_06 buildIndex.ts first, or copy it here.");
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]!);

if (isMain) {
  const listingId = process.argv[2]?.trim();
  if (!listingId) {
    console.error("Usage: node score.ts <listingId>");
    process.exit(1);
  }

  const listings = loadSavedListings();
  const target = listings.find((listing) => listing.listingId === listingId);
  if (!target) {
    console.error(`Listing ${listingId} is not in the saved Irvine index`);
    process.exit(1);
  }

  const ranked = listings
    .filter((listing) => listing.listingId !== target.listingId)
    .map((listing) => ({
      structured: structuredScore(target, listing),
      listing,
    }))
    .sort((left, right) => right.structured - left.structured)
    .slice(0, 5);

  console.log({
    target: {
      listingId: target.listingId,
      address: target.address,
      city: target.city,
      price: target.price,
      beds: target.beds,
      sqft: target.sqft,
    },
    top: ranked.map(({ structured, listing }) => ({
      structured,
      listingId: listing.listingId,
      address: listing.address,
      price: listing.price,
      beds: listing.beds,
      sqft: listing.sqft,
    })),
  });
}
