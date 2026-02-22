import { NextRequest, NextResponse } from "next/server";
import { assessProduct, type ProductSummary } from "@/lib/sustainability-agent";

const MAX_PRODUCTS = 10;

function checkOpenAIKey(): void {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY is required for sustainability assessment");
  }
}

/**
 * POST /api/sustainability/assess
 *
 * Assess sustainability of each product using an LLM agent. The agent may call
 * Open Food Facts (get_product_details) for more data. Requires OPENAI_API_KEY.
 *
 * Body: { products: Array<{ code, product_name?, brands?, ... }> }
 * Returns: { products: [...] } with sustainability_assessment on each item.
 */
export async function POST(request: NextRequest) {
  try {
    checkOpenAIKey();
    const body = await request.json();
    const raw = body?.products;

    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty products array" },
        { status: 400 }
      );
    }

    const products: ProductSummary[] = raw.slice(0, MAX_PRODUCTS).map((p: unknown) => {
      const o = p && typeof p === "object" ? (p as Record<string, unknown>) : {};
      return {
        code: String(o.code ?? ""),
        product_name: typeof o.product_name === "string" ? o.product_name : undefined,
        brands: typeof o.brands === "string" ? o.brands : undefined,
        categories: typeof o.categories === "string" ? o.categories : undefined,
        nutriscore_grade: typeof o.nutriscore_grade === "string" ? o.nutriscore_grade : undefined,
        ecoscore_grade: typeof o.ecoscore_grade === "string" ? o.ecoscore_grade : undefined,
        ingredients_text: typeof o.ingredients_text === "string" ? o.ingredients_text : undefined,
        labels_tags: o.labels_tags,
        additives_tags: o.additives_tags,
        allergens_tags: o.allergens_tags,
        ...o,
      } as ProductSummary;
    });

    const results = await Promise.all(
      products.map(async (product) => {
        try {
          const assessment = await assessProduct(product);
          return { ...product, sustainability_assessment: assessment };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Assessment failed";
          return {
            ...product,
            sustainability_assessment: { error: message } as { error: string },
          };
        }
      })
    );

    return NextResponse.json({ products: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status =
      message.includes("OPENAI_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
