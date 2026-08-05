"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import ProductInput from "@/components/ProductInput";
import SustainabilityDashboard from "@/components/SustainabilityDashboard";
import BetterChoiceCard from "@/components/BetterChoiceCard";
import { AssessmentProgress } from "@/components/AssessmentProgress";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "@/components/LandingPage";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch, type SearchResult } from "@/hooks/useSearch";
import { useAnalyzeSustainability } from "@/hooks/useAnalyzeSustainability";
import { useBetterAlternatives, type BetterAlternativeItem } from "@/hooks/useBetterAlternatives";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { authFetch } from "@/lib/auth-client";

export default function Home() {
  const router = useRouter();
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const { results, isLoading, error, search } = useSearch();
  const { analysis, isLoading: isAnalyzing, error: analysisError, progressStep, progressSteps, analyze, clearAnalysis } =
    useAnalyzeSustainability();
  const { alternatives: betterAlternatives, isLoading: isLoadingAlternatives, error: alternativesError, fetchAlternatives, clearAlternatives } =
    useBetterAlternatives();
  const { lists, refetch: refetchLists } = useShoppingLists();
  const [selectedProduct, setSelectedProduct] = useState<SearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [productToAdd, setProductToAdd] = useState<BetterAlternativeItem | null>(null);
  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const [addToListError, setAddToListError] = useState<string | null>(null);

  const handleProductSubmit = (name: string) => {
    clearAnalysis();
    clearAlternatives();
    setSelectedProduct(null);
    setHasSearched(true);
    search(name);
  };

  const handleAnalyzeSustainability = async () => {
    if (selectedProduct) {
      clearAlternatives();
      await analyze({
        code: selectedProduct.code ?? "",
        product_name: selectedProduct.product_name,
        brands: selectedProduct.brands,
        categories: selectedProduct.categories,
        ingredients: selectedProduct.ingredients,
        ingredients_text: selectedProduct.ingredients,
        ecoscore_grade: selectedProduct.ecoscore_grade,
        nutriscore_grade: selectedProduct.nutriscore_grade,
      });
    }
  };

  const handleSelectProduct = (item: SearchResult) => {
    clearAnalysis();
    clearAlternatives();
    setSelectedProduct(item);
  };

  const handleFindBetterAlternatives = () => {
    if (selectedProduct && analysis && analysis.productCode === selectedProduct.code) {
      fetchAlternatives(
        {
          code: selectedProduct.code ?? "",
          product_name: selectedProduct.product_name,
          brands: selectedProduct.brands,
          categories: selectedProduct.categories,
        },
        6,
        analysis.ecoScore
      );
    }
  };

  const handleAddToChosenList = async (listId: string) => {
    if (!productToAdd) return;
    setAddingToListId(listId);
    setAddToListError(null);
    try {
      const a = productToAdd.assessment;
      const sustainability =
        a && !("error" in a)
          ? {
              verdict: a.verdict,
              score: a.score,
              reasoning: a.reasoning,
              better_alternatives: a.better_alternatives,
              tags: a.tags,
              confidence: a.confidence,
              sources: a.sources,
              assessment_version: a.assessment_version,
              assessed_at: a.assessed_at,
            }
          : undefined;
      const res = await authFetch(`/api/shopping-lists/${listId}/items`, {
        method: "POST",
        body: JSON.stringify({
          code: productToAdd.product.code,
          productName: productToAdd.product.product_name ?? undefined,
          brands: productToAdd.product.brands ?? undefined,
          sustainability,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add");
      }
      setProductToAdd(null);
      refetchLists();
    } catch (err) {
      setAddToListError(err instanceof Error ? err.message : "Failed to add to list");
    } finally {
      setAddingToListId(null);
    }
  };

  const handleSignOut = () => {
    logout();
    router.push("/login");
  };

  if (isAuthLoading) {
    return <div className="min-h-[100dvh] bg-[#dfeef2]" aria-label="Loading" />;
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-[#dfeef2] font-sans text-[#111714] selection:bg-[#2148d8] selection:text-white">
        <AppHeader active="dashboard" email={user.email} onSignOut={handleSignOut} />

        <div className="flex-1 px-3 pb-12 pt-10 sm:px-5 sm:pb-20 sm:pt-16">
          <main className="mx-auto w-full max-w-[1100px]">
            <div className="mb-10 grid grid-cols-1 gap-6 sm:mb-14 sm:grid-cols-12 sm:items-end">
              <div className="sm:col-span-8"><p className="font-mono text-[0.68rem] font-semibold">PRODUCT DESK / NEW ANALYSIS</p><h1 className="mt-4 max-w-[9ch] text-[clamp(3.7rem,8vw,7.5rem)] font-semibold leading-[0.85] tracking-[-0.075em]">What are you buying?</h1></div>
              <p className="max-w-xs border-l-2 border-[#111714] pl-5 text-base leading-7 sm:col-span-4">Search a product, inspect the evidence, then save the better option.</p>
            </div>

            <div className="border-2 border-[#111714] bg-[#fffdf5] p-4 sm:p-7">
              <ProductInput onSubmit={handleProductSubmit} isLoading={isLoading} />

              {error && (
                <div className="mt-6 border-2 border-[#111714] bg-[#fff4de] p-4">
                  <p className="font-mono text-[0.68rem] font-semibold">SEARCH ERROR</p>
                  <p className="mt-1 text-sm">{error}</p>
                </div>
              )}

              {hasSearched && (
                <div className="mt-8">
                  {isLoading ? (
                    <p className="font-mono text-xs font-semibold text-[#0d563f]">SEARCHING...</p>
                  ) : (
                    <>
                      <h2 className="mb-4 border-b-2 border-[#111714] pb-3 font-mono text-xs font-semibold">
                        SEARCH RESULTS / {results.length}
                      </h2>
                      {results.length === 0 ? (
                        <p className="text-[#4c514b]">No products found. Try a different search.</p>
                      ) : (
                        <div className="max-h-72 space-y-2 overflow-y-auto">
                          {results.map((item, index) => (
                            <button
                              key={item.code ?? index}
                              onClick={() => handleSelectProduct(item)}
                              className={`w-full border-2 border-[#111714] p-4 text-left transition-colors ${
                                selectedProduct?.product_name === item.product_name
                                  ? "bg-[#2148d8] text-white"
                                  : "bg-white hover:bg-[#dfeef2]"
                              }`}
                            >
                              <p className="font-semibold">
                                {item.product_name}
                              </p>
                              <p className="mt-1 text-sm opacity-75">
                                {item.brands || "No brand"}
                              </p>
                              {item.description && (
                                <p className="mt-1 line-clamp-2 text-xs opacity-65">
                                  {item.description}
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {selectedProduct && (
                <div className="mt-8 space-y-4">
                  <div className="border-2 border-[#111714] bg-[#dfeef2] p-5 sm:p-6">
                    <p className="mb-2 font-mono text-[0.62rem] font-semibold">SELECTED PRODUCT</p><h3 className="mb-2 text-2xl font-semibold tracking-[-0.04em]">
                      {selectedProduct.product_name}
                    </h3>
                    <p className="font-mono text-[0.65rem] text-[#4c514b]">
                      Brand: {selectedProduct.brands || "Unknown"} | Barcode:{" "}
                      {selectedProduct.code || "N/A"}
                    </p>
                    {selectedProduct.description && (
                      <p className="mt-3 text-sm leading-6 text-[#4c514b]">
                        {selectedProduct.description}
                      </p>
                    )}
                    <button
                      onClick={handleAnalyzeSustainability}
                      disabled={isAnalyzing}
                      className="mt-5 flex items-center gap-2 bg-[#0d563f] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#2148d8] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isAnalyzing && (
                        <svg
                          className="animate-spin h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      )}
                      {isAnalyzing ? progressStep : "Analyze Sustainability"}
                    </button>
                  </div>

                  {isAnalyzing && (
                    <div className="mt-4">
                      <AssessmentProgress step={progressStep} steps={progressSteps} variant="full" />
                    </div>
                  )}

                  {analysisError && (
                    <div className="border-2 border-[#111714] bg-[#fff4de] p-4">
                      <p className="font-mono text-[0.68rem] font-semibold">ANALYSIS ERROR</p>
                      <p className="mt-1 text-sm">{analysisError}</p>
                    </div>
                  )}

                  {analysis && analysis.productCode === selectedProduct.code && (
                    <div className="space-y-6">
                      <SustainabilityDashboard
                        productName={analysis.productName}
                        ecoScore={analysis.ecoScore}
                        verdict={analysis.verdict}
                        reasoning={analysis.reasoning}
                        tags={analysis.tags}
                        confidence={analysis.confidence}
                        sources={analysis.sources}
                        assessedAt={analysis.assessedAt}
                        metrics={analysis.metrics}
                      />

                      <div className="border-2 border-[#111714] bg-[#fffdf5] p-5 sm:p-6">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <h3 className="text-2xl font-semibold tracking-[-0.04em]">
                            Better Alternatives
                          </h3>
                          <button
                            type="button"
                            onClick={handleFindBetterAlternatives}
                            disabled={isLoadingAlternatives}
                            className="flex items-center gap-2 border-2 border-[#111714] bg-[#2148d8] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d563f] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isLoadingAlternatives ? (
                              <>
                                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Finding…
                              </>
                            ) : (
                              "Find similar & more sustainable"
                            )}
                          </button>
                        </div>
                        {alternativesError && (
                          <p className="mb-3 border-2 border-[#111714] bg-[#fff4de] p-3 text-sm">{alternativesError}</p>
                        )}
                        {betterAlternatives.length > 0 ? (
                          <div className="space-y-3">
                            {betterAlternatives.map((alt) => {
                              if (alt.assessment && "error" in alt.assessment) {
                                return (
                                  <div
                                    key={alt.product.code}
                                    className="border-2 border-[#111714] bg-[#fff4de] p-3 text-sm"
                                  >
                                    <span className="font-medium">{alt.product.product_name}</span>
                                    <span className="ml-2">{alt.assessment.error}</span>
                                  </div>
                                );
                              }
                              const a = alt.assessment as { score: number; reasoning: string };
                              return (
                                <BetterChoiceCard
                                  key={alt.product.code}
                                  currentProduct={analysis.productName}
                                  currentScore={analysis.ecoScore}
                                  betterProduct={alt.product.product_name}
                                  betterBrand={alt.product.brands}
                                  betterScore={a.score}
                                  improvement={a.reasoning}
                                  scoreDelta={alt.comparison?.scoreDelta}
                                  confidence={alt.comparison?.confidence}
                                  onAddToList={() => {
                                  setAddToListError(null);
                                  setProductToAdd(alt);
                                }}
                                />
                              );
                            })}
                          </div>
                        ) : analysis.alternatives && analysis.alternatives.length > 0 ? (
                          <div className="space-y-3">
                            <p className="mb-2 font-mono text-[0.65rem] font-semibold">AI SUGGESTIONS</p>
                            {analysis.alternatives.map((alt, index) => (
                              <BetterChoiceCard
                                key={index}
                                currentProduct={analysis.productName}
                                currentScore={analysis.ecoScore}
                                betterProduct={alt.name}
                                betterScore={alt.ecoScore}
                                improvement={alt.improvement}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[#4c514b]">
                            Click &quot;Find similar & more sustainable&quot; to get alternatives from similar products ranked by sustainability.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>

        {productToAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111714]/70 p-4" onClick={() => setProductToAdd(null)}>
            <div
              className="w-full max-w-sm border-2 border-[#111714] bg-[#fffdf5] p-5 text-[#111714]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-semibold tracking-[-0.04em]">Add to list</h3>
                <button
                  type="button"
                  onClick={() => setProductToAdd(null)}
                  className="border-2 border-[#111714] p-1 transition-colors hover:bg-[#2148d8] hover:text-white"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mb-1 text-sm font-semibold">
                {productToAdd.product.product_name}
              </p>
              {productToAdd.product.brands && (
                <p className="mb-4 text-xs text-[#4c514b]">{productToAdd.product.brands}</p>
              )}
              {addToListError && (
                <p className="mb-3 border-2 border-[#111714] bg-[#fff4de] p-3 text-sm">{addToListError}</p>
              )}
              {lists.length === 0 ? (
                <>
                  <p className="mb-3 text-sm text-[#4c514b]">No lists yet. Create one from My Lists.</p>
                  <Link
                    href="/shopping-lists"
                    className="inline-block bg-[#0d563f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2148d8]"
                    onClick={() => setProductToAdd(null)}
                  >
                    Go to My Lists
                  </Link>
                </>
              ) : (
                <ul className="space-y-2">
                  {lists.map((list) => (
                    <li key={list.id}>
                      <button
                        type="button"
                        onClick={() => handleAddToChosenList(list.id)}
                        disabled={addingToListId !== null}
                        className="w-full border-2 border-[#111714] bg-white px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-[#dfeef2] disabled:opacity-50"
                      >
                        {addingToListId === list.id ? "Adding…" : list.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
