"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, List, ArrowLeft, Search, Plus } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        setHasSearched(true);
        search(searchQuery.trim());
      }
    },
    [searchQuery, search]
  );

  const isSelected = useCallback(
    (code: string) => draftItems.some((i) => i.code === code),
    [draftItems]
  );

  const addToDraft = useCallback((result: SearchResult) => {
    const body = searchResultToAddItemBody(result) as DraftListItem;
    console.log("[AddList] addToDraft: mapping search result to draft item", {
      searchResult: {
        code: result.code,
        product_name: result.product_name,
        brands: result.brands,
        categories: result.categories,
        ecoscore_grade: result.ecoscore_grade,
        nutriscore_grade: result.nutriscore_grade,
      },
      mappedBody: body,
      alreadyInDraft: false,
    });
    setDraftItems((prev) => {
      const alreadyInDraft = prev.some((i) => i.code === body.code);
      if (alreadyInDraft) {
        console.log("[AddList] addToDraft: skipped (already in draft)", { code: body.code });
        return prev;
      }
      const newItem: DraftListItem = { ...body, sustainabilityLoading: true };
      console.log("[AddList] addToDraft: added to draft", {
        newItem,
        draftCountBefore: prev.length,
        draftCountAfter: prev.length + 1,
      });
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
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message =
            typeof data?.error === "string" ? data.error : "Assessment failed";
          setDraftItems((prev) =>
            prev.map((item) =>
              item.code !== result.code
                ? item
                : { ...item, sustainabilityLoading: false, sustainabilityError: message }
            )
          );
          return;
        }
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

  const toggleSelected = useCallback(
    (result: SearchResult) => {
      const adding = !isSelected(result.code);
      console.log("[AddList] Item toggled", {
        action: adding ? "add" : "remove",
        code: result.code,
        product_name: result.product_name,
        brands: result.brands,
        fullResult: result,
      });
      if (isSelected(result.code)) {
        removeFromDraft(result.code);
      } else {
        addToDraft(result);
      }
    },
    [isSelected, removeFromDraft, addToDraft]
  );

  const handleSaveList = useCallback(() => {
    if (!isAuthenticated()) return;
    if (listName.trim()) {
      confirmSaveList();
    } else {
      setShowNameModal(true);
    }
  }, [listName, isAuthenticated]);

  const anyScoringInProgress = draftItems.some((i) => i.sustainabilityLoading);

  const confirmSaveList = useCallback(async () => {
    const finalName = listName.trim() || "My list";
    const list = await createList(finalName);
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
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950 font-sans">
      <header className="bg-white dark:bg-gray-950">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center h-14">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link
            href="/shopping-lists"
            className="ml-auto flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
          >
            <List className="w-5 h-5" />
            My Lists
          </Link>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/shopping-lists"
            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label="Back to lists"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            New List
          </h1>
        </div>

        <div className="mb-6">
          <label htmlFor="list-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            List name
          </label>
          <input
            id="list-name"
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="e.g. Weekly groceries"
            className="w-full max-w-md px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left pane: Search */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 overflow-hidden flex flex-col">
            <form onSubmit={handleSearchSubmit} className="p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                  disabled={isLoading}
                />
              </div>
            </form>
            {error && (
              <div className="px-4 py-2 text-sm text-red-600 dark:text-red-400">{error}</div>
            )}
            {hasSearched && (
              <div className="flex-1 overflow-y-auto max-h-[420px] p-2">
                {isLoading && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">
                    Searching…
                  </p>
                )}
                {!isLoading && results.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">
                    No products found. Try another search.
                  </p>
                )}
                {!isLoading && results.length > 0 && (
                  <ul className="space-y-0.5">
                    {results.map((item, index) => (
                      <li key={`${item.code}-${index}`}>
                        <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected(item.code)}
                            onChange={() => toggleSelected(item)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-400"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {item.product_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {item.brands || "No brand"}
                            </p>
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Right pane: Selected Items */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Selected Items
              </h2>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {draftItems.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[420px] p-4 min-h-[200px] flex flex-col">
              {draftItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
                    <ShoppingBag className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Search and check items to add them here
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {draftItems.map((item) => (
                    <li
                      key={item.code}
                      className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.productName || item.code}
                          </p>
                          {item.brands && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
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
                          className="flex-shrink-0 text-sm text-red-600 dark:text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {draftItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                  {isAuthenticated() ? (
                    <button
                      type="button"
                      onClick={handleSaveList}
                      disabled={isSaving || anyScoringInProgress}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      {isSaving ? "Saving…" : anyScoringInProgress ? "Scoring…" : "Create List"}
                    </button>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      <Link href="/login" className="text-gray-900 dark:text-white font-medium underline">
                        Sign in
                      </Link>{" "}
                      to save this list.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {saveError && (
          <div className="mt-6 p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <p className="text-red-700 dark:text-red-300 text-sm font-medium">Save error</p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{saveError}</p>
          </div>
        )}
      </main>

      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 max-w-sm w-full border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              List name
            </h3>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g. Weekly groceries"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowNameModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = listName.trim();
                  if (name) {
                    setShowNameModal(false);
                    confirmSaveList();
                  }
                }}
                disabled={!listName.trim() || isSaving || anyScoringInProgress}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
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
