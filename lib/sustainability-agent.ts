/**
 * Bounded, evidence-first sustainability assessment workflow.
 *
 * The workflow is intentionally plain TypeScript: normalize the product,
 * gather a fixed evidence set, ask for one structured dimension judgment,
 * validate citations, optionally repair once, and calculate the score in code.
 */

import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  AssessmentDeadlineError,
  AssessmentJudgmentSchema,
  AssessmentValidationError,
  calculateWeightedScore,
  hasEnoughEvidence,
  hydrateDimensions,
  normalizeJudgmentScale,
  validateJudgment,
  withTimeout,
  type AssessmentJudgment,
} from "./sustainability-contract";
import { lookupByBarcode, type OffClassificationData } from "./openfoodfacts";
import { searchWeb, type WebSearchResponse } from "./search-web";
import {
  fillEstimatedDimensions,
  findPeerBaseline,
  getCategoryPrior,
  resolveAssessmentScore,
} from "./sustainability-peer-prior";
import {
  ASSESSMENT_DIMENSIONS,
  type AssessmentProgressEvent,
  type AssessmentProgressStage,
  type AssessmentScoreBasis,
  type AssessmentSource,
  type SustainabilityAssessment,
} from "./sustainability-types";

export type {
  AssessmentConfidence,
  AssessmentDimension,
  AssessmentProgressEvent,
  AssessmentSource,
  SustainabilityAssessment,
} from "./sustainability-types";
export { AssessmentDeadlineError, AssessmentValidationError } from "./sustainability-contract";

const MODEL = "gpt-4.1-mini";
const OVERALL_DEADLINE_MS = 65_000;
const PRODUCT_LOOKUP_TIMEOUT_MS = 4_000;
const SEARCH_TIMEOUT_MS = 6_000;
const JUDGMENT_TIMEOUT_MS = 14_000;
const REPAIR_TIMEOUT_MS = 8_000;
const PEER_LOOKUP_TIMEOUT_MS = 8_000;
const SEARCHES_PER_ROUND = 2;
const MAX_RESEARCH_ROUNDS = 4;
const MAX_MODEL_TURNS = 6;
const MAX_RESULTS_PER_SEARCH = 5;
const MAX_EVIDENCE_SOURCES = 24;
const MAX_CACHE_ENTRIES = 250;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const ASSESSMENT_VERSION = "2026-08-05.v6-estimated";

function getOpenAIClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is required for sustainability assessment");
  return new OpenAI({ apiKey: key, maxRetries: 0 });
}

export interface ProductSummary {
  code: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  nutriscore_grade?: string;
  ecoscore_grade?: string;
  ecoscore_score?: number;
  ingredients_text?: string;
  labels_tags?: string[] | string;
  additives_tags?: string[] | string;
  allergens_tags?: string[] | string;
  nutriments?: Record<string, unknown>;
  quantity?: string;
  [key: string]: unknown;
}

export interface AssessProductOptions {
  signal?: AbortSignal;
  onProgress?: (event: AssessmentProgressEvent) => void | Promise<void>;
}

interface EvidenceBundle {
  product: ProductSummary;
  sources: AssessmentSource[];
  researchNotes: string[];
  queriesRun: string[];
  researchRounds: number;
}

interface CacheEntry {
  expiresAt: number;
  promise: Promise<SustainabilityAssessment>;
}

const assessmentCache = new Map<string, CacheEntry>();

function cleanString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, maxLength);
  return cleaned || undefined;
}

function cleanStringList(value: unknown, maxItems = 20): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return [
    ...new Set(
      values
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, maxItems);
}

export function normalizeProduct(product: ProductSummary): ProductSummary {
  return {
    code: cleanString(product.code, 80) ?? "",
    product_name: cleanString(product.product_name, 240),
    brands: cleanString(product.brands, 240),
    categories: cleanString(product.categories, 500),
    nutriscore_grade: cleanString(product.nutriscore_grade, 20)?.toLowerCase(),
    ecoscore_grade: cleanString(product.ecoscore_grade, 20)?.toLowerCase(),
    ecoscore_score:
      typeof product.ecoscore_score === "number" && Number.isFinite(product.ecoscore_score)
        ? Math.max(0, Math.min(100, product.ecoscore_score))
        : undefined,
    ingredients_text: cleanString(product.ingredients_text, 2_000),
    labels_tags: cleanStringList(product.labels_tags),
    additives_tags: cleanStringList(product.additives_tags),
    allergens_tags: cleanStringList(product.allergens_tags),
    nutriments:
      product.nutriments && typeof product.nutriments === "object"
        ? product.nutriments
        : undefined,
    quantity: cleanString(product.quantity, 100),
  };
}

