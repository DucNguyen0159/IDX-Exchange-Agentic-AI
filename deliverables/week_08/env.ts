import { config } from "dotenv";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const envCandidates = [
  resolve(homedir(), "projects/idx_ai/.env"),
  resolve(here, "../../../.env"),
];

const envPath = envCandidates.find((path) => existsSync(path));
if (envPath) {
  config({ path: envPath });
}

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    `GEMINI_API_KEY not loaded. Tried:\n${envCandidates.map((path) => `  - ${path}`).join("\n")}`,
  );
}
