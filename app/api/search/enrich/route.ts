import { NextRequest, NextResponse } from "next/server";
import { search, extractClassificationData } from "@/lib/openfoodfacts";

/**
 * GET /api/search/enrich
 *
 * Search Open Food Facts and return products with structured sustainability/health
 * classification data for AI agents.
 *
 * Query params: same as /api/search (q required, brand, country, page, page_size optional)
 *
 * Response:
 *   - products: items with classification data
 *   - sufficient_for_classification: true if at least one product has enough data
 *   - insufficient_for_classification: true when frontend should handle fallback
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

    const result = await search(q.trim(), {
      page,
      pageSize,
      brand: searchParams.get("brand") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      realEggsOnly: false,
    });

    const enrichedProducts = result.products.map((p) => {
      const classification = extractClassificationData(p);
      return {
        ...p,
        off_classification: classification,
      };
    });

    const anySufficient = enrichedProducts.some(
      (p) => p.off_classification?.sufficient_for_classification
    );

    return NextResponse.json({
      count: result.count,
      page: result.page,
      page_size: result.page_size,
      products: enrichedProducts,
      sufficient_for_classification: anySufficient,
      insufficient_for_classification: !anySufficient,
    });
  } catch (err) {
    console.error("[search/enrich]", err);
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
