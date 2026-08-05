import { embedQuery } from "./embeddings";
import { getProductsByIds, type SearchResultProduct } from "./master-products";
import { queryVectorsMultiNamespace } from "./pinecone";
import {
  ASSESSMENT_DIMENSIONS,
  type AssessmentDimension,
  type AssessmentScoreBasis,
  type AssessmentScoreMode,
  type SustainabilityGrade,
} from "./sustainability-types";

const PEER_FETCH_COUNT = 36;
const MIN_PEER_COUNT = 3;
const MIN_PEER_BRANDS = 2;
const MAX_PRODUCTS_PER_BRAND = 2;

const IGNORED_TOKENS = new Set([
  "and",
  "the",
  "with",
  "product",
  "products",
  "food",
  "foods",
  "beverage",
  "beverages",
  "brand",
  "original",
  "specific",
]);

const CATEGORY_PRIORS: Array<{
  pattern: RegExp;
  score: number;
  label: string;
}> = [
  { pattern: /oat|plant.?based milk|milk alternative/, score: 71, label: "plant-based milk" },
  { pattern: /fruit|vegetable|legume|bean|lentil/, score: 76, label: "fruit and vegetable" },
  { pattern: /beef|lamb|red meat/, score: 24, label: "red meat" },
  { pattern: /pork|poultry|chicken|egg/, score: 41, label: "animal protein" },
  { pattern: /milk|cheese|butter|dairy|yogurt/, score: 43, label: "dairy" },
  { pattern: /fish|seafood|shellfish/, score: 46, label: "seafood" },
  { pattern: /coffee|cocoa|chocolate/, score: 47, label: "coffee and cocoa" },
  { pattern: /cereal|bread|grain|pasta|rice/, score: 58, label: "grain-based food" },
  { pattern: /water|juice|soda|soft drink|drink/, score: 54, label: "packaged beverage" },
  { pattern: /snack|cookie|biscuit|candy|confection/, score: 49, label: "packaged snack" },
  { pattern: /soap|shampoo|detergent|cleaner/, score: 51, label: "household and personal care" },
];

export interface PeerProductInput {
  code: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  ingredients_text?: string;
  labels_tags?: string[] | string;
  ecoscore_score?: number;
  ecoscore_grade?: string;
}

export interface CategoryPrior {
  score: number;
  label: string;
  confidencePercent: number;
}

export interface ScoreResolution {
  score: number;
  grade: SustainabilityGrade;
  mode: AssessmentScoreMode;
  confidencePercent: number;
  explanation: string;
  basis?: AssessmentScoreBasis;
}

interface ScoredPeer {
  product: SearchResultProduct;
  score: number;
  similarity: number;
  brand: string;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function cleanTokens(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !IGNORED_TOKENS.has(token)),
  );
}

function overlapRatio(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return overlap / Math.min(left.size, right.size);
}

function normalizeBrand(value: string | undefined): string {
  return [...cleanTokens(value)].sort().join("-") || "unknown";
}

export function scoreFromEcoSignal(
  score: number | undefined,
  grade: string | undefined,
): number | null {
  if (typeof score === "number" && Number.isFinite(score)) {
    return Math.round(clamp(score, 0, 100));
  }
  const normalized = grade?.trim().toLowerCase();
  if (normalized === "a") return 90;
  if (normalized === "b") return 75;
  if (normalized === "c") return 60;
  if (normalized === "d") return 45;
  if (normalized === "e") return 25;
  return null;
}

