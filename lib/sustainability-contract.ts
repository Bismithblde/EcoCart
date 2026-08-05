import { z } from "zod";
import {
  ASSESSMENT_DIMENSIONS,
  type AssessmentConfidence,
  type AssessmentDimension,
  type AssessmentDimensionId,
  type AssessmentStatus,
  type SustainabilityVerdict,
} from "./sustainability-types";

const dimensionIds = ASSESSMENT_DIMENSIONS.map((dimension) => dimension.id) as [
  AssessmentDimensionId,
  ...AssessmentDimensionId[],
];

export const AssessmentClaimSchema = z.object({
  claim: z.string(),
  source_ids: z.array(z.string()),
}).strict();

export const AssessmentConflictSchema = z.object({
  summary: z.string(),
  source_ids: z.array(z.string()),
}).strict();

export const DimensionJudgmentSchema = z.object({
  id: z.enum(dimensionIds),
  score: z.number().nullable(),
  confidence: z.enum(["low", "medium", "high"]),
  evidence_status: z.enum(["supported", "limited", "conflicting", "missing"]),
  summary: z.string(),
  claims: z.array(AssessmentClaimSchema),
  missing_evidence: z.array(z.string()),
}).strict();

export const AssessmentJudgmentSchema = z.object({
  dimensions: z.array(DimensionJudgmentSchema),
  overall_summary: z.string(),
  conflicts: z.array(AssessmentConflictSchema),
  better_alternatives: z.array(z.string()),
  tags: z.array(z.string()),
}).strict();

export type AssessmentJudgment = z.infer<typeof AssessmentJudgmentSchema>;

