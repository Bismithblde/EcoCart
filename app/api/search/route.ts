import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { search } from "@/lib/openfoodfacts";

const SEARCH_CACHE_REVALIDATE = 120;

/**
 * GET /api/search
 *
 * Search for products via Open Food Facts.
 * Responses are cached for 2 minutes per (q, country, page, page_size, brand).
 *
 * Query params:
 *   q (required) - search keywords (e.g., eggs, gum, cage free eggs)
 *   brand (optional) - filter by brand
 *   country (optional) - filter by country (e.g., united-states, en:united-states)
 *   page (optional) - page number (default 1)
 *   page_size (optional) - results per page (default 24)
 *
 * Rate limit: 10 requests/minute (Open Food Facts)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? searchParams.get("s");

    if (!q || !q.trim()) {
      return NextResponse.json(
        { error: "Search keyword (q) is required" },
        { status: 400 }
      );
    }

    const page = parseInt(searchParams.get("page") ?? "1", 10) || 1;
    const pageSize = Math.min(
      parseInt(searchParams.get("page_size") ?? "24", 10) || 24,
      100
    );
    const brand = searchParams.get("brand") ?? undefined;
    const country = searchParams.get("country") ?? "united-states";

    const getCachedSearch = unstable_cache(
      async () =>
        search(q.trim(), {
          page,
          pageSize,
          brand,
          country,
          realEggsOnly: false,
        }),
      ["search", q.trim(), String(page), String(pageSize), brand ?? "", country ?? ""],
      { revalidate: SEARCH_CACHE_REVALIDATE }
    );

    const result = await getCachedSearch();

    return NextResponse.json(result);
  } catch (err) {
    console.error("[search]", err);
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
