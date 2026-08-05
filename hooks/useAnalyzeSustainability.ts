import { useState, useCallback, useEffect, useRef } from 'react';
import { authFetch } from '@/lib/auth-client';

/** Product shape sent to the assess API (matches search result items). */
export interface ProductForAssessment {
  code: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  ecoscore_grade?: string;
  nutriscore_grade?: string;
  ingredients_text?: string;
  labels_tags?: string[] | string;
  [key: string]: unknown;
}

export interface SustainabilityAssessmentResult {
  verdict: 'good' | 'moderate' | 'poor';
  score: number;
  reasoning: string;
  better_alternatives: string[];
  tags?: string[];
  confidence: 'low' | 'medium' | 'high';
  sources: Array<{
    id: string;
    title: string;
    url: string;
    snippet?: string;
    kind: 'product' | 'web';
  }>;
  assessment_version: string;
  assessed_at: string;
}

export interface AnalysisResult {
  productCode: string;
  productName: string;
  ecoScore: number;
  verdict: 'good' | 'moderate' | 'poor';
  reasoning: string;
  tags: string[];
  confidence: 'low' | 'medium' | 'high';
  sources: SustainabilityAssessmentResult['sources'];
  assessmentVersion: string;
  assessedAt: string;
  metrics: {
    carbonFootprint: string;
    waterUsage: string;
    packaging: string;
  };
  alternatives: Array<{
    name: string;
    ecoScore?: number;
    improvement: string;
  }>;
}

/** Steps shown while the assessment is running (cycles every few seconds). */
export const ASSESSMENT_PROGRESS_STEPS = [
  'Analyzing product…',
  'Checking environmental impact…',
  'Looking up brand & certifications…',
  'Writing assessment…',
] as const;

export function useAnalyzeSustainability() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStepIndex, setProgressStepIndex] = useState(0);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setProgressStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setProgressStepIndex((i) => (i + 1) % ASSESSMENT_PROGRESS_STEPS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const analyze = useCallback(async (product: ProductForAssessment) => {
    if (!product?.code) {
      setError('Product code is required');
      return null;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = ++requestIdRef.current;

    setAnalysis(null);
    setIsLoading(true);
    setError(null);

    try {
      const response = await authFetch('/api/sustainability/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: [product] }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to analyze product');
      }

      const first = data.products?.[0];
      const assessment = first?.sustainability_assessment;

      if (!assessment) {
        throw new Error('No assessment returned');
      }
      if ('error' in assessment && typeof assessment.error === 'string') {
        throw new Error(assessment.error);
      }

      const a = assessment as SustainabilityAssessmentResult;
      const result: AnalysisResult = {
        productCode: first.code ?? product.code,
        productName: first.product_name ?? product.product_name ?? 'Unknown',
        ecoScore: a.score,
        verdict: a.verdict,
        reasoning: a.reasoning,
        tags: a.tags ?? [],
        confidence: a.confidence,
        sources: a.sources ?? [],
        assessmentVersion: a.assessment_version,
        assessedAt: a.assessed_at,
        metrics: {
          carbonFootprint: 'Assessed by AI',
          waterUsage: 'Assessed by AI',
          packaging: 'Assessed by AI',
        },
        alternatives: (a.better_alternatives ?? []).map((improvement) => ({
          name: 'Suggested alternative',
          improvement,
        })),
      };

      if (requestId !== requestIdRef.current || controller.signal.aborted) return null;
      setAnalysis(result);
      return result;
    } catch (err) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return null;
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    requestIdRef.current += 1;
    setAnalysis(null);
    setIsLoading(false);
    setError(null);
  }, []);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const progressStep = ASSESSMENT_PROGRESS_STEPS[progressStepIndex] ?? ASSESSMENT_PROGRESS_STEPS[0];

  return { analysis, isLoading, error, progressStep, progressSteps: ASSESSMENT_PROGRESS_STEPS, analyze, clearAnalysis };
}