function mergeProductDetails(
  product: ProductSummary,
  details: OffClassificationData | null,
): ProductSummary {
  if (!details) return product;
  return normalizeProduct({
    ...product,
    product_name: product.product_name || details.product_name,
    brands: product.brands || details.brands,
    nutriscore_grade: product.nutriscore_grade || details.nutriscore_grade,
    ecoscore_grade: product.ecoscore_grade || details.ecoscore_grade,
    ecoscore_score: product.ecoscore_score ?? details.ecoscore_score,
    ingredients_text: product.ingredients_text || details.ingredients_text,
    labels_tags:
      cleanStringList(product.labels_tags).length > 0 ? product.labels_tags : details.labels,
    additives_tags:
      cleanStringList(product.additives_tags).length > 0
        ? product.additives_tags
        : details.additives,
    allergens_tags:
      cleanStringList(product.allergens_tags).length > 0
        ? product.allergens_tags
        : details.allergens,
  });
}

function summarizeProductRecord(product: ProductSummary): string {
  const facts = [
    typeof product.ecoscore_score === "number" ? `Eco-Score ${Math.round(product.ecoscore_score)}/100` : "",
    product.ecoscore_grade ? `Eco-Score ${product.ecoscore_grade.toUpperCase()}` : "",
    product.categories ? `Categories: ${product.categories}` : "",
    product.ingredients_text ? `Ingredients: ${product.ingredients_text.slice(0, 280)}` : "",
    cleanStringList(product.labels_tags).length
      ? `Labels: ${cleanStringList(product.labels_tags).join(", ")}`
      : "",
  ].filter(Boolean);
  return facts.length ? facts.join(". ") : "Only the product identity was available.";
}

function buildProductSource(product: ProductSummary): AssessmentSource | null {
  if (!product.code) return null;
  return {
    id: "product-1",
    title: `${product.product_name || "Product"} - Open Food Facts record`,
    url: `https://world.openfoodfacts.org/product/${encodeURIComponent(product.code)}`,
    snippet: summarizeProductRecord(product),
    kind: "product",
    domain: "world.openfoodfacts.org",
  };
}

