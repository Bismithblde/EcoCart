import { NextRequest, NextResponse } from "next/server";
import { authorizeAiRequest } from "@/lib/ai-request-guard";
import { embedQuery } from "@/lib/embeddings";
import { getProductsByIds, type SearchResultProduct } from "@/lib/master-products";
import { queryVectorsMultiNamespace } from "@/lib/pinecone";
import { assessProduct, type ProductSummary } from "@/lib/sustainability-agent";
import type { AssessmentScoreMode, SustainabilityAssessment } from "@/lib/sustainability-types";

const DEFAULT_TOP_K = 6;
const MAX_TOP_K = 8;
const MAX_ASSESSMENT_CANDIDATES = 6;
const ASSESSMENT_CONCURRENCY = 2;
const MIN_SCORE_IMPROVEMENT = 5;

function minimumImprovement(mode: AssessmentScoreMode): number {
  if (mode === "verified") return MIN_SCORE_IMPROVEMENT;
  if (mode === "blended") return 10;
  return 15;
}

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

interface RankedCandidate {
  product: SearchResultProduct;
  rank: number;
  similarity: number;
}

interface AlternativeResult {
  product: SearchResultProduct;
  assessment: SustainabilityAssessment;
  comparison: {
    scoreDelta: number;
    confidence: SustainabilityAssessment["confidence"];
    comparable: true;
  };
}

function toProductSummary(product: SearchResultProduct): ProductSummary {
  return {
    code: product.code,
    product_name: product.product_name,
    brands: product.brands,
    categories: product.categories,
    ecoscore_grade: product.ecoscore_grade,
    ecoscore_score: product.ecoscore_score,
    nutriscore_grade: product.nutriscore_grade,
    ingredients_text: product.ingredients,
  };
}

function normalizedTokens(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !GENERIC_TOKENS.has(token)),
  );
}

function overlapRatio(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return overlap / Math.max(left.size, right.size);
}

function normalizeIdentity(value: string | undefined): string {
  return [...normalizedTokens(value)].sort().join("-");
}

function ecoscorePrior(grade: string | undefined): number {
  const normalized = grade?.trim().toLowerCase();
  if (normalized === "a") return 1;
  if (normalized === "b") return 0.75;
  if (normalized === "c") return 0.5;
  if (normalized === "d") return 0.25;
  if (normalized === "e") return 0;
  return 0.4;
}