export function gradeFromScore(score: number): SustainabilityGrade {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

export function weightedMedian(
  values: Array<{ value: number; weight: number }>,
): number | null {
  if (values.length === 0) return null;
  const sorted = values
    .map((item) => ({
      value: clamp(item.value, 0, 100),
      weight: Math.max(0.01, item.weight),
    }))
    .sort((left, right) => left.value - right.value);
  const totalWeight = sorted.reduce((sum, item) => sum + item.weight, 0);
  let runningWeight = 0;
  for (const item of sorted) {
    runningWeight += item.weight;
    if (runningWeight >= totalWeight / 2) return Math.round(item.value);
  }
  return Math.round(sorted[sorted.length - 1].value);
}

export function getCategoryPrior(product: PeerProductInput): CategoryPrior {
  const searchable = [product.categories, product.product_name, product.ingredients_text]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const matched = CATEGORY_PRIORS.find((entry) => entry.pattern.test(searchable));
  const labels = Array.isArray(product.labels_tags)
    ? product.labels_tags.join(" ").toLowerCase()
    : (product.labels_tags ?? "").toLowerCase();
  let adjustment = 0;
  if (/fair.?trade|organic|regenerative/.test(labels)) adjustment += 4;
  if (/vegan|plant.?based/.test(labels)) adjustment += 2;
  const completeness = [
    product.product_name,
    product.brands,
    product.categories,
    product.ingredients_text,
    labels,
  ].filter((value) => Boolean(value && String(value).trim())).length;
  return {
    score: Math.round(clamp((matched?.score ?? 52) + adjustment, 0, 100)),
    label: matched?.label ?? "general consumer product",
    confidencePercent: Math.min(30, 12 + completeness * 3),
  };
}

export async function findPeerBaseline(
  product: PeerProductInput,
): Promise<AssessmentScoreBasis | null> {
  const query = [product.product_name, product.categories]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!query) return null;

  const embedding = await embedQuery(query);
  const matches = await queryVectorsMultiNamespace(embedding, PEER_FETCH_COUNT, {
    name: 0.25,
    categories: 0.7,
    brand: 0.05,
  });
  const ids = matches
    .map((match) => match.id)
    .filter((id) => id && id !== product.code);
  const products = await getProductsByIds(ids);
  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const sourceCategories = cleanTokens(product.categories || product.product_name);
  const brandCounts = new Map<string, number>();
  const peers: ScoredPeer[] = [];

  for (const candidate of products) {
    const score = scoreFromEcoSignal(candidate.ecoscore_score, candidate.ecoscore_grade);
    if (score == null) continue;
    const match = matchesById.get(candidate.code);
    if (!match) continue;
    const categoryOverlap = overlapRatio(sourceCategories, cleanTokens(candidate.categories));
    if (sourceCategories.size > 0 && categoryOverlap === 0 && match.catScore < 0.45) continue;
    const brand = normalizeBrand(candidate.brands);
    const brandCount = brandCounts.get(brand) ?? 0;
    if (brandCount >= MAX_PRODUCTS_PER_BRAND) continue;
    brandCounts.set(brand, brandCount + 1);
    peers.push({
      product: candidate,
      score,
      similarity: clamp(Math.max(match.catScore, match.score), 0, 1),
      brand,
    });
  }

  const brandsRepresented = new Set(peers.map((peer) => peer.brand)).size;
  if (peers.length < MIN_PEER_COUNT || brandsRepresented < MIN_PEER_BRANDS) return null;
  const score = weightedMedian(
    peers.map((peer) => ({ value: peer.score, weight: Math.max(0.15, peer.similarity) })),
  );
  if (score == null) return null;
  const averageSimilarity =
    peers.reduce((sum, peer) => sum + peer.similarity, 0) / peers.length;
  const categoryPrior = getCategoryPrior(product);

  return {
    type: "peer",
    score,
    label: categoryPrior.label,
    peer_count: peers.length,
    average_similarity: Math.round(averageSimilarity * 100) / 100,
    brands_represented: brandsRepresented,
  };
}

function observedDimensionScore(dimensions: AssessmentDimension[]): {
  score: number | null;
  coverage: number;
  averageConfidence: number;
} {
  const byId = new Map(dimensions.map((dimension) => [dimension.id, dimension]));
  const confidenceValue = { low: 1, medium: 2, high: 3 } as const;
  let weightedScore = 0;
  let availableWeight = 0;
  let confidenceSum = 0;
  let scoredCount = 0;
  for (const definition of ASSESSMENT_DIMENSIONS) {
    const dimension = byId.get(definition.id);
    if (!dimension || dimension.score == null || dimension.evidence_status === "missing") continue;
    weightedScore += dimension.score * definition.weight;
    availableWeight += definition.weight;
    confidenceSum += confidenceValue[dimension.confidence];
    scoredCount += 1;
  }
  return {
    score: availableWeight > 0 ? Math.round(weightedScore / availableWeight) : null,
    coverage: Math.round(availableWeight * 100) / 100,
    averageConfidence: scoredCount > 0 ? confidenceSum / scoredCount : 0,
  };
}

