"use client";

import { useState, useCallback, useEffect } from "react";
import { authFetch } from "@/lib/auth-client";
import type { ShoppingList } from "@/lib/shopping-list";

export function useShoppingLists() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/shopping-lists");
      if (!res.ok) {
        if (res.status === 401) {
          setError("Sign in to view your lists");
          setLists([]);
          return;
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to load lists (${res.status})`);
      }
      const data = await res.json();
      setLists(data.lists ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lists");
      setLists([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateList = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return { error: "Name is required" };
      try {
        const res = await authFetch(`/api/shopping-lists/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: trimmed }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Failed to update (${res.status})`);
        }
        await fetchLists();
        return {};
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update list";
        return { error: message };
      }
    },
    [fetchLists]
  );

  const deleteList = useCallback(
    async (id: string) => {
      try {
        const res = await authFetch(`/api/shopping-lists/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Failed to delete (${res.status})`);
        }
        await fetchLists();
        return {};
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete list";
        return { error: message };
      }
    },
    [fetchLists]
  );

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  return { lists, isLoading, error, refetch: fetchLists, updateList, deleteList };
}