function significantWords(value: string | undefined, limit: number): string[] {
  const ignored = new Set([
    "and",
    "the",
    "with",
    "product",
    "products",
    "food",
    "foods",
    "natural",
    "original",
  ]);
  return [
    ...new Set(
      (value ?? "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 2 && !ignored.has(word)),
    ),
  ].slice(0, limit);
}

export function buildResearchQueries(product: ProductSummary): string[] {
  const name = product.product_name || product.code;
  const brand = product.brands || "";
  const categoryTerms = significantWords(product.categories, 4);
  const ingredientTerms = significantWords(product.ingredients_text, 3);
  return [
    `"${name}" ${brand} sustainability packaging sourcing environmental impact`.trim(),
    `${[...categoryTerms, ...ingredientTerms].join(" ")} lifecycle emissions water land use sustainability`.trim(),
  ]
    .filter((query, index, queries) => query.length > 20 && queries.indexOf(query) === index)
    .slice(0, SEARCHES_PER_ROUND);
}

const FOLLOWUP_QUERY_TERMS: Record<
  (typeof ASSESSMENT_DIMENSIONS)[number]["id"],
  string
> = {
  climate: "carbon footprint lifecycle emissions water land use",
  ingredients_sourcing: "ingredient sourcing suppliers farming certification fair trade",
  packaging: "packaging materials carton recyclable recycled content",
  transparency: "sustainability report targets disclosures methodology",
};

export function buildFollowupQueries(
  product: ProductSummary,
  judgment: AssessmentJudgment,
  previousQueries: ReadonlySet<string>,
  researchRound: number,
): string[] {
  const missing = judgment.dimensions
    .filter((dimension) => dimension.score == null || dimension.evidence_status === "missing")
    .map((dimension) => dimension.id);
  const identity = [product.brands, product.product_name].filter(Boolean).join(" ").trim();
  const terms = missing.map((dimension) => FOLLOWUP_QUERY_TERMS[dimension]);
  const brand = product.brands || identity || product.code;
  const candidates =
    researchRound <= 2
      ? [
          `"${identity || product.code}" ${terms.slice(0, 2).join(" ")}`,
          `${brand} ${terms.slice(2).join(" ") || terms.join(" ")} official report`,
        ]
      : researchRound === 3
        ? [
            `${brand} sustainability report environmental targets suppliers packaging pdf`,
            `"${product.product_name || product.code}" lifecycle assessment carbon footprint recyclable packaging`,
          ]
        : [
            `${significantWords(product.categories, 5).join(" ")} independent lifecycle comparison environmental impact brands`,
            `${brand} emissions disclosure sourcing certification packaging commitments`,
          ];
  return candidates
    .map((query) => query.trim().replace(/\s+/g, " "))
    .filter((query, index, queries) =>
      query.length > 20 && !previousQueries.has(query) && queries.indexOf(query) === index,
    )
    .slice(0, SEARCHES_PER_ROUND);
}

function sourceFromSearchResult(
  result: WebSearchResponse["results"][number],
  query: string,
  id: string,
): AssessmentSource {
  return {
    id,
    title: result.title,
    url: result.url,
    snippet: result.snippet,
    kind: "web",
    domain: result.domain,
    query,
    position: result.position,
    ...(result.date ? { published_at: result.date } : {}),
  };
}

function throwIfAborted(signal: AbortSignal): void {
  if (!signal.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new DOMException("The assessment was cancelled", "AbortError");
}

async function gatherEvidence(
  product: ProductSummary,
  signal: AbortSignal,
): Promise<EvidenceBundle> {
  const queries = buildResearchQueries(product);
  const productLookup = product.code
    ? withTimeout(
        (toolSignal) => lookupByBarcode(product.code, { signal: toolSignal }),
        PRODUCT_LOOKUP_TIMEOUT_MS,
        { signal, message: "Product lookup timed out" },
      )
    : Promise.resolve(null);

  const searches = queries.map((query) =>
    withTimeout(
      (toolSignal) => searchWeb(query, { signal: toolSignal, timeoutMs: SEARCH_TIMEOUT_MS }),
      SEARCH_TIMEOUT_MS + 250,
      { signal, message: "Evidence search timed out" },
    ),
  );

  const [lookupResult, ...searchResults] = await Promise.allSettled([
    productLookup,
    ...searches,
  ]);
  throwIfAborted(signal);

  const details = lookupResult.status === "fulfilled" ? lookupResult.value : null;
  const enrichedProduct = mergeProductDetails(product, details);
  const sourceLedger = new Map<string, AssessmentSource>();
  const productSource = buildProductSource(enrichedProduct);
  if (productSource) sourceLedger.set(productSource.url, productSource);

  const researchNotes: string[] = [];
  let webSourceCounter = 0;
  searchResults.forEach((result, index) => {
    const query = queries[index] ?? "";
    if (result.status === "rejected") {
      researchNotes.push(`${query}: search unavailable`);
      return;
    }
    if (result.value.error) researchNotes.push(`${query}: ${result.value.error}`);
    for (const item of result.value.results.slice(0, MAX_RESULTS_PER_SEARCH)) {
      if (sourceLedger.has(item.url)) continue;
      webSourceCounter += 1;
      sourceLedger.set(
        item.url,
        sourceFromSearchResult(item, query, `web-${webSourceCounter}`),
      );
    }
  });

  if (!details) researchNotes.push("Open Food Facts did not return additional product details.");
  return {
    product: enrichedProduct,
    sources: [...sourceLedger.values()].slice(0, MAX_EVIDENCE_SOURCES),
    researchNotes,
    queriesRun: queries,
    researchRounds: 1,
  };
}

async function extendEvidence(
  evidence: EvidenceBundle,
  queries: string[],
  signal: AbortSignal,
): Promise<EvidenceBundle> {
  if (queries.length === 0) return evidence;
  const searches = queries.map((query) =>
    withTimeout(
      (toolSignal) => searchWeb(query, { signal: toolSignal, timeoutMs: SEARCH_TIMEOUT_MS }),
      SEARCH_TIMEOUT_MS + 250,
      { signal, message: "Follow-up evidence search timed out" },
    ),
  );
  const searchResults = await Promise.allSettled(searches);
  throwIfAborted(signal);

  const sourceLedger = new Map(evidence.sources.map((source) => [source.url, source]));
  const researchNotes = [...evidence.researchNotes];
  let webSourceCounter = evidence.sources.filter((source) => source.kind === "web").length;
  searchResults.forEach((result, index) => {
    const query = queries[index] ?? "";
    if (result.status === "rejected") {
      researchNotes.push(`${query}: follow-up search unavailable`);
      return;
    }
    if (result.value.error) researchNotes.push(`${query}: ${result.value.error}`);
    for (const item of result.value.results.slice(0, MAX_RESULTS_PER_SEARCH)) {
      if (sourceLedger.has(item.url)) continue;
      webSourceCounter += 1;
      sourceLedger.set(
        item.url,
        sourceFromSearchResult(item, query, `web-${webSourceCounter}`),
      );
    }
  });

  return {
    ...evidence,
    sources: [...sourceLedger.values()].slice(0, MAX_EVIDENCE_SOURCES),
    researchNotes,
    queriesRun: [...evidence.queriesRun, ...queries],
    researchRounds: evidence.researchRounds + 1,
  };
}

function buildJudgmentPrompt(
  evidence: EvidenceBundle,
  repairIssues: string[] | null,
  previousJudgment: AssessmentJudgment | null,
): string {
  const repair = repairIssues
    ? `\nThe previous response failed validation. Repair only these issues:\n- ${repairIssues.join(
        "\n- ",
      )}\nPrevious response:\n${JSON.stringify(previousJudgment)}`
    : "";

  return `Judge the four fixed sustainability dimensions from the evidence below.${repair}

Rules:
- Return each dimension exactly once: ${ASSESSMENT_DIMENSIONS.map((item) => item.id).join(", ")}.
- Judge environmental sustainability only. Do not reward health or nutrition.
- Every dimension score uses a 0-100 scale, where 100 is the best environmental performance and 0 is the worst. Never use a 0-10 scale.
- A score is allowed only when one or more cited claims support that dimension.
- When one or more cited claims support a dimension, provide a score. Use null only when no claim supports it.
- Set score to null and evidence_status to missing when evidence does not support a judgment.
- Every claim must cite one or more exact source IDs from the evidence ledger.
- Use conflicting when credible sources disagree, and list the conflict with at least two source IDs.
- Missing information is uncertainty, not a negative fact.
- Do not produce an overall score or verdict. The application calculates those.
- Keep summaries concise and state uncertainty directly.

Normalized product:
${JSON.stringify(evidence.product)}

Evidence ledger:
${JSON.stringify(evidence.sources)}

Research notes:
${JSON.stringify(evidence.researchNotes)}`;
}

async function requestJudgment(
  evidence: EvidenceBundle,
  repairIssues: string[] | null,
  previousJudgment: AssessmentJudgment | null,
  signal: AbortSignal,
): Promise<AssessmentJudgment> {
  const timeoutMs = repairIssues ? REPAIR_TIMEOUT_MS : JUDGMENT_TIMEOUT_MS;
  return withTimeout(
    async (modelSignal) => {
      const response = await getOpenAIClient().chat.completions.parse(
        {
          model: MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are an evidence auditor for consumer-product sustainability. Judge only the supplied dimensions, cite the supplied ledger, and expose uncertainty. Never reveal private reasoning.",
            },
            {
              role: "user",
              content: buildJudgmentPrompt(evidence, repairIssues, previousJudgment),
            },
          ],
          max_completion_tokens: 1_800,
          temperature: 0,
          response_format: zodResponseFormat(
            AssessmentJudgmentSchema,
            "sustainability_dimension_judgment",
          ),
        },
        { signal: modelSignal, timeout: timeoutMs, maxRetries: 0 },
      );
      const choice = response.choices[0];
      const message = choice?.message;
      if (!message) throw new Error("The model returned no judgment");
      if (message.refusal) throw new Error(`The model refused the assessment: ${message.refusal}`);
      if (choice.finish_reason !== "stop") {
        throw new Error(`The model response ended with ${choice.finish_reason ?? "unknown status"}`);
      }
      const parsed = AssessmentJudgmentSchema.safeParse(message.parsed);
      if (!parsed.success) {
        throw new AssessmentValidationError(
          parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
        );
      }
      return parsed.data;
    },
    timeoutMs,
    { signal, message: repairIssues ? "Judgment repair timed out" : "Dimension scoring timed out" },
  );
}

