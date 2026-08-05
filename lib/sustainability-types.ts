export const ASSESSMENT_DIMENSIONS = [
  { id: "climate", label: "Climate impact", weight: 0.35 },
  { id: "ingredients_sourcing", label: "Ingredients & sourcing", weight: 0.3 },
  { id: "packaging", label: "Packaging", weight: 0.2 },
  { id: "transparency", label: "Transparency", weight: 0.15 },
] as const;

export type AssessmentDimensionId = (typeof ASSESSMENT_DIMENSIONS)[number]["id"];
export type AssessmentConfidence = "low" | "medium" | "high";
export type AssessmentStatus = "complete" | "estimated" | "insufficient_evidence";
export type SustainabilityGrade = "A" | "B" | "C" | "D" | "F";
export type AssessmentScoreMode =
  | "verified"
  | "blended"
  | "peer_estimate"
  | "category_estimate";
export type DimensionScoreMode = "direct" | "peer_estimate" | "category_estimate";
export type SustainabilityVerdict =
  | "good"
  | "moderate"
  | "poor"
  | "insufficient_evidence";

export interface AssessmentSource {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  kind: "product" | "web";
  domain?: string;
  query?: string;
  position?: number;
  published_at?: string;
}

export interface AssessmentClaim {
  claim: string;
  source_ids: string[];
}

export interface AssessmentDimension {
  id: AssessmentDimensionId;
  label: string;
  weight: number;
  score: number | null;
  score_mode: DimensionScoreMode;
  confidence: AssessmentConfidence;
  evidence_status: "supported" | "limited" | "conflicting" | "missing";
  summary: string;
  claims: AssessmentClaim[];
  missing_evidence: string[];
}

export interface AssessmentConflict {
  summary: string;
  source_ids: string[];
}

export interface AssessmentEvidenceSummary {
  source_count: number;
  cited_source_count: number;
  supported_dimension_count: number;
  coverage: number;
  estimated_dimension_count: number;
  research_rounds: number;
  searches_run: number;
  threshold_met: boolean;
  missing: string[];
  conflicts: AssessmentConflict[];
}

export interface AssessmentScoreBasis {
  type: "peer" | "category";
  score: number;
  label: string;
  peer_count: number;
  average_similarity: number | null;
  brands_represented: number;
}

export interface SustainabilityAssessment {
  status: AssessmentStatus;
  verdict: SustainabilityVerdict;
  score: number | null;
  grade: SustainabilityGrade;
  score_mode: AssessmentScoreMode;
  confidence_percent: number;
  score_explanation: string;
  score_basis?: AssessmentScoreBasis;
  reasoning: string;
  better_alternatives: string[];
  tags: string[];
  confidence: AssessmentConfidence;
  dimensions: AssessmentDimension[];
  evidence: AssessmentEvidenceSummary;
  sources: AssessmentSource[];
  assessment_version: string;
  assessed_at: string;
}

export const ASSESSMENT_PROGRESS_STAGES = [
  { id: "normalizing", label: "Product record" },
  { id: "researching", label: "Evidence search" },
  { id: "scoring", label: "Dimension review" },
  { id: "validating", label: "Citation check" },
] as const;

export type AssessmentProgressStage =
  (typeof ASSESSMENT_PROGRESS_STAGES)[number]["id"];

export interface AssessmentProgressEvent {
  type: "progress";
  productCode: string;
  stage: AssessmentProgressStage;
  status: "active" | "complete";
  message: string;
  evidenceCount: number;
  researchRound?: number;
  maxResearchRounds?: number;
  completedStages: AssessmentProgressStage[];
}

export interface AssessmentCompleteEvent {
  type: "complete";
  products: Array<
    Record<string, unknown> & {
      sustainability_assessment: SustainabilityAssessment | { error: string };
    }
  >;
}

export interface AssessmentErrorEvent {
  type: "error";
  error: string;
  code: "assessment_failed" | "deadline_exceeded" | "stream_failed";
}

export type AssessmentStreamEvent =
  | AssessmentProgressEvent
  | AssessmentCompleteEvent
  | AssessmentErrorEvent;
