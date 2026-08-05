import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { readNdjsonStream, responseError } from "@/lib/ndjson";
import type { SustainabilityAssessment } from "@/lib/sustainability-types";
import type { AssessmentScoreMode } from "@/lib/sustainability-types";

export interface ProductForAlternatives {
  code: string;
  product_name?: string;
  brands?: string;
  categories?: string;
}

export type AlternativeAssessment = SustainabilityAssessment;

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

interface AlternativesProgressEvent {
  type: "progress";
  stage: "searching" | "assessing";
  message: string;
  evaluatedCount: number;
  totalCandidates: number;
}

interface AlternativeCandidateEvent {
  type: "candidate";
  alternative: BetterAlternativeItem;
  evaluatedCount: number;
  totalCandidates: number;
}

interface AlternativesCompleteEvent {
  type: "complete";
  alternatives: BetterAlternativeItem[];
  evaluatedCount: number;
  totalCandidates: number;
}

interface AlternativesErrorEvent {
  type: "error";
  error: string;
}

type AlternativesStreamEvent =
  | AlternativesProgressEvent
  | AlternativeCandidateEvent
  | AlternativesCompleteEvent
  | AlternativesErrorEvent;

export function useBetterAlternatives() {
  const [alternatives, setAlternatives] = useState<BetterAlternativeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState("");
  const [evaluatedCount, setEvaluatedCount] = useState(0);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchAlternatives = useCallback(
    async (
      product: ProductForAlternatives,
      topK = 6,
      currentScore?: number,
      currentScoreMode?: AssessmentScoreMode,
    ) => {
      if (!product?.code && !product?.product_name) {
        setError("Product code or name is required");
        return [];
      }
      if (typeof currentScore !== "number") {
        setError("A supported primary score is required before finding alternatives");
        return [];
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const requestId = ++requestIdRef.current;

      setIsLoading(true);
      setError(null);
      setAlternatives([]);
      setProgressMessage("Finding comparable products");
      setEvaluatedCount(0);
      setTotalCandidates(0);

      try {
        const response = await authFetch("/api/sustainability/better-alternatives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product, topK, currentScore, currentScoreMode }),
          signal: controller.signal,
        });
        if (!response.ok) throw await responseError(response, "Failed to fetch better alternatives");
        if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
          throw new Error("The alternatives endpoint did not return a progress stream");
        }

        let finalAlternatives: BetterAlternativeItem[] = [];
        let receivedComplete = false;
        await readNdjsonStream<AlternativesStreamEvent>(response, {
          signal: controller.signal,
          onEvent: (event) => {
            if (requestId !== requestIdRef.current || controller.signal.aborted) return;
            if (event.type === "error") throw new Error(event.error);
            if (event.type === "progress") {
              setProgressMessage(event.message);
              setEvaluatedCount(event.evaluatedCount);
              setTotalCandidates(event.totalCandidates);
              return;
            }
            if (event.type === "candidate") {
              setEvaluatedCount(event.evaluatedCount);
              setTotalCandidates(event.totalCandidates);
              setAlternatives((current) => {
                if (current.some((item) => item.product.code === event.alternative.product.code)) return current;
                return [...current, event.alternative];
              });
              return;
            }
            receivedComplete = true;
            finalAlternatives = event.alternatives;
            setEvaluatedCount(event.evaluatedCount);
            setTotalCandidates(event.totalCandidates);
          },
        });

        if (requestId !== requestIdRef.current || controller.signal.aborted) return [];
        if (!receivedComplete) throw new Error("The alternatives stream ended before completion");
        setAlternatives(finalAlternatives);
        setProgressMessage("");
        return finalAlternatives;
      } catch (caught) {
        if (
          controller.signal.aborted ||
          requestId !== requestIdRef.current ||
          (caught instanceof DOMException && caught.name === "AbortError")
        ) return [];
        setError(caught instanceof Error ? caught.message : "An error occurred");
        return [];
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      }
    },
    [],
  );

  const clearAlternatives = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    requestIdRef.current += 1;
    setAlternatives([]);
    setIsLoading(false);
    setError(null);
    setProgressMessage("");
    setEvaluatedCount(0);
    setTotalCandidates(0);
  }, []);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  return {
    alternatives,
    isLoading,
    error,
    progressMessage,
    evaluatedCount,
    totalCandidates,
    fetchAlternatives,
    clearAlternatives,
  };
}
