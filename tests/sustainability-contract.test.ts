import assert from "node:assert/strict";
import test from "node:test";
import {
  AssessmentDeadlineError,
  AssessmentJudgmentSchema,
  AssessmentValidationError,
  calculateWeightedScore,
  hasEnoughEvidence,
  hydrateDimensions,
  normalizeJudgmentScale,
  runJudgmentWithSingleRepair,
  validateJudgment,
  withTimeout,
  type AssessmentJudgment,
} from "../lib/sustainability-contract";
import {
  fillEstimatedDimensions,
  getCategoryPrior,
  gradeFromScore,
  resolveAssessmentScore,
  weightedMedian,
} from "../lib/sustainability-peer-prior";

function judgment(): AssessmentJudgment {
  return {
    dimensions: [
      {
        id: "climate",
        score: 80,
        confidence: "high",
        evidence_status: "supported",
        summary: "Climate evidence",
        claims: [{ claim: "Climate claim", source_ids: ["source-1"] }],
        missing_evidence: [],
      },
      {
        id: "ingredients_sourcing",
        score: 60,
        confidence: "medium",
        evidence_status: "limited",
        summary: "Sourcing evidence",
        claims: [{ claim: "Sourcing claim", source_ids: ["source-2"] }],
        missing_evidence: [],
      },
      {
        id: "packaging",
        score: 40,
        confidence: "medium",
        evidence_status: "supported",
        summary: "Packaging evidence",
        claims: [{ claim: "Packaging claim", source_ids: ["source-1"] }],
        missing_evidence: [],
      },
      {
        id: "transparency",
        score: 100,
        confidence: "high",
        evidence_status: "supported",
        summary: "Transparency evidence",
        claims: [{ claim: "Transparency claim", source_ids: ["source-2"] }],
        missing_evidence: [],
      },
    ],
    overall_summary: "Supported assessment",
    conflicts: [],
    better_alternatives: [],
    tags: [],
  };
}

test("calculates the weighted score deterministically in application code", () => {
  const result = calculateWeightedScore(judgment().dimensions);
  assert.deepEqual(result, {
    status: "complete",
    verdict: "moderate",
    score: 69,
    coverage: 1,
    supportedDimensionCount: 4,
  });
});

test("returns insufficient evidence when supported dimensions cover too little weight", () => {
  const value = judgment();
  value.dimensions = value.dimensions.map((dimension) =>
    dimension.id === "climate"
      ? dimension
      : { ...dimension, score: null, evidence_status: "missing", claims: [] },
  );
  assert.equal(calculateWeightedScore(value.dimensions).status, "insufficient_evidence");
  assert.equal(calculateWeightedScore(value.dimensions).score, null);
});

test("recognizes when direct evidence reaches the scoring threshold", () => {
  const value = judgment();
  assert.equal(hasEnoughEvidence(value.dimensions, 2, false), true);
  value.dimensions = value.dimensions.map((dimension) =>
    dimension.id === "climate"
      ? dimension
      : { ...dimension, score: null, evidence_status: "missing", claims: [] },
  );
  assert.equal(hasEnoughEvidence(value.dimensions, 4, false), false);
});

test("maps numeric scores to the A-F receipt scale", () => {
  assert.equal(gradeFromScore(80), "A");
  assert.equal(gradeFromScore(65), "B");
  assert.equal(gradeFromScore(50), "C");
  assert.equal(gradeFromScore(35), "D");
  assert.equal(gradeFromScore(34), "F");
});

test("normalizes an obvious 0-10 model response to the 0-100 contract", () => {
  const value = judgment();
  value.dimensions = value.dimensions.map((dimension, index) => ({
    ...dimension,
    score: 6 + (index % 2),
  }));
  const normalized = normalizeJudgmentScale(value);
  assert.deepEqual(normalized.dimensions.map((dimension) => dimension.score), [60, 70, 60, 70]);
});

test("uses a weighted median so one extreme peer cannot dominate", () => {
  assert.equal(weightedMedian([
    { value: 20, weight: 0.1 },
    { value: 68, weight: 0.9 },
    { value: 72, weight: 0.8 },
  ]), 68);
});

