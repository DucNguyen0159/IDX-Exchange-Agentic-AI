// Usage: node embed.ts
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { RowDataPacket } from "mysql2";
import { pool, query } from "./db.ts";

export const MODEL = "gemini-embedding-001";
export const DIMS = 768;

export type ListingTextRow = RowDataPacket & {
  L_ListingID: string;
  L_Type_: string;
  L_City: string;
  L_Keyword2: number;
  LM_Dec_3: string | number;
  LM_Int2_3: number;
  YearBuilt: number;
  L_SystemPrice: number;
  L_Remarks: string | null;
};

export function listingText(row: ListingTextRow): string {
  const remarks = (row.L_Remarks ?? "").replace(/\s+/g, " ").trim().slice(0, 6000);
  return [
    `${row.L_Type_} in ${row.L_City}, CA.`,
    `${row.L_Keyword2} beds, ${row.LM_Dec_3} baths.`,
    `${row.LM_Int2_3} sq ft. Built ${row.YearBuilt}.`,
    `Price: $${Number(row.L_SystemPrice).toLocaleString("en-US")}.`,
    remarks,
  ].join(" ");
}

export function normalize(values: number[]): number[] {
  const length = Math.hypot(...values);
  if (!length) return values;
  return values.map((value) => value / length);
}

export async function embedText(text: string, taskType: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not loaded");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        taskType,
        output_dimensionality: DIMS,
        content: { parts: [{ text: text.slice(0, 8000) }] },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini embed failed (${response.status}): ${await response.text()}`);
  }

  const body = (await response.json()) as { embedding?: { values?: number[] } };
  const values = body.embedding?.values;
  if (!values?.length) throw new Error("Gemini embed response had no vector");
  return normalize(values);
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]!);

if (isMain) {
const rows = await query<ListingTextRow>(
  `
  SELECT L_ListingID, L_Type_, L_City, L_Keyword2, LM_Dec_3, LM_Int2_3,
         YearBuilt, L_SystemPrice, L_Remarks
  FROM rets_property
  WHERE L_Status = 'Active'
    AND L_City = 'Irvine'
    AND L_Remarks IS NOT NULL
    AND L_Remarks <> ''
  ORDER BY L_ListingID
  LIMIT 1
  `,
);

const row = rows[0];
if (!row) {
  console.error("No Irvine listing with remarks found");
  process.exit(1);
}

const text = listingText(row);
const vector = await embedText(text, "RETRIEVAL_DOCUMENT");
const norm = Math.hypot(...vector);

console.log({
  listingId: row.L_ListingID,
  city: row.L_City,
  type: row.L_Type_,
  textChars: text.length,
  dims: vector.length,
  norm: Math.round(norm * 1e6) / 1e6,
  firstValues: vector.slice(0, 3).map((value) => Math.round(value * 1e4) / 1e4),
});
await pool.end();
}
