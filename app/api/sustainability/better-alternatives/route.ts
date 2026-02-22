import { NextRequest, NextResponse } from "next/server";
import { embedQuery } from "@/lib/embeddings";
import { queryVectorsMultiNamespace } from "@/lib/pinecone";
import { getProductsByIds, type SearchResultProduct } from "@/lib/master-products";
import { assessProduct, type ProductSummary, type SustainabilityAssessment } from "@/lib/sustainability-agent";

const DEFAULT_TOP_K = 6;
const MAX_TOP_K = 10;

function checkOpenAIKey(): void {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY is required for better alternatives");
  }
}

function toProductSummary(p: SearchResultProduct): ProductSummary {
  return {
    code: p.code,
    product_name: p.product_name,
    brands: p.brands,
    categories: p.categories,
    ecoscore_grade: p.ecoscore_grade,
    nutriscore_grade: p.nutriscore_grade,
    ingredients_text: p.ingredients,
  };
}

/**
 * POST /api/sustainability/better-alternatives
 *
 * 1. Embed the current product (name + brands + categories) and query Pinecone for top K similar products.
 * 2. Exclude the current product, fetch full product records from the master table.
 * 3. Run the sustainability agent on each alternative and return them sorted by score (best first).
 *
 * Body: { product: { code, product_name?, brands?, categories? }, topK?: number, currentScore?: number }
 * Alternatives with score <= currentScore are excluded (only strictly better alternatives appear).
 * Returns: { alternatives: Array<{ product: SearchResultProduct, assessment: SustainabilityAssessment }> }
 */
export async function POST(request: NextRequest) {
  try {
    checkOpenAIKey();
    const body = await request.json();
    const product = body?.product;
    const currentScore =
      typeof body.currentScore === "number" ? body.currentScore : undefined;
    if (!product || typeof product !== "object") {
      return NextResponse.json(
        { error: "Request body must include product: { code, product_name?, brands?, categories? }" },
        { status: 400 }
      );
    }

    const code = String(product.code ?? "").trim();
    const product_name = typeof product.product_name === "string" ? product.product_name.trim() : "";
    const brands = typeof product.brands === "string" ? product.brands.trim() : "";
    const categories = typeof product.categories === "string" ? product.categories.trim() : "";

    if (!code && !product_name) {
      return NextResponse.json(
        { error: "Product must have at least code or product_name" },
        { status: 400 }
      );
    }

    const topK = Math.min(
      Math.max(1, parseInt(body.topK ?? String(DEFAULT_TOP_K), 10) || DEFAULT_TOP_K),
      MAX_TOP_K
    );

    const queryParts = [product_name, brands, categories].filter(Boolean);
    const query = queryParts.length > 0 ? queryParts.join(" ") : code;
    const embedding = await embedQuery(query);

    const fetchK = topK + 5;
    const matches = await queryVectorsMultiNamespace(embedding, fetchK);
    const ids = matches
      .map((m) => m.id)
      .filter((id) => id && id !== code);
    const uniqueIds = [...new Set(ids)].slice(0, topK);

    if (uniqueIds.length === 0) {
      return NextResponse.json({ alternatives: [] });
    }

    const products = await getProductsByIds(uniqueIds);
    const summaries = products.map(toProductSummary);

    const assessed = await Promise.all(
      summaries.map(async (summary): Promise<{ product: SearchResultProduct; assessment: SustainabilityAssessment | { error: string } }> => {
        const prod = products.find((p) => p.code === summary.code)!;
        try {
          const assessment = await assessProduct(summary);
          return { product: prod, assessment };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Assessment failed";
          return { product: prod, assessment: { error: message } as { error: string } };
        }
      })
    );

    const scored = assessed.filter((a) => a.assessment && !("error" in a.assessment)) as Array<{
      product: SearchResultProduct;
      assessment: SustainabilityAssessment;
    }>;
    const failed = assessed.filter((a) => a.assessment && "error" in a.assessment);
    scored.sort((a, b) => b.assessment.score - a.assessment.score);
    const minScore = currentScore != null ? currentScore : -1;
    const betterOnly = scored.filter((a) => a.assessment.score > minScore);
    const result = [...betterOnly, ...failed];

    return NextResponse.json({
      alternatives: result.map(({ product: p, assessment }) => ({
        product: p,
        assessment:
            "error" in assessment
            ? { error: assessment.error }
            : {
                verdict: assessment.verdict,
                score: assessment.score,
                reasoning: assessment.reasoning,
                better_alternatives: assessment.better_alternatives,
                tags: assessment.tags ?? [],
              },
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
