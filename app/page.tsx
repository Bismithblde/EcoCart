"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Plus } from "lucide-react";
import ProductInput from "@/components/ProductInput";
import SustainabilityDashboard from "@/components/SustainabilityDashboard";
import BetterChoiceCard from "@/components/BetterChoiceCard";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch } from "@/hooks/useSearch";
import { useAnalyzeSustainability } from "@/hooks/useAnalyzeSustainability";

export default function Home() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { results, isLoading, error, search } = useSearch();
  const { analysis, isLoading: isAnalyzing, error: analysisError, analyze } =
    useAnalyzeSustainability();
  const [selectedProduct, setSelectedProduct] = useState<{
    product_name: string;
    brands?: string;
    code?: string;
    description?: string;
  } | null>(null);
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
      });
    }
  };

  const handleSignOut = () => {
    logout();
    router.push("/login");
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950 font-sans">
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center h-14">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </Link>
            <div className="ml-auto flex items-center gap-4">
              <Link
                href="/shopping-lists"
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                My lists
              </Link>
              <Link
                href="/shopping-list"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                New List
              </Link>
              {user && (
                <>
                  {user.email && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
                      {user.email}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>
          </nav>
        </header>

        <div className="flex flex-col items-center justify-center flex-1 px-4 py-12">
          <main className="w-full max-w-2xl">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                EcoCart
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Check the sustainability of any product
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-8">
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
                          {results.map(
                      (
                        item: {
                          product_name: string;
                          brands?: string;
                          code?: string;
                          description?: string;
                        },
                        index: number
                      ) => (
                        <button
                          key={index}
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
                          </button>
                        )
                      )}
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

                      {analysis.alternatives && analysis.alternatives.length > 0 && (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-6">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            Better Alternatives
                          </h3>
                          <div className="space-y-3">
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
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <div className="text-4xl mb-2">♻️</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Eco-Friendly
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Discover sustainable alternatives
                </p>
              </div>
              <div className="text-center p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <div className="text-4xl mb-2">🌍</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Environmental Impact
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Understand product footprint
                </p>
              </div>
              <div className="text-center p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <div className="text-4xl mb-2">💚</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Make a Difference
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose sustainable products
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
