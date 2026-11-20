// Usage: node chunk.ts
// Part 1: load the three handbook sources and print chunk counts.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(here, "sources");
const CHUNK_SIZE = 600;
const OVERLAP = 100;

export type SourceDoc = {
  title: string;
  content: string;
};

export type TextChunk = {
  source: string;
  chunk: string;
  index: number;
};

const SOURCE_SPECS = [
  {
    title: "Real Estate Data Analyst Primer",
    kind: "pdf" as const,
    path: resolve(homedir(), "projects/idx_ai/handbooks/Real_Estate_Data_Analys_Primer.pdf"),
    cache: resolve(CACHE_DIR, "primer.txt"),
  },
  {
    title: "Trestle Property MetaData",
    kind: "pdf" as const,
    path: resolve(homedir(), "projects/idx_ai/handbooks/Trestle Property MetaData.pdf"),
    cache: resolve(CACHE_DIR, "trestle.txt"),
  },
  {
    title: "Week 5 Market Summaries",
    kind: "text" as const,
    path: resolve(here, "../week_05/README.md"),
    cache: resolve(CACHE_DIR, "week05-market.txt"),
  },
  {
    title: "Handbook Schema Reference",
    kind: "pdf" as const,
    path: resolve(homedir(), "projects/idx_ai/handbooks/AI_Agentic_Engineer_Intern_Handbook_2026_v2.pdf"),
    cache: resolve(CACHE_DIR, "handbook-schema.txt"),
    pdfPages: [4, 5, 6] as number[],
  },
  {
    title: "Week 5 Metric Notes",
    kind: "text" as const,
    path: resolve(here, "metric-notes.md"),
    cache: resolve(CACHE_DIR, "metric-notes.txt"),
  },
];

export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = OVERLAP): string[] {
  const cleaned = text.replace(/\t+/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!cleaned) return [];
  if (overlap >= chunkSize) throw new Error("overlap must be smaller than chunkSize");

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    chunks.push(cleaned.slice(start, end));
    if (end >= cleaned.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

function extractPdfText(pdfPath: string, pages?: number[]): string {
  const script = `
from pypdf import PdfReader
import sys
reader = PdfReader(sys.argv[1])
if len(sys.argv) > 2 and sys.argv[2]:
    pages = [int(x) for x in sys.argv[2].split(",")]
else:
    pages = list(range(1, len(reader.pages) + 1))
parts = []
for page_no in pages:
    idx = page_no - 1
    if 0 <= idx < len(reader.pages):
        parts.append(reader.pages[idx].extract_text() or "")
print("\\n".join(parts))
`;
  const python = resolve(homedir(), "projects/idx_ai/venv/bin/python3");
  const bin = existsSync(python) ? python : "python3";
  const pageArg = pages?.length ? pages.join(",") : "";
  return execFileSync(bin, ["-c", script, pdfPath, pageArg], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

export function loadSources(): SourceDoc[] {
  mkdirSync(CACHE_DIR, { recursive: true });
  return SOURCE_SPECS.map((spec) => {
    if (!existsSync(spec.path)) {
      throw new Error(`Missing source: ${spec.path}`);
    }
    let content: string;
    if (existsSync(spec.cache)) {
      content = readFileSync(spec.cache, "utf8");
    } else if (spec.kind === "pdf") {
      content = extractPdfText(spec.path, "pdfPages" in spec ? spec.pdfPages : undefined);
      writeFileSync(spec.cache, content);
    } else {
      content = readFileSync(spec.path, "utf8");
      writeFileSync(spec.cache, content);
    }
    return { title: spec.title, content };
  });
}

export function buildChunks(docs: SourceDoc[] = loadSources()): TextChunk[] {
  const out: TextChunk[] = [];
  for (const doc of docs) {
    const pieces = chunkText(doc.content);
    pieces.forEach((chunk, index) => {
      out.push({ source: doc.title, chunk, index });
    });
  }
  return out;
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]!);

if (isMain) {
  const docs = loadSources();
  const chunks = buildChunks(docs);
  console.log({
    chunkSize: CHUNK_SIZE,
    overlap: OVERLAP,
    sources: docs.map((doc) => ({
      title: doc.title,
      chars: doc.content.length,
      chunks: chunkText(doc.content).length,
    })),
    totalChunks: chunks.length,
    sample: chunks.slice(0, 2).map((item) => ({
      source: item.source,
      index: item.index,
      preview: item.chunk.slice(0, 120).replace(/\s+/g, " "),
    })),
  });
}
