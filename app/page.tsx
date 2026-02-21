'use client';

import { useState } from 'react';
import Link from 'next/link';
import ProductInput from '@/components/ProductInput';
import SustainabilityDashboard from '@/components/SustainabilityDashboard';
import BetterChoiceCard from '@/components/BetterChoiceCard';
import { useSearch } from '@/hooks/useSearch';
import { useAnalyzeSustainability } from '@/hooks/useAnalyzeSustainability';

export default function Home() {
  const { results, isLoading, error, search } = useSearch();
  const { analysis, isLoading: isAnalyzing, error: analysisError, analyze } = useAnalyzeSustainability();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const handleProductSubmit = (name: string) => {
    setSelectedProduct(null);
    search(name);
  };

  const handleAnalyzeSustainability = async () => {
    if (selectedProduct) {
      await analyze(selectedProduct.title, selectedProduct.brand);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 font-sans">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between h-16">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            EcoCart
          </h1>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      <div className="flex flex-col items-center justify-center flex-1 px-4 py-12">
        <main className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            EcoCart
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Check the sustainability of any product
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <ProductInput onSubmit={handleProductSubmit} isLoading={isLoading} />
          
          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300 font-semibold">Search Error</p>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
            </div>
          )}

          {results && results.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Search Results ({results.length})
              </h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {results.map((item: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedProduct(item)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedProduct?.title === item.title
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-500'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-green-400'
                    }`}
                  >
                    <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.brand || 'No brand'}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedProduct && (
            <div className="mt-8 space-y-4">
              <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {selectedProduct.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Brand: {selectedProduct.brand || 'Unknown'} | EAN: {selectedProduct.ean || 'N/A'}
                </p>
                <button
                  onClick={handleAnalyzeSustainability}
                  disabled={isAnalyzing}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  {isAnalyzing && (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Sustainability'}
                </button>
              </div>

              {analysisError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-700 dark:text-red-300 font-semibold">Analysis Error</p>
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{analysisError}</p>
                </div>
              )}

              {analysis && (
                <div className="space-y-6">
                  <SustainabilityDashboard 
                    productName={analysis.productName}
                    ecoScore={analysis.ecoScore}
                    metrics={analysis.metrics}
                  />
                  
                  {analysis.alternatives && analysis.alternatives.length > 0 && (
                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-6">
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
          <div className="text-center">
            <div className="text-4xl mb-2">♻️</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Eco-Friendly
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Discover sustainable alternatives
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">🌍</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Environmental Impact
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Understand product footprint
            </p>
          </div>
          <div className="text-center">
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
  );
}
