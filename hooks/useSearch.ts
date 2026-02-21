import { useState, useCallback } from 'react';

export interface SearchResult {
  ean: string;
  title: string;
  description?: string;
  brand?: string;
  category?: string;
  images?: string[];
}

export interface SearchResponse {
  items: SearchResult[];
  code: string;
  offset: number;
  total: number;
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setError('Please enter a search term');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed with status ${response.status}`);
      }

      const data: SearchResponse = await response.json();
      setResults(data.items || []);

      if (!data.items || data.items.length === 0) {
        setError('No products found. Try a different search term.');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to search products';
      setError(errorMessage);
      console.error('[useSearch]', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { results, isLoading, error, search };
}
