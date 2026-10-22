// Usage: node search.ts '{"city":"Irvine","maxPrice":1500000,"beds":3,"type":"Condominium","pool":"1"}'
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { RowDataPacket } from "mysql2";
import type { PropertyFilters } from "./parseQuery.ts";
import { query, pool } from "./db.ts";

export type ListingRow = RowDataPacket & {
  L_ListingID: string;
  L_DisplayId: string;
  L_Address: string;
  L_City: string;
  L_Zip: string;
  price: number;
  beds: number;
  baths: string | number;
  sqft: number;
  type: string;
  status: string;
  lat: string;
  lng: string;
  YearBuilt: number;
  AssociationFee: number;
  DaysOnMarket: number;
  PoolPrivateYN: string;
  ViewYN: string;
  FireplaceYN: string;
  PhotoCount: number;
  LA1_UserFirstName: string;
  LA1_UserLastName: string;
  LO1_OrganizationName: string;
};

export async function searchActiveListings(
  filters: PropertyFilters,
  page = 1,
  limit = 10,
): Promise<ListingRow[]> {
  const offset = (page - 1) * limit;
  let sql = `
    SELECT
      L_ListingID, L_DisplayId, L_Address, L_City, L_Zip,
      L_SystemPrice AS price, L_Keyword2 AS beds, LM_Dec_3 AS baths,
      LM_Int2_3 AS sqft, L_Type_ AS type, L_Status AS status,
      LMD_MP_Latitude AS lat, LMD_MP_Longitude AS lng,
      YearBuilt, AssociationFee, DaysOnMarket,
      PoolPrivateYN, ViewYN, FireplaceYN, PhotoCount,
      LA1_UserFirstName, LA1_UserLastName, LO1_OrganizationName
    FROM rets_property
    WHERE L_Status = 'Active'
  `;
  const params: unknown[] = [];

  if (filters.city) {
    sql += " AND L_City = ?";
    params.push(filters.city);
  }
  if (filters.maxPrice != null) {
    sql += " AND L_SystemPrice <= ?";
    params.push(filters.maxPrice);
  }
  if (filters.beds != null) {
    sql += " AND L_Keyword2 >= ?";
    params.push(filters.beds);
  }
  if (filters.baths != null) {
    sql += " AND LM_Dec_3 >= ?";
    params.push(filters.baths);
  }
  if (filters.sqft != null) {
    sql += " AND LM_Int2_3 >= ?";
    params.push(filters.sqft);
  }
  if (filters.type) {
    sql += " AND L_Type_ = ?";
    params.push(filters.type);
  }
  if (filters.pool) {
    sql += " AND PoolPrivateYN = ?";
    params.push(filters.pool);
  }
  if (filters.hasView) {
    sql += " AND ViewYN = ?";
    params.push(filters.hasView);
  }
  if (filters.maxHoa != null) {
    sql += " AND AssociationFee <= ?";
    params.push(filters.maxHoa);
  }

  sql += " ORDER BY L_SystemPrice ASC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  return query<ListingRow>(sql, params);
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]!);

if (isMain) {
  const raw = process.argv[2];
  if (!raw) {
    console.error('Usage: node search.ts \'{"city":"Irvine",...}\'');
    process.exit(1);
  }
  const filters = JSON.parse(raw) as PropertyFilters;
  const rows = await searchActiveListings(filters);
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
}
