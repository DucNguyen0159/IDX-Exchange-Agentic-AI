// One user message -> update session -> either ask the next question or mark ready.
import { parsePropertyQuery, type PropertyFilters } from "./mls/parseQuery.ts";
import { getSession, updateSession, type UserSession } from "./session.ts";

const QUESTIONS: { key: keyof UserSession; ask: string }[] = [
  { key: "city", ask: "Which city?" },
  { key: "maxPrice", ask: "What is your budget?" },
  { key: "type", ask: "Any preferences — condo, townhome, or single family?" },
];

function pickedFilters(filters: PropertyFilters): Partial<UserSession> {
  const updates: Partial<UserSession> = {};
  if (filters.city) updates.city = filters.city;
  if (filters.maxPrice != null) updates.maxPrice = filters.maxPrice;
  if (filters.beds != null) updates.beds = filters.beds;
  if (filters.baths != null) updates.baths = filters.baths;
  if (filters.type) updates.type = filters.type;
  if (filters.pool) updates.pool = filters.pool;
  return updates;
}

export function handleTurn(userId: string, text: string) {
  const current = getSession(userId);
  const session = updateSession(userId, {
    ...pickedFilters(parsePropertyQuery(text)),
    conversationStep: current.conversationStep + 1,
  });
  const missing = QUESTIONS.find((q) => session[q.key] == null);
  if (missing) {
    return { ready: false, reply: missing.ask, session };
  }
  return { ready: true, reply: "Ready to search.", session };
}

const isDemo = process.argv[1]?.endsWith("turn.ts");
if (isDemo) {
  const id = "demo-user";
  const lines = [
    "Find homes in Irvine",
    "Under $1.2M",
    "Single family with at least 3 beds",
  ];
  for (const line of lines) {
    console.log("user:", line);
    console.log(handleTurn(id, line));
  }
}