function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeSuggestion(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 180);
}

function finalizeAssessment(
  judgment: AssessmentJudgment,
  evidence: EvidenceBundle,
  peerBasis: AssessmentScoreBasis | null,
  thresholdMet: boolean,
): SustainabilityAssessment {
  const directDimensions = hydrateDimensions(judgment.dimensions);
  const initialScore = calculateWeightedScore(judgment.dimensions);
  const citedSourceIds = new Set(
    judgment.dimensions.flatMap((dimension) =>
      dimension.claims.flatMap((claim) => claim.source_ids),
    ),
  );
  judgment.conflicts.forEach((conflict) =>
    conflict.source_ids.forEach((sourceId) => citedSourceIds.add(sourceId)),
  );

  const categoryPrior = getCategoryPrior(evidence.product);
  const resolution = resolveAssessmentScore({
    dimensions: directDimensions,
    citedSourceCount: citedSourceIds.size,
    thresholdMet,
    ecoscoreScore: evidence.product.ecoscore_score,
    ecoscoreGrade: evidence.product.ecoscore_grade,
    peerBasis,
    categoryPrior,
    conflictCount: judgment.conflicts.length,
  });
  const dimensions = fillEstimatedDimensions(
    directDimensions,
    resolution,
    categoryPrior,
    peerBasis,
  );
  const status = resolution.mode === "verified" ? "complete" : "estimated";
  const verdict =
    resolution.score >= 70 ? "good" : resolution.score >= 40 ? "moderate" : "poor";
  const confidence =
    resolution.confidencePercent >= 75
      ? "high"
      : resolution.confidencePercent >= 45
        ? "medium"
        : "low";
  const missing = [
    ...new Set(
      dimensions
        .flatMap((dimension) => [
          ...dimension.missing_evidence,
          ...(dimension.evidence_status === "missing"
            ? [`No reliable evidence for ${dimension.label.toLowerCase()}`]
            : []),
        ])
        .map((item) => item.trim()),
    ),
  ].filter(Boolean);
  const reasoning =
    judgment.overall_summary.trim().slice(0, 1_000) ||
    "The available evidence was combined with a clearly labeled estimate.";

  return {
    status,
    verdict,
    score: resolution.score,
    grade: resolution.grade,
    score_mode: resolution.mode,
    confidence_percent: resolution.confidencePercent,
    score_explanation: resolution.explanation,
    ...(resolution.basis ? { score_basis: resolution.basis } : {}),
    reasoning,
    better_alternatives: [
      ...new Set(judgment.better_alternatives.map(normalizeSuggestion).filter(Boolean)),
    ].slice(0, 4),
    tags: [...new Set(judgment.tags.map(normalizeTag).filter(Boolean))].slice(0, 4),
    confidence,
    dimensions,
    evidence: {
      source_count: evidence.sources.length,
      cited_source_count: citedSourceIds.size,
      supported_dimension_count: initialScore.supportedDimensionCount,
      coverage: initialScore.coverage,
      estimated_dimension_count: dimensions.filter((dimension) => dimension.score_mode !== "direct").length,
      research_rounds: evidence.researchRounds,
      searches_run: evidence.queriesRun.length,
      threshold_met: thresholdMet,
      missing,
      conflicts: judgment.conflicts.map((conflict) => ({
        summary: conflict.summary.trim().slice(0, 400),
        source_ids: [...new Set(conflict.source_ids)],
      })),
    },
    sources: evidence.sources,
    assessment_version: ASSESSMENT_VERSION,
    assessed_at: new Date().toISOString(),
  };
}

