// Usage: node similar.ts '<description>'
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { pool } from "./db.ts";
import { embedText } from "./embed.ts";
import { loadIndex, type StoredListing } from "./buildIndex.ts";

export type SimilarHit = {
  score: number;
  listing: StoredListing;
};

export function cosine(left: number[], right: number[]): number {
  let sum = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    sum += left[index]! * right[index]!;
  }
  return sum;
}

export async function similarListings(description: string, limit = 5): Promise<SimilarHit[]> {
  const index = loadIndex();
  if (!index.listings.length) {
    throw new Error("vectors.json is empty. Run: node buildIndex.ts 40");
  }

  const queryVector = await embedText(description, "RETRIEVAL_QUERY");
  return index.listings
    .map((listing) => ({ score: cosine(queryVector, listing.vector), listing }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]!);

if (isMain) {
  const description = process.argv.slice(2).join(" ").trim();
  if (!description) {
    console.error("Usage: node similar.ts '<description>'");
    process.exit(1);
  }

  const hits = await similarListings(description, 5);
  console.log(
    hits.map(({ score, listing }) => ({
      score: Math.round(score * 10000) / 10000,
      listingId: listing.listingId,
      address: listing.address,
      city: listing.city,
      type: listing.type,
      price: listing.price,
      beds: listing.beds,
      baths: listing.baths,
      sqft: listing.sqft,
    })),
  );
  await pool.end();
}
