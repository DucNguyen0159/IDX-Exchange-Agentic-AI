import { config } from "dotenv";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import mysql from "mysql2/promise";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

const here = dirname(fileURLToPath(import.meta.url));

// Prefer the workspace .env (works from week_03/ and from the OpenClaw skill copy).
const envCandidates = [
  resolve(homedir(), "projects/idx_ai/.env"),
  resolve(here, "../../../.env"),
];

const envPath = envCandidates.find((p) => existsSync(p));
if (envPath) {
  config({ path: envPath });
}

if (!process.env.MYSQL_USER || !process.env.MYSQL_DATABASE) {
  throw new Error(
    `MySQL env not loaded. Tried:\n${envCandidates.map((p) => `  - ${p}`).join("\n")}`,
  );
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query<T extends RowDataPacket = RowDataPacket>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const [rows] = await pool.execute<T[] | ResultSetHeader>(sql, params);
  return rows as T[];
}

export { pool };