function preRankCandidates(
  current: { product_name: string; categories: string },
  products: SearchResultProduct[],
  similarityById: Map<string, number>,
): RankedCandidate[] {
  const currentName = normalizedTokens(current.product_name);
  const currentCategories = normalizedTokens(current.categories);
  const seen = new Set<string>();

  return products
    .flatMap((product): RankedCandidate[] => {
      if (!product.product_name) return [];
      const candidateName = normalizedTokens(product.product_name);
      const candidateCategories = normalizedTokens(product.categories);
      const nameOverlap = overlapRatio(currentName, candidateName);
      const categoryOverlap = overlapRatio(currentCategories, candidateCategories);
      const comparable = currentCategories.size > 0 && candidateCategories.size > 0
        ? categoryOverlap > 0 || nameOverlap >= 0.25
        : nameOverlap >= 0.25;
      if (!comparable) return [];

      const identity = `${normalizeIdentity(product.product_name)}|${normalizeIdentity(product.brands)}`;
      if (!identity || seen.has(identity)) return [];
      seen.add(identity);

      const similarity = similarityById.get(product.code) ?? 0;
      return [{
        product,
        similarity,
        rank: similarity * 0.6 + categoryOverlap * 0.2 + nameOverlap * 0.15 + ecoscorePrior(product.ecoscore_grade) * 0.05,
      }];
    })
    .sort((left, right) => right.rank - left.rank)
    .slice(0, MAX_ASSESSMENT_CANDIDATES);
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAiRequest(request, 3);
  if ("response" in authorization) return authorization.response;

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is required for better alternatives" },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const rawProduct = body.product;
  if (!rawProduct || typeof rawProduct !== "object") {
    return NextResponse.json({ error: "Request body must include a product" }, { status: 400 });
  }

  const product = rawProduct as Record<string, unknown>;
  const code = String(product.code ?? "").trim();
  const productName = typeof product.product_name === "string" ? product.product_name.trim() : "";
  const brands = typeof product.brands === "string" ? product.brands.trim() : "";
  const categories = typeof product.categories === "string" ? product.categories.trim() : "";
  const currentScore = body.currentScore;
  const currentScoreMode: AssessmentScoreMode =
    body.currentScoreMode === "verified" ||
    body.currentScoreMode === "blended" ||
    body.currentScoreMode === "peer_estimate" ||
    body.currentScoreMode === "category_estimate"
      ? body.currentScoreMode
      : "blended";
  if (!code || !productName) {
    return NextResponse.json(
      { error: "Product code and product_name are required" },
      { status: 400 },
    );
  }
  if (typeof currentScore !== "number" || !Number.isFinite(currentScore) || currentScore < 0 || currentScore > 100) {
    return NextResponse.json(
      { error: "A valid currentScore from 0 to 100 is required" },
      { status: 400 },
    );
  }

  const topK = Math.min(
    Math.max(1, Number.parseInt(String(body.topK ?? DEFAULT_TOP_K), 10) || DEFAULT_TOP_K),
    MAX_TOP_K,
  );
  const abortController = new AbortController();
  const abortFromRequest = () => abortController.abort(request.signal.reason);
  request.signal.addEventListener("abort", abortFromRequest, { once: true });
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: Record<string, unknown>) => {
        if (closed || abortController.signal.aborted) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      void (async () => {
        try {
          send({ type: "progress", stage: "searching", message: "Finding comparable products", evaluatedCount: 0, totalCandidates: 0 });
          const query = [productName, brands, categories].filter(Boolean).join(" ");
          const embedding = await embedQuery(query);
          const fetchK = Math.min(40, Math.max(24, topK * 5));
          const matches = await queryVectorsMultiNamespace(embedding, fetchK);
          if (abortController.signal.aborted) return;

          const ids = [...new Set(matches.map((match) => match.id).filter((id) => id && id !== code))];
          const retrievedProducts = ids.length > 0 ? await getProductsByIds(ids) : [];
          const similarityById = new Map(matches.map((match) => [match.id, match.score]));
          const candidates = preRankCandidates(
            { product_name: productName, categories },
            retrievedProducts,
            similarityById,
          ).slice(0, Math.min(MAX_ASSESSMENT_CANDIDATES, Math.max(2, topK * 2)));
          send({
            type: "progress",
            stage: "assessing",
            message: `${candidates.length} candidates pre-ranked`,
            evaluatedCount: 0,
            totalCandidates: candidates.length,
          });

          let cursor = 0;
          let evaluatedCount = 0;
          const alternatives: AlternativeResult[] = [];
          const brandCounts = new Map<string, number>();

          const worker = async () => {
            while (!abortController.signal.aborted) {
              const candidateIndex = cursor;
              cursor += 1;
              const candidate = candidates[candidateIndex];
              if (!candidate) return;

              try {
                const assessment = await assessProduct(toProductSummary(candidate.product), {
                  signal: abortController.signal,
                });
                evaluatedCount += 1;
                if (
                  typeof assessment.score !== "number" ||
                  assessment.score - currentScore < Math.max(
                    minimumImprovement(currentScoreMode),
                    minimumImprovement(assessment.score_mode),
                  )
                ) {
                  send({ type: "progress", stage: "assessing", message: `${evaluatedCount} of ${candidates.length} checked`, evaluatedCount, totalCandidates: candidates.length });
                  continue;
                }

                const brand = normalizeIdentity(candidate.product.brands) || "unknown";
                const brandCount = brandCounts.get(brand) ?? 0;
                if (brandCount >= 2) continue;
                brandCounts.set(brand, brandCount + 1);

                const alternative: AlternativeResult = {
                  product: candidate.product,
                  assessment,
                  comparison: {
                    scoreDelta: assessment.score - currentScore,
                    confidence: assessment.confidence,
                    comparable: true,
                  },
                };
                alternatives.push(alternative);
                send({ type: "candidate", alternative, evaluatedCount, totalCandidates: candidates.length });
              } catch (error) {
                evaluatedCount += 1;
                if (abortController.signal.aborted) return;
                send({
                  type: "progress",
                  stage: "assessing",
                  message: `${evaluatedCount} of ${candidates.length} checked`,
                  evaluatedCount,
                  totalCandidates: candidates.length,
                  detail: error instanceof Error ? error.message : "Candidate assessment failed",
                });
              }
            }
          };

          await Promise.all(Array.from({ length: Math.min(ASSESSMENT_CONCURRENCY, candidates.length) }, () => worker()));
          if (abortController.signal.aborted) return;
          alternatives.sort((left, right) => right.comparison.scoreDelta - left.comparison.scoreDelta);
          send({ type: "complete", alternatives: alternatives.slice(0, topK), evaluatedCount, totalCandidates: candidates.length });
        } catch (error) {
          if (!abortController.signal.aborted) {
            send({ type: "error", error: error instanceof Error ? error.message : "Failed to find alternatives" });
          }
        } finally {
          request.signal.removeEventListener("abort", abortFromRequest);
          if (!closed) {
            closed = true;
            try {
              controller.close();
            } catch {
              // The browser may have already cancelled the stream.
            }
          }
        }
      })();
    },
    cancel(reason) {
      closed = true;
      abortController.abort(reason);
      request.signal.removeEventListener("abort", abortFromRequest);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Content-Type-Options": "nosniff",
      "X-Accel-Buffering": "no",
    },
  });
}
