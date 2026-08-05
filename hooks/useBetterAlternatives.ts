import { useState, useCallback, useEffect, useRef } from "react";
import { authFetch } from "@/lib/auth-client";

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
  tags?: string[];
  confidence: "low" | "medium" | "high";
  sources: Array<{
    id: string;
    title: string;
    url: string;
    snippet?: string;
    kind: "product" | "web";
  }>;
  assessment_version: string;
  assessed_at: string;
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
  comparison?: {
    scoreDelta: number;
    confidence: "low" | "medium" | "high";
    comparable: true;
  };
}

export function useBetterAlternatives() {
  const [alternatives, setAlternatives] = useState<BetterAlternativeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchAlternatives = useCallback(
    async (product: ProductForAlternatives, topK: number = 6, currentScore?: number) => {
      if (!product?.code && !product?.product_name) {
        setError("Product code or name is required");
        return [];
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const requestId = ++requestIdRef.current;

      setIsLoading(true);
      setError(null);
      setAlternatives([]);

      try {
        const response = await authFetch("/api/sustainability/better-alternatives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product, topK, currentScore }),
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error ?? "Failed to fetch better alternatives");
        }

        const list = Array.isArray(data.alternatives) ? data.alternatives : [];
        if (requestId !== requestIdRef.current || controller.signal.aborted) return [];
        setAlternatives(list);
        return list;
      } catch (err) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return [];
        const message = err instanceof Error ? err.message : "An error occurred";
        setError(message);
        return [];
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      }
    },
    []
  );

  const clearAlternatives = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    requestIdRef.current += 1;
    setAlternatives([]);
    setIsLoading(false);
    setError(null);
  }, []);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  return { alternatives, isLoading, error, fetchAlternatives, clearAlternatives };
}
