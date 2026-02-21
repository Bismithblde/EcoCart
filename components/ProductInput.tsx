'use client';

import { useState } from 'react';

interface ProductInputProps {
  onSubmit: (productName: string) => void;
  isLoading?: boolean;
}

export default function ProductInput({ onSubmit, isLoading = false }: ProductInputProps) {
  const [productName, setProductName] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (productName.trim()) {
      onSubmit(productName);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="product-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search for a Product
          </label>
          <input
            id="product-input"
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Enter a product name (e.g., organic eggs, water bottle, cotton shirt)"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 transition-colors"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !productName.trim()}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isLoading && (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isLoading ? 'Searching...' : 'Search Products'}
        </button>
      </form>
    </div>
  );
}