async function emitProgress(
  options: AssessProductOptions,
  productCode: string,
  stage: AssessmentProgressStage,
  status: "active" | "complete",
  message: string,
  evidenceCount: number,
  completedStages: AssessmentProgressStage[],
  researchRound?: number,
): Promise<void> {
  await options.onProgress?.({
    type: "progress",
    productCode,
    stage,
    status,
    message,
    evidenceCount,
    ...(researchRound ? { researchRound, maxResearchRounds: MAX_RESEARCH_ROUNDS } : {}),
    completedStages: [...completedStages],
  });
}

async function runAssessment(
  input: ProductSummary,
  options: AssessProductOptions,
  signal: AbortSignal,
): Promise<SustainabilityAssessment> {
  const completedStages: AssessmentProgressStage[] = [];
  await emitProgress(
    options,
    input.code,
    "normalizing",
    "active",
    "Preparing the product record",
    0,
    completedStages,
  );
  const product = normalizeProduct(input);
  if (!product.code) throw new Error("Product code is required");
  completedStages.push("normalizing");
  await emitProgress(
    options,
    product.code,
    "normalizing",
    "complete",
    "Product record prepared",
    0,
    completedStages,
  );

  await emitProgress(
    options,
    product.code,
    "researching",
    "active",
    "Checking product and category evidence",
    0,
    completedStages,
  );
  let evidence = await gatherEvidence(product, signal);
  completedStages.push("researching");
  await emitProgress(
    options,
    product.code,
    "researching",
    "complete",
    `${evidence.sources.length} ${evidence.sources.length === 1 ? "source" : "sources"} found`,
    evidence.sources.length,
    completedStages,
    1,
  );

  const peerBasisPromise = withTimeout(
    () => findPeerBaseline(evidence.product),
    PEER_LOOKUP_TIMEOUT_MS,
    { signal, message: "Comparable product lookup timed out" },
  ).catch(() => null);
  let judgment: AssessmentJudgment | null = null;
  let thresholdMet = false;
  let repairUsed = false;
  let modelTurns = 0;

  for (let round = 1; round <= MAX_RESEARCH_ROUNDS; round += 1) {
    await emitProgress(
      options,
      product.code,
      "scoring",
      "active",
      `Reviewing evidence pass ${round} of ${MAX_RESEARCH_ROUNDS}`,
      evidence.sources.length,
      completedStages,
      round,
    );
    if (modelTurns >= MAX_MODEL_TURNS) break;

    let nextJudgment = normalizeJudgmentScale(
      await requestJudgment(evidence, null, null, signal),
    );
    modelTurns += 1;
    let sourceIds = new Set(evidence.sources.map((source) => source.id));
    let issues = validateJudgment(nextJudgment, sourceIds);
    if (issues.length > 0) {
      if (repairUsed || modelTurns >= MAX_MODEL_TURNS) {
        throw new AssessmentValidationError(issues);
      }
      repairUsed = true;
      await emitProgress(
        options,
        product.code,
        "validating",
        "active",
        "Repairing unsupported citations",
        evidence.sources.length,
        completedStages,
        round,
      );
      nextJudgment = normalizeJudgmentScale(
        await requestJudgment(
          evidence,
          issues,
          nextJudgment,
          signal,
        ),
      );
      modelTurns += 1;
      sourceIds = new Set(evidence.sources.map((source) => source.id));
      issues = validateJudgment(nextJudgment, sourceIds);
      if (issues.length > 0) throw new AssessmentValidationError(issues);
    }

    judgment = nextJudgment;
    const citedSourceIds = new Set(
      judgment.dimensions.flatMap((dimension) =>
        dimension.claims.flatMap((claim) => claim.source_ids),
      ),
    );
    judgment.conflicts.forEach((conflict) =>
      conflict.source_ids.forEach((sourceId) => citedSourceIds.add(sourceId)),
    );
    thresholdMet = hasEnoughEvidence(
      judgment.dimensions,
      citedSourceIds.size,
      typeof evidence.product.ecoscore_score === "number" || Boolean(evidence.product.ecoscore_grade),
    );
    if (!completedStages.includes("scoring")) completedStages.push("scoring");
    await emitProgress(
      options,
      product.code,
      "scoring",
      "complete",
      thresholdMet
        ? `Evidence threshold reached on pass ${round}`
        : `Evidence gaps remain after pass ${round}`,
      evidence.sources.length,
      completedStages,
      round,
    );
    if (thresholdMet || round >= MAX_RESEARCH_ROUNDS || modelTurns >= MAX_MODEL_TURNS) break;

    const followupQueries = buildFollowupQueries(
      evidence.product,
      judgment,
      new Set(evidence.queriesRun),
      round + 1,
    );
    if (followupQueries.length === 0) break;
    await emitProgress(
      options,
      product.code,
      "researching",
      "active",
      `Research pass ${round + 1}: checking missing dimensions`,
      evidence.sources.length,
      completedStages,
      round + 1,
    );
    evidence = await extendEvidence(evidence, followupQueries, signal);
    await emitProgress(
      options,
      product.code,
      "researching",
      "complete",
      `${evidence.sources.length} sources collected after pass ${round + 1}`,
      evidence.sources.length,
      completedStages,
      round + 1,
    );
  }

  if (!judgment) throw new Error("The evidence workflow returned no judgment");
  await emitProgress(
    options,
    product.code,
    "validating",
    "active",
    thresholdMet ? "Calculating the verified score" : "Calculating a labeled estimate",
    evidence.sources.length,
    completedStages,
    evidence.researchRounds,
  );
  const peerBasis = thresholdMet ? null : await peerBasisPromise;
  const assessment = finalizeAssessment(judgment, evidence, peerBasis, thresholdMet);
  completedStages.push("validating");
  await emitProgress(
    options,
    product.code,
    "validating",
    "complete",
    assessment.status === "complete"
      ? "Citations verified and grade calculated"
      : `${assessment.grade} estimate calculated at ${assessment.confidence_percent}% confidence`,
    evidence.sources.length,
    completedStages,
    evidence.researchRounds,
  );
  return assessment;
}