export class AssessmentValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Assessment validation failed: ${issues.join("; ")}`);
    this.name = "AssessmentValidationError";
    this.issues = issues;
  }
}

export class AssessmentDeadlineError extends Error {
  constructor(message = "The assessment exceeded its time limit") {
    super(message);
    this.name = "AssessmentDeadlineError";
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function validateJudgment(
  judgment: AssessmentJudgment,
  availableSourceIds: ReadonlySet<string>,
): string[] {
  const issues: string[] = [];
  const seenDimensions = new Set<AssessmentDimensionId>();

  for (const dimension of judgment.dimensions) {
    if (seenDimensions.has(dimension.id)) {
      issues.push(`dimension ${dimension.id} was returned more than once`);
    }
    seenDimensions.add(dimension.id);

    if (
      dimension.score != null &&
      (!Number.isFinite(dimension.score) || dimension.score < 0 || dimension.score > 100)
    ) {
      issues.push(`dimension ${dimension.id} score must be between 0 and 100`);
    }
    if (dimension.evidence_status === "missing" && dimension.score != null) {
      issues.push(`dimension ${dimension.id} cannot have a score when evidence is missing`);
    }
    if (dimension.score == null && dimension.claims.length > 0) {
      issues.push(`dimension ${dimension.id} has cited claims but no score`);
    }
    if (dimension.score != null && dimension.claims.length === 0) {
      issues.push(`dimension ${dimension.id} needs at least one cited claim`);
    }

    for (const claim of dimension.claims) {
      if (!claim.claim.trim()) {
        issues.push(`dimension ${dimension.id} contains an empty claim`);
      }
      if (claim.source_ids.length === 0) {
        issues.push(`dimension ${dimension.id} contains an uncited claim`);
      }
      for (const sourceId of claim.source_ids) {
        if (!availableSourceIds.has(sourceId)) {
          issues.push(`dimension ${dimension.id} cites unknown source ${sourceId}`);
        }
      }
    }
  }

  for (const definition of ASSESSMENT_DIMENSIONS) {
    if (!seenDimensions.has(definition.id)) {
      issues.push(`dimension ${definition.id} is missing`);
    }
  }

  for (const conflict of judgment.conflicts) {
    if (!conflict.summary.trim()) issues.push("a conflict summary is empty");
    if (new Set(conflict.source_ids).size < 2) {
      issues.push("each conflict must cite at least two sources");
    }
    for (const sourceId of conflict.source_ids) {
      if (!availableSourceIds.has(sourceId)) {
        issues.push(`conflict cites unknown source ${sourceId}`);
      }
    }
  }

  return uniqueStrings(issues);
}

export function normalizeJudgmentScale(
  judgment: AssessmentJudgment,
): AssessmentJudgment {
  const scored = judgment.dimensions.filter(
    (dimension) => typeof dimension.score === "number",
  );
  const appearsToUseTenPointScale =
    scored.length >= 2 &&
    scored.every((dimension) => (dimension.score ?? 0) >= 0 && (dimension.score ?? 0) <= 10) &&
    scored.some((dimension) => (dimension.score ?? 0) > 0);
  if (!appearsToUseTenPointScale) return judgment;
  return {
    ...judgment,
    dimensions: judgment.dimensions.map((dimension) => ({
      ...dimension,
      score: dimension.score == null ? null : dimension.score * 10,
    })),
  };
}

export interface WeightedScoreResult {
  status: AssessmentStatus;
  verdict: SustainabilityVerdict;
  score: number | null;
  coverage: number;
  supportedDimensionCount: number;
}

export function calculateWeightedScore(
  judgments: AssessmentJudgment["dimensions"],
): WeightedScoreResult {
  const byId = new Map(judgments.map((dimension) => [dimension.id, dimension]));
  let weightedScore = 0;
  let availableWeight = 0;
  let supportedDimensionCount = 0;

  for (const definition of ASSESSMENT_DIMENSIONS) {
    const dimension = byId.get(definition.id);
    if (!dimension || dimension.score == null || dimension.evidence_status === "missing") continue;
    weightedScore += dimension.score * definition.weight;
    availableWeight += definition.weight;
    supportedDimensionCount += 1;
  }

  const coverage = Math.round(availableWeight * 100) / 100;
  if (supportedDimensionCount < 2 || coverage < 0.55) {
    return {
      status: "insufficient_evidence",
      verdict: "insufficient_evidence",
      score: null,
      coverage,
      supportedDimensionCount,
    };
  }

  const score = Math.round(weightedScore / availableWeight);
  const verdict: SustainabilityVerdict =
    score >= 70 ? "good" : score >= 40 ? "moderate" : "poor";

  return {
    status: "complete",
    verdict,
    score,
    coverage,
    supportedDimensionCount,
  };
}

export function hasEnoughEvidence(
  judgments: AssessmentJudgment["dimensions"],
  citedSourceCount: number,
  hasProductEcoSignal: boolean,
): boolean {
  const score = calculateWeightedScore(judgments);
  return (
    score.status === "complete" &&
    (citedSourceCount >= 2 || hasProductEcoSignal)
  );
}

export function calculateConfidence(
  judgments: AssessmentJudgment["dimensions"],
  citedSourceCount: number,
  coverage: number,
): AssessmentConfidence {
  const confidenceValues: Record<AssessmentConfidence, number> = {
    low: 1,
    medium: 2,
    high: 3,
  };
  const scored = judgments.filter((dimension) => dimension.score != null);
  const average = scored.length
    ? scored.reduce((sum, dimension) => sum + confidenceValues[dimension.confidence], 0) /
      scored.length
    : 0;

  if (coverage >= 0.85 && citedSourceCount >= 3 && average >= 2.5) return "high";
  if (coverage >= 0.65 && citedSourceCount >= 2 && average >= 1.75) return "medium";
  return "low";
}

export function hydrateDimensions(
  judgments: AssessmentJudgment["dimensions"],
): AssessmentDimension[] {
  const byId = new Map(judgments.map((dimension) => [dimension.id, dimension]));
  return ASSESSMENT_DIMENSIONS.map((definition) => {
    const judgment = byId.get(definition.id);
    return {
      id: definition.id,
      label: definition.label,
      weight: definition.weight,
      score: judgment?.score == null ? null : Math.round(judgment.score),
      score_mode: "direct",
      confidence: judgment?.confidence ?? "low",
      evidence_status: judgment?.evidence_status ?? "missing",
      summary: judgment?.summary.trim() || "No reliable evidence was found for this dimension.",
      claims: judgment?.claims ?? [],
      missing_evidence: uniqueStrings(judgment?.missing_evidence ?? []),
    };
  });
}

export async function runJudgmentWithSingleRepair<T>(options: {
  judge: (repairIssues: string[] | null, signal?: AbortSignal) => Promise<T>;
  validate: (value: T) => string[];
  signal?: AbortSignal;
  onFirstJudgment?: (value: T) => void | Promise<void>;
  onRepair?: (issues: string[]) => void | Promise<void>;
}): Promise<{ value: T; repairAttempts: 0 | 1 }> {
  const first = await options.judge(null, options.signal);
  await options.onFirstJudgment?.(first);
  const firstIssues = options.validate(first);
  if (firstIssues.length === 0) return { value: first, repairAttempts: 0 };

  await options.onRepair?.(firstIssues);
  const repaired = await options.judge(firstIssues, options.signal);
  const repairIssues = options.validate(repaired);
  if (repairIssues.length > 0) throw new AssessmentValidationError(repairIssues);
  return { value: repaired, repairAttempts: 1 };
}

export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  options: { signal?: AbortSignal; message?: string } = {},
): Promise<T> {
  const controller = new AbortController();
  let rejectForParentAbort: ((reason: unknown) => void) | undefined;
  const parentAbort = new Promise<never>((_, reject) => {
    rejectForParentAbort = reject;
  });
  const abortFromParent = () => {
    const reason = options.signal?.reason;
    controller.abort(reason);
    rejectForParentAbort?.(
      reason instanceof Error ? reason : new DOMException("The operation was cancelled", "AbortError"),
    );
  };
  if (options.signal?.aborted) abortFromParent();
  else options.signal?.addEventListener("abort", abortFromParent, { once: true });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new AssessmentDeadlineError(options.message);
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(controller.signal), timeout, parentAbort]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", abortFromParent);
  }
}
