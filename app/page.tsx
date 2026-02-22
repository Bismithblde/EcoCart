"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, List } from "lucide-react";
import ProductInput from "@/components/ProductInput";
import SustainabilityDashboard from "@/components/SustainabilityDashboard";
import BetterChoiceCard from "@/components/BetterChoiceCard";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch, type SearchResult, type SearchWeights, type SearchRanking } from "@/hooks/useSearch";
import { useAnalyzeSustainability } from "@/hooks/useAnalyzeSustainability";
import { useBetterAlternatives } from "@/hooks/useBetterAlternatives";

/** Displays weighted ranking: score = w.name×name + w.categories×cat + w.brand×brand */
function SearchRankingEquation({
  ranking,
  weights,
  className = "",
}: {
  ranking: SearchRanking;
  weights: SearchWeights;
  className?: string;
}) {
  const pct = (x: number) => Math.round(x * 100);
  return (
    <div className={`text-xs text-gray-500 dark:text-gray-400 ${className}`} title="Relevance = name×0.6 + categories×0.25 + brand×0.15">
      <span className="font-medium text-gray-700 dark:text-gray-300">
        Match: {pct(ranking.score)}%
      </span>
      <span className="mx-1.5">=</span>
      <span>
        {weights.name}×{pct(ranking.nameScore)}% + {weights.categories}×{pct(ranking.catScore)}% + {weights.brand}×{pct(ranking.brandScore)}%
      </span>
      <span className="ml-1.5 text-gray-400 dark:text-gray-500">
        (name · category · brand)
      </span>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { results, weights, isLoading, error, search } = useSearch();
  const { analysis, isLoading: isAnalyzing, error: analysisError, analyze } =
    useAnalyzeSustainability();
  const { alternatives: betterAlternatives, isLoading: isLoadingAlternatives, error: alternativesError, fetchAlternatives } =
    useBetterAlternatives();
  const [selectedProduct, setSelectedProduct] = useState<SearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleProductSubmit = (name: string) => {
    setSelectedProduct(null);
    setHasSearched(true);
    search(name);
  };

  const handleAnalyzeSustainability = async () => {
    if (selectedProduct) {
      await analyze({
        code: selectedProduct.code ?? "",
        product_name: selectedProduct.product_name,
        brands: selectedProduct.brands,
        categories: selectedProduct.categories,
      });
    }
  };

  const handleFindBetterAlternatives = () => {
    if (selectedProduct && analysis) {
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

  const handleSignOut = () => {
    logout();
    router.push("/login");
  };

  return (
    <ProtectedRoute>
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
            <div className="ml-auto flex items-center gap-3 min-w-0">
              <Link
                href="/shopping-lists"
                className="flex-shrink-0 flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
              >
                <List className="w-5 h-5 flex-shrink-0" />
                My Lists
              </Link>
              {user && (
                <>
                  {user.email && (
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate min-w-0 max-w-[180px]" title={user.email}>
                      {user.email}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex-shrink-0 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>
          </nav>
        </header>

        <div className="flex flex-col items-center justify-center flex-1 px-4 pt-4 pb-12">
          <main className="w-full max-w-2xl">
            <div className="text-center mb-12">
              <h1 className="text-6xl md:text-8xl font-bold text-gray-900 dark:text-white tracking-[0.2em] md:tracking-[0.25em]">
                ECOCART
              </h1>
            </div>

            <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-8 transition-all duration-300 ease-out hover:border-white dark:hover:border-white hover:-translate-y-0.5">
              <ProductInput onSubmit={handleProductSubmit} isLoading={isLoading} />

              {error && (
                <div className="mt-6 p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                  <p className="text-red-700 dark:text-red-300 font-medium">Search Error</p>
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
                </div>
              )}

              {hasSearched && (
                <div className="mt-8">
                  {isLoading ? (
                    <p className="text-gray-600 dark:text-gray-400">Searching…</p>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                        Search Results ({results.length})
                      </h2>
                      {results.length === 0 ? (
                        <p className="text-gray-600 dark:text-gray-400">No products found. Try a different search.</p>
                      ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {results.map((item, index) => (
                            <button
                              key={item.code ?? index}
                              onClick={() => setSelectedProduct(item)}
                              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                                selectedProduct?.product_name === item.product_name
                                  ? "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                              }`}
                            >
                              <p className="font-medium text-gray-900 dark:text-white">
                                {item.product_name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {item.brands || "No brand"}
                              </p>
                              {item.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                              {item.ranking && (
                                <SearchRankingEquation
                                  ranking={item.ranking}
                                  weights={weights}
                                  className="mt-2"
                                />
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
                  <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {selectedProduct.product_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Brand: {selectedProduct.brands || "Unknown"} | Barcode:{" "}
                      {selectedProduct.code || "N/A"}
                    </p>
                    {selectedProduct.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {selectedProduct.description}
                      </p>
                    )}
                    <button
                      onClick={handleAnalyzeSustainability}
                      disabled={isAnalyzing}
                      className="mt-4 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
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
                      {isAnalyzing ? "Analyzing…" : "Analyze Sustainability"}
                    </button>
                  </div>

                  {analysisError && (
                    <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                      <p className="text-red-700 dark:text-red-300 font-medium">Analysis Error</p>
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{analysisError}</p>
                    </div>
                  )}

                  {analysis && (
                    <div className="space-y-6">
                      <SustainabilityDashboard
                        productName={analysis.productName}
                        ecoScore={analysis.ecoScore}
                        verdict={analysis.verdict}
                        reasoning={analysis.reasoning}
                        metrics={analysis.metrics}
                      />

                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-6">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Better Alternatives
                          </h3>
                          <button
                            type="button"
                            onClick={handleFindBetterAlternatives}
                            disabled={isLoadingAlternatives}
                            className="px-3 py-1.5 rounded-lg bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
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
                          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{alternativesError}</p>
                        )}
                        {betterAlternatives.length > 0 ? (
                          <div className="space-y-3">
                            {betterAlternatives.map((alt) => {
                              if (alt.assessment && "error" in alt.assessment) {
                                return (
                                  <div
                                    key={alt.product.code}
                                    className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-800 dark:text-amber-200"
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
                                  betterScore={a.score}
                                  improvement={a.reasoning}
                                />
                              );
                            })}
                          </div>
                        ) : analysis.alternatives && analysis.alternatives.length > 0 ? (
                          <div className="space-y-3">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">AI suggestions:</p>
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
                          <p className="text-sm text-gray-500 dark:text-gray-400">
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
      </div>
    </ProtectedRoute>
  );
}
