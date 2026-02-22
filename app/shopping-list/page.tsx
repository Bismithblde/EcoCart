"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductInput from "@/components/ProductInput";
import { SustainabilityItemScore } from "@/components/SustainabilityItemScore";
import { useSearch } from "@/hooks/useSearch";
import { useCreateList } from "@/hooks/useShoppingListMutations";
import { searchResultToAddItemBody, type AddItemBody } from "@/lib/shopping-list-mapper";
import type { ShoppingListSustainability } from "@/lib/shopping-list";
import { authFetch } from "@/lib/auth-client";
import { isAuthenticated } from "@/lib/auth-client";
import type { SearchResult } from "@/hooks/useSearch";

export interface DraftListItem extends AddItemBody {
  sustainabilityLoading?: boolean;
  sustainabilityError?: string;
}

export default function ShoppingListCreatorPage() {
  const router = useRouter();
  const { results, isLoading, error, search } = useSearch();
  const { createList, isLoading: isSaving, error: saveError } = useCreateList();
  const [draftItems, setDraftItems] = useState<DraftListItem[]>([]);
  const [listName, setListName] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);

  const handleProductSubmit = useCallback((name: string) => {
    search(name);
  }, [search]);

  const addToDraft = useCallback((result: SearchResult) => {
    const body = searchResultToAddItemBody(result) as DraftListItem;
    setDraftItems((prev) => {
      if (prev.some((i) => i.code === body.code)) return prev;
      const newItem: DraftListItem = { ...body, sustainabilityLoading: true };
      return [...prev, newItem];
    });

    const productPayload = {
      code: result.code,
      product_name: result.product_name,
      brands: result.brands,
      categories: result.categories,
      ecoscore_grade: result.ecoscore_grade,
      nutriscore_grade: result.nutriscore_grade,
    };

    fetch("/api/sustainability/assess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: [productPayload] }),
    })
      .then((res) => res.json())
      .then((data) => {
        const first = data?.products?.[0];
        const assessment = first?.sustainability_assessment;
        const hasError = assessment && typeof assessment.error === "string";
        setDraftItems((prev) =>
          prev.map((item) =>
            item.code !== result.code
              ? item
              : {
                  ...item,
                  sustainability: hasError ? undefined : (assessment as ShoppingListSustainability),
                  sustainabilityLoading: false,
                  sustainabilityError: hasError ? (assessment as { error: string }).error : undefined,
                }
          )
        );
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Assessment failed";
        setDraftItems((prev) =>
          prev.map((item) =>
            item.code !== result.code
              ? item
              : { ...item, sustainabilityLoading: false, sustainabilityError: message }
          )
        );
      });
  }, []);

  const removeFromDraft = useCallback((code: string) => {
    setDraftItems((prev) => prev.filter((i) => i.code !== code));
  }, []);

  const handleSaveList = useCallback(async () => {
    if (!isAuthenticated()) return;
    setShowNameModal(true);
  }, []);

  const confirmSaveList = useCallback(async () => {
    const name = listName.trim();
    if (!name) return;
    const list = await createList(name);
    if (!list) return;
    for (const item of draftItems) {
      const { sustainabilityLoading, sustainabilityError, ...body } = item;
      const res = await authFetch(`/api/shopping-lists/${list.id}/items`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
    }
    setShowNameModal(false);
    setListName("");
    setDraftItems([]);
    router.push(`/shopping-lists/${list.id}`);
  }, [listName, draftItems, createList, router]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 font-sans">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white">
            EcoCart
          </Link>
          <div className="flex gap-4">
            <Link
              href="/shopping-lists"
              className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              My lists
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            New shopping list
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Search for products and add them with +. Save the list when done.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <ProductInput onSubmit={handleProductSubmit} isLoading={isLoading} />
            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}
            {results.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Search results
                </h2>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {results.map((item: SearchResult, index: number) => (
                    <div
                      key={`${item.code}-${index}`}
                      className="flex items-center justify-between gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {item.product_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {item.brands || "No brand"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToDraft(item)}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-lg leading-none"
                        aria-label="Add to list"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Your list ({draftItems.length})
            </h2>
            {draftItems.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Add items from search results using the + button.
              </p>
            ) : (
              <>
                <ul className="space-y-2 max-h-80 overflow-y-auto mb-4">
                  {draftItems.map((item) => (
                    <li
                      key={item.code}
                      className="flex items-start justify-between gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {item.productName || item.code}
                        </p>
                        {item.brands && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {item.brands}
                          </p>
                        )}
                        <SustainabilityItemScore
                          sustainability={item.sustainability ?? null}
                          loading={item.sustainabilityLoading}
                          error={item.sustainabilityError}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromDraft(item.code)}
                        className="flex-shrink-0 text-red-600 dark:text-red-400 hover:underline text-sm"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                {isAuthenticated() ? (
                  <button
                    type="button"
                    onClick={handleSaveList}
                    disabled={isSaving}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                  >
                    {isSaving ? "Saving…" : "Save list"}
                  </button>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <Link href="/login" className="text-green-600 dark:text-green-400 font-medium hover:underline">
                      Sign in
                    </Link>{" "}
                    to save this list to your profile.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {saveError && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300 font-medium">Save error</p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{saveError}</p>
          </div>
        )}
      </div>

      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Name your list
            </h3>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g. Weekly groceries"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowNameModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSaveList}
                disabled={!listName.trim() || isSaving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
