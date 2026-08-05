import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { readNdjsonStream, responseError } from "@/lib/ndjson";
import {
  ASSESSMENT_PROGRESS_STAGES,
  type AssessmentCompleteEvent,
  type AssessmentProgressEvent,
  type AssessmentProgressStage,
  type AssessmentStreamEvent,
  type SustainabilityAssessment,
} from "@/lib/sustainability-types";

export { ASSESSMENT_PROGRESS_STAGES } from "@/lib/sustainability-types";

/** Product shape sent to the assessment API. */
export interface ProductForAssessment {
  code: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  ecoscore_grade?: string;
  ecoscore_score?: number;
  nutriscore_grade?: string;
  ingredients_text?: string;
  labels_tags?: string[] | string;
  [key: string]: unknown;
}

export type SustainabilityAssessmentResult = SustainabilityAssessment;

export interface AnalysisResult {
  productCode: string;
  productName: string;
  ecoScore: number | null;
  grade: SustainabilityAssessment["grade"];
  scoreMode: SustainabilityAssessment["score_mode"];
  confidencePercent: number;
  scoreExplanation: string;
  scoreBasis: SustainabilityAssessment["score_basis"];
  status: SustainabilityAssessment["status"];
  verdict: SustainabilityAssessment["verdict"];
  reasoning: string;
  tags: string[];
  confidence: SustainabilityAssessment["confidence"];
  dimensions: SustainabilityAssessment["dimensions"];
  evidence: SustainabilityAssessment["evidence"];
  sources: SustainabilityAssessment["sources"];
  assessmentVersion: string;
  assessedAt: string;
  alternatives: Array<{
    name: string;
    ecoScore?: number;
    improvement: string;
  }>;
}

export interface AssessmentProgressState {
  stage: AssessmentProgressStage;
  status: "active" | "complete";
  message: string;
  evidenceCount: number;
  researchRound?: number;
  maxResearchRounds?: number;
  completedStages: AssessmentProgressStage[];
}

export const INITIAL_ASSESSMENT_PROGRESS: AssessmentProgressState = {
  stage: "normalizing",
  status: "active",
  message: "Preparing the product record",
  evidenceCount: 0,
  completedStages: [],
};

function toProgressState(event: AssessmentProgressEvent): AssessmentProgressState {
  return {
    stage: event.stage,
    status: event.status,
    message: event.message,
    evidenceCount: event.evidenceCount,
    researchRound: event.researchRound,
    maxResearchRounds: event.maxResearchRounds,
    completedStages: event.completedStages,
  };
}

function toAnalysisResult(
  first: Record<string, unknown>,
  product: ProductForAssessment,
  assessment: SustainabilityAssessment,
): AnalysisResult {
  return {
    productCode: typeof first.code === "string" ? first.code : product.code,
    productName:
      typeof first.product_name === "string"
        ? first.product_name
        : product.product_name ?? "Unknown product",
    ecoScore: assessment.score,
    grade: assessment.grade,
    scoreMode: assessment.score_mode,
    confidencePercent: assessment.confidence_percent,
    scoreExplanation: assessment.score_explanation,
    scoreBasis: assessment.score_basis,
    status: assessment.status,
    verdict: assessment.verdict,
    reasoning: assessment.reasoning,
    tags: assessment.tags ?? [],
    confidence: assessment.confidence,
    dimensions: assessment.dimensions ?? [],
    evidence: assessment.evidence,
    sources: assessment.sources ?? [],
    assessmentVersion: assessment.assessment_version,
    assessedAt: assessment.assessed_at,
    alternatives: (assessment.better_alternatives ?? []).map((improvement) => ({
      name: "Suggested alternative",
      improvement,
    })),
  };
}

export function useAnalyzeSustainability() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AssessmentProgressState>(INITIAL_ASSESSMENT_PROGRESS);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async (product: ProductForAssessment) => {
    if (!product?.code) {
      setError("Product code is required");
      return null;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = ++requestIdRef.current;

    setAnalysis(null);
    setIsLoading(true);
    setError(null);
    setProgress(INITIAL_ASSESSMENT_PROGRESS);

    try {
      const response = await authFetch("/api/sustainability/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: [product] }),
        signal: controller.signal,
      });

      if (!response.ok) throw await responseError(response, "Failed to analyze product");
      if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
        throw new Error("The assessment endpoint did not return a progress stream");
      }

      let completed: AssessmentCompleteEvent | null = null;
      await readNdjsonStream<AssessmentStreamEvent>(response, {
        signal: controller.signal,
        onEvent: (event) => {
          if (requestId !== requestIdRef.current || controller.signal.aborted) return;
          if (event.type === "progress" && event.productCode === product.code) {
            setProgress(toProgressState(event));
          } else if (event.type === "error") {
            throw new Error(event.error);
          } else if (event.type === "complete") {
            completed = event;
          }
        },
      });

      if (requestId !== requestIdRef.current || controller.signal.aborted) return null;
      const completeEvent = completed as AssessmentCompleteEvent | null;
      const first = completeEvent?.products?.[0];
      const assessment = first?.sustainability_assessment;
      if (!first || !assessment) throw new Error("No assessment returned");
      if ("error" in assessment) throw new Error(assessment.error);

      const result = toAnalysisResult(first, product, assessment);
      if (result.productCode !== product.code) {
        throw new Error("The assessment did not match the requested product");
      }
      setAnalysis(result);
      return result;
    } catch (caught) {
      if (
        controller.signal.aborted ||
        requestId !== requestIdRef.current ||
        (caught instanceof DOMException && caught.name === "AbortError")
      ) {
        return null;
      }
      const message = caught instanceof Error ? caught.message : "An error occurred";
      setError(message);
      return null;
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  }, []);

  const cancelAnalysis = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    requestIdRef.current += 1;
    setIsLoading(false);
    setError(null);
    setProgress(INITIAL_ASSESSMENT_PROGRESS);
  }, []);

  const clearAnalysis = useCallback(() => {
    cancelAnalysis();
    setAnalysis(null);
  }, [cancelAnalysis]);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  return {
    analysis,
    isLoading,
    error,
    progress,
    progressSteps: ASSESSMENT_PROGRESS_STAGES,
    analyze,
    cancelAnalysis,
    clearAnalysis,
  };
}
