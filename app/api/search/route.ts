import { NextRequest, NextResponse } from "next/server";
import { embedQuery } from "@/lib/embeddings";
import { queryVectorsMultiNamespace, SEARCH_WEIGHTS } from "@/lib/pinecone";
import { getProductsByIds, type SearchResultProduct } from "@/lib/master-products";

const DEFAULT_TOP_K = 24;
const MAX_PAGE_SIZE = 100;
/** Over-fetch so after dedupe and brand prioritization we still have enough for the page. */
const FETCH_MULTIPLIER = 3;

function normalizeName(name: string): string {
  return (name ?? "").trim().toLowerCase();
}

/**
 * Prioritize products with brands (more useful); remove unbranded duplicates
 * that share the same product name so only one "Eggs" with no brand remains.
 */
function prioritizeBrandedAndDedupeUnbranded(
  products: SearchResultProduct[]
): SearchResultProduct[] {
  const withMeta = products.map((p, index) => ({
    product: p,
    index,
    hasBrand: Boolean(p.brands?.trim()),
    normName: normalizeName(p.product_name),
  }));

  const seenUnbrandedNames = new Set<string>();
  const filtered = withMeta.filter((m) => {
    if (m.hasBrand) return true;
    if (seenUnbrandedNames.has(m.normName)) return false;
    seenUnbrandedNames.add(m.normName);
    return true;
  });

  filtered.sort((a, b) => {
    if (a.hasBrand !== b.hasBrand) return a.hasBrand ? -1 : 1;
    return a.index - b.index;
  });

  return filtered.map((f) => f.product);
}

/**
 * GET /api/search
 *
 * Semantic product search: embed query via Featherless (Yuan-embedding-2.0-en),
 * query Pinecone for top N, then join with master DB (api_items) for full product info.
 *
 * Query params:
 *   q (required) - search keywords (e.g., product name or category)
 *   page (optional) - page number (default 1)
 *   page_size (optional) - results per page (default 24, max 100)
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

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      Math.max(1, parseInt(searchParams.get("page_size") ?? "24", 10) || 24),
      MAX_PAGE_SIZE
    );

    const topK = Math.min(
      pageSize * page * FETCH_MULTIPLIER,
      MAX_PAGE_SIZE * 10
    );
    const queryEmbedding = await embedQuery(q.trim());
    const matches = await queryVectorsMultiNamespace(queryEmbedding, topK);

    const ids = matches.map((m) => m.id).filter(Boolean);
    const products = await getProductsByIds(ids);
    const rankingById = new Map(
      matches.map((m) => [
        m.id,
        {
          score: m.score,
          nameScore: m.nameScore,
          catScore: m.catScore,
          brandScore: m.brandScore,
        },
      ])
    );

    const ordered = prioritizeBrandedAndDedupeUnbranded(products);
    const start = (page - 1) * pageSize;
    const pagedProducts = ordered.slice(start, start + pageSize).map((p) => {
      const ranking = rankingById.get(p.code);
      return {
        ...p,
        ...(ranking && {
          ranking: {
            score: ranking.score,
            nameScore: ranking.nameScore,
            catScore: ranking.catScore,
            brandScore: ranking.brandScore,
          },
        }),
      };
    });

    return NextResponse.json({
      products: pagedProducts,
      count: ordered.length,
      page,
      page_size: pageSize,
      weights: SEARCH_WEIGHTS,
    });
  } catch (err) {
    console.error("[search]", err);
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