function normalizeProductForCache(product: ProductSummary): Record<string, unknown> {
  return normalizeProduct(product);
}

function getCacheKey(product: ProductSummary): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        model: MODEL,
        version: ASSESSMENT_VERSION,
        product: normalizeProductForCache(product),
      }),
    )
    .digest("hex");
}

function pruneCache(now: number): void {
  for (const [key, entry] of assessmentCache) {
    if (entry.expiresAt <= now) assessmentCache.delete(key);
  }
  while (assessmentCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = assessmentCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    assessmentCache.delete(oldestKey);
  }
}

async function replayCachedProgress(
  productCode: string,
  assessment: SustainabilityAssessment,
  options: AssessProductOptions,
): Promise<void> {
  const completed: AssessmentProgressStage[] = [];
  for (const stage of ["normalizing", "researching", "scoring", "validating"] as const) {
    completed.push(stage);
    const message =
      stage === "normalizing"
        ? "Product record prepared"
        : stage === "researching"
          ? `${assessment.sources.length} saved ${assessment.sources.length === 1 ? "source" : "sources"} loaded`
          : stage === "scoring"
            ? "Current dimension review loaded"
            : "Cached citations verified";
    await emitProgress(
      options,
      productCode,
      stage,
      "complete",
      message,
      assessment.sources.length,
      completed,
      Math.max(1, assessment.evidence.research_rounds),
    );
  }
}

