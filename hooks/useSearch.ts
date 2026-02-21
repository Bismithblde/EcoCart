import { useState, useCallback } from 'react';

export interface SearchResult {
  code: string;
  product_name: string;
  brands?: string;
  categories?: string;
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

  const search = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setError('Please enter a product name');
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('Invalid search query');
        } else if (response.status === 502) {
          throw new Error('Search service is temporarily unavailable');
        } else {
          throw new Error(`Search failed with status ${response.status}`);
        }
      }

      const data: SearchResponse = await response.json();

      if (data.products && data.products.length > 0) {
        setResults(data.products);
        setError(null);
      } else {
        setResults([]);
        setError(`No products found for "${trimmedQuery}". Try searching for a different product name.`);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to search products';
      setError(errorMessage);
      setResults([]);
      console.error('[useSearch]', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { results, isLoading, error, search };
}
