import { useState, useCallback } from 'react';

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
}

export interface AnalysisResult {
  productName: string;
  ecoScore: number;
  verdict: 'good' | 'moderate' | 'poor';
  reasoning: string;
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

export function useAnalyzeSustainability() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (product: ProductForAssessment) => {
    if (!product?.code) {
      setError('Product code is required');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sustainability/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: [product] }),
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
        productName: first.product_name ?? product.product_name ?? 'Unknown',
        ecoScore: a.score,
        verdict: a.verdict,
        reasoning: a.reasoning,
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

      setAnalysis(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return { analysis, isLoading, error, analyze, clearAnalysis };
}