const ASSESSMENT_ERROR_PREFIX = "Sustainability assessment failed: ";

/** Assess one product within a hard deadline. */
export async function assessProduct(
  product: ProductSummary,
  options: AssessProductOptions = {},
): Promise<SustainabilityAssessment> {
  const key = getCacheKey(product);
  const now = Date.now();
  const cached = assessmentCache.get(key);
  if (cached && cached.expiresAt > now) {
    const assessment = await withTimeout(() => cached.promise, OVERALL_DEADLINE_MS, {
      signal: options.signal,
      message: "Waiting for the current assessment timed out",
    });
    await replayCachedProgress(product.code, assessment, options);
    return assessment;
  }

  pruneCache(now);
  const promise = withTimeout(
    (deadlineSignal) => runAssessment(product, options, deadlineSignal),
    OVERALL_DEADLINE_MS,
    { signal: options.signal, message: "The assessment exceeded the 65-second limit" },
  ).catch((error) => {
    assessmentCache.delete(key);
    if (error instanceof AssessmentDeadlineError || error instanceof AssessmentValidationError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      message.startsWith(ASSESSMENT_ERROR_PREFIX)
        ? message
        : `${ASSESSMENT_ERROR_PREFIX}${message}`,
    );
  });

  assessmentCache.set(key, { expiresAt: now + CACHE_TTL_MS, promise });
  return promise;
}
