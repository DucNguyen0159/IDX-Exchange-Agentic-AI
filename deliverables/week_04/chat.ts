// When the session is ready, run the Week 3 active-listing search and return cards.
import type { PropertyFilters } from "./mls/parseQuery.ts";
import { pool } from "./mls/db.ts";
import { searchActiveListings } from "./mls/search.ts";
import type { UserSession } from "./session.ts";
import { handleTurn } from "./turn.ts";

export type PropertyCard = {
  address: string;
  price: number;
  beds: number;
  baths: string | number;
  photos: number;
};

function toFilters(session: UserSession): PropertyFilters {
  return {
    city: session.city ?? null,
    maxPrice: session.maxPrice ?? null,
    beds: session.beds ?? null,
    baths: session.baths ?? null,
    sqft: null,
    type: session.type ?? null,
    pool: session.pool ?? null,
    hasView: null,
    maxHoa: null,
  };
}

export async function handleChat(userId: string, text: string) {
  const turn = handleTurn(userId, text);
  if (!turn.ready) {
    return { ready: false, reply: turn.reply, cards: [] as PropertyCard[] };
  }

  const rows = await searchActiveListings(toFilters(turn.session), 1, 5);
  const cards: PropertyCard[] = rows.map((row) => ({
    address: row.L_Address,
    price: row.price,
    beds: row.beds,
    baths: row.baths,
    photos: row.PhotoCount,
  }));

  return { ready: true, reply: `Found ${cards.length} homes.`, cards };
}

const isMain = process.argv[1]?.endsWith("chat.ts");
if (isMain) {
  const userId = process.argv[2];
  const text = process.argv.slice(3).join(" ").trim();
  if (!userId || !text) {
    console.error("Usage: node chat.ts <userId> '<message>'");
    process.exit(1);
  }
  const result = await handleChat(userId, text);
  console.log(JSON.stringify(result, null, 2));
  await pool.end();
}
