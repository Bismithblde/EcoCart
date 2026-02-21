import { NextRequest, NextResponse } from "next/server";

const UPC_API_BASE = "https://api.upcitemdb.com/prod/trial";

/**
 * GET /api/search
 *
 * Search for products via UPC Item DB API.
 *
 * Query params:
 *   q (required) - search keywords (e.g., eggs, gum, cage free eggs)
 *   brand (optional) - filter by brand
 *   category (optional) - filter by category (groceries, phones, etc.)
 *   offset (optional) - for result paging (default 0)
 *   match_mode (optional) - 0 = best matches, 1 = strict (default 1)
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

    const params = new URLSearchParams({
      s: q.trim(),
      match_mode: searchParams.get("match_mode") ?? "1",
      type: "product",
    });

    const offset = searchParams.get("offset");
    if (offset !== null && offset !== "") {
      params.set("offset", offset);
    }

    const brand = searchParams.get("brand");
    if (brand?.trim()) {
      params.set("brand", brand.trim());
    }

    const category = searchParams.get("category");
    if (category?.trim()) {
      params.set("category", category.trim());
    }

    const url = `${UPC_API_BASE}/search?${params.toString()}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error("[search] UPC API error", res.status, await res.text());
      return NextResponse.json(
        { error: "Search service unavailable" },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[search]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
