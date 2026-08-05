"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, ArrowLeft, Search, Plus } from "lucide-react";
import { SustainabilityItemScore } from "@/components/SustainabilityItemScore";
import AppHeader from "@/components/AppHeader";
import { useSearch } from "@/hooks/useSearch";
import { useCreateList } from "@/hooks/useShoppingListMutations";
import { searchResultToAddItemBody, type AddItemBody } from "@/lib/shopping-list-mapper";
import type { ShoppingListSustainability } from "@/lib/shopping-list";
import { authFetch } from "@/lib/auth-client";
import { isAuthenticated } from "@/lib/auth-client";
import type { SearchResult } from "@/hooks/useSearch";
import {
  INITIAL_ASSESSMENT_PROGRESS,
  type AssessmentProgressState,
} from "@/hooks/useAnalyzeSustainability";
import { readNdjsonStream, responseError } from "@/lib/ndjson";
import type { AssessmentStreamEvent } from "@/lib/sustainability-types";

export interface DraftListItem extends AddItemBody {
  sustainabilityLoading?: boolean;
  sustainabilityError?: string;
  sustainabilityProgress?: AssessmentProgressState;
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
  const assessmentControllersRef = useRef(new Map<string, AbortController>());

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
      const newItem: DraftListItem = {
        ...body,
        sustainabilityLoading: true,
        sustainabilityProgress: INITIAL_ASSESSMENT_PROGRESS,
      };
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
      ingredients: result.ingredients,
      ingredients_text: result.ingredients,
      ecoscore_grade: result.ecoscore_grade,
      ecoscore_score: result.ecoscore_score,
      nutriscore_grade: result.nutriscore_grade,
    };

    const controller = new AbortController();
    assessmentControllersRef.current.get(result.code)?.abort();
    assessmentControllersRef.current.set(result.code, controller);

    authFetch("/api/sustainability/assess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: [productPayload] }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw await responseError(res, "Assessment failed");
        if (!res.headers.get("content-type")?.includes("application/x-ndjson")) {
          throw new Error("The assessment endpoint did not return a progress stream");
        }

        let first: Extract<AssessmentStreamEvent, { type: "complete" }>["products"][number] | undefined;
        await readNdjsonStream<AssessmentStreamEvent>(res, {
          signal: controller.signal,
          onEvent: (event) => {
            if (event.type === "error") throw new Error(event.error);
            if (event.type === "progress" && event.productCode === result.code) {
              setDraftItems((prev) => prev.map((item) => item.code !== result.code ? item : {
                ...item,
                sustainabilityProgress: {
                  stage: event.stage,
                  status: event.status,
                  message: event.message,
                  evidenceCount: event.evidenceCount,
                  researchRound: event.researchRound,
                  maxResearchRounds: event.maxResearchRounds,
                  completedStages: event.completedStages,
                },
              }));
            } else if (event.type === "complete") {
              first = event.products[0];
            }
          },
        });
        if (controller.signal.aborted) return;
        const assessment = first?.sustainability_assessment;
        const hasError = Boolean(assessment && "error" in assessment);
        setDraftItems((prev) =>
          prev.map((item) =>
            item.code !== result.code
              ? item
              : {
                  ...item,
                  sustainability: hasError ? undefined : (assessment as ShoppingListSustainability),
                  sustainabilityLoading: false,
                  sustainabilityError: hasError ? (assessment as { error: string }).error : undefined,
                  sustainabilityProgress: undefined,
                }
          )
        );
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Assessment failed";
        setDraftItems((prev) =>
          prev.map((item) =>
            item.code !== result.code
              ? item
              : { ...item, sustainabilityLoading: false, sustainabilityError: message }
          )
        );
      })
      .finally(() => {
        if (assessmentControllersRef.current.get(result.code) === controller) {
          assessmentControllersRef.current.delete(result.code);
        }
      });
  }, []);

  const removeFromDraft = useCallback((code: string) => {
    assessmentControllersRef.current.get(code)?.abort();
    assessmentControllersRef.current.delete(code);
    setDraftItems((prev) => prev.filter((i) => i.code !== code));
  }, []);

  useEffect(() => () => {
    for (const controller of assessmentControllersRef.current.values()) controller.abort();
    assessmentControllersRef.current.clear();
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

  const anyScoringInProgress = draftItems.some((i) => i.sustainabilityLoading);

  const confirmSaveList = useCallback(async () => {
    const finalName = listName.trim() || "My list";
    const list = await createList(finalName);
    if (!list) return;
    for (const item of draftItems) {
      const body = { ...item };
      delete body.sustainabilityLoading;
      delete body.sustainabilityError;
      delete body.sustainabilityProgress;
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

  const handleSaveList = useCallback(() => {
    if (!isAuthenticated()) return;
    if (listName.trim()) {
      confirmSaveList();
    } else {
      setShowNameModal(true);
    }
  }, [listName, confirmSaveList]);

  return (
    <div className="flex min-h-screen flex-col bg-[#dfeef2] font-sans text-[#111714]">
      <AppHeader active="lists" />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-3 py-10 sm:px-5 sm:py-16">
        <div className="mb-10 flex items-start gap-4 sm:mb-14">
          <Link
            href="/shopping-lists"
            className="mt-1 flex items-center border-2 border-[#111714] bg-[#fffdf5] p-2 transition-colors hover:bg-[#2148d8] hover:text-white"
            aria-label="Back to lists"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div><p className="font-mono text-[0.68rem] font-semibold">LIST BUILDER / NEW</p><h1 className="mt-3 text-[clamp(3.6rem,8vw,7rem)] font-semibold leading-[0.85] tracking-[-0.07em]">Build a better basket.</h1></div>
        </div>

        <div className="mb-8 max-w-xl">
          <label htmlFor="list-name" className="block border-x-2 border-t-2 border-[#111714] bg-[#fffdf5] px-4 py-2 font-mono text-[0.68rem] font-semibold">
            LIST NAME / OPTIONAL
          </label>
          <input
            id="list-name"
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="e.g. Weekly groceries"
            className="min-h-14 w-full border-2 border-[#111714] bg-white px-4 py-3 outline-none placeholder:text-[#727873] focus:bg-[#dfeef2] focus:ring-2 focus:ring-[#2148d8]"
          />
        </div>

        <div className="grid grid-cols-1 gap-0 border-2 border-[#111714] bg-[#111714] lg:grid-cols-2">
          {/* Left pane: Search */}
          <div className="flex flex-col overflow-hidden bg-[#fffdf5]">
            <form onSubmit={handleSearchSubmit} className="border-b-2 border-[#111714] p-4 sm:p-5">
              <p className="mb-3 font-mono text-[0.68rem] font-semibold text-[#0d563f]">01 / FIND PRODUCTS</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4c514b]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className="min-h-13 w-full border-2 border-[#111714] bg-white py-3 pl-10 pr-4 outline-none placeholder:text-[#727873] focus:bg-[#dfeef2] focus:ring-2 focus:ring-[#2148d8]"
                  disabled={isLoading}
                />
              </div>
            </form>
            {error && (
              <div className="border-b-2 border-[#111714] bg-[#fff4de] px-4 py-3 text-sm">{error}</div>
            )}
            {hasSearched && (
              <div className="flex-1 overflow-y-auto max-h-[420px] p-2">
                {isLoading && (
                  <p className="p-4 text-center font-mono text-xs font-semibold text-[#0d563f]">
                    SEARCHING...
                  </p>
                )}
                {!isLoading && results.length === 0 && (
                  <p className="p-4 text-center text-sm text-[#4c514b]">
                    No products found. Try another search.
                  </p>
                )}
                {!isLoading && results.length > 0 && (
                  <ul className="grid gap-px bg-[#111714]">
                    {results.map((item, index) => (
                      <li key={`${item.code}-${index}`}>
                        <label className="flex cursor-pointer items-center gap-3 bg-[#fffdf5] p-3 hover:bg-[#dfeef2]">
                          <input
                            type="checkbox"
                            checked={isSelected(item.code)}
                            onChange={() => toggleSelected(item)}
                            className="h-4 w-4 rounded-none border-2 border-[#111714] accent-[#0d563f] focus:ring-[#2148d8]"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">
                              {item.product_name}
                            </p>
                            <p className="truncate text-sm text-[#4c514b]">
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
          <div className="flex flex-col overflow-hidden bg-[#fffdf5] lg:border-l-2 lg:border-[#111714]">
            <div className="flex items-center justify-between border-b-2 border-[#111714] bg-[#0d563f] p-4 text-white sm:p-5">
              <h2 className="font-mono text-[0.68rem] font-semibold">
                02 / SELECTED ITEMS
              </h2>
              <span className="font-mono text-sm font-semibold">
                {draftItems.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[420px] p-4 min-h-[200px] flex flex-col">
              {draftItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center border-2 border-[#111714] bg-[#dfeef2]">
                    <ShoppingBag className="h-8 w-8 text-[#0d563f]" />
                  </div>
                  <p className="max-w-xs text-sm text-[#4c514b]">
                    Search and check items to add them here
                  </p>
                </div>
              ) : (
                <ul className="grid gap-2">
                  {draftItems.map((item) => (
                    <li
                      key={item.code}
                      className="border-2 border-[#111714] bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {item.productName || item.code}
                          </p>
                          {item.brands && (
                            <p className="mt-1 text-sm text-[#4c514b]">
                              {item.brands}
                            </p>
                          )}
                          <SustainabilityItemScore
                            sustainability={item.sustainability ?? null}
                            loading={item.sustainabilityLoading}
                            error={item.sustainabilityError}
                            progress={item.sustainabilityProgress}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromDraft(item.code)}
                          className="flex-shrink-0 border-b-2 border-[#111714] font-mono text-[0.62rem] font-semibold hover:text-[#2148d8]"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {draftItems.length > 0 && (
                <div className="mt-4 border-t-2 border-[#111714] pt-4">
                  {isAuthenticated() ? (
                    <button
                      type="button"
                      onClick={handleSaveList}
                      disabled={isSaving || anyScoringInProgress}
                      className="flex w-full items-center justify-center gap-2 bg-[#0d563f] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#2148d8] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      {isSaving ? "Saving…" : anyScoringInProgress ? "Scoring…" : "Create List"}
                    </button>
                  ) : (
                    <p className="text-center text-sm text-[#4c514b]">
                      <Link href="/login" className="font-semibold text-[#111714] underline decoration-2 underline-offset-4">
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
          <div className="mt-6 border-2 border-[#111714] bg-[#fff4de] p-4">
            <p className="font-mono text-[0.68rem] font-semibold">SAVE ERROR</p>
            <p className="mt-1 text-sm">{saveError}</p>
          </div>
        )}
      </main>

      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111714]/70 p-4">
          <div className="w-full max-w-sm border-2 border-[#111714] bg-[#fffdf5] p-6">
            <p className="font-mono text-[0.62rem] font-semibold text-[#0d563f]">SAVE RECEIPT</p><h3 className="mb-3 mt-2 text-3xl font-semibold tracking-[-0.04em]">
              List name
            </h3>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g. Weekly groceries"
              className="mb-4 min-h-13 w-full border-2 border-[#111714] bg-white px-4 py-3 outline-none placeholder:text-[#727873] focus:bg-[#dfeef2] focus:ring-2 focus:ring-[#2148d8]"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowNameModal(false)}
                className="border-2 border-[#111714] px-4 py-2 font-semibold hover:bg-[#dfeef2]"
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
                className="bg-[#0d563f] px-4 py-2 font-semibold text-white hover:bg-[#2148d8] disabled:opacity-50"
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
