import { useState, useCallback, useRef } from "react";

export interface SearchResult {
  code: string;
  product_name: string;
  brands?: string;
  categories?: string;
  /** Short description from categories or ingredients (backend-derived). */
  description?: string;
  ecoscore_grade?: string;
  ecoscore_score?: number;
  nutriscore_grade?: string;
  nutriscore_score?: number;
  image_url?: string;
  image_small_url?: string;
}

export interface SearchResponse {
  products: SearchResult[];
  count: number;
  page: number;
  page_size: number;
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setError("Please enter a product name");
      setResults([]);
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const params = new URLSearchParams({
        q: trimmedQuery,
        country: "united-states",
        page_size: "12",
      });
      const response = await fetch(`/api/search?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal,
      });

      if (signal.aborted) return;

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error("Invalid search query");
        } else if (response.status === 502) {
          throw new Error("Search service is temporarily unavailable");
        } else {
          throw new Error(`Search failed with status ${response.status}`);
        }
      }

      const data: SearchResponse = await response.json();

      if (signal.aborted) return;

      if (data.products && data.products.length > 0) {
        console.log("[AddList][useSearch] Search API returned products", {
          query: trimmedQuery,
          count: data.products.length,
          products: data.products.map((p) => ({
            code: p.code,
            product_name: p.product_name,
            brands: p.brands,
          })),
        });
        setResults(data.products);
        setError(null);
      } else {
        setResults([]);
        setError(
          `No products found for "${trimmedQuery}". Try searching for a different product name.`,
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      const errorMessage =
        err instanceof Error ? err.message : "Failed to search products";
      setError(errorMessage);
      setResults([]);
      console.error("[useSearch]", err);
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  return { results, isLoading, error, search };
}
