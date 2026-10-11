// Usage: node parse.ts "3 bed condos in Irvine under $1.5M with a pool"
import { parsePropertyQuery } from "./parseQuery.ts";

const query = process.argv.slice(2).join(" ").trim();
if (!query) {
  console.error('Usage: node parse.ts "<free-text property query>"');
  process.exit(1);
}
console.log(JSON.stringify(parsePropertyQuery(query), null, 2));
