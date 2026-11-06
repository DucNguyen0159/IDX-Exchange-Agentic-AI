// Usage: node buildIndex.ts [limit]
// Embeds active Irvine listings once and saves deliverables/week_06/vectors.json.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RowDataPacket } from "mysql2";
import { pool, query } from "./db.ts";
import { DIMS, MODEL, embedText, listingText, type ListingTextRow } from "./embed.ts";

const here = dirname(fileURLToPath(import.meta.url));
export const VECTORS_PATH = resolve(here, "vectors.json");
const TASK_TYPE = "RETRIEVAL_DOCUMENT";
const DEFAULT_LIMIT = 40;

export type StoredListing = {
  listingId: string;
  address: string;
  city: string;
  zip: string;
  type: string;
  price: number;
  beds: number;
  baths: string | number;
  sqft: number;
  photoCount: number;
  text: string;
  vector: number[];
};

export type VectorIndex = {
  model: string;
  dims: number;
  taskType: string;
  city: string;
  listings: StoredListing[];
};

type IndexRow = ListingTextRow &
  RowDataPacket & {
    L_Address: string;
    L_Zip: string;
    PhotoCount: number;
  };

export function loadIndex(): VectorIndex {
  try {
    return JSON.parse(readFileSync(VECTORS_PATH, "utf8")) as VectorIndex;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { model: MODEL, dims: DIMS, taskType: TASK_TYPE, city: "Irvine", listings: [] };
    }
    throw error;
  }
}

function saveIndex(index: VectorIndex): void {
  writeFileSync(VECTORS_PATH, JSON.stringify(index));
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]!);

if (isMain) {
  const limit = Number(process.argv[2] ?? DEFAULT_LIMIT);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    console.error("Limit must be an integer from 1 to 200");
    process.exit(1);
  }

  const index = loadIndex();
  if (index.model !== MODEL || index.dims !== DIMS || index.taskType !== TASK_TYPE) {
    throw new Error("vectors.json was built with a different model. Delete it and run again.");
  }

  const known = new Set(index.listings.map((listing) => listing.listingId));
  const rows = await query<IndexRow>(
    `
    SELECT L_ListingID, L_Address, L_City, L_Zip, L_Type_, L_Keyword2, LM_Dec_3,
           LM_Int2_3, YearBuilt, L_SystemPrice, L_Remarks, PhotoCount
    FROM rets_property
    WHERE L_Status = 'Active'
      AND L_City = 'Irvine'
      AND L_Remarks IS NOT NULL
      AND L_Remarks <> ''
    ORDER BY L_ListingID
    `,
  );
  const pending = rows.filter((row) => !known.has(String(row.L_ListingID))).slice(0, limit);

  for (const row of pending) {
    const text = listingText(row);
    let vector: number[];
    try {
      vector = await embedText(text, TASK_TYPE);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("(429)") && !message.includes("(503)")) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 5000));
      vector = await embedText(text, TASK_TYPE);
    }
    index.listings.push({
      listingId: String(row.L_ListingID),
      address: row.L_Address,
      city: row.L_City,
      zip: row.L_Zip,
      type: row.L_Type_,
      price: Number(row.L_SystemPrice),
      beds: Number(row.L_Keyword2),
      baths: row.LM_Dec_3,
      sqft: Number(row.LM_Int2_3),
      photoCount: Number(row.PhotoCount),
      text,
      vector,
    });
    saveIndex(index);
    console.log(`embedded ${index.listings.length} ${row.L_ListingID}`);
  }

  console.log({
    file: "vectors.json",
    city: index.city,
    model: index.model,
    dims: index.dims,
    added: pending.length,
    saved: index.listings.length,
    available: rows.length,
  });
  await pool.end();
}
