// Search memory for one user. Saved to sessions.json so a new process
// (each OpenClaw / WhatsApp turn) still sees the previous filters.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type UserSession = {
  city?: string;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  type?: string;
  pool?: string;
  conversationStep: number;
};

const sessions = new Map<string, UserSession>();
const storePath = resolve(dirname(fileURLToPath(import.meta.url)), "sessions.json");

function loadSessions(): void {
  if (!existsSync(storePath)) return;
  const saved = JSON.parse(readFileSync(storePath, "utf8")) as Record<string, UserSession>;
  for (const [userId, session] of Object.entries(saved)) {
    sessions.set(userId, session);
  }
}

function saveSessions(): void {
  const saved = Object.fromEntries(sessions);
  writeFileSync(storePath, JSON.stringify(saved, null, 2) + "\n");
}

loadSessions();

export function getSession(userId: string): UserSession {
  const existing = sessions.get(userId);
  if (existing) return existing;
  const fresh: UserSession = { conversationStep: 0 };
  sessions.set(userId, fresh);
  saveSessions();
  return fresh;
}

export function updateSession(
  userId: string,
  updates: Partial<UserSession>,
): UserSession {
  const next = { ...getSession(userId), ...updates };
  sessions.set(userId, next);
  saveSessions();
  return next;
}

export function clearSession(userId: string): void {
  sessions.delete(userId);
  saveSessions();
}

const isDemo = process.argv[1]?.endsWith("session.ts");
if (isDemo) {
  const id = "demo-user";
  console.log("1 get   ", getSession(id));
  console.log("2 update", updateSession(id, { city: "Irvine", conversationStep: 1 }));
  console.log("3 get   ", getSession(id));
  clearSession(id);
  console.log("4 after clear", getSession(id));
}
