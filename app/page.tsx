'use client';

import { useState } from 'react';
import ProductInput from '@/components/ProductInput';

export default function Home() {
  const [productName, setProductName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleProductSubmit = async (name: string) => {
    setProductName(name);
    setIsLoading(true);
    
    // TODO: Add API call to check sustainability
    // This will be connected to the sustainability checking logic
    console.log('Checking sustainability for:', name);
    
    // Simulated delay - replace with actual API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 font-sans px-4">
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
          
          {productName && (
            <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-semibold">Product:</span> {productName}
              </p>
              {!isLoading && (
                <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
                  Sustainability analysis results will appear here
                </p>
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
  );
}