export function resolveAssessmentScore(options: {
  dimensions: AssessmentDimension[];
  citedSourceCount: number;
  thresholdMet: boolean;
  ecoscoreScore?: number;
  ecoscoreGrade?: string;
  peerBasis: AssessmentScoreBasis | null;
  categoryPrior: CategoryPrior;
  conflictCount: number;
}): ScoreResolution {
  const observed = observedDimensionScore(options.dimensions);
  const structuredScore = scoreFromEcoSignal(options.ecoscoreScore, options.ecoscoreGrade);
  const categoryBasis: AssessmentScoreBasis = {
    type: "category",
    score: options.categoryPrior.score,
    label: options.categoryPrior.label,
    peer_count: 0,
    average_similarity: null,
    brands_represented: 0,
  };
  const fallbackBasis = options.peerBasis ?? categoryBasis;
  let score: number;
  let mode: AssessmentScoreMode;

  if (options.thresholdMet && observed.score != null) {
    score = structuredScore == null
      ? observed.score
      : Math.round(observed.score * 0.7 + structuredScore * 0.3);
    mode = "verified";
  } else if (structuredScore != null) {
    score = observed.score == null
      ? structuredScore
      : Math.round(structuredScore * 0.65 + observed.score * 0.35);
    mode = "verified";
  } else if (observed.score != null) {
    const directWeight = clamp(
      observed.coverage * 0.9 + Math.min(options.citedSourceCount, 3) * 0.05,
      0.25,
      0.75,
    );
    score = Math.round(
      observed.score * directWeight + fallbackBasis.score * (1 - directWeight),
    );
    mode = "blended";
  } else {
    score = fallbackBasis.score;
    mode = fallbackBasis.type === "peer" ? "peer_estimate" : "category_estimate";
  }

  const peerStrength = options.peerBasis
    ? Math.min(24, options.peerBasis.peer_count * 3) +
      Math.min(10, options.peerBasis.brands_represented * 2) +
      Math.min(8, (options.peerBasis.average_similarity ?? 0) * 10)
    : 0;
  let confidencePercent =
    8 +
    observed.coverage * 38 +
    Math.min(options.citedSourceCount, 4) * 5 +
    observed.averageConfidence * 4 +
    (typeof options.ecoscoreScore === "number" ? 38 : options.ecoscoreGrade ? 24 : 0) +
    (mode === "peer_estimate" ? peerStrength : mode === "verified" ? peerStrength * 0.25 : peerStrength * 0.6) -
    options.conflictCount * 8;

  const confidenceCap =
    mode === "verified"
      ? options.thresholdMet
        ? 95
        : typeof options.ecoscoreScore === "number"
          ? 82
          : 72
      : mode === "blended"
        ? 78
        : mode === "peer_estimate"
          ? 60
          : 30;
  if (mode === "category_estimate") confidencePercent = options.categoryPrior.confidencePercent;
  confidencePercent = Math.round(clamp(confidencePercent, 8, confidenceCap));
  score = Math.round(clamp(score, 0, 100));

  const directPercent = Math.round(observed.coverage * 100);
  const explanation =
    mode === "verified"
      ? options.thresholdMet
        ? `Product-specific citations support this grade with ${directPercent}% direct dimension coverage.`
        : `Uses the product's structured Eco-Score, with ${directPercent}% of dimensions supported by direct citations.`
      : mode === "blended"
        ? `Combines ${directPercent}% direct evidence with the ${fallbackBasis.label} ${fallbackBasis.type === "peer" ? "peer baseline" : "category baseline"}.`
        : mode === "peer_estimate"
          ? `Estimated from ${fallbackBasis.peer_count} similar products across ${fallbackBasis.brands_represented} brands.`
          : `Estimated from the ${fallbackBasis.label} category baseline because direct and peer evidence remained sparse.`;

  return {
    score,
    grade: gradeFromScore(score),
    mode,
    confidencePercent,
    explanation,
    ...(mode === "verified" ? {} : { basis: fallbackBasis }),
  };
}

const DIMENSION_ESTIMATE_OFFSETS: Record<AssessmentDimension["id"], number> = {
  climate: 2,
  ingredients_sourcing: 0,
  packaging: -3,
  transparency: -5,
};

export function fillEstimatedDimensions(
  dimensions: AssessmentDimension[],
  resolution: ScoreResolution,
  categoryPrior: CategoryPrior,
  dimensionBasis?: AssessmentScoreBasis | null,
): AssessmentDimension[] {
  const basis = dimensionBasis ?? resolution.basis;
  const estimateBase = basis?.score ?? categoryPrior.score;
  const estimateMode = basis?.type === "peer" ? "peer_estimate" : "category_estimate";
  const basisLabel = basis?.type === "peer"
    ? `${basis.peer_count} comparable ${basis.label} products`
    : `the ${categoryPrior.label} category baseline`;

  return dimensions.map((dimension) => {
    if (dimension.score != null) return { ...dimension, score_mode: "direct" };
    const score = Math.round(
      clamp(estimateBase + DIMENSION_ESTIMATE_OFFSETS[dimension.id], 0, 100) / 5,
    ) * 5;
    return {
      ...dimension,
      score,
      score_mode: estimateMode,
      summary: `${dimension.summary} The displayed estimate uses ${basisLabel}.`,
    };
  });
}
