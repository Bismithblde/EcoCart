import { useState, useCallback } from "react";

export interface ProductForAlternatives {
  code: string;
  product_name?: string;
  brands?: string;
  categories?: string;
}

export interface AlternativeAssessment {
  verdict: "good" | "moderate" | "poor";
  score: number;
  reasoning: string;
  better_alternatives: string[];
}

export interface AlternativeProduct {
  code: string;
  product_name: string;
  brands?: string;
  categories?: string;
  description?: string;
  ecoscore_grade?: string;
  nutriscore_grade?: string;
}

export interface BetterAlternativeItem {
  product: AlternativeProduct;
  assessment: AlternativeAssessment | { error: string };
}

export function useBetterAlternatives() {
  const [alternatives, setAlternatives] = useState<BetterAlternativeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlternatives = useCallback(
    async (product: ProductForAlternatives, topK: number = 6, currentScore?: number) => {
      if (!product?.code && !product?.product_name) {
        setError("Product code or name is required");
        return [];
      }

      setIsLoading(true);
      setError(null);
      setAlternatives([]);

      try {
        const response = await fetch("/api/sustainability/better-alternatives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product, topK, currentScore }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error ?? "Failed to fetch better alternatives");
        }

        const list = Array.isArray(data.alternatives) ? data.alternatives : [];
        setAlternatives(list);
        return list;
      } catch (err) {
        const message = err instanceof Error ? err.message : "An error occurred";
        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearAlternatives = useCallback(() => {
    setAlternatives([]);
    setError(null);
  }, []);

  return { alternatives, isLoading, error, fetchAlternatives, clearAlternatives };
}
