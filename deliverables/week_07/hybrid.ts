// Usage: node hybrid.ts <listingId>
// Part 2: structured (max 60) + embedding cosine * 40.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { structuredScore, type ScoreListing } from "./score.ts";

const here = dirname(fileURLToPath(import.meta.url));

export type EmbeddedListing = ScoreListing & {
  vector: number[];
};

type VectorIndex = {
  listings: EmbeddedListing[];
};

export function cosine(left: number[], right: number[]): number {
  let sum = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    sum += left[index]! * right[index]!;
  }
  return sum;
}

export function hybridScore(
  target: EmbeddedListing,
  candidate: EmbeddedListing,
): { structured: number; semantic: number; total: number } {
  const structured = structuredScore(target, candidate);
  const semantic = Math.round(cosine(target.vector, candidate.vector) * 40 * 100) / 100;
  return {
    structured,
    semantic,
    total: Math.round((structured + semantic) * 100) / 100,
  };
}

export function loadEmbeddedListings(): EmbeddedListing[] {
  const paths = [
    resolve(here, "vectors.json"),
    resolve(here, "../week_06/vectors.json"),
  ];
  for (const path of paths) {
    try {
      const index = JSON.parse(readFileSync(path, "utf8")) as VectorIndex;
      const listings = (index.listings ?? []).filter(
        (listing) => Array.isArray(listing.vector) && listing.vector.length > 0,
      );
      if (listings.length) return listings;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  throw new Error("vectors.json with embeddings not found. Run week_06 buildIndex.ts first.");
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]!);

if (isMain) {
  const listingId = process.argv[2]?.trim();
  if (!listingId) {
    console.error("Usage: node hybrid.ts <listingId>");
    process.exit(1);
  }

  const listings = loadEmbeddedListings();
  const target = listings.find((listing) => listing.listingId === listingId);
  if (!target) {
    console.error(`Listing ${listingId} is not in the saved Irvine index`);
    process.exit(1);
  }

  const ranked = listings
    .filter((listing) => listing.listingId !== target.listingId)
    .map((listing) => ({ ...hybridScore(target, listing), listing }))
    .sort((left, right) => right.total - left.total)
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
    top: ranked.map(({ structured, semantic, total, listing }) => ({
      total,
      structured,
      semantic,
      listingId: listing.listingId,
      address: listing.address,
      price: listing.price,
      beds: listing.beds,
      sqft: listing.sqft,
    })),
  });
}
