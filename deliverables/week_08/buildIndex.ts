// Usage: node buildIndex.ts
// Part 2: embed all chunks once and save rag-index.json.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildChunks } from "./chunk.ts";
import { DIMS, MODEL, embedText } from "./embed.ts";

const here = dirname(fileURLToPath(import.meta.url));
export const INDEX_PATH = resolve(here, "rag-index.json");
const TASK_TYPE = "RETRIEVAL_DOCUMENT";

export type IndexedChunk = {
  source: string;
  index: number;
  chunk: string;
  embedding: number[];
};

export type RagIndex = {
  model: string;
  dims: number;
  taskType: string;
  chunks: IndexedChunk[];
};

export function loadIndex(): RagIndex {
  try {
    return JSON.parse(readFileSync(INDEX_PATH, "utf8")) as RagIndex;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { model: MODEL, dims: DIMS, taskType: TASK_TYPE, chunks: [] };
    }
    throw error;
  }
}

function saveIndex(index: RagIndex): void {
  writeFileSync(INDEX_PATH, JSON.stringify(index));
}

function chunkKey(source: string, index: number): string {
  return `${source}::${index}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function embedWithRetry(text: string): Promise<number[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return await embedText(text, TASK_TYPE);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("(429)") && !message.includes("(503)")) throw error;
      const match = message.match(/retry in ([0-9]+(?:\.[0-9]+)?)s/i);
      const seconds = match ? Number(match[1]) : 35;
      const waitMs = Math.ceil((Number.isFinite(seconds) ? seconds : 35) * 1000) + 1000;
      console.log(`rate limited; waiting ${Math.round(waitMs / 1000)}s`);
      await sleep(waitMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]!);

if (isMain) {
  const pending = buildChunks();
  const index = loadIndex();
  if (index.model !== MODEL || index.dims !== DIMS || index.taskType !== TASK_TYPE) {
    throw new Error("rag-index.json was built with a different model. Delete it and run again.");
  }

  const known = new Set(index.chunks.map((item) => chunkKey(item.source, item.index)));
  let added = 0;

  for (const item of pending) {
    const key = chunkKey(item.source, item.index);
    if (known.has(key)) continue;
    const embedding = await embedWithRetry(item.chunk);
    index.chunks.push({
      source: item.source,
      index: item.index,
      chunk: item.chunk,
      embedding,
    });
    known.add(key);
    added += 1;
    saveIndex(index);
    if (added % 10 === 0 || added === 1) {
      console.log(`embedded ${index.chunks.length}/${pending.length}`);
    }
    // Free tier is about 100 embed requests / minute.
    await sleep(700);
  }

  console.log({
    file: "rag-index.json",
    model: index.model,
    dims: index.dims,
    added,
    saved: index.chunks.length,
    total: pending.length,
  });
}
