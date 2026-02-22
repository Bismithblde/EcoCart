"use client";

import { useState, useCallback, useEffect } from "react";
import { authFetch } from "@/lib/auth-client";
import type { ShoppingList, ShoppingListItem } from "@/lib/shopping-list";

export function useShoppingList(id: string | null) {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    if (!id) {
      setList(null);
      setItems([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/shopping-lists/${id}`);
      if (!res.ok) {
        if (res.status === 401) {
          setError("Sign in to view this list");
          setList(null);
          setItems([]);
          return;
        }
        if (res.status === 404) {
          setError("List not found");
          setList(null);
          setItems([]);
          return;
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to load list (${res.status})`);
      }
      const data = await res.json();
      setList(data.list ?? null);
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load list");
      setList(null);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { list, items, isLoading, error, refetch: fetchList };
}
