import { useState, useCallback } from 'react';

export interface AnalysisResult {
  productName: string;
  ecoScore: number;
  metrics: {
    carbonFootprint: string;
    waterUsage: string;
    packaging: string;
  };
  alternatives: Array<{
    name: string;
    ecoScore: number;
    improvement: string;
  }>;
}

export function useAnalyzeSustainability() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (productName: string, brand?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productName, brand }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze product');
      }

      const data: AnalysisResult = await response.json();
      setAnalysis(data);
      return data;
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
