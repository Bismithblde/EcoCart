import { NextRequest, NextResponse } from "next/server";
import { embedQuery } from "@/lib/embeddings";
import { queryVectorsMultiNamespace } from "@/lib/pinecone";
import { getProductsByIds, type SearchResultProduct } from "@/lib/master-products";
import {
  assessProduct,
  type ProductSummary,
  type SustainabilityAssessment,
} from "@/lib/sustainability-agent";
import { authorizeAiRequest } from "@/lib/ai-request-guard";

const DEFAULT_TOP_K = 6;
const MAX_TOP_K = 8;
const MAX_ASSESSMENT_CANDIDATES = 6;
const MIN_SCORE_IMPROVEMENT = 5;

const GENERIC_TOKENS = new Set([
  "and",
  "the",
  "with",
  "food",
  "foods",
  "product",
  "products",
  "brand",
  "organic",
  "natural",
  "original",
]);

function checkOpenAIKey(): void {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY is required for better alternatives");
  }
}

function toProductSummary(product: SearchResultProduct): ProductSummary {
  return {
    code: product.code,
    product_name: product.product_name,
    brands: product.brands,
    categories: product.categories,
    ecoscore_grade: product.ecoscore_grade,
    nutriscore_grade: product.nutriscore_grade,
    ingredients_text: product.ingredients,
  };
}

function normalizedTokens(value: string | undefined): Set<string> {
  const tokens = (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !GENERIC_TOKENS.has(token));
  return new Set(tokens);
}

function overlapCount(left: Set<string>, right: Set<string>): number {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) count += 1;
  }
  return count;
}

function normalizeIdentity(value: string | undefined): string {
  return [...normalizedTokens(value)].sort().join("-");
}

function isComparableProduct(
  current: { product_name: string; categories: string },
  candidate: SearchResultProduct
): boolean {
  const currentName = normalizedTokens(current.product_name);
  const candidateName = normalizedTokens(candidate.product_name);
  const currentCategories = normalizedTokens(current.categories);
  const candidateCategories = normalizedTokens(candidate.categories);

  const nameOverlap = overlapCount(currentName, candidateName);
  const categoryOverlap = overlapCount(currentCategories, candidateCategories);

  if (currentCategories.size > 0 && candidateCategories.size > 0) {
    return categoryOverlap >= 2 || (categoryOverlap >= 1 && nameOverlap >= 1);
  }
  return nameOverlap >= 1;
}

function uniqueComparableProducts(
  current: { product_name: string; categories: string },
  products: SearchResultProduct[]
): SearchResultProduct[] {
  const seen = new Set<string>();
  const result: SearchResultProduct[] = [];

  for (const product of products) {
    if (!product.product_name || !isComparableProduct(current, product)) continue;
    const identity = `${normalizeIdentity(product.product_name)}|${normalizeIdentity(product.brands)}`;
    if (!identity || seen.has(identity)) continue;
    seen.add(identity);
    result.push(product);
  }

  return result;
}

interface AssessedCandidate {
  product: SearchResultProduct;
  assessment: SustainabilityAssessment;
  similarity: number;
}

/**
 * Find comparable products, assess a bounded candidate set, and return only
 * evidence-backed recommendations that are meaningfully better.
 */
export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeAiRequest(request, 3);
    if ("response" in authorization) return authorization.response;

    checkOpenAIKey();
    const body = await request.json();
    const product = body?.product;
    if (!product || typeof product !== "object") {
      return NextResponse.json(
        { error: "Request body must include a product" },
        { status: 400 }
      );
    }

    const code = String(product.code ?? "").trim();
    const productName = typeof product.product_name === "string" ? product.product_name.trim() : "";
    const brands = typeof product.brands === "string" ? product.brands.trim() : "";
    const categories = typeof product.categories === "string" ? product.categories.trim() : "";
    const currentScore = body.currentScore;

    if (!code || !productName) {
      return NextResponse.json(
        { error: "Product code and product_name are required" },
        { status: 400 }
      );
    }
    if (
      typeof currentScore !== "number" ||
      !Number.isFinite(currentScore) ||
      currentScore < 0 ||
      currentScore > 100
    ) {
      return NextResponse.json(
        { error: "A valid currentScore from 0 to 100 is required" },
        { status: 400 }
      );
    }

    const topK = Math.min(
      Math.max(1, Number.parseInt(String(body.topK ?? DEFAULT_TOP_K), 10) || DEFAULT_TOP_K),
      MAX_TOP_K
    );
    const query = [productName, brands, categories].filter(Boolean).join(" ");
    const embedding = await embedQuery(query);
    const fetchK = Math.min(40, Math.max(24, topK * 5));
    const matches = await queryVectorsMultiNamespace(embedding, fetchK);
    const similarityById = new Map(matches.map((match) => [match.id, match.score]));
    const ids = [
      ...new Set(matches.map((match) => match.id).filter((id) => id && id !== code)),
    ];

    if (ids.length === 0) {
      return NextResponse.json({ alternatives: [], evaluatedCount: 0 });
    }

    const retrievedProducts = await getProductsByIds(ids);
    const candidates = uniqueComparableProducts(
      { product_name: productName, categories },
      retrievedProducts
    ).slice(0, MAX_ASSESSMENT_CANDIDATES);

    const settled = await Promise.allSettled(
      candidates.map(async (candidate): Promise<AssessedCandidate> => ({
        product: candidate,
        assessment: await assessProduct(toProductSummary(candidate)),
        similarity: similarityById.get(candidate.code) ?? 0,
      }))
    );

    const assessed = settled
      .filter((result): result is PromiseFulfilledResult<AssessedCandidate> => result.status === "fulfilled")
      .map((result) => result.value)
      .filter(({ assessment }) =>
        assessment.score - currentScore >= MIN_SCORE_IMPROVEMENT &&
        assessment.confidence !== "low" &&
        assessment.sources.length > 0
      )
      .sort((left, right) => {
        const improvementDifference =
          (right.assessment.score - currentScore) - (left.assessment.score - currentScore);
        return improvementDifference || right.similarity - left.similarity;
      });

    const brandCounts = new Map<string, number>();
    const diversified = assessed.filter(({ product: candidate }) => {
      const brand = normalizeIdentity(candidate.brands) || "unknown";
      const count = brandCounts.get(brand) ?? 0;
      if (count >= 2) return false;
      brandCounts.set(brand, count + 1);
      return true;
    }).slice(0, topK);

    return NextResponse.json({
      alternatives: diversified.map(({ product: candidate, assessment }) => ({
        product: candidate,
        assessment,
        comparison: {
          scoreDelta: assessment.score - currentScore,
          confidence: assessment.confidence,
          comparable: true as const,
        },
      })),
      evaluatedCount: candidates.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
