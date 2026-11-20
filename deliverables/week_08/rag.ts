// Usage: node rag.ts '<question>'
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import "./env.ts";
import { embedText } from "./embed.ts";
import { loadIndex, type IndexedChunk } from "./buildIndex.ts";

export type RetrievedChunk = IndexedChunk & { score: number };

export function cosine(left: number[], right: number[]): number {
  let sum = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    sum += left[index]! * right[index]!;
  }
  return sum;
}

export async function retrieve(query: string, topK = 4): Promise<RetrievedChunk[]> {
  const index = loadIndex();
  if (!index.chunks.length) {
    throw new Error("rag-index.json is empty. Run: node buildIndex.ts");
  }

  const queryVector = await embedText(query, "RETRIEVAL_QUERY");
  return index.chunks
    .map((chunk) => ({ ...chunk, score: cosine(queryVector, chunk.embedding) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, topK);
}

async function generateAnswer(question: string, chunks: RetrievedChunk[]): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not loaded");

  const context = chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] source=${chunk.source}\n${chunk.chunk}`,
    )
    .join("\n\n");

  const prompt = [
    "Answer using only the context below.",
    "If the context is not enough, say you do not know from the indexed documents.",
    "Keep the answer short and concrete.",
    "",
    context,
    "",
    `Question: ${question}`,
  ].join("\n");

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini generate failed (${response.status}): ${await response.text()}`);
  }

  const body = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("Gemini generate response had no text");
  return text.trim();
}

export async function ragAnswer(question: string, topK = 4) {
  const chunks = await retrieve(question, topK);
  const answer = await generateAnswer(question, chunks);
  return {
    question,
    answer,
    sources: chunks.map((chunk) => ({
      source: chunk.source,
      index: chunk.index,
      score: Math.round(chunk.score * 10000) / 10000,
      preview: chunk.chunk.slice(0, 140).replace(/\s+/g, " "),
    })),
  };
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]!);

if (isMain) {
  const question = process.argv.slice(2).join(" ").trim();
  if (!question) {
    console.error("Usage: node rag.ts '<question>'");
    process.exit(1);
  }

  const result = await ragAnswer(question, 4);
  console.log(JSON.stringify(result, null, 2));
}
