/**
 * Master product table (api_items or products) read for search results.
 * Maps DB rows to the SearchResult shape expected by the frontend.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface SearchResultProduct {
  code: string;
  product_name: string;
  brands?: string;
  categories?: string;
  description?: string;
  ecoscore_grade?: string;
  ecoscore_score?: number;
  nutriscore_grade?: string;
  nutriscore_score?: number;
  image_url?: string;
  image_small_url?: string;
}

const MASTER_TABLE = process.env.MASTER_TABLE ?? "api_items";
const ID_COLUMN = MASTER_TABLE === "products" ? "code" : "id";

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase URL and key are required");
  return createClient(url, key);
}

/** Map api_items or products row to SearchResult shape. */
function rowToSearchResult(row: Record<string, unknown>): SearchResultProduct {
  const id = String(row[ID_COLUMN] ?? "");
  const productName = String(row.product_name ?? "").trim();
  const brands = row.brands != null ? String(row.brands).trim() : undefined;
  const categories = row.categories != null ? String(row.categories).trim() : undefined;
  const labels = row.labels != null ? String(row.labels).trim() : undefined;
  const description = [categories, labels].filter(Boolean).join(" • ") || undefined;
  const ecoscoreGrade =
    row.ecoscore_grade != null
      ? String(row.ecoscore_grade).trim()
      : row.grade != null
        ? String(row.grade).trim()
        : undefined;
  const ecoscoreScore =
    row.ecoscore_score != null
      ? Number(row.ecoscore_score)
      : row.eco_score != null
        ? Number(row.eco_score)
        : undefined;
  const nutriments = row.nutriments as Record<string, unknown> | undefined;
  const nutriscoreScore =
    nutriments && typeof nutriments.nutriscore_score === "number"
      ? nutriments.nutriscore_score
      : undefined;
  const nutriscoreGrade =
    nutriments && typeof nutriments.nutriscore_grade === "string"
      ? nutriments.nutriscore_grade
      : undefined;

  return {
    code: id,
    product_name: productName,
    brands: brands || undefined,
    categories: categories || undefined,
    description: description || undefined,
    ecoscore_grade: ecoscoreGrade || undefined,
    ecoscore_score: Number.isFinite(ecoscoreScore) ? ecoscoreScore : undefined,
    nutriscore_grade: nutriscoreGrade,
    nutriscore_score: Number.isFinite(nutriscoreScore) ? nutriscoreScore : undefined,
    image_url: row.image_url != null ? String(row.image_url) : undefined,
    image_small_url: row.image_small_url != null ? String(row.image_small_url) : undefined,
  };
}

/**
 * Fetch products by ids from the master table. Preserves order of ids where possible.
 */
export async function getProductsByIds(ids: string[]): Promise<SearchResultProduct[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(MASTER_TABLE)
    .select("*")
    .in(ID_COLUMN, ids);

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  const byId = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    const id = String(row[ID_COLUMN]);
    if (id) byId.set(id, row);
  }
  return ids.map((id) => byId.get(id)).filter(Boolean).map((row) => rowToSearchResult(row!));
}