test("returns a peer estimate instead of null when direct evidence is absent", () => {
  const value = judgment();
  value.dimensions = value.dimensions.map((dimension) => ({
    ...dimension,
    score: null,
    evidence_status: "missing",
    claims: [],
  }));
  const dimensions = hydrateDimensions(value.dimensions);
  const categoryPrior = getCategoryPrior({
    code: "oat-1",
    product_name: "Original oatmilk",
    categories: "oat-based drinks",
  });
  const resolution = resolveAssessmentScore({
    dimensions,
    citedSourceCount: 0,
    thresholdMet: false,
    peerBasis: {
      type: "peer",
      score: 72,
      label: "plant-based milk",
      peer_count: 8,
      average_similarity: 0.82,
      brands_represented: 5,
    },
    categoryPrior,
    conflictCount: 0,
  });
  assert.equal(resolution.score, 72);
  assert.equal(resolution.grade, "B");
  assert.equal(resolution.mode, "peer_estimate");
  assert.ok(resolution.confidencePercent <= 60);
  const filled = fillEstimatedDimensions(dimensions, resolution, categoryPrior);
  assert.equal(filled.every((dimension) => typeof dimension.score === "number"), true);
  assert.equal(filled.every((dimension) => dimension.score_mode === "peer_estimate"), true);
});

test("blends partial direct evidence with a peer baseline", () => {
  const value = judgment();
  value.dimensions = value.dimensions.map((dimension) =>
    dimension.id === "climate"
      ? dimension
      : { ...dimension, score: null, evidence_status: "missing", claims: [] },
  );
  const resolution = resolveAssessmentScore({
    dimensions: hydrateDimensions(value.dimensions),
    citedSourceCount: 1,
    thresholdMet: false,
    peerBasis: {
      type: "peer",
      score: 68,
      label: "plant-based milk",
      peer_count: 7,
      average_similarity: 0.79,
      brands_represented: 4,
    },
    categoryPrior: { score: 71, label: "plant-based milk", confidencePercent: 24 },
    conflictCount: 0,
  });
  assert.equal(resolution.mode, "blended");
  assert.ok(resolution.score > 68 && resolution.score < 80);
  assert.ok(resolution.confidencePercent <= 78);
});

test("caps category-only estimates at low confidence", () => {
  const value = judgment();
  value.dimensions = value.dimensions.map((dimension) => ({
    ...dimension,
    score: null,
    evidence_status: "missing",
    claims: [],
  }));
  const resolution = resolveAssessmentScore({
    dimensions: hydrateDimensions(value.dimensions),
    citedSourceCount: 0,
    thresholdMet: false,
    peerBasis: null,
    categoryPrior: { score: 52, label: "general consumer product", confidencePercent: 18 },
    conflictCount: 0,
  });
  assert.equal(resolution.score, 52);
  assert.equal(resolution.grade, "C");
  assert.equal(resolution.mode, "category_estimate");
  assert.equal(resolution.confidencePercent, 18);
});

test("rejects uncited and unknown-source claims", () => {
  const value = judgment();
  value.dimensions[0].claims = [
    { claim: "Uncited", source_ids: [] },
    { claim: "Unknown", source_ids: ["invented-source"] },
  ];
  const issues = validateJudgment(value, new Set(["source-1", "source-2"]));
  assert.ok(issues.some((issue) => issue.includes("uncited claim")));
  assert.ok(issues.some((issue) => issue.includes("unknown source invented-source")));
});

test("requires a score when a dimension returns cited claims", () => {
  const value = judgment();
  value.dimensions[0].score = null;
  const issues = validateJudgment(value, new Set(["source-1", "source-2"]));
  assert.ok(issues.some((issue) => issue.includes("cited claims but no score")));
});

test("strict schema rejects unexpected model fields", () => {
  const value = { ...judgment(), untrusted_score: 99 };
  assert.equal(AssessmentJudgmentSchema.safeParse(value).success, false);
});

test("enforces tool deadlines even when the operation ignores cancellation", async () => {
  const startedAt = Date.now();
  await assert.rejects(
    withTimeout(() => new Promise<never>(() => undefined), 25),
    AssessmentDeadlineError,
  );
  assert.ok(Date.now() - startedAt < 250);
});

test("performs one repair and never a third judgment", async () => {
  let calls = 0;
  const result = await runJudgmentWithSingleRepair({
    judge: async () => ({ valid: ++calls === 2 }),
    validate: (value) => value.valid ? [] : ["invalid"],
  });
  assert.equal(calls, 2);
  assert.equal(result.repairAttempts, 1);
  assert.equal(result.value.valid, true);
});

test("stops after one failed repair", async () => {
  let calls = 0;
  await assert.rejects(
    runJudgmentWithSingleRepair({
      judge: async () => ({ valid: false, call: ++calls }),
      validate: () => ["still invalid"],
    }),
    AssessmentValidationError,
  );
  assert.equal(calls, 2);
});
