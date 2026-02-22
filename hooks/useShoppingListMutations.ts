"use client";

import { useState, useCallback } from "react";
import { authFetch } from "@/lib/auth-client";
import type { ShoppingList } from "@/lib/shopping-list";
import type { AddItemBody } from "@/lib/shopping-list-mapper";

export function useCreateList() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createList = useCallback(async (name: string): Promise<ShoppingList | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/shopping-lists", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError("Sign in to save lists");
          return null;
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to create list (${res.status})`);
      }
      const data = await res.json();
      return data.list ?? null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create list");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createList, isLoading, error };
}

export function useAddItemToList(listId: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = useCallback(
    async (body: AddItemBody): Promise<boolean> => {
      if (!listId) {
        setError("No list selected");
        return false;
      }
      setIsLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/api/shopping-lists/${listId}/items`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          if (res.status === 401) {
            setError("Sign in to add items");
            return false;
          }
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Failed to add item (${res.status})`);
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add item");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [listId]
  );

  return { addItem, isLoading, error };
}

export function useDeleteListItem(listId: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      if (!listId) return false;
      setIsLoading(true);
      setError(null);
      try {
        const res = await authFetch(
          `/api/shopping-lists/${listId}/items/${itemId}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Failed to delete item (${res.status})`);
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete item");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [listId]
  );

  return { deleteItem, isLoading, error };
}
